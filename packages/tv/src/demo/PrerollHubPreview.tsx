import { useEffect } from 'react';
import { GameHub } from '../components/GameHub';
import { HUB9_CONTENT } from '../prototype/hub9/games9';

/** The real hub, held on its opening hero while the pre-roll owns the remote. */
export function PrerollHubPreview({ origin, showTrialHero }: { origin: string; showTrialHero: boolean }) {
  useEffect(() => {
    let cancelled = false;
    // Tell the parent when the rendered hub's artwork and fonts are ready, so
    // loading time never consumes the short preview before the paywall.
    Promise.all([
      document.fonts.ready,
      ...Array.from(document.images, (image) => image.decode().catch(() => {})),
    ]).then(() => {
      if (!cancelled && window.parent !== window) {
        window.parent.postMessage({ type: 'weekend:preroll-hub-ready' }, origin);
      }
    });
    return () => { cancelled = true; };
  }, [origin]);

  return (
    <GameHub
      roomCode="WKND42"
      content={HUB9_CONTENT}
      detailView="immersive"
      showTrialHero={showTrialHero}
      autoRotateHero={false}
      onLaunch={() => {}}
    />
  );
}
