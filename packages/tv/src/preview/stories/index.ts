import type { ComponentType } from 'react';
import ButtonStory from './Button';
import DialogStory from './Dialog';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
  { slug: 'dialog', label: 'Dialog', Component: DialogStory },
];
