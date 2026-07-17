// Infographic panels for the player profile, built on Recharts.
// Desktop-first; every chart sits in a ResponsiveContainer so the grid reflows
// on mobile. Colors follow the entity-stable genre palette in theme.ts.

import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Game, Genre, PlayerProfile } from '../personalization';
import { GENRES, INTERACTIONS, MOTIVATIONS, PLAYER_BANDS } from '../personalization';
import type { ProfileStats } from '../personalization';
import { FONT, GENRE_COLOR, UI } from './theme';

// ── Layout primitives ───────────────────────────────────────────────────────

export function Card({
  title,
  hint,
  children,
  span,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  span?: number;
}) {
  return (
    <div
      style={{
        background: UI.card,
        border: `1px solid ${UI.border}`,
        borderRadius: 16,
        padding: '18px 20px 20px',
        gridColumn: span ? `span ${span}` : undefined,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.01em', color: UI.ink }}>{title}</h3>
        {hint && <span style={{ fontSize: 12, color: UI.muted }}>{hint}</span>}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

export function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      style={{
        background: UI.cardAlt,
        border: `1px solid ${UI.border}`,
        borderRadius: 14,
        padding: '16px 18px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: UI.muted }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: accent ?? UI.ink }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4, fontSize: 13, color: UI.ink50 }}>{sub}</div>}
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────

function tip(): ReactNode {
  return null;
}

interface TipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || !payload.length) return tip();
  const p = payload[0];
  return (
    <div
      style={{
        background: '#000',
        border: `1px solid ${UI.borderStrong}`,
        borderRadius: 10,
        padding: '8px 11px',
        fontFamily: FONT,
        fontSize: 13,
        color: UI.ink,
        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontWeight: 700 }}>{label ?? p.name}</div>
      <div style={{ color: p.color ?? UI.accent, marginTop: 2 }}>
        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        {unit ?? ''}
      </div>
    </div>
  );
}

// ── Genre affinity radar ────────────────────────────────────────────────────

export function GenreRadar({ profile }: { profile: PlayerProfile }) {
  const data = GENRES.map((g) => ({ axis: g, value: profile.genreAffinity[g] }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={UI.grid} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: UI.ink70, fontSize: 11, fontFamily: FONT }} />
        <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={UI.accent} fill={UI.accent} fillOpacity={0.35} strokeWidth={2} isAnimationActive />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Motivation bars (horizontal) ────────────────────────────────────────────

export function MotivationBars({ profile }: { profile: PlayerProfile }) {
  const data = MOTIVATIONS.map((m) => ({ name: m, value: profile.motivationAffinity[m] })).sort(
    (a, b) => b.value - a.value,
  );
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={118}
          tick={{ fill: UI.ink70, fontSize: 11.5, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
        <Bar dataKey="value" fill={UI.accent} radius={[4, 4, 4, 4]} isAnimationActive barSize={13} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Party-size distribution donut ───────────────────────────────────────────

const BAND_COLOR: Record<string, string> = {
  '1': '#3987e5',
  '2': '#199e70',
  '3-4': '#c98500',
  '5+': '#d55181',
};

export function PartyDonut({ profile }: { profile: PlayerProfile }) {
  const data = PLAYER_BANDS.map((b) => ({ name: b, value: Math.round(profile.partySizeDistribution[b] * 100) })).filter(
    (d) => d.value > 0,
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ResponsiveContainer width="60%" height={190}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="88%"
            paddingAngle={2}
            stroke={UI.card}
            strokeWidth={2}
            isAnimationActive
          >
            {data.map((d) => (
              <Cell key={d.name} fill={BAND_COLOR[d.name]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip unit="%" />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: UI.ink70 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: BAND_COLOR[d.name] }} />
            <span style={{ fontWeight: 600, color: UI.ink }}>{d.name}</span>
            <span style={{ marginLeft: 'auto', color: UI.muted, fontVariantNumeric: 'tabular-nums' }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Interaction preferences (diverging) ─────────────────────────────────────

export function InteractionBars({ profile }: { profile: PlayerProfile }) {
  const data = INTERACTIONS.map((it) => ({ name: it, value: profile.interactionPref[it] }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} stackOffset="sign">
        <XAxis type="number" domain={[-1, 1]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={70}
          tick={{ fill: UI.ink70, fontSize: 11.5, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive barSize={15}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.value >= 0 ? UI.good : UI.bad} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Top engaged games ───────────────────────────────────────────────────────

export function TopGamesBars({ stats }: { stats: ProfileStats }) {
  const data = stats.topGames.map((t) => ({ name: t.game.title, value: t.engagement, accent: t.game.accent }));
  if (data.length === 0) {
    return <Empty>No play history yet — generate a profile.</Empty>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: UI.ink70, fontSize: 11.5, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive barSize={15}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.accent} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Genre legend (shared reference) ─────────────────────────────────────────

export function GenreLegend({ library }: { library: Game[] }) {
  const present = new Set<Genre>(library.map((g) => g.genre));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
      {GENRES.filter((g) => present.has(g)).map((g) => (
        <span key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: UI.ink70 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: GENRE_COLOR[g] }} />
          {g}
        </span>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: 120,
        display: 'grid',
        placeItems: 'center',
        color: UI.muted,
        fontSize: 13.5,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}
