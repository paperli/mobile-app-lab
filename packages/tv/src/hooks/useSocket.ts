import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  CONFIG,
  ConnectionStatus,
  NavigationInputPayload,
  RoomStatusPayload,
} from '@mobile-app-lab/shared';

const ROOM_CODE_KEY = 'tv_room_code';

export function useSocket(onNavigationInput: (payload: NavigationInputPayload) => void) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    deviceType: 'tv',
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [connectedMobileIds, setConnectedMobileIds] = useState<string[]>([]);

  // Use a ref to store the callback so it doesn't cause socket reconnections
  const onNavigationInputRef = useRef(onNavigationInput);

  // Update the ref when the callback changes
  useEffect(() => {
    onNavigationInputRef.current = onNavigationInput;
  }, [onNavigationInput]);

  useEffect(() => {
    // Get server URL from environment variable or construct from hostname
    const getServerUrl = () => {
      // Use environment variable if available (for production deployment)
      if (import.meta.env.VITE_SERVER_URL) {
        return import.meta.env.VITE_SERVER_URL;
      }
      // Use current hostname and protocol for local network access
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      return `${protocol}://${hostname}:${CONFIG.SERVER_PORT}`;
    };

    const socketInstance = io(getServerUrl(), {
      transports: ['websocket'],
    });

    socketInstance.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[TV] Connected to server');
      setConnectionStatus({ connected: true, deviceType: 'tv' });

      // Try to rejoin existing room from sessionStorage
      const savedCode = sessionStorage.getItem(ROOM_CODE_KEY);
      if (savedCode) {
        console.log('[TV] Attempting to rejoin room:', savedCode);
        socketInstance.emit(SOCKET_EVENTS.ROOM_REJOIN, { roomCode: savedCode });
      } else {
        // No saved room, create a new one
        socketInstance.emit(SOCKET_EVENTS.ROOM_CREATE, { deviceType: 'tv' });
      }
    });

    // Rejoin response
    socketInstance.on(SOCKET_EVENTS.ROOM_REJOINED, (payload: { success: boolean; roomCode?: string }) => {
      if (payload.success && payload.roomCode) {
        console.log('[TV] Rejoined room:', payload.roomCode);
        setRoomCode(payload.roomCode);
        setConnectionStatus((prev) => ({ ...prev, roomCode: payload.roomCode }));
      } else {
        // Rejoin failed (room expired or gone), create a new room
        console.log('[TV] Rejoin failed, creating new room');
        sessionStorage.removeItem(ROOM_CODE_KEY);
        socketInstance.emit(SOCKET_EVENTS.ROOM_CREATE, { deviceType: 'tv' });
      }
    });

    socketInstance.on(SOCKET_EVENTS.ROOM_CREATED, (payload: { roomCode: string }) => {
      console.log('[TV] Room created:', payload.roomCode);
      setRoomCode(payload.roomCode);
      setConnectionStatus((prev) => ({ ...prev, roomCode: payload.roomCode }));
      // Save to sessionStorage for persistence across refreshes
      sessionStorage.setItem(ROOM_CODE_KEY, payload.roomCode);
    });

    socketInstance.on(SOCKET_EVENTS.ROOM_JOINED, (payload: { success: boolean }) => {
      if (payload.success) {
        console.log('[TV] Mobile device connected');
      }
    });

    socketInstance.on(SOCKET_EVENTS.ROOM_STATUS, (payload: RoomStatusPayload) => {
      setConnectedMobileIds(payload.mobileSocketIds);
    });

    socketInstance.on(SOCKET_EVENTS.NAVIGATION_INPUT, (payload: NavigationInputPayload) => {
      console.log('[TV] Navigation input received:', payload);
      // Use the ref to call the latest callback without causing reconnections
      onNavigationInputRef.current(payload);
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('[TV] Disconnected from server');
      setConnectionStatus({ connected: false, deviceType: 'tv' });
      // Don't clear roomCode or sessionStorage — we want to rejoin on reconnect
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []); // Empty dependency array - socket connects once and stays connected

  return { socket, connectionStatus, roomCode, connectedMobileIds };
}
