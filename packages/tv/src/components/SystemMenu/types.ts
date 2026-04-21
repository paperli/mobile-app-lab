import type { NavigationDirection, TVScreen } from '@mobile-app-lab/shared';

export type SystemMenuTab = 'resume' | 'controllers' | 'exit';
export type SystemMenuLayer = 'tabs' | 'content';

export interface SystemMenuBounce {
  layer: SystemMenuLayer;
  direction: NavigationDirection;
}

export interface SystemMenuState {
  open: boolean;
  tab: SystemMenuTab;
  layer: SystemMenuLayer;
  contentIndex: number;
  bounce: SystemMenuBounce | null;
}

export interface SystemMenuContext {
  screen: TVScreen;
  gameId?: string;
}
