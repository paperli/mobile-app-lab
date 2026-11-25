// Links from the demo gallery to the paid-social funnel prototype
// (packages/funnel): TikTok ad → game landing page → sign up / checkout →
// play on desktop or TV. On Pages it deploys at ./funnel/; in dev it is its own
// Vite server on :5177.

/** The funnel's URL for a hash route, e.g. 'demo' or 'ad'. */
export function funnelUrl(hash: string): string {
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:5177/funnel/#${hash}`;
  return `./funnel/#${hash}`;
}

const CARDS = [
  {
    hash: 'demo',
    tagline: 'Phone demo',
    desc: 'For presenting on a laptop: the whole flow inside an iPhone frame, with a side panel to pick the game (Jeopardy!, Song Quiz, Spot On, Guess the Emoji, Sketchy AF, Wit’s End), track the step, flip the mobile-app banner placement, and restart.',
  },
  {
    hash: 'ad',
    tagline: 'On your phone',
    desc: 'Open on a phone: a mock TikTok ad → the game’s landing page (teaser, email, Join Now) → the prod sign-up / sign-in and checkout replicas → the Desktop | TV play page → the hub with that game’s merch hero.',
  },
];

export function FunnelCard() {
  return (
    <>
      <div style={{ marginTop: 56, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8a9a' }}>
        Paid-social funnel — TikTok ad to playing (Nov 2026)
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 377px))', justifyContent: 'start', gap: 24 }}>
        {CARDS.map((c) => (
          <a
            key={c.hash}
            href={funnelUrl(c.hash)}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              background: '#141518',
              border: '1px solid #2b2c30',
              borderRadius: 18,
              padding: '26px 26px 28px',
              transition: 'border-color 160ms ease, transform 160ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6a6b70';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2b2c30';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a9a', textTransform: 'uppercase' }}>Funnel</div>
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{c.tagline}</div>
            <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: 'rgba(243,244,241,0.68)' }}>{c.desc}</p>
            <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: '#f3f4f1' }}>Open →</div>
          </a>
        ))}
      </div>
    </>
  );
}
