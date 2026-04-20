import type { ComponentType } from 'react';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [];
