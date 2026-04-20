import type { TVScreen } from '@mobile-app-lab/shared';
import { TabRow } from './TabRow';
import { ControllersTab } from './ControllersTab';
import { ExitGameTab } from './ExitGameTab';
import type { SystemMenuState } from './types';

interface SystemMenuProps {
  state: SystemMenuState;
  roomCode: string;
  screen: TVScreen;
  gameId?: string;
  connectedMobileIds: string[];
}

export function SystemMenu({ state, roomCode, screen, gameId, connectedMobileIds }: SystemMenuProps) {
  if (!state.open) return null;

  const contentFocused = state.layer === 'content';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '70vw',
          maxWidth: '1200px',
          padding: '4vh 3vw',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(10,10,20,0.9)',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            fontSize: '0.9vw',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            fontFamily: 'ui-monospace, monospace',
            marginBottom: '2vh',
          }}
        >
          System Menu
        </div>

        <TabRow activeTab={state.tab} layerFocused={state.layer === 'tabs'} />

        <div style={{ minHeight: '30vh' }}>
          {state.tab === 'resume' && (
            <div
              style={{
                padding: '4vh 3vw',
                border: '1px dashed rgba(255,255,255,0.25)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1.2vw',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              Press OK to resume.
            </div>
          )}
          {state.tab === 'controllers' && (
            <ControllersTab
              roomCode={roomCode}
              screen={screen}
              gameId={gameId}
              connectedMobileIds={connectedMobileIds}
            />
          )}
          {state.tab === 'exit' && (
            <ExitGameTab
              screen={screen}
              gameId={gameId}
              focusedIndex={state.contentIndex}
              contentFocused={contentFocused}
            />
          )}
        </div>

        <div
          style={{
            marginTop: '3vh',
            paddingTop: '2vh',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'center',
            gap: '3vw',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.85vw',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span>◀ ▶ Tabs</span>
          <span>▼ Enter</span>
          <span>▲ Back</span>
          <span>OK Select</span>
        </div>
      </div>
    </div>
  );
}
