// Story: catalog of all 30 games — tile + logo + full metadata for each, so the
// complete set is visible at a glance. Click a game to expand its hero + three
// screenshots inline.
import { useState } from 'react';
import { HUB_GAMES, type HubGame } from '../../prototype/hub/games';
import { GameTileV2 } from '../../prototype/hub/GameTileV2';
import { HeroV2 } from '../../prototype/hub/HeroV2';
import { Screenshot, SHOT_VARIANTS } from '../../prototype/hub/Screenshot';
import { GameMetaPills } from '../../prototype/hub/MetadataPill';

export default function HubGalleryStory() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Hub Layout — All 30 games</h2>
      <p className="text-sm text-fg-muted mb-6 max-w-3xl">
        Every game's tile, logotype and metadata. Click a card to expand its Hero v2
        band and three screenshots.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {HUB_GAMES.map((game) => {
          const open = openId === game.id;
          return (
            <div key={game.id} className="flex flex-col">
              <div onClick={() => setOpenId(open ? null : game.id)} style={{ cursor: 'pointer' }}>
                <GameTileV2 game={game} />
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-fg">{game.title}</h3>
                  {game.featured && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-pill bg-canary/20 text-canary font-semibold">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-muted mt-1">{game.description}</p>
                <div className="mt-2 flex gap-2 text-xs text-fg-muted">
                  <span>👥 {game.players}</span>
                  <span>·</span>
                  <span>{game.interaction}</span>
                </div>
              </div>
              {open && (
                <div className="mt-4">
                  {/* Hero (responsive) */}
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: 12 }}>
                    <ResponsiveHero game={game} />
                  </div>
                  {/* Screenshots */}
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {SHOT_VARIANTS.map((v) => (
                      <Screenshot key={v} game={game} variant={v} />
                    ))}
                  </div>
                  <div className="mt-3">
                    <GameMetaPills players={game.players} interaction={game.interaction} size={32} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Renders the 1920×800 hero and scales it to the parent width via a CSS
// aspect-ratio box + transform driven by a ResizeObserver-free technique:
// wrap in an element sized by aspect-ratio and scale the fixed hero to match.
function ResponsiveHero({ game }: { game: HubGame }) {
  return (
    <div style={{ width: '100%', aspectRatio: '1920 / 800', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
        ref={(el) => {
          if (!el) return;
          const inner = el.firstElementChild as HTMLElement | null;
          if (!inner) return;
          const apply = () => {
            inner.style.transform = `scale(${el.clientWidth / 1920})`;
          };
          apply();
        }}
      >
        <div style={{ width: 1920, height: 800, transformOrigin: 'top left' }}>
          <HeroV2 game={game} />
        </div>
      </div>
    </div>
  );
}
