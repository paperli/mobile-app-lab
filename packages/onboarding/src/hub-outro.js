import { OUTRO_PROMPTS } from './vo.js';

// Match the integrated onboarding: reveal the real hub beneath the studio,
// let the host sign off from the lower right, then fade the host over 3 seconds.
export function startHubOutro(scene) {
  const generation = scene.generation;
  let active = true, waiting = true, fading = false, waitTimer, orbFade, pendingNavigation;
  const status = document.createElement('div');
  status.id = 'hubLoading'; status.hidden = true;
  status.innerHTML = '<span role="status">Getting your game night ready…</span><button>Retry loading the hub</button>';
  document.getElementById('tv').appendChild(status);
  scene.busy = true;
  scene.outroState = 'loading';
  const current = () => active && scene.generation === generation;
  // The phone is already a controller when WOF finishes. Keep the latest
  // input while the hub loads, then allow navigation throughout the sign-off.
  scene.outroNavigate = key => {
    if (!current()) return;
    if (waiting) pendingNavigation = key;
    else scene.hubNavigate(key);
  };
  const narrate = () => {
    if (!current() || waiting || fading) return;
    scene.outroState = 'speaking';
    scene.say(OUTRO_PROMPTS[scene.connected ? 'paired' : 'unpaired'], () => {
      if (!current()) return;
      fading = true; scene.outroState = 'fading';
      orbFade = scene.animate(scene.orb.root, { alpha: 0 }, 3000, 0, 'ease-in-out');
      scene.later(() => {
        scene.outroState = 'complete'; scene.busy = false;
        scene.phoneStep = 'dpad'; scene.showHub();
      }, scene.reduced ? 0 : 3100);
    });
  };
  const prepare = () => {
    clearTimeout(waitTimer);
    status.hidden = true;
    waitTimer = setTimeout(() => { if (current() && waiting) status.hidden = false; }, 10000);
    scene.prepareHub(() => {
      if (!current()) return;
      waiting = false; clearTimeout(waitTimer); status.hidden = true;
      scene.revealHub();
      scene.stage.change('empty');
      scene.animate(scene.world, { alpha: 0 }, 1200, 150, 'ease-in');
      scene.animate(scene.ui, { alpha: 0 }, 900);
      scene.brand.alpha = 0; if (scene.brandHalo) scene.brandHalo.alpha = 0;
      scene.orb.resume();
      scene.phoneStep = 'dpad'; scene.onchange();
      if (pendingNavigation) { scene.hubNavigate(pendingNavigation); pendingNavigation = null; }
      scene.later(() => { if (!document.hidden) narrate(); }, scene.reduced ? 0 : 1300);
    });
  };
  status.querySelector('button').onclick = () => { scene.host.unlock(); scene.resetHub(); prepare(); };
  scene.replayOutro = narrate;
  prepare();
  return () => {
    active = false; clearTimeout(waitTimer); status.remove();
    orbFade?.stop();
    scene.replayOutro = null; scene.outroState = null;
    scene.outroNavigate = null;
    scene.orb.root.alpha = 1;
  };
}
