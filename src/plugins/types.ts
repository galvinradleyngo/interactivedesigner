import type { ActivityDoc, ScoreResult } from '../schema/types';

/**
 * Shared (framework-free) half of an activity plugin. Each activity type also has
 * an `Editor` (React, app only) and a player renderer (player only).
 */
export interface ActivityTypeDef<C = unknown, A = unknown> {
  type: string;
  label: string;
  description: string;
  /** Current content schema version for this type. */
  contentVersion: number;
  createDefault(): C;
  /** Pure scoring function. `answers` is the player's recorded state. */
  score(content: C, answers: A): ScoreResult;
}

export interface PlayerContext<C = unknown> {
  root: HTMLElement;
  doc: ActivityDoc<C>;
  /** Resolve `media:<id>` references to a usable URL. */
  resolveMedia(ref: string | null | undefined): string;
  /** Previously saved progress (suspend_data), if any. */
  restored: unknown;
  /** Persist progress; the runtime stores it in suspend_data. */
  saveProgress(state: unknown): void;
  /** Report a finished attempt. */
  finish(score: ScoreResult): void;
  /** Called when the learner starts over. */
  reset(): void;
}

export interface PlayerPlugin<C = unknown> {
  type: string;
  render(ctx: PlayerContext<C>): void;
}
