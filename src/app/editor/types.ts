import type { RefObject } from 'react';
import type { ProjectDoc, StageElement } from '../../schema/types';

/** Props every block's inspector panel receives. */
export interface PanelProps<P> {
  props: P;
  el: StageElement;
  doc: ProjectDoc;
  /** Replace the block's props. `key` merges rapid edits (typing) into one undo step. */
  onChange(props: P, key?: string): void;
  patchEl(patch: Partial<StageElement>, key?: string): void;
  addImage(file: File): Promise<string>;
  /** Selected sub-item (hotspot, drop zone, card...) shared with the on-canvas overlay. */
  sub: string | null;
  setSub(id: string | null): void;
  startBlockEdit(): void;
}

/** On-canvas editing layer for an activity (hotspot markers, drop zones...). */
export interface OverlayProps<P> {
  props: P;
  onChange(props: P, key?: string): void;
  sub: string | null;
  setSub(id: string | null): void;
  /** The overlay's own box; its size maps to 100 x 100 percent units. */
  boxRef: RefObject<HTMLDivElement | null>;
  hint?: string;
}
