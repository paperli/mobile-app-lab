// Fire TV pre-roll upsell prototype.
//
//   home → ident → pre-roll (v1–v3) or loading + hub preview (v4/v5) → paywall → hub
//
// One 1920×1080 stage, a D-pad focus model and a review toolbar.
// The paywall is a mock of Amazon's system sheet; nothing is charged.
import { fitStage, STAGE_W, STAGE_H, FRAME_BEZEL, FRAME_CHIN, TV_FRAME_CHROME } from '@weekend/ui/device';
import { hubUrl } from './hub-link.js';
import { setupHubPreview } from './hub-preview.js';
import './style.css';
import { paywallMarkup } from '@weekend/ui/fire-tv-paywall';
import '@weekend/ui/fire-tv-paywall/style.css';
document.getElementById('screen-paywall').innerHTML = paywallMarkup();

const query = new URLSearchParams(location.search);
if (query.has('clean')) document.body.classList.add('clean');

const $ = (sel) => document.querySelector(sel);
const controls = $('#controls');
const tv = $('#tv'), stage = $('#stage'), tvStage = $('#tvStage'), tvFrame = $('#tvFrame'), led = $('#tvLed'), tools = $('#tools');

// ── Stage fit (same frame rule as the hub and the onboarding) ─────────────
const CONTROL_GAP = 14;
function fit() {
  const framed = fitStage(innerWidth, innerHeight, true).framed;
  document.body.classList.toggle('framed', framed);
  const band = framed && !document.body.classList.contains('clean') ? tools.getBoundingClientRect().height + CONTROL_GAP : 0;
  const { scale } = fitStage(innerWidth, innerHeight, true, { h: band });
  const w = Math.round(STAGE_W * scale), h = Math.round(STAGE_H * scale);
  tv.style.width = w + 'px';
  tv.style.height = h + 'px';
  stage.style.transform = `scale(${w / STAGE_W})`;
  tvStage.style.background = framed ? TV_FRAME_CHROME.pageBackground : '#000';
  if (framed) {
    Object.assign(tvFrame.style, {
      width: w + FRAME_BEZEL * 2 + 'px',
      height: h + FRAME_BEZEL * 2 + FRAME_CHIN + 'px',
      padding: `${FRAME_BEZEL}px ${FRAME_BEZEL}px ${FRAME_BEZEL + FRAME_CHIN}px`,
      borderRadius: TV_FRAME_CHROME.radius + 'px',
      background: TV_FRAME_CHROME.background,
      border: TV_FRAME_CHROME.border,
      boxShadow: TV_FRAME_CHROME.shadow,
    });
    tv.style.borderRadius = TV_FRAME_CHROME.screenRadius + 'px';
    tv.style.boxShadow = TV_FRAME_CHROME.screenShadow;
    Object.assign(led.style, {
      bottom: (FRAME_BEZEL + FRAME_CHIN) / 2 - 3 + 'px',
      width: TV_FRAME_CHROME.ledSize + 'px',
      height: TV_FRAME_CHROME.ledSize + 'px',
      background: TV_FRAME_CHROME.ledBackground,
      boxShadow: TV_FRAME_CHROME.ledShadow,
    });
  } else {
    tvFrame.removeAttribute('style');
    tv.style.borderRadius = '';
    tv.style.boxShadow = '';
  }
}
fit();
requestAnimationFrame(fit);
addEventListener('resize', fit);

// ── Review state ──────────────────────────────────────────────────────────
const VIDEOS = { pan: 'assets/video/upsell-pan.mp4', crawl: 'assets/video/upsell-crawl.mp4' };
// Which wall each Figma version was drawn over: v1's left fade and v2's heavy
// dim both sit on the busy panning wall; v3 has no overlay and needs the
// crawl, whose top half is empty sky.
const DEFAULT_BG = { 1: 'pan', 2: 'pan', 3: 'crawl' };
const DEFAULT_AUTO = { 1: false, 2: true, 3: true };
const DEFAULT_COUNTDOWN = 10;
const parseCountdown = (v) => Math.min(60, Math.max(1, Math.round(Number(v)) || DEFAULT_COUNTDOWN));
// The hub's dwell time is independent of the upsell CTA countdown.
const DEFAULT_HUB_DELAY = 3;
const DEFAULT_LOADING_DELAY = 2; // matches the onboarding ident's loading pause
const parseDelay = (v, fallback) => Number.isFinite(Number(v)) && Number(v) > 0
  ? Math.min(60, Math.max(1, Math.round(Number(v)))) : fallback;
const parseHubDelay = (v) => parseDelay(v, DEFAULT_HUB_DELAY);
const parseLoadingDelay = (v) => parseDelay(v, DEFAULT_LOADING_DELAY);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  screen: null,
  version: ['1', '2', '3', '4', '5'].includes(query.get('v')) ? Number(query.get('v')) : 1,
  bg: VIDEOS[query.get('bg')] ? query.get('bg') : null, // null → version default
  // Auto-advance countdown on the CTA. null → version default (as in Figma:
  // v1 waits for OK, v2/v3 count down).
  auto: { on: true, 1: true, true: true, off: false, 0: false, false: false }[query.get('auto')] ?? null,
  countdown: parseCountdown(query.get('countdown')), // seconds
  hubDelay: parseHubDelay(query.get('hubDelay')), // seconds, after the hub is ready
  loadingDelay: parseLoadingDelay(query.get('loadingDelay')), // seconds on the ident's final frame
  sound: query.get('sound') !== 'off',
  focus: null,
  checked: false,
};
const timers = new Set();
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
const usesHubPreview = () => state.version === 4 || state.version === 5;
const afterIdent = () => usesHubPreview() ? 'loading' : 'preroll';

function syncUrl() {
  const p = new URLSearchParams(location.search);
  p.set('v', String(state.version));
  if (state.bg) p.set('bg', state.bg); else p.delete('bg');
  if (state.auto === null) p.delete('auto'); else p.set('auto', state.auto ? 'on' : 'off');
  if (state.countdown === DEFAULT_COUNTDOWN) p.delete('countdown'); else p.set('countdown', String(state.countdown));
  if (state.hubDelay === DEFAULT_HUB_DELAY) p.delete('hubDelay'); else p.set('hubDelay', String(state.hubDelay));
  if (state.loadingDelay === DEFAULT_LOADING_DELAY) p.delete('loadingDelay'); else p.set('loadingDelay', String(state.loadingDelay));
  history.replaceState(null, '', '?' + p.toString());
}

function syncTools() {
  controls.querySelectorAll('[data-version]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.version) === state.version));
  controls.querySelectorAll('[data-bg]').forEach((b) => b.classList.toggle('is-on', (b.dataset.bg === 'auto' && !state.bg) || b.dataset.bg === state.bg));
  controls.querySelectorAll('[data-auto]').forEach((b) => b.classList.toggle('is-on', b.dataset.auto === (state.auto === null ? 'default' : state.auto ? 'on' : 'off')));
  controls.querySelectorAll('[data-countdown]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.countdown) === state.countdown));
  const cdInput = $('#countdownInput');
  if (document.activeElement !== cdInput) cdInput.value = String(state.countdown);
  controls.querySelectorAll('[data-hub-delay]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.hubDelay) === state.hubDelay));
  const hubInput = $('#hubDelayInput');
  if (document.activeElement !== hubInput) hubInput.value = String(state.hubDelay);
  controls.querySelectorAll('[data-loading-delay]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.loadingDelay) === state.loadingDelay));
  const loadingInput = $('#loadingDelayInput');
  if (document.activeElement !== loadingInput) loadingInput.value = String(state.loadingDelay);
  controls.querySelectorAll('[data-upsell-only]').forEach((el) => { el.hidden = usesHubPreview(); });
  controls.querySelectorAll('[data-hub-only]').forEach((el) => { el.hidden = !usesHubPreview(); });
  controls.querySelectorAll('[data-jump]').forEach((b) => b.classList.toggle('is-on', b.dataset.jump === state.screen));
  controls.querySelector('[data-jump="paywall"]').textContent = usesHubPreview() ? '5 · Paywall' : '4 · Paywall';
  $('#soundTop').textContent = state.sound ? 'Sound On' : 'Sound Off';
}
const currentBg = () => state.bg || DEFAULT_BG[state.version];
const currentAuto = () => (state.auto === null ? DEFAULT_AUTO[state.version] : state.auto);

// ── Focus ─────────────────────────────────────────────────────────────────
function setFocus(key) {
  state.focus = key;
  document.querySelectorAll('[data-focus]').forEach((el) => el.classList.toggle('is-focused', el.dataset.focus === key));
}

// ── Screens ───────────────────────────────────────────────────────────────
const identVideo = $('#identVideo');
const prerollVideo = $('#prerollVideo');
const prerollScreen = $('#screen-preroll');
const ctaLabel = $('#prerollCtaLabel');
let loadingComplete = false;
const hubPreview = setupHubPreview(() => {
  if (state.screen === 'loading') revealLoadedHub();
  else scheduleHubPaywall();
});

function revealLoadedHub() {
  if (state.screen === 'loading' && loadingComplete && hubPreview.ready && controls.hidden && !document.hidden) go('hub');
}

function scheduleLoading() {
  if (state.screen !== 'loading') return;
  clearTimers();
  loadingComplete = false;
  if (controls.hidden && !document.hidden) {
    later(() => { loadingComplete = true; revealLoadedHub(); }, state.loadingDelay * 1000);
  }
}

function scheduleHubPaywall() {
  if (state.screen !== 'hub') return;
  clearTimers();
  // Rehearsal controls and background tabs pause the preview. Closing the
  // panel or returning to the tab gives the hub its full chosen duration.
  if (hubPreview.ready && controls.hidden && !document.hidden) {
    later(() => go('paywall'), state.hubDelay * 1000);
  }
}
function schedulePreview() {
  if (state.screen === 'loading') scheduleLoading();
  else scheduleHubPaywall();
}
document.addEventListener('visibilitychange', schedulePreview);

function preloadHub() {
  if (usesHubPreview()) hubPreview.load(state.version === 4);
  else hubPreview.reset();
}

function stopMedia() {
  identVideo.onended = null;
  identVideo.onerror = null;
  [identVideo, prerollVideo].forEach((v) => { v.pause(); });
}

function play(video) {
  video.muted = !state.sound;
  const p = video.play();
  // Autoplay with sound needs a gesture; fall back to muted rather than stall.
  if (p && p.catch) p.catch(() => {
    if (!video.closest('.screen').classList.contains('is-active')) return;
    video.muted = true;
    video.play().catch(() => {});
  });
}

function go(screen) {
  if (screen === 'preroll' && usesHubPreview()) screen = 'loading';
  if (screen === 'hub' || screen === 'loading') {
    if (!usesHubPreview()) screen = 'preroll';
    else if (screen === 'hub' && !hubPreview.ready) screen = 'loading';
  }
  clearTimers();
  stopMedia();
  state.screen = screen;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === screen));
  enter[screen]();
  syncTools();
}

const enter = {
  home() {
    setFocus('home-cta');
    preloadHub();
  },
  ident() {
    setFocus(null);
    preloadHub();
    identVideo.currentTime = 0;
    const finish = () => { if (state.screen === 'ident') go(afterIdent()); };
    identVideo.onended = finish;
    identVideo.onerror = finish;
    play(identVideo);
    // The ident is ~5s; if it stalls (slow network, deferred media load),
    // don't strand the flow on its poster.
    later(finish, 9000);
  },
  loading() {
    setFocus(null);
    preloadHub();
    scheduleLoading();
  },
  hub() {
    setFocus(null);
    preloadHub();
    scheduleHubPaywall();
  },
  preroll() {
    hubPreview.reset();
    prerollScreen.dataset.version = String(state.version);
    loadPrerollVideo();
    setFocus(null);
    const auto = currentAuto();
    let n = state.countdown;
    ctaLabel.innerHTML = auto ? countdownLabel(n) : 'Get Started';

    // Restart the reveal from scratch (a reflow between, so it replays).
    prerollScreen.classList.remove(...STAGES);
    void prerollScreen.offsetWidth;
    // v1 reveals tile and copy together; v2/v3 land the tile alone in the
    // centre first, then slide it into place as the copy arrives.
    const t = reducedMotion ? { tile: 0, text: 0, cta: 0, focus: 300 }
      : state.version === 1 ? { tile: 150, text: 450, cta: 1100, focus: 1800 }
      : { tile: 150, text: 1250, cta: 1950, focus: 2650 };
    later(() => prerollScreen.classList.add('s-tile'), t.tile);
    later(() => prerollScreen.classList.add('s-text'), t.text);
    later(() => prerollScreen.classList.add('s-cta'), t.cta);
    // The CTA shows unfocused first so it reads as a button, then takes focus.
    later(() => {
      revealPreroll();
      if (!auto) return;
      const tick = () => {
        n -= 1;
        if (n === 0) return go('paywall');
        ctaLabel.innerHTML = countdownLabel(n);
        later(tick, 1000);
      };
      later(tick, 1000);
    }, t.focus);
  },
  paywall() {
    state.checked = false;
    renderCheck();
    setFocus(null);
    const screen = $('#screen-paywall');
    screen.classList.remove('is-ready', 'is-processing', 'show-toast');
    // The system sheet opens on a spinner, then the terms fade in focused on
    // the authorization checkbox (Continue is disabled until it's ticked).
    later(() => { screen.classList.add('is-ready'); setFocus('pw-check'); }, 1100);
  },
};

const countdownLabel = (n) => `Get Started in <span class="pr-cta__num">${n}</span>`;
const STAGES = ['s-tile', 's-text', 's-cta'];
/** Finish the pre-roll reveal and focus the CTA (also used to skip ahead). */
function revealPreroll() {
  prerollScreen.classList.add(...STAGES);
  setFocus('preroll-cta');
}

function loadPrerollVideo() {
  const src = VIDEOS[currentBg()];
  if (!prerollVideo.src.endsWith(src)) {
    prerollVideo.src = src;
    prerollVideo.currentTime = 0;
  }
  play(prerollVideo);
}

// ── Paywall ───────────────────────────────────────────────────────────────
function renderCheck() {
  const check = $('.pw-check');
  check.classList.toggle('is-checked', state.checked);
  check.setAttribute('aria-checked', String(state.checked));
  $('.pw-btn--primary').disabled = !state.checked;
}

function toggleCheck() {
  state.checked = !state.checked;
  renderCheck();
  const screen = $('#screen-paywall');
  if (state.checked) {
    // Ticking it moves focus straight to Continue, as on device.
    setFocus('pw-continue');
    screen.classList.add('show-toast');
  } else {
    screen.classList.remove('show-toast');
  }
}

function startSubscription() {
  if (!state.checked) return;
  const screen = $('#screen-paywall');
  setFocus(null);
  screen.classList.add('is-processing');
  later(() => { location.href = hubUrl(); }, 1400);
}

// ── Input ─────────────────────────────────────────────────────────────────
// Each focus key's neighbours and OK action. Anything missing is a no-op.
const NAV = {
  'home-cta': { ok: () => go('ident') },
  'preroll-cta': { ok: () => go('paywall') },
  'pw-check': { ok: toggleCheck, down: () => state.checked && 'pw-continue' },
  'pw-continue': { ok: startSubscription, up: 'pw-check', right: 'pw-change' },
  'pw-change': { ok: () => {}, up: 'pw-check', left: () => state.checked && 'pw-continue' },
};

function back() {
  if (state.screen === 'paywall') go(usesHubPreview() ? 'hub' : 'preroll');
  else if (state.screen !== 'home') go('home');
  // Back on the Fire TV home leaves the prototype for the versions landing page.
  else location.href = './';
}

function onKey(e) {
  // P / R / remote Menu (red) toggles the controls panel, as in the onboarding.
  const typing = e.target.tagName === 'INPUT';
  if ([80, 82, 403].includes(e.keyCode) && !e.metaKey && !e.ctrlKey && !typing) {
    e.preventDefault();
    return toggleControls();
  }
  const panel = e.target.closest && e.target.closest('#controls');
  if (panel) {
    // Inside the panel: Back closes it; arrows walk its buttons.
    // The number field keeps its own editing keys (Backspace, arrows).
    if (typing && e.key !== 'Escape') return;
    if (['Escape', 'Backspace'].includes(e.key)) {
      e.preventDefault();
      toggleControls(false);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const all = Array.from(panel.querySelectorAll('button,a,input')).filter((el) => el.getClientRects().length);
      const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
      all[(all.indexOf(e.target) + step + all.length) % all.length].focus();
    }
    return;
  }
  const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  const isOk = e.key === 'Enter' || e.key === ' ';
  const isBack = e.key === 'Escape' || e.key === 'Backspace';
  if (!dir && !isOk && !isBack) return;
  // Toolbar buttons keep their own keyboard behaviour.
  if (e.target.closest && e.target.closest('#tools')) return;
  if (e.target.closest && e.target.closest('#hubStatus') && !isBack) return;
  if (e.target.blur) e.target.blur();
  e.preventDefault();
  if (isBack) return back();
  if (state.screen === 'ident' && isOk) return go(afterIdent()); // skip the ident
  if (state.screen === 'preroll' && !state.focus) {
    // Mid-reveal: any key finishes it rather than being swallowed. The pending
    // focus timer still fires and starts the countdown (if it's on).
    if (isOk || dir) revealPreroll();
    return;
  }
  const node = NAV[state.focus];
  if (!node) return;
  if (isOk) return node.ok && node.ok();
  const next = typeof node[dir] === 'function' ? node[dir]() : node[dir];
  if (next) setFocus(next);
}
addEventListener('keydown', onKey);

// Pointer: clicking a focusable focuses it and presses OK.
stage.addEventListener('click', (e) => {
  const el = e.target.closest('[data-focus]');
  if (!el || el.disabled) return;
  setFocus(el.dataset.focus);
  NAV[el.dataset.focus]?.ok?.();
});

// ── Toolbar + controls panel ──────────────────────────────────────────────
function toggleControls(open = controls.hidden) {
  controls.hidden = !open;
  if (document.activeElement) document.activeElement.blur();
  if (open) controls.querySelector('button')?.focus();
  schedulePreview();
}
function toggleSound() {
  state.sound = !state.sound;
  [identVideo, prerollVideo].forEach((v) => { v.muted = !state.sound; });
  syncTools();
}
$('#controlsToggle').onclick = () => toggleControls();
$('#resetTop').onclick = () => { go('home'); document.activeElement?.blur(); };
$('#soundTop').onclick = () => { toggleSound(); document.activeElement?.blur(); };
$('#fullTop').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
  document.activeElement?.blur();
};
$('#hubLink').href = hubUrl();

controls.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.version) {
    state.version = Number(b.dataset.version);
    syncUrl();
    go(afterIdent());
  } else if (b.dataset.bg) {
    state.bg = b.dataset.bg === 'auto' ? null : b.dataset.bg;
    syncUrl();
    if (state.screen === 'preroll') go('preroll'); else syncTools();
  } else if (b.dataset.countdown) {
    setCountdown(b.dataset.countdown);
  } else if (b.dataset.hubDelay) {
    setHubDelay(b.dataset.hubDelay);
  } else if (b.dataset.loadingDelay) {
    setLoadingDelay(b.dataset.loadingDelay);
  } else if (b.dataset.auto) {
    state.auto = { on: true, off: false, default: null }[b.dataset.auto];
    syncUrl();
    if (state.screen === 'preroll') go('preroll'); else syncTools();
  } else if (b.dataset.jump) {
    go(b.dataset.jump);
  }
});

function setCountdown(v) {
  state.countdown = parseCountdown(v);
  syncUrl();
  // Restart the pre-roll so the new length is seen from the top.
  if (state.screen === 'preroll') go('preroll'); else syncTools();
}
$('#countdownInput').addEventListener('change', (e) => setCountdown(e.target.value));

function setHubDelay(value) {
  state.hubDelay = parseHubDelay(value);
  $('#hubDelayInput').value = String(state.hubDelay);
  syncUrl();
  syncTools();
  scheduleHubPaywall();
}
$('#hubDelayInput').addEventListener('change', (e) => setHubDelay(e.target.value));

function setLoadingDelay(value) {
  state.loadingDelay = parseLoadingDelay(value);
  $('#loadingDelayInput').value = String(state.loadingDelay);
  syncUrl();
  syncTools();
  scheduleLoading();
}
$('#loadingDelayInput').addEventListener('change', (e) => setLoadingDelay(e.target.value));

// Every reviewable variation as a direct link, so a link can be shared
// straight to the state someone should look at.
const VARIATIONS = [
  ['Full flow (from the Fire TV ad)', ''],
  ['Fire TV ad', 'screen=home'],
  ['Weekend ident', 'screen=ident'],
  ['V1 · left stack · panning', 'screen=preroll&v=1'],
  ['V1 · left stack · crawling', 'screen=preroll&v=1&bg=crawl'],
  ['V2 · centred, dimmed · panning', 'screen=preroll&v=2'],
  ['V2 · centred, dimmed · crawling', 'screen=preroll&v=2&bg=crawl'],
  ['V3 · centred, clear · crawling', 'screen=preroll&v=3'],
  ['V3 · centred, clear · panning', 'screen=preroll&v=3&bg=pan'],
  ['V1 · auto-advance countdown on', 'screen=preroll&v=1&auto=on'],
  ['V2 · countdown off (waits for OK)', 'screen=preroll&v=2&auto=off'],
  ['V3 · countdown off (waits for OK)', 'screen=preroll&v=3&auto=off'],
  ['Hub loading · ident with canary spinner', 'screen=loading&v=4'],
  ['V4 · hub with trial hero · full flow', 'v=4'],
  ['V4 · jump to hub with trial hero', 'screen=hub&v=4'],
  ['V5 · hub without trial hero · full flow', 'v=5'],
  ['V5 · jump to hub without trial hero', 'screen=hub&v=5'],
  ['Fire TV paywall', 'screen=paywall'],
  ['Hub after subscribing', null],
];
$('#variationLinks').innerHTML = '<li><a href="./">All versions (landing page)</a></li>' +
  VARIATIONS.map(([label, q]) =>
    `<li><a href="${q === null ? hubUrl() : '?' + q}">${label}</a></li>`).join('');

// ── Paywall background: the game wall, tilted, as on device ─────────────

const startScreen = ['home', 'ident', 'preroll', 'loading', 'hub', 'paywall'].includes(query.get('screen')) ? query.get('screen') : 'home';
go(startScreen);

// Reveal the TV once it's fitted and its fonts are in (or after a short cap,
// so a slow font never blanks the page). See the inline style in play.html.
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1000))]).then(() => {
  fit();
  document.body.classList.add('ready');
});
