import { useEffect, useState } from 'react';
import type { NavigationDirection, TVScreen } from '@mobile-app-lab/shared';
import { bounceTransform, bounceTransition } from './bounce';

const BOUNCE_ANIMATION_MS = 150;

// Strip tile sizing — 4 tiles across the 70vw content region.
const TILE_WIDTH_VW = 16;
const TILE_HEIGHT_VW = (TILE_WIDTH_VW * 9) / 16;
const TILE_GAP_VW = 2;

// Border thickness used for the Launch-tile focus ring. Kept via box-sizing
// so the outer tile size stays constant.
const TILE_BORDER_IDLE_PX = 2;
const TILE_BORDER_FOCUS_PX = 4;

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
  bounceDirection: NavigationDirection | null;
}

export function getExitGameActions(screen: TVScreen, gameId?: string): ExitGameAction[] {
  if (screen === 'hub') {
    return [
      { id: 'yes', label: 'Yes', kind: 'confirm-yes' },
      { id: 'no', label: 'No', kind: 'confirm-no' },
    ];
  }
  if (screen === 'in-game' && gameId === 'game-1') {
    return [
      { id: 'exit', label: 'Exit Game', kind: 'exit' },
      { id: 'mode-pop', label: 'Pop Hits', kind: 'launch', gameId: 'game-1', modeId: 'pop' },
      { id: 'mode-80s', label: '80s Classics', kind: 'launch', gameId: 'game-1', modeId: '80s' },
      { id: 'mode-rnb', label: 'R&B Anthems', kind: 'launch', gameId: 'game-1', modeId: 'rnb' },
    ];
  }
  return [
    { id: 'exit', label: 'Exit Game', kind: 'exit' },
    { id: 'jeopardy', label: 'Launch Jeopardy!', kind: 'launch', gameId: 'jeopardy' },
    { id: 'wits-end', label: "Launch Wit's End", kind: 'launch', gameId: 'game-5' },
    { id: 'cocomelon', label: 'Launch CoComelon', kind: 'launch', gameId: 'cocomelon' },
  ];
}

export function ExitGameTab({ screen, gameId, focusedIndex, contentFocused, bounceDirection }: ExitGameTabProps) {
  const actions = getExitGameActions(screen, gameId);

  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (bounceDirection) {
      setIsAnimating(true);
      const t = window.setTimeout(() => setIsAnimating(false), BOUNCE_ANIMATION_MS);
      return () => window.clearTimeout(t);
    }
  }, [bounceDirection]);

  // Hub: keep the confirm dialog layout (title + Yes/No pill buttons).
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
        <div style={{ color: 'white', fontSize: '2vw', fontWeight: 600 }}>Leave the app?</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.1vw' }}>
          You'll exit the Weekend hub and return to your TV's home screen.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2vw', marginTop: '1vh' }}>
          {actions.map((action, idx) => {
            const focused = contentFocused && idx === focusedIndex;
            const applyBounce = isAnimating && focused && bounceDirection !== null;
            const isYes = action.kind === 'confirm-yes';
            return (
              <div
                key={action.id}
                style={{
                  minWidth: '10vw',
                  padding: '1.5vh 3vw',
                  border: '2px solid',
                  borderColor: focused
                    ? '#FFFFFF'
                    : isYes
                      ? 'rgba(255,120,120,0.4)'
                      : 'rgba(255,255,255,0.25)',
                  background: focused ? '#FFFFFF' : 'transparent',
                  color: focused ? '#0B0B12' : isYes ? 'rgba(255,150,150,0.9)' : 'white',
                  fontSize: '1.4vw',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '8px',
                  fontFamily: 'ui-monospace, monospace',
                  transform: applyBounce ? bounceTransform(bounceDirection) : 'none',
                  transition: `border-color 120ms ease-out, background 120ms ease-out, color 120ms ease-out, ${bounceTransition}`,
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

  // game-menu / in-game: 4 equal 16:9 tiles. Exit tile has a static outer
  // border with an inner Exit Game button that picks up the focus style;
  // Launch tiles grow a thicker border (same white tint) on focus.
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: `${TILE_GAP_VW}vw` }}>
      {actions.map((action, idx) => {
        const focused = contentFocused && idx === focusedIndex;
        const applyBounce = isAnimating && focused && bounceDirection !== null;
        const isExit = action.kind === 'exit';

        const bounceStyle: React.CSSProperties = {
          transform: applyBounce ? bounceTransform(bounceDirection) : 'none',
          transition: bounceTransition,
        };

        if (isExit) {
          return (
            <div
              key={action.id}
              style={{
                width: `${TILE_WIDTH_VW}vw`,
                height: `${TILE_HEIGHT_VW}vw`,
                border: `${TILE_BORDER_IDLE_PX}px solid rgba(255,255,255,0.25)`,
                boxSizing: 'border-box',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                padding: '1.4vh 1vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'ui-monospace, monospace',
                textAlign: 'center',
                ...bounceStyle,
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '1vw',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  lineHeight: 1.3,
                  marginTop: '0.5vh',
                }}
              >
                Are you sure you want to exit?
              </div>
              <div
                style={{
                  padding: '1vh 1.2vw',
                  border: '2px solid',
                  borderColor: focused ? '#FFFFFF' : 'rgba(255,120,120,0.5)',
                  borderRadius: '8px',
                  background: focused ? '#FFFFFF' : 'transparent',
                  color: focused ? '#0B0B12' : 'rgba(255,150,150,0.9)',
                  fontSize: '1.15vw',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  transition: 'border-color 120ms ease-out, background 120ms ease-out, color 120ms ease-out',
                  marginBottom: '0.2vh',
                }}
              >
                Exit Game
              </div>
            </div>
          );
        }

        // Launch tile — borderless at rest, thicker white border on focus.
        return (
          <div
            key={action.id}
            style={{
              width: `${TILE_WIDTH_VW}vw`,
              height: `${TILE_HEIGHT_VW}vw`,
              border: `${focused ? TILE_BORDER_FOCUS_PX : TILE_BORDER_IDLE_PX}px solid`,
              borderColor: focused ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
              boxSizing: 'border-box',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              padding: '1.5vh 1vw',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'ui-monospace, monospace',
              textAlign: 'center',
              color: 'white',
              fontSize: '1.3vw',
              fontWeight: 600,
              letterSpacing: '0.04em',
              transition: `border-color 120ms ease-out, border-width 120ms ease-out, ${bounceTransition}`,
              ...bounceStyle,
            }}
          >
            {action.label}
          </div>
        );
      })}
    </div>
  );
}
