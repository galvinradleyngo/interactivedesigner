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
  category: 'basic' | 'interaction';
  /** Name of the icon in the app's icon set. */
  icon: string;
  /** Can this interaction be graded (counted toward a score)? Only a few make sense to grade. */
  gradable?: boolean;
  defaultSize: { w: number; h: number };
  createDefault(): P;
  /** For gradable interactions: whether it currently has anything to grade (e.g. correct answers set). */
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
  /** Show author hints (e.g. "add an image") for unfinished blocks: editor and preview only. */
  hints: boolean;
  /** False unless the activity is graded and this interaction counts: show no scores, points or percentages otherwise. */
  graded: boolean;
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

/** Whether an interaction's result counts toward a score (activity graded, and not switched off for this one). */
export function isGraded(settings: { graded?: boolean }, props: Record<string, unknown>): boolean {
  return settings.graded === true && props.graded !== false;
}
