import type { ComponentType } from 'react';
import ButtonStory from './Button';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
];
