import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceInputOptions {
  enabled?: boolean;
  smoothingFactor?: number; // 0-1, higher = smoother but less responsive
  testMode?: boolean; // Simulate voice input for testing without microphone
}

interface UseVoiceInputReturn {
  volume: number; // 0-1 range
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { enabled = false, smoothingFactor = 0.8, testMode = false } = options;

  const [volume, setVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testIntervalRef = useRef<number | null>(null);

  // Simulate voice input for testing (when microphone not available)
  const startTestMode = useCallback(() => {
    console.log('[VoiceInput] Starting test mode...');
    setIsListening(true);
    setError(null);

    let time = 0;
    testIntervalRef.current = window.setInterval(() => {
      // Simulate varying volume levels
      const simulatedVolume = 0.3 + Math.sin(time / 500) * 0.3 + Math.random() * 0.2;
      setVolume(Math.max(0, Math.min(1, simulatedVolume)));
      time += 50;
    }, 50);
  }, []);

  const stopTestMode = useCallback(() => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    setIsListening(false);
    setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    // Use test mode if enabled
    if (testMode) {
      startTestMode();
      return;
    }

    // On native iOS, the SFSpeechRecognizer's AVAudioEngine owns the mic
    // exclusively. Subscribing to the bridge's voiceVolume events instead of
    // calling getUserMedia keeps the wave guide animating without fighting
    // for mic access.
    const native = window.NativeBridge;
    if (native?.startSpeechRecognition) {
      setError(null);
      setIsListening(true);
      const unsub = native.addEventListener('voiceVolume', (e) => {
        setVolume(e.volume);
      });
      // Stash the unsubscribe on the streamRef so stopListening can reach it.
      // Using the existing slot avoids a new ref while keeping cleanup tidy.
      (streamRef as { current: unknown }).current = { __nativeUnsub: unsub };
      return;
    }

    try {
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not available. Please use HTTPS or localhost.');
      }

      console.log('[VoiceInput] Requesting microphone access...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      console.log('[VoiceInput] Microphone access granted');

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = smoothingFactor;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);

      setIsListening(true);

      // Start analyzing volume
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / dataArray.length;

        // Normalize to 0-1 range (0-255 -> 0-1)
        let normalizedVolume = average / 255;

        // Amplify the volume (typical speech is quiet, multiply by 2.5x)
        // This makes normal/loud speech reach closer to 100%
        normalizedVolume = normalizedVolume * 2.5;

        // Clamp to 0-1 range
        normalizedVolume = Math.max(0, Math.min(1, normalizedVolume));

        setVolume(normalizedVolume);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Microphone access error:', err);
    }
  }, [smoothingFactor]);

  const stopListening = useCallback(() => {
    // Stop test mode if active
    if (testIntervalRef.current) {
      stopTestMode();
      return;
    }

    // Native bridge path: just unsubscribe from voiceVolume events. The
    // recognizer keeps running because it's owned by useVoiceTransport.
    const slot = streamRef.current as unknown as { __nativeUnsub?: () => void } | null;
    if (slot && typeof slot.__nativeUnsub === 'function') {
      slot.__nativeUnsub();
      streamRef.current = null;
      setIsListening(false);
      setVolume(0);
      return;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect microphone
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setVolume(0);
  }, [stopTestMode]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isListening) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    volume,
    isListening,
    error,
    startListening,
    stopListening,
  };
}
