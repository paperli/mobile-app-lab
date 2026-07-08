// Speech synthesis (TTS) bridge. Prefers native AVSpeechSynthesizer on iOS,
// falls back to window.speechSynthesis in the browser.
//
// Returns a Promise that resolves when the utterance finishes (or is
// cancelled) so the voice transport can sequence "speak prompt → listen for
// yes/no" without overlap.

let nextUtteranceId = 0;
const newUtteranceId = () => `utt-${Date.now()}-${++nextUtteranceId}`;

type Speaker = (text: string) => Promise<void>;

let cached: Speaker | null = null;

function nativeSpeaker(): Speaker {
  const native = window.NativeBridge!;
  const pending = new Map<string, () => void>();

  native.addEventListener('speakDone', (e) => {
    const resolve = pending.get(e.utteranceId);
    if (resolve) {
      pending.delete(e.utteranceId);
      resolve();
    }
  });

  return (text: string) =>
    new Promise<void>((resolve) => {
      const id = newUtteranceId();
      pending.set(id, resolve);
      native.speak(text, id);
    });
}

function webSpeaker(): Speaker | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return (text: string) =>
    new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const done = () => resolve();
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
    });
}

function unsupportedSpeaker(): Speaker {
  return (text: string) => {
    console.warn('[speechSynthBridge] no TTS available, would have said:', text);
    return Promise.resolve();
  };
}

export function speak(text: string): Promise<void> {
  if (!cached) {
    if (window.NativeBridge?.speak) cached = nativeSpeaker();
    else cached = webSpeaker() ?? unsupportedSpeaker();
  }
  return cached(text);
}

export function cancelSpeech(): void {
  if (window.NativeBridge?.cancelSpeak) {
    window.NativeBridge.cancelSpeak();
    return;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
