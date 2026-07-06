import type { ComponentType } from 'react';
import ButtonStory from './Button';
import DialogStory from './Dialog';
import TintingStory from './Tinting';
import FocusFrameStory from './FocusFrame';
import ControllersStory from './Controllers';
import SystemMenuStory from './SystemMenu';
import PlaygroundStory from './Playground';
import HubV2Story from './HubV2';
import HubGalleryStory from './HubGallery';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'hub-v2',       label: 'Hub Layout v2',  Component: HubV2Story },
  { slug: 'hub-gallery',  label: 'Hub · All Games',Component: HubGalleryStory },
  { slug: 'playground',   label: 'Playground',     Component: PlaygroundStory },
  { slug: 'button',       label: 'Button',         Component: ButtonStory },
  { slug: 'dialog',       label: 'Dialog',         Component: DialogStory },
  { slug: 'tinting',      label: 'Tinting',        Component: TintingStory },
  { slug: 'focus-frame',  label: 'FocusFrame',     Component: FocusFrameStory },
  { slug: 'controllers',  label: 'Controllers',    Component: ControllersStory },
  { slug: 'system-menu',  label: 'System Menu',    Component: SystemMenuStory },
];
