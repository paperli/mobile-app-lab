import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceEnum,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2';
import { useState, useEffect, useRef } from 'react';

interface RiveEdgeGlowProps {
  /** Normalized volume 0-1 from useVoiceInput */
  volume: number;
}

export function RiveEdgeGlow({ volume }: RiveEdgeGlowProps) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    fetch('/uikit.riv')
      .then((res) => res.arrayBuffer())
      .then((buf) => setBuffer(buf))
      .catch((err) => console.error('[RiveEdgeGlow] Failed to load .riv:', err));
  }, []);

  // Edge glowing
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
  const edgeViewStateHook = useViewModelInstanceEnum('viewState', edgeVMI);
  const edgeVolumeHook = useViewModelInstanceNumber('volume', edgeVMI);
  const setEdgeViewState = edgeViewStateHook?.setValue;
  const setEdgeVolume = edgeVolumeHook?.setValue;

  useEffect(() => {
    console.log('[RiveEdgeGlow] edgeRive:', !!edgeRive, 'edgeVM:', !!edgeVM, 'edgeVMI:', !!edgeVMI);
    console.log('[RiveEdgeGlow] viewState hook:', !!edgeViewStateHook?.value, 'value:', edgeViewStateHook?.value);
    console.log('[RiveEdgeGlow] volume hook:', !!edgeVolumeHook?.value !== undefined, 'value:', edgeVolumeHook?.value);
  }, [edgeRive, edgeVM, edgeVMI, edgeViewStateHook, edgeVolumeHook]);

  // Keep a ref to setEdgeVolume so we can call it from rAF
  const setEdgeVolumeRef = useRef(setEdgeVolume);
  useEffect(() => { setEdgeVolumeRef.current = setEdgeVolume; }, [setEdgeVolume]);

  // Game logo
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

  // Set viewState to 'ready' on both
  useEffect(() => {
    if (setEdgeViewState) setEdgeViewState('ready');
  }, [setEdgeViewState]);

  useEffect(() => {
    if (setLogoViewState) setLogoViewState('ready');
  }, [setLogoViewState]);

  // Map volume (0-1) to 0-100 and feed into edge_glowing
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!setEdgeVolume) {
      console.log('[RiveEdgeGlow] setEdgeVolume not ready yet');
      return;
    }
    console.log('[RiveEdgeGlow] Volume binding ready, starting rAF loop');
    let running = true;
    let logCounter = 0;
    const update = () => {
      if (!running) return;
      const mapped = Math.round(volumeRef.current * 100);
      setEdgeVolumeRef.current?.(mapped);
      // Log every 60 frames (~1 second)
      if (logCounter % 60 === 0) {
        console.log(`[RiveEdgeGlow] raw=${volumeRef.current.toFixed(3)} mapped=${mapped}`);
      }
      logCounter++;
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

      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '180px', height: '300px', zIndex: 1 }}>
        <GameLogo style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
