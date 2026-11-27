import type { Design, ProjectSettings, StageElement } from '../schema/types';

/**
 * Every block on the canvas (basic elements and activities) is a plugin with:
 *  - a shared definition (this file's BlockTypeDef: defaults + pure scoring),
 *  - a player renderer (framework-free, `player.ts`),
 *  - an editor panel and optional on-canvas overlay (React, app only).
 */
export interface BlockTypeDef<P = Record<string, unknown>> {
  type: string;
  label: string;
  description: string;
  category: 'basic' | 'activity';
  /** Name of the icon in the app's icon set. */
  icon: string;
  defaultSize: { w: number; h: number };
  createDefault(): P;
  /** Whether this block currently counts toward the score. Defaults to false. */
  isScored?(props: P): boolean;
  /** Pure scoring: fraction 0..1 for the learner's recorded state. */
  fraction?(props: P, state: unknown): number;
}

export interface BlockContext<P = Record<string, unknown>> {
  /** Container filling the element's box. */
  root: HTMLElement;
  el: StageElement;
  props: P;
  settings: ProjectSettings;
  design: Design;
  /** True inside the editor canvas: render a static look, attach no learner behavior. */
  editing: boolean;
  resolveMedia(ref: unknown): string;
  /** Previously saved state for this block (from suspend_data). */
  state: unknown;
  setState(s: unknown): void;
  /** Report the block's current result (scored blocks). */
  report(r: { fraction: number; done: boolean }): void;
  goto(target: 'next' | 'prev' | number): void;
}

export interface BlockPlayer<P = Record<string, unknown>> {
  type: string;
  render(ctx: BlockContext<P>): void;
}

/** Points a scored block is worth (editable per block). */
export const DEFAULT_POINTS = 10;
export function blockPoints(props: Record<string, unknown>): number {
  const p = Number(props.points);
  return Number.isFinite(p) && p >= 0 ? p : DEFAULT_POINTS;
}
