/**
 * TypeScript declarations for the native iOS bridge
 * The NativeBridge object is injected by the iOS app via WKWebView
 */

export type NativeBridgeEvent =
  | 'voiceTranscript'
  | 'voiceState'
  | 'voiceVolume'
  | 'speakDone';

export interface VoiceTranscriptEvent {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceStateEvent {
  state: 'idle' | 'listening' | 'denied' | 'unavailable';
}

export interface VoiceVolumeEvent {
  /** 0..1 RMS, throttled to ~30Hz on the native side. */
  volume: number;
}

export interface SpeakDoneEvent {
  utteranceId: string;
}

declare global {
  interface Window {
    NativeBridge?: {
      isNativeApp: () => boolean;

      triggerHaptic: (
        type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'navigation'
      ) => void;

      dismissController: () => void;

      // --- Voice ---
      startSpeechRecognition: () => void;
      stopSpeechRecognition: () => void;
      speak: (text: string, utteranceId: string) => void;
      cancelSpeak: () => void;

      addEventListener: {
        (event: 'voiceTranscript', callback: (e: VoiceTranscriptEvent) => void): () => void;
        (event: 'voiceState', callback: (e: VoiceStateEvent) => void): () => void;
        (event: 'voiceVolume', callback: (e: VoiceVolumeEvent) => void): () => void;
        (event: 'speakDone', callback: (e: SpeakDoneEvent) => void): () => void;
        (event: NativeBridgeEvent, callback: (payload: unknown) => void): () => void;
      };
    };

    webkit?: {
      messageHandlers?: {
        NativeBridge?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
  }
}

export {};
