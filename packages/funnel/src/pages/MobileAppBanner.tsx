// "Play {game} free on your phone" banner (layout A2 from the banner
// explorations): the game's preview scene fades into its accent color on the
// left, a hopping Weekend app icon leads the title, and "Get the app" sits
// under it. Only games with a mobile version have `mobileApp` set.
import { useEffect, useState, type CSSProperties } from 'react';
import { APP_DOWNLOAD_URL, asset, type FunnelGame } from '../config';

/** Shared by the banner and the Where to play Mobile tile. */
export function useAppDownload() {
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  const linkProps = APP_DOWNLOAD_URL
    ? { href: APP_DOWNLOAD_URL, target: '_blank', rel: 'noopener' }
    : {
        href: '#',
        onClick: (e: { preventDefault: () => void }) => {
          e.preventDefault();
          setNote('Opens the Weekend app download page (prototype)');
        },
      };
  const toast = note && <div className="pl-toast" role="status">{note}</div>;
  return { linkProps, toast };
}

export function MobileAppBanner({ game, placement }: { game: FunnelGame; placement: 'cta' | 'about' }) {
  const { linkProps, toast } = useAppDownload();
  if (!game.mobileApp) return null;

  const style = { '--accent': game.mobileApp.accent, '--focus': game.mobileApp.focus } as CSSProperties;
  return (
    <>
      <a {...linkProps} className={`app-banner is-${placement}`} style={style} aria-label={`Play ${game.title} free on your phone. Get the Weekend app.`}>
        <img className="app-banner-art" src={asset(`img/${game.id}-banner.webp`)} alt="" />
        <span className="app-banner-copy">
          <img className="app-banner-icon" src={asset('img/weekend-app-icon.webp')} alt="" />
          <span className="app-banner-title">Play {game.title} free on your phone</span>
          <span className="app-banner-cta">
            Get the app <span className="arrow">→</span>
          </span>
        </span>
      </a>
      {toast}
    </>
  );
}
