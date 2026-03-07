// Navigation types
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';
export type NavigationAction = 'ok' | 'back';
export type DeviceType = 'tv' | 'mobile';
export type ControllerMode = 'dpad' | 'trackpad' | 'gamepad' | 'hybrid' | 'square-hybrid';

// Navigation event sent from mobile to TV
export interface NavigationEvent {
  type: 'navigate' | 'action';
  direction?: NavigationDirection;
  action?: NavigationAction;
  timestamp: number;
}

// Game data
export interface GameData {
  id: string;
  title: string;
  description: string;
  previewImage: string;
  backgroundColor: string;
}

// Room/Connection types
export interface RoomInfo {
  roomCode: string;
  tvConnected: boolean;
  mobileConnected: boolean;
  createdAt: number;
}

export interface ConnectionStatus {
  connected: boolean;
  deviceType: DeviceType;
  roomCode?: string;
  error?: string;
}

// Socket.io event payloads
export interface RoomCreatePayload {
  deviceType: DeviceType;
}

export interface RoomCreatedPayload {
  roomCode: string;
}

export interface RoomJoinPayload {
  roomCode: string;
  deviceType: DeviceType;
}

export interface RoomJoinedPayload {
  success: boolean;
  roomCode?: string;
  error?: string;
}

export interface NavigationInputPayload extends NavigationEvent {
  roomCode: string;
}

// Screen state broadcast from TV to mobile
export type TVScreen = 'hub' | 'loading' | 'game-menu' | 'playlist-select' | 'in-game';

export interface ScreenUpdatePayload {
  screen: TVScreen;
  gameId?: string;
}
