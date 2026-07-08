import type { VoiceIntent } from '../utils/voiceMatcher';

// Temporary debug surface for the voice pipeline. Shows recent transcripts
// reaching the TV plus what the matcher made of each one. Remove once voice
// is stable.

export interface TVVoiceDebugEvent {
  id: number;
  ts: number;
  transcript: string;
  recognizerConfidence: number;
  intent: VoiceIntent | null;
  decision: 'execute' | 'confirm' | 'ignore';
}

interface Props {
  events: TVVoiceDebugEvent[];
  pendingPromptText: string | null;
  pendingPromptConfirmed: 'pending' | 'yes' | 'no' | 'timeout' | null;
}

const COLOR_BY_DECISION: Record<TVVoiceDebugEvent['decision'], string> = {
  execute: '#7fff7f',
  confirm: '#ffd866',
  ignore: '#888',
};

function describeIntent(intent: VoiceIntent | null): string {
  if (!intent) return '∅ no match';
  if (intent.kind === 'navigate') return `nav ${intent.direction}`;
  if (intent.kind === 'action') return `act ${intent.action}`;
  return `goto ${intent.targetLabel}${intent.autoLaunch ? ' + launch' : ''}`;
}

export function VoiceDebugOverlay({ events, pendingPromptText, pendingPromptConfirmed }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.78)',
        color: '#fff',
        font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '8px 10px',
        borderRadius: 8,
        maxWidth: 520,
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#9cf', marginBottom: 4 }}>TV voice</div>
      {pendingPromptText && (
        <div style={{ color: '#ffd866', marginBottom: 6 }}>
          ❓ {pendingPromptText}
          {pendingPromptConfirmed && pendingPromptConfirmed !== 'pending' && (
            <span style={{ marginLeft: 6, color: pendingPromptConfirmed === 'yes' ? '#7fff7f' : '#f77' }}>
              → {pendingPromptConfirmed}
            </span>
          )}
        </div>
      )}
      {events.length === 0 ? (
        <div style={{ color: '#888' }}>(waiting for transcripts from mobile…)</div>
      ) : (
        events.map((e) => (
          <div key={e.id} style={{ display: 'flex', gap: 8, color: COLOR_BY_DECISION[e.decision] }}>
            <span style={{ width: 60, color: '#888' }}>[{e.decision}]</span>
            <span style={{ flex: 1 }}>"{e.transcript}"</span>
            <span style={{ color: '#aaa' }}>
              {describeIntent(e.intent)}
              {e.intent && ` · ${(e.intent.confidence * 100).toFixed(0)}%`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
