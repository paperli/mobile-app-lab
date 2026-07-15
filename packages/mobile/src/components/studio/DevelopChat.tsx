import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic } from 'lucide-react';
import { STUDIO_ITERATIONS } from '@mobile-app-lab/shared';
import { HapticFeedback } from '../../utils/haptics';

const CANARY = 'rgb(var(--palette-canary-500))';

export interface ChatMsg {
  role: 'user' | 'master';
  text: string;
}

/**
 * The "Develop" tab: a scrollable chat log on top and an input row (text + faked
 * mic + send) at the bottom. Holding the mic drops a random pre-generated
 * iteration prompt into the field; sending submits it as an iteration.
 */
export function DevelopChat({
  log,
  onSend,
  onVoiceState,
}: {
  log: ChatMsg[];
  onSend: (text: string) => void;
  onVoiceState: (state: 'idle' | 'listening') => void;
}) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  const startListening = () => {
    setListening(true);
    onVoiceState('listening');
    HapticFeedback.medium();
  };
  const stopListening = () => {
    if (!listening) return;
    setListening(false);
    onVoiceState('idle');
    setText(STUDIO_ITERATIONS[Math.floor(Math.random() * STUDIO_ITERATIONS.length)]);
    HapticFeedback.success();
  };
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    HapticFeedback.medium();
    onSend(t);
    setText('');
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Chat log */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px' }}>
        {log.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
              padding: '10px 14px',
              borderRadius: 16,
              fontSize: 15,
              lineHeight: 1.35,
              background: m.role === 'user' ? CANARY : 'rgba(255,255,255,0.08)',
              color: m.role === 'user' ? '#1a1400' : '#F3F4F1',
              borderBottomRightRadius: m.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input row */}
      {listening && (
        <div style={{ textAlign: 'center', margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: CANARY }}>listening…</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask for a change…"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)',
            color: '#F3F4F1',
            fontSize: 16,
            lineHeight: 1.3,
            padding: '12px 16px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {text.trim() ? (
          <button
            onClick={submit}
            aria-label="Send"
            style={{ flex: '0 0 auto', width: 52, height: 52, borderRadius: '50%', border: 'none', background: CANARY, color: '#1a1400', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowUp size={24} strokeWidth={2.6} />
          </button>
        ) : (
          <button
            aria-label="Hold to speak"
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            onPointerCancel={stopListening}
            style={{
              flex: '0 0 auto',
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: listening ? `2px solid ${CANARY}` : '1px solid rgba(255,255,255,0.25)',
              background: listening ? 'rgba(255,218,10,0.18)' : 'rgba(255,255,255,0.08)',
              color: listening ? CANARY : '#F3F4F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transform: listening ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 120ms ease',
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Mic size={24} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  );
}
