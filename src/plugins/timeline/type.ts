import type { BlockTypeDef } from '../types';

export interface TimelineEvent {
  id: string;
  /** Free text: "1969", "March 2020", "Step 1"... */
  date: string;
  title: string;
  html: string;
  image: string | null;
}

export interface TimelineProps {
  orientation: 'horizontal' | 'vertical';
  /** Empty = project accent colour. */
  color: string;
  events: TimelineEvent[];
}

export const timelineDef: BlockTypeDef<TimelineProps> = {
  type: 'timeline',
  label: 'Timeline',
  description: 'Events in order along a line; learners pick one to read its details.',
  category: 'activity',
  icon: 'timeline',
  defaultSize: { w: 860, h: 340 },
  createDefault: () => ({
    orientation: 'horizontal',
    color: '',
    events: [
      {
        id: 'e1',
        date: '1990',
        title: 'First event',
        html: '<p>Describe what happened.</p>',
        image: null,
      },
      {
        id: 'e2',
        date: '2005',
        title: 'Second event',
        html: '<p>Describe what happened next.</p>',
        image: null,
      },
      {
        id: 'e3',
        date: '2020',
        title: 'Third event',
        html: '<p>Describe how it ended up.</p>',
        image: null,
      },
    ],
  }),
};
