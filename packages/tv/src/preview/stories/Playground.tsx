import { useState, type CSSProperties } from 'react';

/**
 * Design-system playground. A single TV-scale surface for eyeballing the type
 * ramp against several game-accent themes. Pick a theme from the top pills
 * to swap the accent color used across all samples below — the type specimens
 * and sample composition inherit the accent via a local CSS custom property.
 */

interface GameTheme {
  id: string;
  name: string;
  /** RGB triplet (space-separated), alpha applied via `<alpha-value>`. */
  accent: string;
  /** Hex string for labeled swatches. */
  accentHex: string;
  /** Short flavor copy shown in the sample composition. */
  tagline: string;
}

const THEMES: GameTheme[] = [
  { id: 'weekend',   name: 'Weekend',    accent: '255 218 10',   accentHex: '#FFDA0A', tagline: 'Pick up and play, anytime.' },
  { id: 'songquiz',  name: 'Song Quiz',  accent: '247 33 73',    accentHex: '#F72149', tagline: 'Guess that tune in 5, 4, 3…' },
  { id: 'trivia',    name: 'Trivia',     accent: '188 225 7',    accentHex: '#BCE107', tagline: 'Know it all, split-second.' },
  { id: 'kids',      name: 'Kids',       accent: '211 115 179',  accentHex: '#D373B3', tagline: 'Bright games, big laughs.' },
  { id: 'chill',     name: 'Chill',      accent: '173 224 235',  accentHex: '#ADE0EB', tagline: 'Take your time. It’s Sunday.' },
  { id: 'race',      name: 'Race',       accent: '33 69 247',    accentHex: '#2145F7', tagline: 'Left, right, brake, win.' },
  { id: 'orchard',   name: 'Orchard',    accent: '88 143 61',    accentHex: '#588F3D', tagline: 'Nature-puzzle-o-rama.' },
  { id: 'blaze',     name: 'Blaze',      accent: '251 121 40',   accentHex: '#FB7928', tagline: 'Fast, bright, overheated.' },
];

interface TypeSample {
  className: string;
  label: string;
  /** Size / line-height pair shown next to the label. */
  meta: string;
}

const TYPE_SAMPLES: TypeSample[] = [
  { className: 'text-display-1', label: 'Display 1', meta: '96 / 104' },
  { className: 'text-display-2', label: 'Display 2', meta: '80 / 88' },
  { className: 'text-display-3', label: 'Display 3', meta: '64 / 72' },
  { className: 'text-display-4', label: 'Display 4', meta: '56 / 64' },
  { className: 'text-display-5', label: 'Display 5', meta: '48 / 56' },
  { className: 'text-display-6', label: 'Display 6', meta: '40 / 48' },
  { className: 'text-title',     label: 'Title',     meta: '40 / 48' },
  { className: 'text-body',      label: 'Body',      meta: '32 / 48' },
  { className: 'text-callout',   label: 'Callout',   meta: '32 / 40' },
  { className: 'text-hint',      label: 'Hint',      meta: '32 / 44' },
  { className: 'text-metadata',  label: 'Metadata',  meta: '24 / 32' },
  { className: 'text-caption',   label: 'Caption',   meta: '24 / 32' },
];

const SAMPLE_HEADING = 'There’s more to play!';
const SAMPLE_BODY =
  'Every Weekend title is built to be picked up and played without setup. Hand someone a controller and you’re in.';
const SAMPLE_CAPTION = 'Supports 1–4 players • Mobile phones as controllers • No account required';

export default function PlaygroundStory() {
  const [themeId, setThemeId] = useState<string>(THEMES[0].id);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  // Scope the accent locally to the playground container via CSS var.
  const surfaceStyle: CSSProperties = {
    ['--playground-accent' as string]: theme.accent,
  };

  return (
    <div className="flex flex-col gap-8" style={surfaceStyle}>
      <header className="flex flex-col gap-3">
        <h2 className="text-display-2 font-bold">DS Playground</h2>
        <p className="text-body text-fg-muted">
          Pick a game theme to swap the accent color, then read through the type ramp below on a
          Midnight Blue TV surface. Each specimen shows its Tailwind utility class and its
          size / line-height in px.
        </p>
      </header>

      {/* Theme switcher */}
      <section className="flex flex-col gap-3">
        <h3 className="text-metadata uppercase tracking-widest text-fg-muted">Game theme</h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => {
            const active = t.id === themeId;
            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={[
                  'inline-flex items-center gap-2 rounded-pill px-4 py-2 transition-colors',
                  active
                    ? 'bg-fg-90 text-bg'
                    : 'bg-fg-5 text-fg hover:bg-fg-10',
                ].join(' ')}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.accentHex }}
                />
                <span className="text-caption font-semibold">{t.name}</span>
                <span className="text-caption font-code text-fg-muted">{t.accentHex}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sample composition on the active theme's TV surface */}
      <section className="flex flex-col gap-3">
        <h3 className="text-metadata uppercase tracking-widest text-fg-muted">TV surface — sample</h3>
        <div
          className="rounded-card p-12 flex flex-col gap-4 relative overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-bg-midnight))',
          }}
        >
          {/* Accent wash to evoke per-game tint */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 15% 15%, rgb(var(--playground-accent)) 0%, transparent 55%)',
            }}
          />
          <div className="relative flex flex-col gap-4">
            <span
              className="text-metadata uppercase tracking-widest font-semibold"
              style={{ color: `rgb(var(--playground-accent))` }}
            >
              {theme.name}
            </span>
            <h4 className="text-display-4 font-bold text-fg">{SAMPLE_HEADING}</h4>
            <p className="text-body text-fg-80 max-w-3xl">{SAMPLE_BODY}</p>
            <p className="text-caption text-fg-muted">{SAMPLE_CAPTION}</p>
            <div className="flex gap-3 mt-2">
              <span
                className="inline-flex items-center rounded-pill px-4 py-2 text-callout font-semibold"
                style={{
                  backgroundColor: `rgb(var(--playground-accent))`,
                  color: 'rgb(var(--palette-midnight-blue))',
                }}
              >
                Launch game
              </span>
              <span className="inline-flex items-center rounded-pill px-4 py-2 text-callout font-semibold border border-fg-25 text-fg">
                More info
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Type ramp — every token on the TV surface */}
      <section className="flex flex-col gap-3">
        <h3 className="text-metadata uppercase tracking-widest text-fg-muted">Type ramp</h3>
        <div
          className="rounded-card p-10 flex flex-col gap-6"
          style={{ backgroundColor: 'rgb(var(--color-bg-midnight))' }}
        >
          {TYPE_SAMPLES.map((s) => (
            <div key={s.className} className="flex items-baseline gap-6">
              <div className="w-48 shrink-0 flex flex-col text-fg-muted">
                <span className="text-metadata font-semibold text-fg">{s.label}</span>
                <span className="text-caption font-code">{s.meta}</span>
                <span className="text-caption font-code">.{s.className}</span>
              </div>
              <div className="flex-1 min-w-0 text-fg" style={{ wordBreak: 'break-word' }}>
                <span className={s.className}>Ag {SAMPLE_HEADING}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accent + neutral swatches for quick reference */}
      <section className="flex flex-col gap-3">
        <h3 className="text-metadata uppercase tracking-widest text-fg-muted">Palette</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Canary',        hex: '#FFDA0A', tw: 'bg-canary' },
            { label: 'Clementine',    hex: '#FB7928', tw: 'bg-clementine' },
            { label: 'Raspberry',     hex: '#F72149', tw: 'bg-raspberry' },
            { label: 'Orchid',        hex: '#D373B3', tw: 'bg-orchid' },
            { label: 'Pink',          hex: '#EEA0EE', tw: 'bg-pink' },
            { label: 'Sky',           hex: '#ADE0EB', tw: 'bg-sky' },
            { label: 'Cobalt',        hex: '#2145F7', tw: 'bg-cobalt' },
            { label: 'Hunter',        hex: '#588F3D', tw: 'bg-hunter' },
            { label: 'Limon',         hex: '#BCE107', tw: 'bg-limon' },
            { label: 'Warm White',    hex: '#F3F4F1', tw: 'bg-warm-white' },
            { label: 'Warmer White',  hex: '#ECECDB', tw: 'bg-warmer-white' },
            { label: 'Midnight Blue', hex: '#0A0322', tw: 'bg-midnight' },
          ].map((c) => (
            <div
              key={c.label}
              className={[
                'rounded-card overflow-hidden flex flex-col justify-end',
                c.tw,
              ].join(' ')}
              style={{ height: '120px' }}
            >
              <div
                className="bg-bg/80 backdrop-blur-sm px-3 py-2 flex items-center justify-between"
                style={{ color: 'rgb(var(--color-fg))' }}
              >
                <span className="text-caption font-semibold">{c.label}</span>
                <span className="text-caption font-code text-fg-muted">{c.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
