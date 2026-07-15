const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
const INK = '#F3F4F1';
const CANARY = 'rgb(var(--palette-canary-500))';

export interface StudioExitConfirmProps {
  /** Focused button: 0 = Keep building, 1 = Leave. Driven by the phone d-pad. */
  focus: number;
}

// Full-screen "leave game creation?" confirmation. Navigated from the phone
// (left/right to choose, OK to confirm); the TV is the source of truth.
export function StudioExitConfirm({ focus }: StudioExitConfirmProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(6,3,20,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5vh',
        fontFamily: FONT,
        color: INK,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '3.6vw', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Leave game creation?
        </h1>
        <p style={{ margin: '1.4vh 0 0', fontSize: '1.5vw', color: 'rgba(243,244,241,0.6)' }}>
          Your game won't be saved.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '2vw' }}>
        <ConfirmButton label="Keep building" active={focus === 0} kind="ghost" />
        <ConfirmButton label="Leave" active={focus === 1} kind="danger" />
      </div>
      <div style={{ fontSize: '1.2vw', fontWeight: 700, color: 'rgba(243,244,241,0.5)' }}>
        Use the d-pad on your phone · OK to confirm
      </div>
    </div>
  );
}

function ConfirmButton({ label, active, kind }: { label: string; active: boolean; kind: 'ghost' | 'danger' }) {
  const base = kind === 'danger' ? '#ff5a6a' : 'rgba(255,255,255,0.1)';
  return (
    <div
      style={{
        padding: '2vh 3.4vw',
        borderRadius: 999,
        fontSize: '1.8vw',
        fontWeight: 800,
        color: active ? (kind === 'danger' ? '#2a0206' : '#1a1400') : INK,
        background: active ? (kind === 'danger' ? '#ff5a6a' : CANARY) : base,
        border: active ? '2.5px solid transparent' : '2.5px solid rgba(255,255,255,0.14)',
        boxShadow: active ? '0 0 0 4px rgba(255,218,10,0.18), 0 10px 30px rgba(0,0,0,0.4)' : 'none',
        transform: active ? 'scale(1.04)' : 'scale(1)',
        transition: 'all 160ms ease',
      }}
    >
      {label}
    </div>
  );
}
