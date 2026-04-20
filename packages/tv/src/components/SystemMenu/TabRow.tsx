import type { SystemMenuTab } from './types';

const TABS: { id: SystemMenuTab; label: string; icon: JSX.Element }[] = [
  {
    id: 'resume',
    label: 'Resume',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'controllers',
    label: 'Controllers',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="10" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M7 12h2M8 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
        <circle cx="17" cy="13" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'exit',
    label: 'Exit Game',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface TabRowProps {
  activeTab: SystemMenuTab;
  layerFocused: boolean;
}

export function TabRow({ activeTab, layerFocused }: TabRowProps) {
  return (
    <div style={{ display: 'flex', gap: '1.5vw', justifyContent: 'center', marginBottom: '3vh' }}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <div
            key={tab.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6vw',
              padding: '1.2vh 2vw',
              border: '2px solid',
              borderColor: isActive && layerFocused ? '#FFFFFF' : isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
              borderRadius: '8px',
              fontSize: '1.4vw',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              transition: 'all 120ms ease-out',
            }}
          >
            <span style={{ display: 'inline-flex' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
