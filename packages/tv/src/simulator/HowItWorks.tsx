// ─────────────────────────────────────────────────────────────────────────
//  How It Works — tracking events + the player-profile model
//
//  A reference page for the simulator: the telemetry it's modeled on, how those
//  events turn into profile signals, the learning rules the play-simulation
//  applies, and the actual ranking weights (read from the engine constants).
//  Data is presented as tables, a signal-flow infographic, and weight charts.
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { COLD_WEIGHTS, WARM_WEIGHTS } from '../personalization';
import { Card } from './Charts';
import { FONT, UI } from './theme';

// ── Event catalog (mirrors the strategy doc's telemetry) ────────────────────

interface EventRow {
  name: string;
  captures: string;
  feeds: string;
}

const HUB_EVENTS: EventRow[] = [
  { name: 'Hub Opened', captures: 'A hub session started + resolved Cold/Warm state', feeds: 'Session context, funnel baseline' },
  { name: 'Row Viewed', captures: 'A row met the visibility qualification', feeds: 'Row reach, exposure' },
  { name: 'Tile Focused', captures: 'A tile received TV focus', feeds: 'Current intent, consideration' },
  { name: 'Tile Focus Duration', captures: 'How long focus lasted', feeds: 'Consideration strength, fatigue' },
  { name: 'Tile Selected', captures: 'A tile was chosen', feeds: 'Intent, selection rate' },
  { name: 'Game Launch Started', captures: 'A launch attempt began', feeds: 'Launch funnel' },
  { name: 'Game Launch Success', captures: 'The game loaded to setup', feeds: 'Launch success rate' },
];

const GAMEPLAY_EVENTS: EventRow[] = [
  { name: 'Party Formation Started', captures: 'Setup / party assembly began', feeds: 'Party lifecycle' },
  { name: 'Player Joined / Left', captures: 'Participants + connected phones change', feeds: 'Active player count, party context' },
  { name: 'Party Established', captures: 'Authoritative active-player count at start', feeds: 'Warm party context, party-size distribution' },
  { name: 'Round Started / Finished', captures: 'Round progress', feeds: 'Engagement, completion' },
  { name: 'Game Completed', captures: 'Normal finish', feeds: 'Satisfaction ↑' },
  { name: 'Game Exited', captures: 'Exit reason (normal vs technical)', feeds: 'Satisfaction (tech failures excluded)' },
  { name: 'Returned To Hub', captures: 'Carries party context back', feeds: 'Warm-hub eligibility' },
];

const REC_EVENTS: EventRow[] = [
  { name: 'Recommendation Row Viewed', captures: 'A personalized row was seen', feeds: 'Row CTR denominator' },
  { name: 'Recommendation Tile Focused', captures: 'Focus on a recommended tile', feeds: 'Recommendation consideration' },
  { name: 'Recommendation Selected', captures: 'A recommendation was picked', feeds: 'Recommendation CTR' },
  { name: 'Recommendation Played', captures: 'Attributed to a playable start', feeds: 'Recommendation play rate' },
  { name: 'Recommendation Ignored', captures: 'Exposed but not acted on', feeds: 'Fatigue, diversity tuning' },
];

// ── Signal → profile mapping ────────────────────────────────────────────────

const SIGNALS: { signal: string; from: string; profileField: string; decay: string }[] = [
  { signal: 'Taste affinity', from: 'Genres/motivations/interactions of played + focused games', profileField: 'genreAffinity, motivationAffinity, interactionPref', decay: 'slow (weeks)' },
  { signal: 'Engagement', from: 'Rounds, active minutes, replays', profileField: 'perGame.engagement', decay: 'medium' },
  { signal: 'Satisfaction', from: 'Completion, normal exits, replays', profileField: 'perGame.satisfaction', decay: 'slow' },
  { signal: 'Current intent', from: 'Recent focus/selection/launch', profileField: 'recencyWeight × engagement', decay: 'fast (~14d half-life)' },
  { signal: 'Party habits', from: 'Active player count at party established', profileField: 'partySizeDistribution', decay: 'slow' },
  { signal: 'Fatigue', from: 'Repeated exposure without conversion', profileField: 'perGame.fatigue', decay: 'medium' },
  { signal: 'Novelty receptivity', from: 'Trying + enjoying new releases', profileField: 'noveltyReceptivity', decay: 'slow' },
  { signal: 'Confidence', from: 'Evidence volume (plays, distinct games)', profileField: 'derived', decay: '—' },
];

const LEARNING: { field: string; rule: string }[] = [
  { field: 'genre / motivation / interaction / audience affinity', rule: 'move toward the played game: x += 0.14 × (1 − x)' },
  { field: 'perGame.engagement / satisfaction', rule: 'increment toward 1 on each play (+~10%)' },
  { field: 'perGame.playCount / lastPlayed', rule: 'playCount +1, lastPlayed = now' },
  { field: 'partySizeDistribution', rule: 'shift 22% of mass to the played band, renormalize' },
  { field: 'avgSessionMin', rule: 'roll 22% toward the game’s typical session length' },
  { field: 'favorites', rule: 'earned at ≥3 plays and satisfaction > 0.72' },
  { field: 'household.avgPartySize / familyFriendly', rule: 'roll toward the played count / audience' },
];

const REASONS: { code: string; when: string }[] = [
  { code: 'PARTY_SIZE_MATCH', when: 'Warm hub, game compatible with active player count' },
  { code: 'PREVIOUS_GAME_SIMILARITY', when: 'High metadata similarity to the previous game' },
  { code: 'GENRE_CONTINUATION', when: 'Same genre as the previous game' },
  { code: 'TEAM_GAME', when: 'Team competition / co-op, party-compatible' },
  { code: 'RECENTLY_PLAYED', when: 'Recent successful playable session' },
  { code: 'TAXONOMY_AFFINITY', when: 'Sufficient profile/household genre affinity' },
  { code: 'SIMILAR_TO_FAVORITE', when: 'Near a named high-affinity favorite' },
  { code: 'REACTIVATION', when: 'Enjoyed historically, not played in a while' },
  { code: 'UNDEREXPOSED_MATCH', when: 'High predicted preference, low exposure' },
  { code: 'NEW_RELEASE_MATCH', when: 'New lifecycle + fit' },
  { code: 'CONTEXTUAL_POPULARITY', when: 'Low confidence → fall back to trending' },
  { code: 'NEUTRAL_RECOMMENDATION', when: 'No stronger supportable claim' },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'radial-gradient(120% 90% at 50% -10%, #101114 0%, #08090a 60%)',
        color: UI.ink,
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 5vw 110px', boxSizing: 'border-box' }}>
        <a href="?view=simulator" style={{ fontSize: 15, fontWeight: 700, color: UI.muted, textDecoration: 'none' }}>
          ← Back to the simulator
        </a>
        <h1 style={{ margin: '22px 0 0', fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>
          How it works — events &amp; the profile model
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.55, color: UI.ink70, maxWidth: 820 }}>
          The recommendation engine is fed by telemetry. Discovery events happen on the TV; gameplay + party events come
          from inside a game. Those events become long-term <b style={{ color: UI.ink }}>profile signals</b>, which the
          ranker turns into the categorized rows. This page shows the data contract and how the numbers are computed.
        </p>

        {/* Signal flow infographic */}
        <SectionLabel>The pipeline</SectionLabel>
        <FlowDiagram />

        {/* Event tables */}
        <SectionLabel>Tracking events</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 16 }}>
          <Card title="Hub events" hint="TV discovery">
            <EventTable rows={HUB_EVENTS} />
          </Card>
          <Card title="Gameplay events" hint="in-game / party">
            <EventTable rows={GAMEPLAY_EVENTS} />
          </Card>
          <Card title="Recommendation events" hint="attribution">
            <EventTable rows={REC_EVENTS} />
          </Card>
        </div>

        {/* Signals */}
        <SectionLabel>Events → profile signals</SectionLabel>
        <Card title="How each signal is computed" hint="event → profile field">
          <Table
            head={['Signal', 'Derived from', 'Profile field', 'Decay']}
            rows={SIGNALS.map((s) => [s.signal, s.from, <code key="f" style={codeStyle}>{s.profileField}</code>, s.decay])}
            widths={['20%', '34%', '31%', '15%']}
          />
        </Card>

        {/* Learning rules */}
        <SectionLabel>Learning rule (when a player plays)</SectionLabel>
        <Card title="What a play updates" hint="the simulator applies these on every play">
          <Table head={['Profile field', 'Update rule']} rows={LEARNING.map((l) => [l.field, <code key="r" style={codeStyle}>{l.rule}</code>])} widths={['42%', '58%']} />
        </Card>

        {/* Ranking weights */}
        <SectionLabel>Ranking weights (live from the engine)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
          <Card title="Cold-hub score weights" hint="party unknown">
            <WeightBars weights={COLD_WEIGHTS} />
          </Card>
          <Card title="Warm-hub score weights" hint="party known">
            <WeightBars weights={WARM_WEIGHTS} />
          </Card>
        </div>
        <p style={{ margin: '14px 2px 0', fontSize: 13.5, color: UI.muted, lineHeight: 1.55 }}>
          Fatigue &amp; avoided-interaction are subtracted (red). Sparse profiles blend toward popularity:
          <code style={{ ...codeStyle, margin: '0 6px' }}>score = confidence·personalized + (1−confidence)·popularity</code>.
        </p>

        {/* Reason codes */}
        <SectionLabel>Recommendation reasons</SectionLabel>
        <Card title="Evidence-gated reason codes" hint="every tile carries one">
          <Table head={['Reason code', 'Produced when']} rows={REASONS.map((r) => [<code key="c" style={codeStyle}>{r.code}</code>, r.when])} widths={['38%', '62%']} />
        </Card>
      </div>
    </div>
  );
}

// ── Flow diagram ────────────────────────────────────────────────────────────

function FlowDiagram() {
  const stages: { title: string; items: string[]; color: string }[] = [
    { title: 'Events', items: ['Hub focus / select', 'Party established', 'Game completed'], color: '#5aa9ff' },
    { title: 'Signals', items: ['Taste affinity', 'Engagement · satisfaction', 'Party-size habits', 'Fatigue · confidence'], color: '#c58cf5' },
    { title: 'Pipeline', items: ['Candidate generation', 'Weighted ranking', 'Confidence blend', 'Re-rank + diversity'], color: '#f4b740' },
    { title: 'Rows', items: ['Recommended For You', 'Keep the Party Going', 'More for N Players', '…with a reason each'], color: '#5ad19b' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
      {stages.map((s, i) => (
        <div key={s.title} style={{ display: 'flex', alignItems: 'stretch', gap: 10, flex: '1 1 240px', minWidth: 0 }}>
          <div
            style={{
              flex: 1,
              background: UI.card,
              border: `1px solid ${UI.border}`,
              borderTop: `3px solid ${s.color}`,
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.color }}>
              {s.title}
            </div>
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.items.map((it) => (
                <li key={it} style={{ fontSize: 13, color: UI.ink70, lineHeight: 1.35 }}>
                  {it}
                </li>
              ))}
            </ul>
          </div>
          {i < stages.length - 1 && (
            <div style={{ alignSelf: 'center', color: UI.muted, fontSize: 20, fontWeight: 700 }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Weight bars ─────────────────────────────────────────────────────────────

function WeightBars({ weights }: { weights: Record<string, number> }) {
  const data = Object.entries(weights)
    .map(([k, v]) => ({ name: label(k), value: v, negative: k === 'fatigue' || k === 'avoidance' }))
    .sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, Math.max(...data.map((d) => d.value)) * 1.15]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tick={{ fill: UI.ink70, fontSize: 11.5, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={13} isAnimationActive>
          {data.map((d, i) => (
            <Cell key={i} fill={d.negative ? UI.bad : UI.accent} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: unknown) => Number(v).toFixed(2)} style={{ fill: UI.muted, fontSize: 11, fontFamily: FONT }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function label(k: string): string {
  const map: Record<string, string> = {
    taste: 'Taste affinity',
    engagement: 'Engagement',
    satisfaction: 'Satisfaction',
    recentIntent: 'Recent intent',
    discovery: 'Discovery',
    novelty: 'Novelty',
    editorial: 'Editorial',
    fatigue: 'Fatigue (−)',
    avoidance: 'Avoided interaction (−)',
    partyFit: 'Party fit',
    previousSimilarity: 'Previous-game sim.',
    groupEnjoyment: 'Group enjoyment',
    durationFit: 'Session-length fit',
  };
  return map[k] ?? k;
}

// ── Tables ──────────────────────────────────────────────────────────────────

function EventTable({ rows }: { rows: EventRow[] }) {
  return <Table head={['Event', 'Captures', 'Feeds']} rows={rows.map((r) => [<b key="n" style={{ color: UI.ink, fontWeight: 700 }}>{r.name}</b>, r.captures, r.feeds])} widths={['30%', '40%', '30%']} />;
}

function Table({ head, rows, widths }: { head: string[]; rows: ReactNode[][]; widths?: string[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '0 10px 8px 0',
                  width: widths?.[i],
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: UI.muted,
                  borderBottom: `1px solid ${UI.border}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '9px 10px 9px 0',
                    color: UI.ink70,
                    verticalAlign: 'top',
                    lineHeight: 1.4,
                    borderBottom: `1px solid ${UI.cardAlt}`,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: '48px 0 18px',
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: UI.muted,
      }}
    >
      {children}
    </h2>
  );
}

const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11.5,
  color: '#9fd0ff',
  background: 'rgba(90,169,255,0.08)',
  borderRadius: 4,
  padding: '1px 5px',
} as const;
