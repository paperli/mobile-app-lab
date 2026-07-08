import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceEnum,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2';
import { useState, useEffect, useRef } from 'react';
import { TVScreen } from '@mobile-app-lab/shared';

/** Maps TVScreen to Rive viewState enum values */
function tvScreenToViewState(tvScreen: TVScreen): string {
  switch (tvScreen) {
    case 'hub':
      return 'initialize';
    case 'loading':
      return 'launching';
    case 'game-menu':
    case 'playlist-select':
    case 'party-playlist-select':
    case 'in-game':
      return 'ready';
    default:
      return 'initialize';
  }
}

/** Shared hook to load the .riv buffer once */
function useRiveBuffer() {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    fetch('/uikit.riv')
      .then((res) => res.arrayBuffer())
      .then((buf) => setBuffer(buf))
      .catch((err) => console.error('[RiveEdgeGlow] Failed to load .riv:', err));
  }, []);

  return buffer;
}

interface RiveEdgeGlowProps {
  tvScreen: TVScreen;
  /** Normalized volume 0-1 from useVoiceInput */
  volume: number;
}

export function RiveEdgeGlow({ tvScreen, volume }: RiveEdgeGlowProps) {
  const buffer = useRiveBuffer();
  const viewState = tvScreenToViewState(tvScreen);

  const { RiveComponent: EdgeGlowing, rive: edgeRive } = useRive(
    buffer
      ? {
          buffer,
          artboard: 'edge_glowing',
          stateMachines: 'MainStateMachine',
          autoplay: true,
          autoBind: false,
        }
      : null
  );

  const edgeVM = useViewModel(edgeRive, { name: 'MainViewModal' });
  const edgeVMI = useViewModelInstance(edgeVM, { rive: edgeRive });
  const { setValue: setEdgeViewState } = useViewModelInstanceEnum('viewState', edgeVMI);
  const { setValue: setEdgeVolume } = useViewModelInstanceNumber('volume', edgeVMI);

  const setEdgeVolumeRef = useRef(setEdgeVolume);
  useEffect(() => { setEdgeVolumeRef.current = setEdgeVolume; }, [setEdgeVolume]);

  useEffect(() => {
    if (setEdgeViewState) setEdgeViewState(viewState);
  }, [viewState, setEdgeViewState]);

  // Map volume (0-1) to 0-100 and feed into edge_glowing
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!setEdgeVolume) return;
    let running = true;
    const update = () => {
      if (!running) return;
      setEdgeVolumeRef.current?.(Math.round(volumeRef.current * 100));
      requestAnimationFrame(update);
    };
    update();
    return () => { running = false; };
  }, [setEdgeVolume]);

  if (!buffer) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <EdgeGlowing style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

interface RiveGameLogoProps {
  tvScreen: TVScreen;
}

export function RiveGameLogo({ tvScreen }: RiveGameLogoProps) {
  const buffer = useRiveBuffer();
  const viewState = tvScreenToViewState(tvScreen);

  const { RiveComponent: GameLogo, rive: logoRive } = useRive(
    buffer
      ? {
          buffer,
          artboard: 'game_logo_box',
          stateMachines: 'MainStateMachine',
          autoplay: true,
          autoBind: false,
        }
      : null
  );

  const logoVM = useViewModel(logoRive, { name: 'MainViewModal' });
  const logoVMI = useViewModelInstance(logoVM, { rive: logoRive });
  const { setValue: setLogoViewState } = useViewModelInstanceEnum('viewState', logoVMI);

  useEffect(() => {
    if (setLogoViewState) setLogoViewState(viewState);
  }, [viewState, setLogoViewState]);

  if (!buffer) return null;

  return (
    <div style={{ position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)', width: '180px', height: '300px', zIndex: 9999, pointerEvents: 'none' }}>
      <GameLogo style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
