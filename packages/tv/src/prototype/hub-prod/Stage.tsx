import { useLayoutEffect, useState, type ReactNode } from 'react';
import { FRAME_BEZEL, FRAME_CHIN, STAGE_H, STAGE_W, TV_FRAME_CHROME, fitStage } from '@weekend/ui/device';

/**
 * Presents a 1920×1080 design-px stage scaled to the viewport, inside a TV
 * bezel when the viewport is sub-native (the shared tvFrame rule).
 */
export function TvStage({ children, framed = true }: { children: ReactNode; framed?: boolean }) {
  const [fit, setFit] = useState({ scale: 1, framed: false });
  useLayoutEffect(() => {
    const update = () => setFit(fitStage(window.innerWidth, window.innerHeight, framed));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [framed]);

  const { scale } = fit;
  const stage = (
    <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: fit.framed ? TV_FRAME_CHROME.pageBackground : '#000',
        overflow: 'hidden',
      }}
    >
      {fit.framed ? (
        <div
          style={{
            width: STAGE_W * scale + 2 * FRAME_BEZEL,
            height: STAGE_H * scale + 2 * FRAME_BEZEL + FRAME_CHIN,
            padding: `${FRAME_BEZEL}px ${FRAME_BEZEL}px ${FRAME_BEZEL + FRAME_CHIN}px`,
            boxSizing: 'border-box',
            borderRadius: TV_FRAME_CHROME.radius,
            background: TV_FRAME_CHROME.background,
            border: TV_FRAME_CHROME.border,
            boxShadow: TV_FRAME_CHROME.shadow,
            position: 'relative',
          }}
        >
          <div style={{ borderRadius: TV_FRAME_CHROME.screenRadius, overflow: 'hidden', boxShadow: TV_FRAME_CHROME.screenShadow, background: '#000' }}>
            {stage}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: (FRAME_BEZEL + FRAME_CHIN) / 2 - 3,
              left: '50%',
              transform: 'translateX(-50%)',
              width: TV_FRAME_CHROME.ledSize,
              height: TV_FRAME_CHROME.ledSize,
              borderRadius: '50%',
              background: TV_FRAME_CHROME.ledBackground,
              boxShadow: TV_FRAME_CHROME.ledShadow,
            }}
          />
        </div>
      ) : (
        stage
      )}
    </div>
  );
}
