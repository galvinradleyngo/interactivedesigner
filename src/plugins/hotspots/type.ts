import type { BlockTypeDef } from '../types';

export interface Hotspot {
  id: string;
  /** Position in percent of the block (marker centre). */
  x: number;
  y: number;
  label: string;
  html: string;
  image: string | null;
  /** In 'find' mode: clicking this hotspot is a correct answer. */
  correct: boolean;
}

export interface HotspotProps {
  image: string | null;
  /** explore: click to reveal content. find: a self-check, click the right spot (never graded). */
  mode: 'explore' | 'find';
  prompt: string;
  markerColor: string;
  hotspots: Hotspot[];
}

export interface HotspotState {
  seen: string[];
  pick: string | null;
}

export const hotspotsDef: BlockTypeDef<HotspotProps> = {
  type: 'hotspots',
  label: 'Hotspots',
  description:
    'Clickable points on an image that reveal text or pictures, or a "find the spot" self-check.',
  category: 'interaction',
  icon: 'hotspot',
  defaultSize: { w: 640, h: 420 },
  createDefault: () => ({
    image: null,
    mode: 'explore',
    prompt: 'Click the correct spot.',
    markerColor: '',
    hotspots: [],
  }),
};
