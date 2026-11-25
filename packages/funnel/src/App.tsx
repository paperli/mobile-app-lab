import { useLayoutEffect } from 'react';
import { HUB, guard, hubUrl, navigate, useRoute } from './router';
import { IN_FRAME, useGame, useSession } from './state';
import { LooksPage } from './pages/LooksPage';
import { DemoPage } from './pages/DemoPage';
import { AdPage } from './pages/AdPage';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { PaymentPage } from './pages/PaymentPage';
import { PlayPage } from './pages/PlayPage';
import { ProtoSheet } from './ProtoSheet';

export function App() {
  const route = useRoute();
  useSession(); // re-render on session changes (device/offer toggles)
  const GAME = useGame();
  const redirect = guard(route);

  useLayoutEffect(() => {
    if (!redirect) return;
    if (redirect === HUB) location.replace(hubUrl('desktop'));
    else navigate(redirect, { replace: true });
  }, [redirect]);

  useLayoutEffect(() => {
    if (route.name === 'ad') document.title = `${GAME.title} · Sponsored`;
    if (route.name === 'landing') document.title = `${GAME.title} on Weekend`;
  }, [route.name, GAME.title]);

  if (redirect) return null;

  let page;
  switch (route.name) {
    case 'ad':
      page = <AdPage />;
      break;
    case 'signup':
    case 'signin':
      page = <AuthPage key={route.name} mode={route.name} next={route.params.get('next')} />;
      break;
    case 'payment':
      page = <PaymentPage />;
      break;
    case 'demo':
      page = <DemoPage />;
      break;
    case 'looks':
      page = <LooksPage />;
      break;
    case 'play':
      page = <PlayPage initialTab={route.params.get('tab') === 'tv' ? 'tv' : 'desktop'} />;
      break;
    default:
      page = <LandingPage />;
  }

  return (
    <>
      {page}
      {route.name !== 'ad' && route.name !== 'looks' && route.name !== 'demo' && !IN_FRAME && <ProtoSheet route={route.name} />}
    </>
  );
}
