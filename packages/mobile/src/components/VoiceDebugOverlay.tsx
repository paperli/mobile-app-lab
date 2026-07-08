import { useEffect, useState } from 'react';
import { getSpeechRecognitionBridge } from '../utils/speechRecognitionBridge';

// Temporary debug surface. Shows bridge selection, native voice state, and a
// rolling buffer of recent recognizer results. Remove once voice is stable.

interface LogEntry {
  id: number;
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

let counter = 0;

export function VoiceDebugOverlay() {
  const [bridgeKind, setBridgeKind] = useState<string>('…');
  const [supported, setSupported] = useState<boolean>(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nativeState, setNativeState] = useState<string | null>(null);

  useEffect(() => {
    const bridge = getSpeechRecognitionBridge();
    setBridgeKind(bridge.kind);
    setSupported(bridge.isSupported);
    if (!bridge.isSupported) return;

    const unsub = bridge.onResult((r) => {
      setLog((prev) => {
        const next: LogEntry = {
          id: ++counter,
          transcript: r.transcript,
          confidence: r.confidence,
          isFinal: r.isFinal,
        };
        return [next, ...prev].slice(0, 10);
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const native = window.NativeBridge;
    if (!native?.addEventListener) return;
    const unsub = native.addEventListener('voiceState', (e) => {
      setNativeState(e.state);
    });
    return unsub;
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 6,
        left: 6,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.78)',
        color: '#7fff7f',
        font: '11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '6px 8px',
        borderRadius: 6,
        maxWidth: '80vw',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
      }}
    >
      <div style={{ color: '#fff' }}>
        VOICE bridge=<b>{bridgeKind}</b>
        {!supported && <span style={{ color: '#f77' }}> (unsupported)</span>}
        {nativeState && <> · ios=<b style={{ color: nativeState === 'denied' ? '#f77' : '#fff' }}>{nativeState}</b></>}
      </div>
      {log.length === 0 ? (
        <div style={{ color: '#888' }}>(no transcripts yet — speak!)</div>
      ) : (
        log.map((e) => (
          <div key={e.id} style={{ opacity: e.isFinal ? 1 : 0.55 }}>
            {e.isFinal ? '►' : '∙'} {e.transcript || '<empty>'}
            {' '}<span style={{ color: '#888' }}>{(e.confidence * 100).toFixed(0)}%</span>
          </div>
        ))
      )}
    </div>
  );
}
