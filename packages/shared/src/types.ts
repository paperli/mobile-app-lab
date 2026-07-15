// Navigation types
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';
export type NavigationAction = 'ok' | 'back' | 'system';
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
export type TVScreen =
  | 'hub'
  | 'loading'
  | 'game-menu'
  | 'playlist-select'
  | 'party-playlist-select'
  | 'in-game'
  | 'studio';

export interface ScreenUpdatePayload {
  screen: TVScreen;
  gameId?: string;
}

// Game Studio — voice-driven game creation (mobile ↔ TV)
//
// The TV drives the flow and pushes the current phase to the phone; the phone
// renders the matching controller (idea entry → game controls / develop chat)
// and sends ideas / iterations / discrete actions back.
export type StudioPhase =
  | 'connect' // TV: QR + "connect your phone"; phone flips to the studio controller
  | 'prompt' // TV: game master asks for an idea; phone: idea-entry controller
  | 'generating' // TV: progress bar + "thinking…"; phone: waiting
  | 'reveal' // TV: game-tile "breathing" reveal animation; phone: waiting
  | 'game' // TV: the created game previews; phone: [Controller] [Develop]
  | 'playing'; // TV: the created game is actually being played; phone: answer pad

// The kind of game the idea maps to. Drives the TV title/theme; today every
// kind is played through the shared trivia engine (prototype).
export type StudioGameKind = 'trivia' | 'word' | 'drawing' | 'music' | 'bluff';

// TV → Mobile: current creation phase + game version (bumps on each iteration).
// `title`/`kind`/`idea` describe the game the TV built from the user's idea, so
// the phone can label its controls to match (instead of a hard-coded "Jeopardy").
export interface StudioStatePayload {
  roomCode: string;
  phase: StudioPhase;
  version: number;
  title?: string;
  kind?: StudioGameKind;
  idea?: string;
  // True while the TV is showing the "leave game creation?" confirmation; the
  // phone switches to a d-pad to cancel/confirm on the TV.
  exitConfirm?: boolean;
}

// Mobile → TV: submit a game idea (create) or an iteration request (iterate).
export interface StudioSubmitPayload {
  roomCode: string;
  text: string;
  mode: 'create' | 'iterate';
}

// Mobile → TV: discrete studio controls.
//   ready   — the phone has mounted the studio controller (connect → prompt)
//   start   — the big Start button on the Controller tab
//   develop-tab / controller-tab — segmented control switches
//   play-again   — from the results screen, restart the round
//   quit-game    — leave gameplay, back to the game preview
//   request-exit — ask the TV to show the "leave game creation?" confirmation
export type StudioAction =
  | 'ready'
  | 'start'
  | 'develop-tab'
  | 'controller-tab'
  | 'play-again'
  | 'quit-game'
  | 'request-exit';

export interface StudioActionPayload {
  roomCode: string;
  action: StudioAction;
}

// ── Studio gameplay (the real, phone-controlled game behind Start) ──────────
// A simple trivia round: the TV shows a question + four options; each phone taps
// an option; the TV reveals the answer, scores it, advances, and finally shows
// results. All game kinds run through this engine in the prototype.
export type StudioPlayStatus = 'question' | 'reveal' | 'results';

export interface StudioQuestion {
  prompt: string;
  options: string[]; // exactly 4
  correctIndex: number;
}

// TV → Mobile: the live gameplay state (what to render on the answer pad).
export interface StudioGameStatePayload {
  roomCode: string;
  status: StudioPlayStatus;
  questionIndex: number; // 0-based
  totalQuestions: number;
  prompt: string;
  options: string[];
  // Present once the round is revealed / finished.
  correctIndex?: number;
  // What this room picked for the current question (reveal only). Null = no pick.
  selectedIndex?: number | null;
  score: number;
}

// Mobile → TV: the option this phone tapped for the current question.
export interface StudioAnswerPayload {
  roomCode: string;
  index: number;
}

export interface SystemMenuOpenPayload {
  roomCode: string;
}

export interface SystemMenuClosePayload {
  roomCode: string;
}

export interface SystemMenuActionPayload {
  roomCode: string;
  action: 'resume' | 'exit';
}

// Voice — mobile ↔ TV
// Mobile owns the mic and TTS. The TV matches transcripts against
// screen-aware grammars and may bounce a confirmation prompt back to mobile
// for a low-confidence match.

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'awaiting-confirm';

export interface VoiceTranscriptPayload {
  roomCode: string;
  // Lowercased, trimmed final transcript from mobile.
  transcript: string;
  // Recognizer-reported confidence 0..1. Native SFSpeechRecognizer often
  // reports 0 for very short utterances; treat as a hint, not a gate.
  recognizerConfidence: number;
  // True for a final segment, false for an interim. TV ignores interim today
  // but the wire format leaves room to react sooner later.
  isFinal: boolean;
  timestamp: number;
}

export interface VoiceConfirmPromptPayload {
  roomCode: string;
  // The yes/no question to read aloud on mobile.
  prompt: string;
  // Opaque id so mobile can pair the response to the right prompt; the TV
  // treats stale responses as no-ops.
  promptId: string;
}

export interface VoiceConfirmResponsePayload {
  roomCode: string;
  promptId: string;
  // Whether the user said yes (or anything affirmative). Null if mobile
  // gave up (timeout / unintelligible).
  confirmed: boolean | null;
}

export interface VoiceStatePayload {
  roomCode: string;
  state: VoiceState;
}
