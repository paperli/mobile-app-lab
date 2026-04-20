import type { ComponentType } from 'react';
import ButtonStory from './Button';
import SystemButtonStory from './SystemButton';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
  { slug: 'system-button', label: 'System Button', Component: SystemButtonStory },
];
