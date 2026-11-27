import type { BlockTypeDef } from '../types';

/** Item and zone rects are in percent of the block. */
export interface DdItem {
  id: string;
  label: string;
  image: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Id of the zone this item belongs in; null = distractor (belongs nowhere). */
  zone: string | null;
}
export interface DdZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Max items accepted; 0 = unlimited. */
  capacity: number;
}
export interface DdProps {
  points: number;
  bgColor: string;
  background: string | null;
  items: DdItem[];
  zones: DdZone[];
}
export interface DdState {
  /** itemId -> zoneId */
  place: Record<string, string>;
  checked: boolean;
}

/** (right - wrong) / total, floored at 0. Distractors placed in a zone count as wrong. */
export function ddFraction(p: DdProps, place: Record<string, string>): number {
  const total = p.items.filter((i) => i.zone).length;
  if (total === 0) return 0;
  let right = 0;
  let wrong = 0;
  for (const item of p.items) {
    const z = place[item.id];
    if (!z) continue;
    if (item.zone === z) right++;
    else wrong++;
  }
  return Math.max(0, (right - wrong) / total);
}

export const dragDropDef: BlockTypeDef<DdProps> = {
  type: 'dragDrop',
  label: 'Drag and drop',
  description:
    'Learners drag items onto the right zones. Good for labelling, sorting and sequencing.',
  category: 'interaction',
  icon: 'dragdrop',
  gradable: true,
  defaultSize: { w: 720, h: 420 },
  createDefault: () => ({ points: 10, bgColor: '#f8fafc', background: null, items: [], zones: [] }),
  isScored: (p) => p.items.some((i) => i.zone),
  fraction: (p, state) => ddFraction(p, (state as DdState | null)?.place ?? {}),
};
