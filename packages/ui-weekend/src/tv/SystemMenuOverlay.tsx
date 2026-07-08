import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { ModalPanel } from '../primitives/ModalPanel';
import { ExitConfirmCard } from './ExitConfirmCard';
import { PairPanel } from './PairPanel';
import { type Slot } from './SlotCard';
import { BOUNCE_DURATION_MS, bounceTransform, bounceTransition, type BounceDirection } from './bounce';
import {
  FOCUS_FRAME_INNER_STYLE_CANARY,
  FOCUS_FRAME_OFFSET_PX,
  FOCUS_FRAME_OUTER_STYLE,
} from './focus';

export interface ExitAction {
  id: string;
  label: string;
  kind: 'exit' | 'launch';
  // When set on a launch action, the tile renders in hub-style (colored
  // 20vw card + emoji + title) instead of the minimalist outline tile.
  backgroundColor?: string;
  title?: string;
}

export type ExitTabContent =
  | {
      variant: 'confirm';
      title?: string;
      description?: string;
      confirmAction?: ExitAction;
    }
  | {
      variant: 'tiles';
      /** Header shown above the tile row inside the modal. */
      title?: string;
      description?: string;
      /** Copy shown inside the Exit tile itself. */
      prompt?: string;
      actions: ExitAction[];
    };

export type SystemMenuTab = 'resume' | 'controllers' | 'exit';
export type SystemMenuAction = 'ok' | 'back';
export type SystemMenuDirection = 'left' | 'right' | 'up' | 'down';

export interface SystemMenuOverlayHandle {
  navigate: (direction: SystemMenuDirection) => void;
  action: (action: SystemMenuAction) => void;
}

export interface SystemMenuOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileUrl: string;
  roomCode: string;
  slots: Slot[];
  exitTab?: ExitTabContent;
  initialTab?: SystemMenuTab;
  onResume: () => void;
  onExitAction: (action: ExitAction) => void;
  /** Fires when focus moves to a new tab / layer / content item. */
  onNavigate?: () => void;
  /** Fires when the user presses a direction that can't be followed (edge). */
  onBounce?: () => void;
  /** Fires when the user activates (OK) a focused item. */
  onSelect?: () => void;
}

type Layer = 'tabs' | 'content';

interface TabDef {
  id: SystemMenuTab;
  label: string;
  icon: (focused: boolean) => ReactNode;
}

const ICON_COLOR_FOCUSED = 'currentColor';

const TABS: TabDef[] = [
  {
    id: 'resume',
    label: 'Resume',
    icon: () => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18l-6-6 6-6"
          stroke={ICON_COLOR_FOCUSED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'controllers',
    label: 'Controllers',
    icon: () => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect
          x="2"
          y="7"
          width="20"
          height="10"
          rx="4"
          stroke={ICON_COLOR_FOCUSED}
          strokeWidth="2"
        />
        <path
          d="M7 12h2M8 11v2"
          stroke={ICON_COLOR_FOCUSED}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="15" cy="11" r="1" fill={ICON_COLOR_FOCUSED} />
        <circle cx="17" cy="13" r="1" fill={ICON_COLOR_FOCUSED} />
      </svg>
    ),
  },
  {
    id: 'exit',
    label: 'Exit Game',
    icon: () => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 6l12 12M18 6l-12 12"
          stroke={ICON_COLOR_FOCUSED}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const TAB_ORDER: SystemMenuTab[] = ['resume', 'controllers', 'exit'];

const DEFAULT_CONFIRM_ACTION: ExitAction = { id: 'exit', label: 'Exit', kind: 'exit' };
const DEFAULT_CONFIRM: ExitTabContent = { variant: 'confirm' };

export const SystemMenuOverlay = forwardRef<SystemMenuOverlayHandle, SystemMenuOverlayProps>(
  function SystemMenuOverlay(
    {
      open,
      onOpenChange,
      mobileUrl,
      roomCode,
      slots,
      exitTab = DEFAULT_CONFIRM,
      initialTab = 'resume',
      onResume,
      onExitAction,
      onNavigate,
      onBounce,
      onSelect,
    },
    ref,
  ) {
    const [tab, setTab] = useState<SystemMenuTab>(initialTab);
    const [layer, setLayer] = useState<Layer>('tabs');
    const [contentIndex, setContentIndex] = useState(0);
    const [bounce, setBounce] = useState<{ layer: Layer; direction: BounceDirection } | null>(null);

    const exitItemCount = useMemo(() => {
      if (exitTab.variant === 'confirm') return 2;
      return exitTab.actions.length;
    }, [exitTab]);

    const wasOpen = useRef(open);
    useEffect(() => {
      if (open && !wasOpen.current) {
        setTab(initialTab);
        setLayer('tabs');
        setContentIndex(0);
        setBounce(null);
      } else if (!open && wasOpen.current) {
        const t = window.setTimeout(() => {
          setTab('resume');
          setLayer('tabs');
          setContentIndex(0);
          setBounce(null);
        }, 250);
        wasOpen.current = false;
        return () => window.clearTimeout(t);
      }
      wasOpen.current = open;
    }, [open, initialTab]);

    useEffect(() => {
      if (!bounce) return;
      const t = window.setTimeout(() => setBounce(null), BOUNCE_DURATION_MS);
      return () => window.clearTimeout(t);
    }, [bounce]);

    const defaultContentIndexForExit = useCallback(() => {
      if (exitTab.variant === 'confirm') return 1; // No (safer default)
      return 0; // Exit tile first
    }, [exitTab]);

    const navigate = useCallback(
      (direction: SystemMenuDirection) => {
        if (layer === 'tabs') {
          const idx = TAB_ORDER.indexOf(tab);
          if (direction === 'left' && idx > 0) {
            setTab(TAB_ORDER[idx - 1]);
            onNavigate?.();
            return;
          }
          if (direction === 'right' && idx < TAB_ORDER.length - 1) {
            setTab(TAB_ORDER[idx + 1]);
            onNavigate?.();
            return;
          }
          if (direction === 'up' && tab === 'exit') {
            setLayer('content');
            setContentIndex(defaultContentIndexForExit());
            onNavigate?.();
            return;
          }
          setBounce({ layer: 'tabs', direction });
          onBounce?.();
          return;
        }

        if (tab === 'exit') {
          if (direction === 'left' && contentIndex > 0) {
            setContentIndex(contentIndex - 1);
            onNavigate?.();
            return;
          }
          if (direction === 'right' && contentIndex < exitItemCount - 1) {
            setContentIndex(contentIndex + 1);
            onNavigate?.();
            return;
          }
          if (direction === 'down') {
            setLayer('tabs');
            onNavigate?.();
            return;
          }
          setBounce({ layer: 'content', direction });
          onBounce?.();
        }
      },
      [layer, tab, contentIndex, exitItemCount, defaultContentIndexForExit, onNavigate, onBounce],
    );

    const action = useCallback(
      (act: SystemMenuAction) => {
        if (act === 'back') {
          if (layer === 'content') {
            setLayer('tabs');
            onNavigate?.();
            return;
          }
          onOpenChange(false);
          return;
        }

        if (layer === 'tabs') {
          if (tab === 'resume') {
            onSelect?.();
            onOpenChange(false);
            onResume();
            return;
          }
          if (tab === 'exit') {
            setLayer('content');
            setContentIndex(defaultContentIndexForExit());
            onSelect?.();
            return;
          }
          // controllers — no-op, but the tab itself can't be "activated"
          onBounce?.();
          return;
        }

        if (exitTab.variant === 'confirm') {
          if (contentIndex === 0) {
            const chosen = exitTab.confirmAction ?? DEFAULT_CONFIRM_ACTION;
            onSelect?.();
            onOpenChange(false);
            onExitAction(chosen);
          } else {
            setLayer('tabs');
            onNavigate?.();
          }
          return;
        }
        const chosen = exitTab.actions[contentIndex];
        if (!chosen) return;
        onSelect?.();
        onOpenChange(false);
        onExitAction(chosen);
      },
      [
        layer,
        tab,
        contentIndex,
        exitTab,
        onOpenChange,
        onResume,
        onExitAction,
        defaultContentIndexForExit,
        onNavigate,
        onBounce,
        onSelect,
      ],
    );

    useImperativeHandle(ref, () => ({ navigate, action }), [navigate, action]);

    useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        const dir: SystemMenuDirection | null =
          e.key === 'ArrowLeft' ? 'left' :
          e.key === 'ArrowRight' ? 'right' :
          e.key === 'ArrowUp' ? 'up' :
          e.key === 'ArrowDown' ? 'down' :
          null;
        if (dir) {
          e.preventDefault();
          navigate(dir);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action('ok');
        }
        // Escape is handled by Dialog.Content's onEscapeKeyDown so Radix's
        // built-in "Escape closes dialog" doesn't double-fire with ours.
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [open, navigate, action]);

    const tabsBounce = bounce?.layer === 'tabs' ? bounce.direction : null;
    const contentBounce = bounce?.layer === 'content' ? bounce.direction : null;

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            // The `background` shorthand (gradient) resets background-color to
            // transparent, which overrides Dialog.Overlay's default `bg-black/60`.
            style={{
              background:
                'linear-gradient(0deg, #000 0%, rgba(0, 0, 0, 0.89) 20.55%, rgba(0, 0, 0, 0.64) 39.56%, rgba(0, 0, 0, 0.64) 100%)',
            }}
          />
          <Dialog.Content
            variant="fullscreen"
            // Intercept Escape so Radix's default close doesn't stack with our
            // layered `back` action. Also stop the native event from
            // propagating so window-level listeners (useKeyboardNav) don't
            // fire a second `back` — otherwise the double dispatch can race
            // with systemMenuOpenRef and re-open the menu via boundary-back.
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              e.stopImmediatePropagation();
              action('back');
            }}
          >
            <Dialog.Title className="sr-only">System menu</Dialog.Title>

            {/* Layer 2 — contextual content.
                Pair modal + exit confirm (Yes/No): vertically centered.
                Exit tiles (game option row): bottom edge 172px above screen bottom. */}
            {tab === 'controllers' && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                <div style={{ width: '90vw', maxWidth: '1072px', pointerEvents: 'auto' }}>
                  <PairPanel mobileUrl={mobileUrl} roomCode={roomCode} slots={slots} />
                </div>
              </div>
            )}
            {tab === 'exit' && exitTab.variant === 'confirm' && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                <div style={{ width: '90vw', maxWidth: '1072px', pointerEvents: 'auto' }}>
                  <ExitContent
                    exitTab={exitTab}
                    focusedIndex={contentIndex}
                    contentFocused={layer === 'content'}
                    bounceDirection={contentBounce}
                  />
                </div>
              </div>
            )}
            {tab === 'exit' && exitTab.variant === 'tiles' && (
              <div
                className="absolute inset-x-0 flex justify-center"
                style={{ bottom: '172px', pointerEvents: 'none' }}
              >
                <div style={{ width: '90vw', pointerEvents: 'auto' }}>
                  <ExitContent
                    exitTab={exitTab}
                    focusedIndex={contentIndex}
                    contentFocused={layer === 'content'}
                    bounceDirection={contentBounce}
                  />
                </div>
              </div>
            )}
            {/* Resume: intentionally empty */}

            {/* Layer 1 — bottom tab row */}
            <div
              className="absolute inset-x-0 flex flex-col items-center"
              style={{ bottom: '4vh' }}
            >
              <TabRow
                activeTab={tab}
                layerFocused={layer === 'tabs'}
                bounceDirection={tabsBounce}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);

// --- Sub-components -----------------------------------------------------

interface TabRowProps {
  activeTab: SystemMenuTab;
  layerFocused: boolean;
  bounceDirection: BounceDirection | null;
}

function TabRow({ activeTab, layerFocused, bounceDirection }: TabRowProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (!bounceDirection) return;
    setIsAnimating(true);
    const t = window.setTimeout(() => setIsAnimating(false), BOUNCE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [bounceDirection]);

  return (
    <div className="flex items-center justify-center" style={{ gap: '1.2vw' }}>
      {TABS.map((t) => {
        const isActive = t.id === activeTab;
        const isFocused = isActive && layerFocused;
        const applyBounce = isAnimating && isFocused && bounceDirection !== null;
        const bounceTransformStyle = applyBounce ? bounceTransform(bounceDirection) : 'none';

        // Three tab states:
        //   • isFocused (active + tabs layer focused) → primary Canary pill
        //   • isActive && !layerFocused (current tab, but Layer 2 has focus) → soft 10% white
        //   • !isActive → ghost, muted text
        const variant = isFocused ? 'primary' : isActive ? 'soft' : 'ghost';

        return (
          <Button
            key={t.id}
            variant={variant}
            size="xl"
            // Dim the label only for tabs that aren't the current one. The
            // active-but-off-focus tab keeps full-contrast fg so its position
            // reads clearly alongside the focused content below.
            className={!isActive ? 'hover:bg-transparent text-fg-60' : ''}
            style={{
              transform: bounceTransformStyle,
              transition: `${bounceTransition}, background 120ms ease-out, color 120ms ease-out`,
            }}
            tabIndex={-1}
          >
            <span className="inline-flex items-center" style={{ gap: '0.4vw' }}>
              {t.icon(isFocused)}
              <span>{t.label}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}

interface ExitContentProps {
  exitTab: ExitTabContent;
  focusedIndex: number;
  contentFocused: boolean;
  bounceDirection: BounceDirection | null;
}

function ExitContent({ exitTab, focusedIndex, contentFocused, bounceDirection }: ExitContentProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (!bounceDirection) return;
    setIsAnimating(true);
    const t = window.setTimeout(() => setIsAnimating(false), BOUNCE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [bounceDirection]);

  const bounceStyle: CSSProperties | undefined = isAnimating && bounceDirection
    ? { transform: bounceTransform(bounceDirection), transition: bounceTransition }
    : undefined;

  if (exitTab.variant === 'confirm') {
    return (
      <ExitConfirmCard
        title={exitTab.title}
        description={exitTab.description}
        focusedIndex={focusedIndex}
        focused={contentFocused}
        bounceStyle={bounceStyle}
      />
    );
  }

  // Tiles variant — Exit tile (kind === 'exit', first) + N launch tiles.
  // Exit tile now matches launch tile dimensions so every option reads as a
  // peer in the choice set. 4-tile row: 16 × 4 + 2 × 3 = 70vw, fits the 86vw
  // panel content box comfortably.
  const TILE_WIDTH_VW = 16;
  const TILE_HEIGHT_VW = (TILE_WIDTH_VW * 9) / 16;
  const TILE_RADIUS_PX = 6;
  const TILE_GAP_VW = 2;
  const TILE_BORDER_IDLE_PX = 2;
  const TILE_BORDER_FOCUS_PX = 4;
  const prompt = exitTab.prompt ?? 'Are you sure you want to exit?';
  const headerTitle = exitTab.title ?? "There's more to play!";
  const headerDescription =
    exitTab.description ?? 'Exit the game and go back to Weekend home, or launch a game';

  return (
    <ModalPanel
      tone="midnight"
      className="flex flex-col items-center"
      style={{ padding: '64px' }}
    >
      <div
        className="flex flex-col items-center text-center"
        style={{ maxWidth: '60vw', gap: '32px' }}
      >
        <h3 className="text-display-3 font-semibold text-fg">{headerTitle}</h3>
        <p className="text-body text-fg-muted">{headerDescription}</p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${TILE_GAP_VW}vw`,
          marginTop: '48px',
        }}
      >
        {exitTab.actions.map((action, idx) => {
          const focused = contentFocused && idx === focusedIndex;
          const applyBounce = isAnimating && focused && bounceDirection !== null;
          const tileBounceStyle: CSSProperties = {
            transform: applyBounce ? bounceTransform(bounceDirection) : 'none',
            transition: bounceTransition,
          };

          if (action.kind === 'exit') {
            return (
              <div
                key={action.id}
                style={{
                  width: `${TILE_WIDTH_VW}vw`,
                  height: `${TILE_HEIGHT_VW}vw`,
                  border: `${TILE_BORDER_IDLE_PX}px solid rgba(255,255,255,0.25)`,
                  boxSizing: 'border-box',
                  borderRadius: `${TILE_RADIUS_PX}px`,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '1.4vh 1vw',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-sans)',
                  textAlign: 'center',
                  ...tileBounceStyle,
                }}
              >
                <div
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '1vw',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    lineHeight: 1.3,
                    marginTop: '0.5vh',
                  }}
                >
                  {prompt}
                </div>
                <Button
                  variant={focused ? 'primary' : 'soft'}
                  size="compact"
                  style={{ marginBottom: '0.2vh' }}
                  tabIndex={-1}
                >
                  {action.label}
                </Button>
              </div>
            );
          }

          if (action.backgroundColor) {
            return (
              <div
                key={action.id}
                style={{
                  position: 'relative',
                  width: `${TILE_WIDTH_VW}vw`,
                  height: `${TILE_HEIGHT_VW}vw`,
                  ...tileBounceStyle,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: `${TILE_RADIUS_PX}px`,
                    overflow: 'hidden',
                    backgroundColor: action.backgroundColor,
                    opacity: focused ? 1 : 0.8,
                    transition: 'opacity 200ms ease-out, transform 150ms ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5vw',
                    color: 'white',
                    transform: focused ? 'scale(1)' : 'scale(0.98)',
                  }}
                >
                  <div style={{ fontSize: '4vw', marginBottom: '1vw' }}>🎮</div>
                  <h3
                    style={{
                      fontSize: '1.5vw',
                      fontWeight: 700,
                      textAlign: 'center',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    {action.title ?? action.label}
                  </h3>
                </div>
                {focused && (
                  <div
                    aria-hidden
                    style={{
                      ...FOCUS_FRAME_OUTER_STYLE,
                      position: 'absolute',
                      inset: `-${FOCUS_FRAME_OFFSET_PX}px`,
                    }}
                  >
                    <div style={FOCUS_FRAME_INNER_STYLE_CANARY} />
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={action.id}
              style={{
                width: `${TILE_WIDTH_VW}vw`,
                height: `${TILE_HEIGHT_VW}vw`,
                border: `${focused ? TILE_BORDER_FOCUS_PX : TILE_BORDER_IDLE_PX}px solid`,
                borderColor: focused ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                boxSizing: 'border-box',
                borderRadius: `${TILE_RADIUS_PX}px`,
                background: 'rgba(255,255,255,0.04)',
                padding: '1.5vh 1vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                textAlign: 'center',
                color: 'white',
                fontSize: '1.3vw',
                fontWeight: 600,
                transition: `border-color 120ms ease-out, border-width 120ms ease-out, ${bounceTransition}`,
                ...tileBounceStyle,
              }}
            >
              {action.label}
            </div>
          );
        })}
      </div>
    </ModalPanel>
  );
}
