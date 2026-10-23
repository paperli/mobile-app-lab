import { paywallMarkup } from '@weekend/ui/fire-tv-paywall';
import '@weekend/ui/fire-tv-paywall/style.css';
import { PAYWALL_PHASE } from './variations.js';

/** The same system sheet as pre-roll, with an explicit skip route for FTUE. */
export function showFireTVPaywall(scene) {
  const layer = document.createElement('section');
  layer.className = 'fire-tv-paywall onboarding-paywall';
  layer.setAttribute('aria-label', 'Fire TV subscription preview');
  layer.innerHTML = paywallMarkup({
    artBase: 'assets/landing-wall/', appIcon: 'assets/firetv-weekend-appicon.png', allowSkip: true,
  });
  document.getElementById('tv').appendChild(layer);
  const fit = () => { layer.style.transform = `scale(${document.getElementById('tv').clientWidth / 1920})`; };
  fit(); window.addEventListener('resize', fit);
  let checked = false, ready = false, processing = false, focus = null;
  const select = key => {
    focus = key;
    layer.querySelectorAll('[data-focus]').forEach(button => {
      button.classList.toggle('is-focused', button.dataset.focus === key);
    });
  };
  const complete = subscribed => {
    if (!ready || processing) return;
    if (!subscribed) { scene.acceptFireTVPaywall(false); return; }
    if (!checked) return;
    processing = true; select(null); layer.classList.add('is-processing');
    scene.later(() => scene.acceptFireTVPaywall(true), 1400);
  };
  const activate = key => {
    if (!ready || processing) return;
    scene.host.unlock();
    if (key === 'pw-check') {
      checked = !checked;
      const button = layer.querySelector('.pw-check');
      button.classList.toggle('is-checked', checked);
      button.setAttribute('aria-checked', String(checked));
      layer.querySelector('.pw-btn--primary').disabled = !checked;
      select(checked ? 'pw-continue' : 'pw-check');
    } else if (key === 'pw-continue') complete(true);
    else if (key === 'pw-skip') complete(false);
  };
  layer.addEventListener('click', event => {
    const button = event.target.closest('[data-focus]');
    if (button && !button.disabled) { button.blur(); activate(button.dataset.focus); }
  });
  scene.paywallMove = key => {
    if (!ready || processing) return;
    if (key === 'back') return complete(false);
    if (key === 'enter') return activate(focus);
    if (key === 'up') select('pw-check');
    else if (key === 'down') select(checked ? 'pw-continue' : 'pw-skip');
    else if (key === 'right') select('pw-skip');
    else if (key === 'left') select(checked ? 'pw-continue' : 'pw-check');
  };
  scene.later(() => {
    if (scene.phase !== PAYWALL_PHASE) return;
    ready = true; layer.classList.add('is-ready');
    select(scene.flow.subscribed ? 'pw-check' : 'pw-skip');
  }, 1100);
  return () => { window.removeEventListener('resize', fit); layer.remove(); scene.paywallMove = null; };
}
