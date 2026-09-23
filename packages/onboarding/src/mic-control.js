// One Rive instance per mounted mic screen. Voice-state changes only update
// inputs and attributes; they never replace the canvas or its pointer capture.
export function mountMicControl({ hold, canvas, status, scene, createRive }) {
  let disposed = false, volume, activeInput = null;
  const update = () => {
    const listening = scene.voice === 'listening';
    hold.setAttribute('aria-pressed', String(listening));
    hold.setAttribute('aria-busy', String(scene.voice === 'processing'));
    hold.disabled = scene.voice === 'processing';
    status.textContent = listening ? 'Listening' : scene.voice === 'processing' ? 'Answer sent' : 'Microphone ready';
    if (volume) volume.value = listening ? 65 : 0;
    if (scene.reduced && volume) instance.drawFrame();
    if (!listening) activeInput = null;
  };
  const instance = createRive({
    src: 'assets/controller-uikit.riv', canvas, artboard: 'orb',
    stateMachines: 'MainStateMachine', autoplay: !scene.reduced, autoBind: false,
    onLoad() {
      if (disposed) return;
      const viewModel = instance.viewModelByName('MainViewModel')?.instance();
      if (viewModel) instance.bindViewModelInstance(viewModel);
      volume = instance.viewModelInstance?.number('volume');
      instance.resizeDrawingSurfaceToCanvas();
      update();
      instance.drawFrame();
      hold.classList.add('orb-ready');
    },
    // Keep the same blue, usable static control if the asset fails to load.
    onLoadError() { if (!disposed) hold.classList.add('orb-unavailable'); },
  });
  const start = input => {
    if (activeInput !== null || hold.disabled) return false;
    scene.host.unlock();
    scene.startHold();
    if (scene.voice !== 'listening') return false;
    activeInput = input;
    update();
    return true;
  };
  const finish = (input, cancelled = false) => {
    if (input !== activeInput) return;
    activeInput = null;
    if (cancelled) scene.cancelHold(); else scene.endHold();
    update();
  };
  hold.onpointerdown = e => {
    if (e.button !== 0 || e.isPrimary === false) return;
    e.preventDefault();
    if (start(e.pointerId)) hold.setPointerCapture(e.pointerId);
  };
  hold.onpointerup = e => finish(e.pointerId);
  hold.onpointercancel = e => finish(e.pointerId, true);
  hold.onlostpointercapture = e => finish(e.pointerId, true);
  hold.onkeydown = e => {
    if (![' ', 'Enter'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) start(e.key);
  };
  hold.onkeyup = e => {
    if (![' ', 'Enter'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); finish(e.key);
  };
  hold.onblur = () => {
    if (typeof activeInput === 'string') finish(activeInput, true);
  };
  update();
  return {
    update,
    dispose() {
      disposed = true;
      // Screen navigation cancels input; it must never submit an answer.
      if (activeInput !== null) { activeInput = null; scene.cancelHold(); }
      instance.cleanup();
    },
  };
}
