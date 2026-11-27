import type { BlockTypeDef } from '../types';

export interface CompareProps {
  before: string | null;
  after: string | null;
  labelBefore: string;
  labelAfter: string;
  /** Initial slider position, percent. */
  start: number;
}

export const imageCompareDef: BlockTypeDef<CompareProps> = {
  type: 'imageCompare',
  label: 'Image comparison',
  description: 'Two images with a slider to reveal one over the other (before/after).',
  category: 'interaction',
  icon: 'compare',
  defaultSize: { w: 640, h: 400 },
  createDefault: () => ({
    before: null,
    after: null,
    labelBefore: 'Before',
    labelAfter: 'After',
    start: 50,
  }),
};
