import { templates } from './reference-phone.js';
import { Rive, RuntimeLoader } from '@rive-app/canvas';
import riveWasm from '@rive-app/canvas/rive.wasm?url';
import { mountMicControl } from './mic-control.js';
import { backIcon } from './controller-icons.js';

RuntimeLoader.setWasmUrl(riveWasm);
const mic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
const button = (label, action, alt = false) => `<button class="phone-button ${alt ? 'alt' : ''}" data-action="${action}">${label}</button>`;
const logo = '<p class="phone-logo"><img src="assets/weekend-logo.png" alt="Weekend"></p>';
const topbar = `<nav class="arcade-topbar" aria-label="Controller"><button type="button" data-action="remote-back" aria-label="Back">${backIcon}</button><span class="arcade-mark"><img src="assets/weekend-mark.webp" alt="Weekend"></span><button type="button" data-action="phone-settings" aria-label="Settings">⚙</button></nav>`;
const pad = () => templates(8).dpad();

export function setupPhone(s, modal) {
  const screen = modal.screen;
  let micControl, installTimer;
  let settings = false, disconnect = false;
  let swipeStart, suppressClick = false;
  const setStep = step => { s.phoneStep = step; render(); };

  function render() {
    const micScreen = s.phase === 6 && !settings && !s.gameMenu && !s.hubVisible;
    if (micScreen && micControl) { micControl.update(); return; }
    const previousMic = micControl; micControl = null;
    previousMic?.dispose();
    if(s.phase===0){settings=false;disconnect=false;clearTimeout(installTimer);}
    const step = s.phoneStep;
    let body = '';
    const controller = s.connected && (step === 'dpad' || s.gameMenu || (s.phase >= 5 && s.phase <= 7));
    screen.className = 'wk-phone__screen phone-screen journey-phone';
    if (s.phase < 4 && !s.hubVisible) body = `${logo}<h3 class="phone-title">Game night starts on TV.</h3><p class="phone-copy">Your phone will join after the first question.</p>`;
    else if (settings) body = `${topbar}<h3 class="phone-title">Settings</h3><p class="phone-copy">Connected to Living Room TV<br>Pair code WKND42</p>${disconnect ? '<p class="phone-copy">Disconnect from this TV?</p>' + button('Disconnect', 'disconnect-confirm') + button('Stay connected', 'disconnect-cancel', true) : button('Disconnect from TV', 'disconnect', true)}${button('Done', 'close-settings')}`;
    else if (s.gameMenu || (s.hubVisible && step === 'dpad')) body = `${topbar}<p class="connection-label">● Living Room TV</p><div class="controller-main">${pad()}</div><button type="button" class="arcade-back" data-action="remote-back" aria-label="Back">${backIcon}</button>`;
    else if (['pair', 'camera', 'detected'].includes(step)) body = `<div class="camera-preview"><div class="camera-tools">ϟ <span>⌃</span> ◎</div><p>Point your camera at the TV code</p><div class="camera-target"><img src="assets/pairing-session.png" alt="TV pairing QR code"></div>${step === 'detected' ? '<button class="scan-result" data-action="scan">↗ pair.weekend.com</button>' : '<button class="scan-result" data-action="detect">Scan QR code</button>'}<div class="camera-modes">VIDEO <strong>PHOTO</strong> PORTRAIT</div><button class="camera-shutter" data-action="detect" aria-label="Scan TV code"></button><small>Camera preview · simulation</small></div>`;
    else if (['appclip', 'download'].includes(step)) body = `${logo}<h3 class="phone-title">Your phone.<br>Your way to play.</h3><p class="phone-copy">Get Weekend to connect to your TV and join the fun.</p>${button('Download the app', 'app-store')}${button('Use App Clip', 'show-clip', true)}<p class="phone-copy">Your TV: WKND42</p>${step === 'appclip' ? '<section class="appclip-sheet" role="dialog" aria-label="Weekend App Clip"><button class="sheet-close" data-action="close-clip" aria-label="Close App Clip">×</button><img src="assets/weekend-mark.webp" alt=""><h3>Weekend</h3><p>Pick up. Connect. Play.</p>' + button('Open App Clip', 'launch-app') + '<small>App Clip · simulated preview</small></section>' : ''}`;
    else if (['store', 'installing', 'installed'].includes(step)) body = `<p class="store-back">‹ Apps</p><div class="store-app"><img src="assets/weekend-mark.webp" alt="Weekend app icon"><h3>Weekend</h3><p>Game night. Every night.</p></div>${step === 'store' ? button('Get', 'install') : step === 'installed' ? button('Open', 'launch-app') : '<div class="download-progress" role="status">Downloading…<progress aria-label="Download progress"></progress></div>'}<div class="store-ratings"><span>4.9 ★<small>RATINGS</small></span><span>12+<small>AGE</small></span><span>Games<small>CATEGORY</small></span></div><div class="store-promo"><h3>Your TV.<br>Your friends.<br>Your Weekend.</h3><img src="assets/hub/wheel-of-fortune.png" alt="Wheel of Fortune"></div><small class="simulation-note">App Store preview · no app is installed</small>`;
    else if (step === 'connecting') body = `${logo}<div class="connection-spinner"></div><h3 class="phone-title">Joining your puzzle…</h3><p class="phone-copy">The puzzle stays on your TV.<br>Your phone will be the microphone.</p>`;
    else if (s.phase === 5) {
      if (step === 'permission') body = `${topbar}<section class="permission-sheet" role="dialog" aria-label="Microphone permission"><h3>“Weekend” Would Like to Access the Microphone</h3><p>Answer games using your voice.</p>${button('Allow Microphone', 'grant')}${button('Don’t Allow', 'deny', true)}<small>System prompt · simulation</small></section>`;
      else if (step === 'denied') body = `${topbar}<h3 class="phone-title">Your mic is off.</h3><p class="phone-copy">Your puzzle is still on TV. Allow microphone access in Settings to answer.</p>${button('Open Settings', 'mic-settings')}${button('Skip to all games', 'return-hub', true)}`;
      else if (step === 'settings') body = `${topbar}<p class="state-pill">SETTINGS · SIMULATION</p><h3 class="phone-title">Weekend</h3><p class="phone-copy">Microphone access is off.</p>${button('Enable Microphone', 'grant')}`;
      else body = `${topbar}<p class="connection-label">● Connected to your TV</p><div class="phone-mic-icon">${mic}</div><h3 class="phone-title">Answer with your voice.</h3><p class="phone-copy">Allow microphone access to solve the puzzle on your TV.</p>${button('Set up microphone', 'request-mic')}`;
    } else if (s.phase === 6) body = `${topbar}<p class="connection-label">● Living Room TV</p><div class="controller-main"><button type="button" class="arcade-mic" id="holdMic" aria-label="Press and hold to answer" aria-pressed="false"><canvas id="micOrb" width="440" height="440" aria-hidden="true"></canvas><span class="mic-fallback" aria-hidden="true"></span></button></div><p id="micStatus" class="controller-sr-only" role="status"></p>`;
    else if (s.phase === 7) body = `${topbar}<p class="connection-label">● Living Room TV</p><div class="controller-main"><div class="phone-success-check" role="status" aria-label="Answer accepted">✓</div></div>`;
    else {
      const t = templates(8);
      t.checkout = ({getstarted:'landing', signup:'account', offer:'offer', pay:'applepay'})[step] || 'landing';
      t.accountMode = s.accountMode;
      body = t.claimPhone().replace('Claim My Free Week', 'Get Started');
    }
    screen.innerHTML = body.replaceAll('assets/weekend-3d-yellow.svg', 'assets/weekend-logo.png');
    screen.scrollTop = 0;
    if (controller) screen.classList.add('arcade-controller');
    const hold = screen.querySelector('#holdMic');
    if (hold) {
      micControl = mountMicControl({ hold, canvas:screen.querySelector('#micOrb'), status:screen.querySelector('#micStatus'), scene:s, createRive:options=>new Rive(options) });
    }
  }

  modal.el.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (suppressClick && action==='pad') { suppressClick=false; return; }
    suppressClick=false;
    s.host.unlock();
    if (action === 'pad') {s.move(target.dataset.dir === 'select' ? 'enter' : target.dataset.dir);return;}
    if (action === 'remote-back') {settings=false;s.move('back');return;}
    if (action === 'detect') setStep('detected');
    else if (action === 'scan') s.scan();
    else if (action === 'close-clip') setStep('download');
    else if (action === 'show-clip') setStep('appclip');
    else if (action === 'app-store') setStep('store');
    else if (action === 'install') {setStep('installing');clearTimeout(installTimer);installTimer=setTimeout(()=>{if(s.phoneStep==='installing')setStep('installed');},1800);}
    else if (action === 'launch-app') s.openApp();
    else if (action === 'phone-settings') {settings=true;render();}
    else if (action === 'close-settings') {settings=false;disconnect=false;render();}
    else if (action === 'disconnect') {disconnect=true;render();}
    else if (action === 'disconnect-cancel') {disconnect=false;render();}
    else if (action === 'disconnect-confirm') {settings=false;disconnect=false;s.connected=false;s.permission=false;s.hideHub();s.go(4);setStep('pair');}
    else if (action === 'request-mic') setStep(s.scenario==='denied'?'denied':'permission');
    else if (action === 'mic-settings') setStep('settings');
    else if (action === 'grant') s.micAllowed();
    else if (action === 'deny') setStep('denied');
    else if (action === 'begin-signup') {s.accountMode='signup';setStep('signup');}
    else if (action === 'switch-account') {s.accountMode=s.accountMode==='signup'?'signin':'signup';render();}
    else if (action === 'account-complete' || action === 'back-to-offer') setStep('offer');
    else if (action === 'open-apple-pay') setStep('pay');
    else if (action === 'confirm-payment') s.buy();
    else if (action === 'return-hub') {s.phoneStep='dpad';s.browse();}
    else if (['skip-trial','more-games','browse-after-success'].includes(action)) s.browse();
  });
  screen.addEventListener('pointerdown', e => {
    if(e.target.closest('.dpad')) { swipeStart={x:e.clientX,y:e.clientY};suppressClick=false; }
  });
  screen.addEventListener('pointerup', e => {
    if(!swipeStart)return;
    const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;
    swipeStart=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<28)return;
    suppressClick=true;
    s.move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
  });
  screen.addEventListener('pointercancel',()=>{swipeStart=null;});
  modal.el.addEventListener('keydown', e => {
    if (!e.target.closest('[data-action="pad"]')) return;
    const key = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Escape:'back'}[e.key];
    if(key){e.preventDefault();e.stopPropagation();s.move(key);}
  });
  return render;
}
