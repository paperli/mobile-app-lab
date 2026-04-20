import type { TVScreen } from '@mobile-app-lab/shared';

export interface ExitGameAction {
  id: string;
  label: string;
  kind: 'exit' | 'launch' | 'confirm-yes' | 'confirm-no';
  gameId?: string;
  modeId?: string;
}

interface ExitGameTabProps {
  screen: TVScreen;
  gameId?: string;
  focusedIndex: number;
  contentFocused: boolean;
}

// Returns the list of selectable actions for the current context.
// The same function is called from the App to resolve what the focused index maps to.
export function getExitGameActions(screen: TVScreen, gameId?: string): ExitGameAction[] {
  if (screen === 'hub') {
    return [
      { id: 'yes', label: 'Yes', kind: 'confirm-yes' },
      { id: 'no', label: 'No', kind: 'confirm-no' },
    ];
  }
  if (screen === 'in-game' && gameId === 'game-1') {
    // Song Quiz in-game → show other game modes / playlists
    return [
      { id: 'exit', label: 'Exit Game', kind: 'exit' },
      { id: 'mode-pop', label: 'Pop Hits', kind: 'launch', gameId: 'game-1', modeId: 'pop' },
      { id: 'mode-80s', label: '80s Classics', kind: 'launch', gameId: 'game-1', modeId: '80s' },
      { id: 'mode-rnb', label: 'R&B Anthems', kind: 'launch', gameId: 'game-1', modeId: 'rnb' },
    ];
  }
  // game-menu and in-game (non Song Quiz) → switch game strip
  return [
    { id: 'exit', label: 'Exit Game', kind: 'exit' },
    { id: 'jeopardy', label: "Launch Jeopardy!", kind: 'launch', gameId: 'jeopardy' },
    { id: 'wits-end', label: "Launch Wit's End", kind: 'launch', gameId: 'game-5' },
    { id: 'cocomelon', label: 'Launch CoComelon', kind: 'launch', gameId: 'cocomelon' },
  ];
}

export function ExitGameTab({ screen, gameId, focusedIndex, contentFocused }: ExitGameTabProps) {
  const actions = getExitGameActions(screen, gameId);

  // Hub shows a confirm dialog layout; other contexts show the exit + launches strip.
  if (screen === 'hub') {
    return (
      <div
        style={{
          padding: '3vh 3vw',
          border: '1px dashed rgba(255,255,255,0.25)',
          borderRadius: '12px',
          textAlign: 'center',
          minHeight: '24vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '3vh',
        }}
      >
        <div style={{ color: 'white', fontSize: '2vw', fontWeight: 600 }}>
          Leave the app?
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.1vw' }}>
          You'll exit the Weekend hub and return to your TV's home screen.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2vw', marginTop: '1vh' }}>
          {actions.map((action, idx) => {
            const focused = contentFocused && idx === focusedIndex;
            const isYes = action.kind === 'confirm-yes';
            return (
              <div
                key={action.id}
                style={{
                  minWidth: '10vw',
                  padding: '1.5vh 3vw',
                  border: '2px solid',
                  borderColor: focused ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                  background: focused
                    ? isYes
                      ? 'rgba(255,80,80,0.2)'
                      : 'rgba(255,255,255,0.08)'
                    : 'transparent',
                  color: isYes ? (focused ? '#FF9090' : 'rgba(255,150,150,0.8)') : 'white',
                  fontSize: '1.4vw',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '8px',
                  fontFamily: 'ui-monospace, monospace',
                  transition: 'all 120ms ease-out',
                }}
              >
                {action.label}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // game-menu / in-game: strip layout with Exit Game on left + launches on right
  return (
    <div
      style={{
        padding: '2vh 3vw',
        border: '1px dashed rgba(255,255,255,0.25)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '2vw',
      }}
    >
      {actions.map((action, idx) => {
        const focused = contentFocused && idx === focusedIndex;
        const isExit = action.kind === 'exit';
        return (
          <div
            key={action.id}
            style={{
              flex: isExit ? 'none' : 1,
              minWidth: isExit ? '10vw' : 0,
              padding: '2vh 1.5vw',
              border: '2px solid',
              borderColor: focused ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              background: focused
                ? isExit
                  ? 'rgba(255,80,80,0.15)'
                  : 'rgba(255,255,255,0.1)'
                : 'transparent',
              color: isExit ? (focused ? '#FF9090' : 'rgba(255,150,150,0.8)') : 'white',
              fontSize: '1.2vw',
              fontWeight: 600,
              textAlign: 'center',
              borderRadius: '8px',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.05em',
              transition: 'all 120ms ease-out',
              marginRight: isExit ? '1vw' : 0,
            }}
          >
            {action.label}
          </div>
        );
      })}
    </div>
  );
}
