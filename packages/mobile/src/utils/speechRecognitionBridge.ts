// Single API for continuous speech recognition. Prefers the native iOS
// SFSpeechRecognizer bridge (much more reliable in WKWebView) and falls back
// to webkitSpeechRecognition in the browser for desktop testing.

export interface RecognitionResult {
  transcript: string;
  /** 0..1. SFSpeechRecognizer confidence, or browser SR confidence. */
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionBridge {
  readonly isSupported: boolean;
  /** Bridge type for diagnostics. */
  readonly kind: 'native' | 'web' | 'unsupported';
  start(): void;
  stop(): void;
  onResult(cb: (r: RecognitionResult) => void): () => void;
}

function createNativeBridge(): SpeechRecognitionBridge {
  const native = window.NativeBridge!;
  const callbacks = new Set<(r: RecognitionResult) => void>();

  let unsubscribe: (() => void) | null = null;

  const ensureListening = () => {
    if (unsubscribe) return;
    unsubscribe = native.addEventListener('voiceTranscript', (e) => {
      callbacks.forEach((cb) => cb(e));
    });
  };

  return {
    isSupported: true,
    kind: 'native',
    start() {
      ensureListening();
      native.startSpeechRecognition();
    },
    stop() {
      native.stopSpeechRecognition();
    },
    onResult(cb) {
      ensureListening();
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
  };
}

function createWebBridge(): SpeechRecognitionBridge | null {
  const Ctor =
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
  if (!Ctor) return null;

  const callbacks = new Set<(r: RecognitionResult) => void>();
  let recognition: SpeechRecognition | null = null;
  let keepAlive = false;

  const dispatch = (r: RecognitionResult) => callbacks.forEach((cb) => cb(r));

  const startInternal = () => {
    if (recognition) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript.trim();
      if (!text) return;
      dispatch({
        transcript: text.toLowerCase(),
        confidence: last[0].confidence ?? 0,
        isFinal: last.isFinal,
      });
    };
    r.onerror = (event: Event) => {
      // Ignore the noisy ones; the keep-alive loop will restart.
      const err = (event as Event & { error?: string }).error;
      if (err === 'no-speech' || err === 'aborted') return;
      console.warn('[speechBridge:web] error', err);
    };
    r.onend = () => {
      recognition = null;
      if (keepAlive) {
        setTimeout(() => {
          if (keepAlive) startInternal();
        }, 300);
      }
    };

    try {
      r.start();
      recognition = r;
    } catch (err) {
      console.warn('[speechBridge:web] start failed', err);
      recognition = null;
    }
  };

  return {
    isSupported: true,
    kind: 'web',
    start() {
      keepAlive = true;
      startInternal();
    },
    stop() {
      keepAlive = false;
      if (recognition) {
        try { recognition.stop(); } catch { /* noop */ }
      }
    },
    onResult(cb) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
  };
}

let cached: SpeechRecognitionBridge | null = null;

export function getSpeechRecognitionBridge(): SpeechRecognitionBridge {
  if (cached) return cached;

  if (typeof window !== 'undefined' && window.NativeBridge?.startSpeechRecognition) {
    cached = createNativeBridge();
    return cached;
  }

  const web = createWebBridge();
  if (web) {
    cached = web;
    return cached;
  }

  cached = {
    isSupported: false,
    kind: 'unsupported',
    start() { /* noop */ },
    stop() { /* noop */ },
    onResult() { return () => { /* noop */ }; },
  };
  return cached;
}
