import { hubUrl } from './hub-link.js';
import { PAIRING_SUCCESS_PROMPT } from './vo.js';

// Keep the phone flow alive while displaying the real hub bundle.
export function setupHubBridge(scene) {
  const url = new URL(hubUrl(), location.href);
  url.searchParams.set('onboardingOrigin', location.origin);
  const frame = document.createElement('iframe');
  frame.id = 'onboardingHub';
  frame.title = 'Weekend game hub';
  frame.hidden = true;
  document.getElementById('tv').appendChild(frame);
  let ready = false;
  let pendingSuccess = false;
  let successOverUpsell = false;
  let successActive = false;
  let successNarrationPending = false;
  const send = (command, value) => {
    if (ready) frame.contentWindow.postMessage({ type: 'weekend:onboarding', command, value }, url.origin);
  };
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return;
    if (event.data?.type === 'weekend:hub-ready' && !ready) {
      ready = true;
      if (pendingSuccess) { send('success', { overUpsell: successOverUpsell }); pendingSuccess = false; }
      else if (scene.connected && !scene.member) send('sample');
    }
    if (event.data?.type === 'weekend:success-visible' && scene.hubVisible) {
      frame.style.opacity = '1';
      frame.style.pointerEvents = 'auto';
      if (successNarrationPending) {
        successNarrationPending = false;
        scene.host.say(PAIRING_SUCCESS_PROMPT);
      }
    }
    if (event.data?.type === 'weekend:success-dismissed') {
      if (successActive) scene.host.stop();
      successActive = false;
      successNarrationPending = false;
    }
    if (event.data?.type === 'weekend:play-puzzle') {
      frame.hidden = true;
      scene.hubVisible = false;
      scene.go(scene.permission ? 6 : 5);
    }
    if (event.data?.type === 'weekend:start-trial') scene.go(8);
  });
  scene.showHub = (success = false) => {
    successActive = success;
    successNarrationPending = success;
    successOverUpsell = success && !scene.hubVisible;
    scene.pause();
    scene.hubVisible = true;
    frame.hidden = false;
    // Keep the current TV page visible until the success overlay has mounted.
    frame.style.opacity = successOverUpsell ? '0' : '1';
    frame.style.pointerEvents = successOverUpsell ? 'none' : 'auto';
    if (!frame.src) frame.src = url.href;
    if (success) {
      if (ready) send('success', { overUpsell: successOverUpsell }); else pendingSuccess = true;
    }
    scene.onchange();
  };
  scene.replayHubPrompt = () => { if (successActive) scene.host.say(PAIRING_SUCCESS_PROMPT); };
  scene.hubNavigate = key => send('navigate', key);
  scene.hideHub = () => {
    if (successActive) scene.host.stop();
    successActive = false; successNarrationPending = false;
    frame.hidden = true; scene.hubVisible = false;
  };
  scene.resetHub = () => { scene.hideHub();frame.removeAttribute('src');ready=false;pendingSuccess=false; };
}
