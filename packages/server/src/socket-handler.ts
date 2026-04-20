import { Server, Socket } from 'socket.io';
import { RoomManager } from './room-manager.js';
import {
  SOCKET_EVENTS,
  RoomCreatePayload,
  RoomJoinPayload,
  NavigationInputPayload,
  ScreenUpdatePayload,
  RoomStatusPayload,
} from '@mobile-app-lab/shared';

function broadcastRoomStatus(io: Server, roomManager: RoomManager, roomCode: string) {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.tvSocketId) return;
  const payload: RoomStatusPayload = {
    roomCode,
    mobileSocketIds: [...room.mobileSocketIds],
  };
  io.to(room.tvSocketId).emit(SOCKET_EVENTS.ROOM_STATUS, payload);
}

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Handle room creation (TV)
    socket.on(SOCKET_EVENTS.ROOM_CREATE, (payload: RoomCreatePayload) => {
      console.log(`[Socket] Room create request from ${socket.id}`);

      const roomCode = roomManager.createRoom(socket.id);

      // Send room code back to TV
      socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
        roomCode,
      });

      // Join the socket.io room for easy broadcasting
      socket.join(roomCode);
    });

    // Handle room rejoin (TV reconnecting after refresh)
    socket.on(SOCKET_EVENTS.ROOM_REJOIN, (payload: { roomCode: string }) => {
      const { roomCode } = payload;
      console.log(`[Socket] Room rejoin request: ${roomCode} from ${socket.id}`);

      const success = roomManager.rejoinRoom(roomCode, socket.id);

      if (success) {
        socket.join(roomCode);
        socket.emit(SOCKET_EVENTS.ROOM_REJOINED, {
          success: true,
          roomCode,
        });
        broadcastRoomStatus(io, roomManager, roomCode);
        console.log(`[Socket] TV ${socket.id} rejoined room ${roomCode}`);
      } else {
        socket.emit(SOCKET_EVENTS.ROOM_REJOINED, {
          success: false,
        });
        console.log(`[Socket] TV ${socket.id} failed to rejoin room ${roomCode}`);
      }
    });

    // Handle room joining (Mobile)
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: RoomJoinPayload) => {
      const { roomCode, deviceType } = payload;
      console.log(`[Socket] Room join request: ${roomCode} from ${socket.id} (${deviceType})`);

      const success = roomManager.joinRoom(roomCode, socket.id, deviceType);

      if (success) {
        // Join the socket.io room
        socket.join(roomCode);

        // Notify mobile of successful join
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          success: true,
          roomCode,
        });

        // Notify TV that mobile has connected
        const room = roomManager.getRoom(roomCode);
        if (room && room.tvSocketId) {
          io.to(room.tvSocketId).emit(SOCKET_EVENTS.ROOM_JOINED, {
            success: true,
            roomCode,
          });
        }

        broadcastRoomStatus(io, roomManager, roomCode);

        console.log(`[Socket] ${socket.id} successfully joined room ${roomCode}`);
      } else {
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          success: false,
          error: 'Room not found or already full',
        });
        console.log(`[Socket] ${socket.id} failed to join room ${roomCode}`);
      }
    });

    // Handle navigation input from mobile
    socket.on(SOCKET_EVENTS.NAVIGATION_INPUT, (payload: NavigationInputPayload) => {
      const room = roomManager.getRoomBySocket(socket.id);

      if (!room) {
        console.log(`[Socket] Navigation input from ${socket.id} but not in any room`);
        return;
      }

      if (!room.mobileSocketIds.includes(socket.id)) {
        console.log(`[Socket] Navigation input from ${socket.id} but not a mobile in this room`);
        return;
      }

      // Forward to TV
      if (room.tvSocketId) {
        io.to(room.tvSocketId).emit(SOCKET_EVENTS.NAVIGATION_INPUT, payload);
        console.log(
          `[Socket] Navigation forwarded: ${payload.type} ${payload.direction || payload.action || ''}`
        );
      }
    });

    // Handle screen updates from TV → forward to mobile devices in the room
    socket.on(SOCKET_EVENTS.SCREEN_UPDATE, (payload: ScreenUpdatePayload) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.tvSocketId !== socket.id) return;

      // Broadcast to all mobile devices in the room
      for (const mobileId of room.mobileSocketIds) {
        io.to(mobileId).emit(SOCKET_EVENTS.SCREEN_UPDATE, payload);
      }
      console.log(`[Socket] Screen update forwarded: ${payload.screen}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const priorRoom = roomManager.getRoomBySocket(socket.id);
      const priorRoomCode = priorRoom?.code;
      const wasMobile = priorRoom?.mobileSocketIds.includes(socket.id) ?? false;
      roomManager.removeSocket(socket.id);
      if (priorRoomCode && wasMobile) {
        broadcastRoomStatus(io, roomManager, priorRoomCode);
      }
    });
  });
}
