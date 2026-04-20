import type { TVScreen } from '@mobile-app-lab/shared';

export type SystemMenuTab = 'resume' | 'controllers' | 'exit';
export type SystemMenuLayer = 'tabs' | 'content';

export interface SystemMenuState {
  open: boolean;
  tab: SystemMenuTab;
  layer: SystemMenuLayer;
  contentIndex: number;
}

export interface SystemMenuContext {
  screen: TVScreen;
  gameId?: string;
}
