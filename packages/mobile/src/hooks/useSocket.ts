import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  CONFIG,
  ConnectionStatus,
  NavigationEvent,
} from '@mobile-app-lab/shared';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    deviceType: 'mobile',
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [isPaired, setIsPaired] = useState(false);

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
      console.log('[Mobile] Connected to server');
      setConnectionStatus({ connected: true, deviceType: 'mobile' });
    });

    socketInstance.on(SOCKET_EVENTS.ROOM_JOINED, (payload: { success: boolean; error?: string }) => {
      if (payload.success) {
        console.log('[Mobile] Successfully joined room');
        setIsPaired(true);
      } else {
        console.error('[Mobile] Failed to join room:', payload.error);
        setConnectionStatus((prev) => ({ ...prev, error: payload.error }));
      }
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('[Mobile] Disconnected from server');
      setConnectionStatus({ connected: false, deviceType: 'mobile' });
      setIsPaired(false);
      setRoomCode('');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = useCallback(
    (code: string) => {
      if (!socket) return;

      setRoomCode(code);
      socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
        roomCode: code,
        deviceType: 'mobile',
      });
    },
    [socket]
  );

  const sendNavigationInput = useCallback(
    (event: NavigationEvent) => {
      if (!socket || !isPaired || !roomCode) {
        console.warn('[Mobile] Cannot send input: not paired');
        return;
      }

      socket.emit(SOCKET_EVENTS.NAVIGATION_INPUT, {
        ...event,
        roomCode,
      });
    },
    [socket, isPaired, roomCode]
  );

  return {
    socket,
    connectionStatus,
    roomCode,
    isPaired,
    joinRoom,
    sendNavigationInput,
  };
}
