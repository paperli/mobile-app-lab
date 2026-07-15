import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  CONFIG,
  ConnectionStatus,
  NavigationEvent,
  TVScreen,
  ScreenUpdatePayload,
  StudioPhase,
  StudioGameKind,
  StudioStatePayload,
  StudioAction,
  StudioGameStatePayload,
} from '@mobile-app-lab/shared';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    deviceType: 'mobile',
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [isPaired, setIsPaired] = useState(false);
  const [tvScreen, setTvScreen] = useState<TVScreen>('hub');
  // Studio phase/version pushed by the TV (only meaningful while tvScreen==='studio').
  const [studioPhase, setStudioPhase] = useState<StudioPhase>('connect');
  const [studioVersion, setStudioVersion] = useState(0);
  // The game the TV built from the idea (drives the phone's labels).
  const [studioTitle, setStudioTitle] = useState('');
  const [studioKind, setStudioKind] = useState<StudioGameKind>('trivia');
  // Live gameplay state pushed by the TV while phase==='playing'.
  const [studioGame, setStudioGame] = useState<StudioGameStatePayload | null>(null);
  // True while the TV is showing the leave-confirmation (phone becomes a d-pad).
  const [studioExitConfirm, setStudioExitConfirm] = useState(false);

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

    socketInstance.on(SOCKET_EVENTS.SCREEN_UPDATE, (payload: ScreenUpdatePayload) => {
      console.log('[Mobile] Screen update:', payload.screen);
      setTvScreen(payload.screen);
    });

    socketInstance.on(SOCKET_EVENTS.STUDIO_STATE, (payload: StudioStatePayload) => {
      console.log('[Mobile] Studio state:', payload.phase, 'v' + payload.version);
      setStudioPhase(payload.phase);
      setStudioVersion(payload.version);
      if (payload.title !== undefined) setStudioTitle(payload.title);
      if (payload.kind !== undefined) setStudioKind(payload.kind);
      setStudioExitConfirm(!!payload.exitConfirm);
    });

    socketInstance.on(SOCKET_EVENTS.STUDIO_GAME_STATE, (payload: StudioGameStatePayload) => {
      setStudioGame(payload);
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

  // Studio: send a game idea (create) or an iteration prompt (iterate).
  const sendStudioSubmit = useCallback(
    (text: string, mode: 'create' | 'iterate') => {
      if (!socket || !roomCode) return;
      socket.emit(SOCKET_EVENTS.STUDIO_SUBMIT, { roomCode, text, mode });
    },
    [socket, roomCode]
  );

  // Studio: send a discrete action (ready / start / tab switch).
  const sendStudioAction = useCallback(
    (action: StudioAction) => {
      if (!socket || !roomCode) return;
      socket.emit(SOCKET_EVENTS.STUDIO_ACTION, { roomCode, action });
    },
    [socket, roomCode]
  );

  // Studio: report mic state (listening/idle) so the TV game-master can react.
  // Reuses the voice-state channel; the faked studio mic drives it on press/release.
  const sendVoiceState = useCallback(
    (state: 'idle' | 'listening') => {
      if (!socket || !roomCode) return;
      socket.emit(SOCKET_EVENTS.VOICE_STATE, { roomCode, state });
    },
    [socket, roomCode]
  );

  // Studio gameplay: send the tapped answer option to the TV.
  const sendStudioAnswer = useCallback(
    (index: number) => {
      if (!socket || !roomCode) return;
      socket.emit(SOCKET_EVENTS.STUDIO_ANSWER, { roomCode, index });
    },
    [socket, roomCode]
  );

  const leaveRoom = useCallback(() => {
    setIsPaired(false);
    setRoomCode('');
    setTvScreen('hub');
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  return {
    socket,
    connectionStatus,
    roomCode,
    isPaired,
    tvScreen,
    studioPhase,
    studioVersion,
    studioTitle,
    studioKind,
    studioGame,
    studioExitConfirm,
    joinRoom,
    sendNavigationInput,
    sendStudioSubmit,
    sendStudioAction,
    sendVoiceState,
    sendStudioAnswer,
    leaveRoom,
    disconnect,
  };
}
