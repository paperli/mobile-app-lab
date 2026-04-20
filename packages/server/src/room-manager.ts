import { RoomInfo, DeviceType } from '@mobile-app-lab/shared';

interface Room {
  code: string;
  tvSocketId: string | null;
  mobileSocketIds: string[];
  createdAt: number;
  maxMobiles: number;
  tvDisconnectedAt: number | null; // When TV disconnected (for grace period)
}

const TV_RECONNECT_GRACE_MS = 30_000; // 30 seconds for TV to reconnect

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  // Generate a random 6-digit room code
  generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create a new room for TV
  createRoom(tvSocketId: string): string {
    let roomCode: string;

    // Ensure unique room code
    do {
      roomCode = this.generateRoomCode();
    } while (this.rooms.has(roomCode));

    const room: Room = {
      code: roomCode,
      tvSocketId,
      mobileSocketIds: [],
      createdAt: Date.now(),
      maxMobiles: 6,
      tvDisconnectedAt: null,
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(tvSocketId, roomCode);

    console.log(`[RoomManager] Room created: ${roomCode} by TV ${tvSocketId}`);
    return roomCode;
  }

  // Join an existing room
  joinRoom(roomCode: string, mobileSocketId: string, deviceType: DeviceType): boolean {
    const room = this.rooms.get(roomCode);

    if (!room) {
      console.log(`[RoomManager] Room ${roomCode} not found`);
      return false;
    }

    if (deviceType === 'mobile') {
      if (room.mobileSocketIds.length >= room.maxMobiles) {
        console.log(`[RoomManager] Room ${roomCode} is full (${room.maxMobiles} mobiles)`);
        return false;
      }
      room.mobileSocketIds.push(mobileSocketId);
      this.socketToRoom.set(mobileSocketId, roomCode);
      console.log(`[RoomManager] Mobile ${mobileSocketId} joined room ${roomCode} (${room.mobileSocketIds.length}/${room.maxMobiles})`);
    } else {
      console.log(`[RoomManager] Only mobile devices can join existing rooms`);
      return false;
    }

    return true;
  }

  // Rejoin an existing room as TV (after page refresh)
  rejoinRoom(roomCode: string, tvSocketId: string): boolean {
    const room = this.rooms.get(roomCode);

    if (!room) {
      console.log(`[RoomManager] Rejoin failed: room ${roomCode} not found`);
      return false;
    }

    // Only allow rejoin if the room has no active TV (grace period)
    if (room.tvSocketId !== null) {
      console.log(`[RoomManager] Rejoin failed: room ${roomCode} already has a TV`);
      return false;
    }

    // Check if grace period has expired
    if (room.tvDisconnectedAt && Date.now() - room.tvDisconnectedAt > TV_RECONNECT_GRACE_MS) {
      console.log(`[RoomManager] Rejoin failed: grace period expired for room ${roomCode}`);
      this.rooms.delete(roomCode);
      return false;
    }

    // Reclaim the room
    room.tvSocketId = tvSocketId;
    room.tvDisconnectedAt = null;
    this.socketToRoom.set(tvSocketId, roomCode);
    console.log(`[RoomManager] TV ${tvSocketId} rejoined room ${roomCode} (${room.mobileSocketIds.length} mobiles connected)`);
    return true;
  }

  // Get room by socket ID
  getRoomBySocket(socketId: string): Room | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  // Get room by code
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  // Remove socket from room (on disconnect)
  removeSocket(socketId: string): void {
    const roomCode = this.socketToRoom.get(socketId);

    if (!roomCode) {
      return;
    }

    const room = this.rooms.get(roomCode);

    if (!room) {
      return;
    }

    // Remove the socket from the room
    if (room.tvSocketId === socketId) {
      console.log(`[RoomManager] TV disconnected from room ${roomCode}, starting grace period`);
      // Keep room alive for grace period so TV can rejoin after refresh
      room.tvSocketId = null;
      room.tvDisconnectedAt = Date.now();

      // Schedule cleanup after grace period
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomCode);
        if (currentRoom && currentRoom.tvSocketId === null) {
          console.log(`[RoomManager] Grace period expired for room ${roomCode}, removing room`);
          this.rooms.delete(roomCode);
          currentRoom.mobileSocketIds.forEach(mobileId => {
            this.socketToRoom.delete(mobileId);
          });
        }
      }, TV_RECONNECT_GRACE_MS);
    } else if (room.mobileSocketIds.includes(socketId)) {
      console.log(`[RoomManager] Mobile disconnected from room ${roomCode}`);
      room.mobileSocketIds = room.mobileSocketIds.filter(id => id !== socketId);
      console.log(`[RoomManager] ${room.mobileSocketIds.length} mobiles remaining in room ${roomCode}`);
    }

    this.socketToRoom.delete(socketId);
  }

  // Get all active rooms (for debugging)
  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(room => ({
      roomCode: room.code,
      tvConnected: room.tvSocketId !== null,
      mobileConnected: room.mobileSocketIds.length > 0,
      createdAt: room.createdAt,
    }));
  }

  // Clean up expired rooms
  cleanupExpiredRooms(expiryMs: number): void {
    const now = Date.now();
    const expiredRooms: string[] = [];

    this.rooms.forEach((room, code) => {
      if (now - room.createdAt > expiryMs) {
        expiredRooms.push(code);
      }
    });

    expiredRooms.forEach(code => {
      const room = this.rooms.get(code);
      if (room) {
        if (room.tvSocketId) this.socketToRoom.delete(room.tvSocketId);
        room.mobileSocketIds.forEach(mobileId => {
          this.socketToRoom.delete(mobileId);
        });
        this.rooms.delete(code);
        console.log(`[RoomManager] Expired room removed: ${code}`);
      }
    });

    if (expiredRooms.length > 0) {
      console.log(`[RoomManager] Cleaned up ${expiredRooms.length} expired rooms`);
    }
  }
}
