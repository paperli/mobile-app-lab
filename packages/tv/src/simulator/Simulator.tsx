// ─────────────────────────────────────────────────────────────────────────
//  Personalization Simulator
//
//  A playground for the rule-based recommendation engine. Generate a random
//  player profile (or clean it), dial the catalog size, flip between Cold and
//  Warm hub, and watch the categorized rows + profile infographics update live.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  buildColdHub,
  buildLibrary,
  buildWarmHub,
  emptyHousehold,
  emptyProfile,
  MAX_LIBRARY,
  profileStats,
  randomProfile,
  recordPlay,
  type Game,
  type HouseholdProfile,
  type PlayerProfile,
  type SessionContext,
} from '../personalization';
import { Card, GenreLegend, GenreRadar, InteractionBars, MotivationBars, PartyDonut, StatTile, TopGamesBars } from './Charts';
import { HubRows, loadRowOrder, DEFAULT_ORDER, ROW_ORDER_KEY } from './GameRows';
import { FONT, GENRE_COLOR, UI } from './theme';

type Mode = 'cold' | 'warm';

const PANEL_MIN = 300;
const PANEL_MAX = 640;
const NARROW_BP = 900;

export default function Simulator() {
  const [size, setSize] = useState(20);
  const library = useMemo(() => buildLibrary(size), [size]);

  const [state, setState] = useState<{ profile: PlayerProfile; household: HouseholdProfile }>(() =>
    randomProfile(buildLibrary(20)),
  );
  const { profile, household } = state;

  // Single "Players" control: 0 = Cold hub (party unknown), 1–8 = Warm hub.
  const [players, setPlayers] = useState(0);
  const mode: Mode = players === 0 ? 'cold' : 'warm';
  const partySize = Math.max(1, players);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(true);
  const [rowOrder, setRowOrder] = useState<string[]>(loadRowOrder);
  const [panelWidth, setPanelWidth] = useState(380);
  const [dragging, setDragging] = useState(false);
  const [winW, setWinW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const stats = useMemo(() => profileStats(profile, library), [profile, library]);

  // Default previous game = most engaged played title in the current library.
  const previousGameId = prevId ?? stats.topGames[0]?.game.id ?? library[0]?.id ?? '';

  const ctx: SessionContext = useMemo(
    () => ({
      previousGameId,
      activePlayerCount: partySize,
      connectedPhones: Math.max(1, partySize - 1),
      gameMode: null,
      sessionLengthMin: profile.avgSessionMin,
      dayOfWeek: 6,
      localHour: 20,
    }),
    [previousGameId, partySize, profile.avgSessionMin],
  );

  const hub = useMemo(
    () => (mode === 'cold' ? buildColdHub(profile, household, library) : buildWarmHub(profile, household, library, ctx)),
    [mode, profile, household, library, ctx],
  );

  const generate = () => {
    setState(randomProfile(library));
    setPrevId(null);
  };
  const reset = () => {
    setState({ profile: emptyProfile(), household: emptyHousehold() });
    setPrevId(null);
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // Track viewport width to switch between docked split and overlay drawer.
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Divider drag → resize the side panel.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, w)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging]);

  const narrow = winW < NARROW_BP;

  const play = (game: Game, count: number) => {
    setState((s) => recordPlay(s.profile, s.household, game, count));
    flash(`▶ Played ${game.title} with ${count} player${count > 1 ? 's' : ''} — profile updated`);
  };

  const changeRowOrder = (next: string[]) => {
    setRowOrder(next);
    try {
      localStorage.setItem(ROW_ORDER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const resetRowOrder = () => {
    setRowOrder([...DEFAULT_ORDER]);
    try {
      localStorage.removeItem(ROW_ORDER_KEY);
    } catch {
      /* ignore */
    }
  };
  const orderCustomized = rowOrder.join('|') !== DEFAULT_ORDER.join('|');

  const prevGame = library.find((g) => g.id === previousGameId);

  // The player-profile panel body — reused by the docked panel and the drawer.
  const profileContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 22px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: UI.muted }}>
          Player profile
        </span>
        <button
          onClick={() => setProfileOpen(false)}
          title="Close panel"
          style={{
            marginLeft: 'auto',
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 700,
            color: UI.ink70,
            background: 'transparent',
            border: `1px solid ${UI.border}`,
            borderRadius: 999,
            padding: '4px 12px',
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatTile label="Persona" value={profile.label.split(' ')[0]} sub={profile.label} accent={UI.accent} />
        <StatTile label="Confidence" value={stats.confidence.toFixed(2)} sub="evidence volume" accent={confColor(stats.confidence)} />
        <StatTile label="Games played" value={String(stats.gamesPlayed)} sub={`${stats.totalPlays} total plays`} />
        <StatTile label="Favorites" value={String(stats.favorites)} sub="explicit ❤" />
        <StatTile label="Avg session" value={`${profile.avgSessionMin}m`} sub="preferred length" />
        <StatTile label="Novelty" value={`${Math.round(profile.noveltyReceptivity * 100)}%`} sub="tries new games" />
      </div>

      <Card title="Favorites">
        {profile.favoriteGameIds.length === 0 ? (
          <div style={{ color: UI.muted, fontSize: 13.5 }}>No favorites yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.favoriteGameIds.map((id) => {
              const g = library.find((x) => x.id === id);
              if (!g) return null;
              return (
                <span
                  key={id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    color: UI.ink,
                    background: `${g.accent}1f`,
                    border: `1px solid ${g.accent}55`,
                    borderRadius: 999,
                    padding: '5px 12px',
                  }}
                >
                  <span>{g.emoji}</span>
                  {g.title}
                </span>
              );
            })}
          </div>
        )}
      </Card>
      <Card title="Genre legend" hint="shared across charts & tiles">
        <GenreLegend library={library} />
      </Card>

      <Card title="Genre affinity" hint="0–1 taste">
        <GenreRadar profile={profile} />
      </Card>
      <Card title="Motivation affinity" hint="why they play">
        <MotivationBars profile={profile} />
      </Card>
      <Card title="Party size habits" hint="how many play">
        <PartyDonut profile={profile} />
        <div style={{ marginTop: 8, fontSize: 12.5, color: UI.muted }}>
          Household avg party ≈ <b style={{ color: UI.ink }}>{household.avgPartySize}</b> · family-friendly{' '}
          <b style={{ color: UI.ink }}>{Math.round(household.familyFriendly * 100)}%</b>
        </div>
      </Card>
      <Card title="Interaction preference" hint="−1 avoid · +1 love">
        <InteractionBars profile={profile} />
      </Card>
      <Card title="Most engaged games" hint="recency-weighted">
        <TopGamesBars stats={stats} />
      </Card>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 50% -10%, #101114 0%, #08090a 60%)',
        color: UI.ink,
        fontFamily: FONT,
      }}
    >
      {/* Main scroll pane */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(24px, 4vw, 56px) 96px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <a href="?" style={{ fontSize: 15, fontWeight: 700, color: UI.muted, textDecoration: 'none' }}>
            ← Back to layouts
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="?view=how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                fontWeight: 700,
                color: '#04241a',
                background: 'linear-gradient(90deg, #34d399, #22d3ee)',
                borderRadius: 999,
                padding: '9px 16px',
                textDecoration: 'none',
              }}
            >
              📊 How it works — events &amp; profile model ↗
            </a>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              title={profileOpen ? 'Hide player profile panel' : 'Show player profile panel'}
              aria-pressed={profileOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: 700,
                color: profileOpen ? '#04241a' : UI.ink,
                background: profileOpen ? '#34d399' : 'transparent',
                border: `1px solid ${profileOpen ? '#34d399' : UI.borderStrong}`,
                borderRadius: 999,
                padding: '8px 15px',
                cursor: 'pointer',
              }}
            >
              <PanelIcon open={profileOpen} />
              Profile
            </button>
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>Personalization Simulator</h1>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.55, color: UI.ink70, maxWidth: 820 }}>
          Generate a player profile and watch the hub reorganize. <b style={{ color: UI.ink }}>Click a game tile</b> (or a
          player-count button on hover) to simulate playing it — that adds to history and re-learns the profile live. Hover
          a tile to see the score breakdown and the recommendation reason that placed it.
        </p>

        {/* Controls */}
        <Controls
          size={size}
          setSize={setSize}
          onGenerate={generate}
          onReset={reset}
          players={players}
          setPlayers={setPlayers}
          prevId={previousGameId}
          setPrevId={setPrevId}
          library={library}
          personaLabel={profile.label}
        />

        {/* Hub output */}
        <SectionTitle
          title={mode === 'cold' ? 'Cold hub — party unknown' : `Warm hub — ${partySize} active players`}
          desc={
            mode === 'cold'
              ? 'Ranked on long-term taste, household history, recency, new releases and popularity. No party-size claims.'
              : `Party context carried back from ${prevGame?.title ?? 'the last game'}. Party-specific rows enforce hard player-count compatibility.`
          }
          accent
          action={
            orderCustomized ? (
              <button
                onClick={resetRowOrder}
                title="Reset order"
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 700,
                  color: UI.ink70,
                  background: 'transparent',
                  border: `1px solid ${UI.borderStrong}`,
                  borderRadius: 999,
                  padding: '4px 12px',
                  cursor: 'pointer',
                }}
              >
                ↺ Reset order
              </button>
            ) : undefined
          }
        />
        <div style={{ marginTop: 22 }}>
          <HubRows hub={hub} onPlay={play} order={rowOrder} onOrderChange={changeRowOrder} />
        </div>
      </div>
      </div>

      {/* Docked, resizable side panel (wide screens) */}
      {profileOpen && !narrow && (
        <>
          <div
            onMouseDown={() => setDragging(true)}
            title="Drag to resize"
            style={{
              flex: '0 0 auto',
              width: 8,
              cursor: 'col-resize',
              background: dragging ? UI.accent : UI.border,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 2, height: 30, borderRadius: 2, background: dragging ? '#fff' : UI.muted }} />
          </div>
          <aside
            style={{
              flex: '0 0 auto',
              width: panelWidth,
              overflowY: 'auto',
              background: '#0b0c0f',
            }}
          >
            {profileContent}
          </aside>
        </>
      )}

      {/* Overlay drawer (narrow screens) */}
      {profileOpen && narrow && (
        <>
          <div
            onClick={() => setProfileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100 }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(92vw, 420px)',
              overflowY: 'auto',
              background: '#0b0c0f',
              borderLeft: `1px solid ${UI.border}`,
              boxShadow: '-16px 0 48px rgba(0,0,0,0.6)',
              zIndex: 1101,
            }}
          >
            {profileContent}
          </aside>
        </>
      )}

      {/* Play toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 28,
            transform: 'translateX(-50%)',
            zIndex: 1200,
            background: '#0a0b0d',
            border: `1px solid ${UI.good}`,
            color: UI.ink,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            padding: '11px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function Controls(props: {
  size: number;
  setSize: (n: number) => void;
  onGenerate: () => void;
  onReset: () => void;
  players: number;
  setPlayers: (n: number) => void;
  prevId: string;
  setPrevId: (id: string) => void;
  library: Game[];
  personaLabel: string;
}) {
  const { size, setSize, onGenerate, onReset, players, setPlayers, prevId, setPrevId, library } = props;
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        marginTop: 28,
        background: 'rgba(10,11,13,0.86)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${UI.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <button onClick={onGenerate} style={btnPrimary}>
        🎲 Generate profile
      </button>
      <button onClick={onReset} style={btnGhost}>
        🧹 Clean profile
      </button>

      <div style={divider} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: UI.ink70 }}>
        <span style={{ fontWeight: 700, color: UI.ink }}>Library</span>
        <input
          type="range"
          min={6}
          max={MAX_LIBRARY}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          style={{ width: 140, accentColor: UI.accent }}
        />
        <span style={{ fontVariantNumeric: 'tabular-nums', width: 58, color: UI.ink }}>{size} games</span>
      </label>

      <div style={divider} />

      {/* Players — 0 = Cold hub (party unknown), 1–8 = Warm hub */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: UI.ink70 }}>
        <span style={{ fontWeight: 700, color: UI.ink }}>Players</span>
        <input
          type="range"
          min={0}
          max={8}
          value={players}
          onChange={(e) => setPlayers(Number(e.target.value))}
          style={{ width: 150, accentColor: players === 0 ? UI.muted : '#f4b740' }}
        />
        <span style={{ width: 148, fontSize: 13, fontWeight: 700, color: players === 0 ? UI.ink70 : '#f4b740' }}>
          {players === 0 ? '❄ Cold · unknown' : `🔥 ${players} player${players > 1 ? 's' : ''}`}
        </span>
      </label>

      {players >= 1 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: UI.ink70 }}>
          <span style={{ fontWeight: 700, color: UI.ink }}>Last game</span>
          <select
            value={prevId}
            onChange={(e) => setPrevId(e.target.value)}
            style={{
              background: UI.cardAlt,
              color: UI.ink,
              border: `1px solid ${UI.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              fontFamily: FONT,
              fontSize: 13.5,
              maxWidth: 200,
            }}
          >
            {library.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: UI.muted }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: GENRE_COLOR.Trivia }} />
        {props.personaLabel}
      </span>
    </div>
  );
}

// Side-panel (right) icon — filled right cell when the panel is open.
function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="15" y1="4" x2="15" y2="20" />
      {open && <rect x="15" y="4" width="6" height="16" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function SectionTitle({ title, desc, accent, action }: { title: string; desc: string; accent?: boolean; action?: ReactNode }) {
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent ? '#f4b740' : UI.muted,
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, color: UI.ink70, maxWidth: 780 }}>{desc}</p>
    </div>
  );
}

function confColor(c: number): string {
  if (c >= 0.6) return UI.good;
  if (c >= 0.3) return '#f4b740';
  return UI.bad;
}

// ── inline styles ─────────────────────────────────────────────────────────

const btnBase: CSSProperties = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 999,
  padding: '10px 18px',
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'transform 120ms ease, filter 120ms ease',
};
const btnPrimary: CSSProperties = { ...btnBase, background: '#e9eaec', color: '#0b0c0e' };
const btnGhost: CSSProperties = { ...btnBase, background: 'transparent', color: UI.ink, borderColor: UI.borderStrong };
const divider: CSSProperties = { width: 1, height: 26, background: UI.border };
