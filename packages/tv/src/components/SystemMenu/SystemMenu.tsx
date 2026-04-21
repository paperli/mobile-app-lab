import type { NavigationDirection, TVScreen } from '@mobile-app-lab/shared';
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
  const tabsBounce: NavigationDirection | null =
    state.bounce && state.bounce.layer === 'tabs' ? state.bounce.direction : null;
  const contentBounce: NavigationDirection | null =
    state.bounce && state.bounce.layer === 'content' ? state.bounce.direction : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Center: Layer 2 contextual content (empty on Resume) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '18vh',
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: '70vw', maxWidth: '1200px' }}>
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
              bounceDirection={contentBounce}
            />
          )}
          {/* Resume: intentionally empty */}
        </div>
      </div>

      {/* Bottom: Layer 1 tab row + nav hints */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '4vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <TabRow
          activeTab={state.tab}
          layerFocused={state.layer === 'tabs'}
          bounceDirection={tabsBounce}
        />
      </div>
    </div>
  );
}
