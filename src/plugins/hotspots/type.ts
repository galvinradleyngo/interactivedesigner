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
  points: number;
  image: string | null;
  /** explore: click to reveal content (unscored). find: click the right spot (scored). */
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
    'Clickable points on an image that reveal text or pictures, or a "find the spot" quiz.',
  category: 'activity',
  icon: 'hotspot',
  defaultSize: { w: 640, h: 420 },
  createDefault: () => ({
    points: 10,
    image: null,
    mode: 'explore',
    prompt: 'Click the correct spot.',
    markerColor: '',
    hotspots: [],
  }),
  isScored: (p) => p.mode === 'find',
  fraction: (p, state) => {
    const pick = (state as HotspotState | null)?.pick;
    return pick && p.hotspots.find((h) => h.id === pick)?.correct ? 1 : 0;
  },
};
