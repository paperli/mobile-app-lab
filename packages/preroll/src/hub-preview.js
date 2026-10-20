import { hubPreviewUrl } from './hub-link.js';

// Separate bundles in dev, the same Pages site in production. Only trust the
// current iframe's readiness message; a retry gets a fresh window/source.
export function setupHubPreview(onReady) {
  const screen = document.querySelector('#screen-hub');
  const status = document.querySelector('#hubStatus');
  const message = document.querySelector('#hubStatusText');
  const retry = document.querySelector('#hubRetry');
  let frame = null;
  let url = null;
  let timeout = null;
  let ready = false;

  function reset() {
    clearTimeout(timeout);
    frame?.remove();
    frame = null;
    ready = false;
    screen.classList.remove('is-ready');
  }

  function load(showTrialHero, force = false) {
    const next = hubPreviewUrl(showTrialHero);
    if (!force && frame && url.href === next.href) return;
    reset();
    url = next;
    // The ident and canary spinner cover both simulated and actual loading.
    // This status is only needed if the hub cannot be reached.
    status.hidden = true;
    retry.hidden = true;
    frame = document.createElement('iframe');
    frame.id = 'hubPreview';
    frame.title = showTrialHero ? 'Game hub with trial hero' : 'Game hub without trial hero';
    // This is a brief preview. Keep remote and pointer input in the pre-roll,
    // so a game or trial CTA cannot take the user out of the timed flow.
    frame.tabIndex = -1;
    frame.inert = true;
    frame.src = url.href;
    screen.prepend(frame);
    timeout = setTimeout(() => {
      message.textContent = 'The game hub couldn’t load. Check that the hub is running, then try again.';
      status.hidden = false;
      retry.hidden = false;
    }, 15000);
  }

  window.addEventListener('message', (event) => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== url.origin ||
        event.data?.type !== 'weekend:preroll-hub-ready' || ready) return;
    clearTimeout(timeout);
    ready = true;
    status.hidden = true;
    screen.classList.add('is-ready');
    onReady();
  });
  retry.addEventListener('click', () => load(url.searchParams.get('trialHero') === 'on', true));

  return { load, reset, get ready() { return ready; } };
}
