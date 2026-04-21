import { useEffect, useState } from 'react';
import type { NavigationDirection } from '@mobile-app-lab/shared';
import type { SystemMenuTab } from './types';
import { bounceTransform, bounceTransition } from './bounce';

const BOUNCE_ANIMATION_MS = 150;

const TABS: { id: SystemMenuTab; label: string; icon: (active: boolean, focused: boolean) => JSX.Element }[] = [
  {
    id: 'resume',
    label: 'Resume',
    icon: (_active, focused) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18l-6-6 6-6"
          stroke={focused ? '#0B0B12' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'controllers',
    label: 'Controllers',
    icon: (_active, focused) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="10" rx="4" stroke={focused ? '#0B0B12' : 'currentColor'} strokeWidth="2" />
        <path d="M7 12h2M8 11v2" stroke={focused ? '#0B0B12' : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
        <circle cx="15" cy="11" r="1" fill={focused ? '#0B0B12' : 'currentColor'} />
        <circle cx="17" cy="13" r="1" fill={focused ? '#0B0B12' : 'currentColor'} />
      </svg>
    ),
  },
  {
    id: 'exit',
    label: 'Exit Game',
    icon: (_active, focused) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 6l12 12M18 6l-12 12"
          stroke={focused ? '#0B0B12' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface TabRowProps {
  activeTab: SystemMenuTab;
  layerFocused: boolean;
  bounceDirection: NavigationDirection | null;
}

export function TabRow({ activeTab, layerFocused, bounceDirection }: TabRowProps) {
  // Animate the bounce for a brief window, then settle back — identical to
  // the hub's FocusFrame. Holding an invalid key re-sends the same direction,
  // but React dedupes same-value props so the effect does not re-fire.
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (bounceDirection) {
      setIsAnimating(true);
      const t = window.setTimeout(() => setIsAnimating(false), BOUNCE_ANIMATION_MS);
      return () => window.clearTimeout(t);
    }
  }, [bounceDirection]);

  return (
    <div style={{ display: 'flex', gap: '1.5vw', justifyContent: 'center' }}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const isFocused = isActive && layerFocused;
        const applyBounce = isAnimating && isFocused && bounceDirection !== null;
        return (
          <div
            key={tab.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6vw',
              padding: '1.2vh 2vw',
              background: isFocused ? '#FFFFFF' : 'transparent',
              color: isFocused ? '#0B0B12' : isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
              borderRadius: '8px',
              fontSize: '1.4vw',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              transform: applyBounce ? bounceTransform(bounceDirection) : 'none',
              transition: `background 120ms ease-out, color 120ms ease-out, ${bounceTransition}`,
            }}
          >
            <span style={{ display: 'inline-flex' }}>{tab.icon(isActive, isFocused)}</span>
            <span>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
