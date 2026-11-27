import type { ScoreResult } from '../schema/types';
import { percent } from '../schema/types';
import type { ScormAdapter } from './api';
import { SUSPEND_LIMIT_12, SUSPEND_LIMIT_2004, decodeSuspend, encodeSuspend } from './suspend';

export interface ProgressUpdate {
  /** Current score, or null when the project has no scored blocks. */
  score: ScoreResult | null;
  /** Everything required is finished. */
  completed: boolean;
}

/**
 * Drives the SCORM adapter. With no adapter (standalone/preview) every call is a no-op
 * so the activity still runs normally.
 */
export class Reporter {
  private active = false;
  private terminated = false;
  private started: number;

  constructor(
    private adapter: ScormAdapter | null,
    private passingScore: number,
    private now: () => number = Date.now,
  ) {
    this.started = now();
  }

  get connected(): boolean {
    return this.active;
  }

  start(): unknown {
    if (!this.adapter) return null;
    this.active = this.adapter.initialize();
    if (!this.active) return null;
    this.adapter.setCompletion(false);
    this.adapter.commit();
    return decodeSuspend(this.adapter.getSuspendData());
  }

  saveProgress(state: unknown): void {
    if (!this.active || !this.adapter) return;
    const limit = this.adapter.version === '1.2' ? SUSPEND_LIMIT_12 : SUSPEND_LIMIT_2004;
    const encoded = encodeSuspend(state, limit);
    if (encoded === null) return;
    this.adapter.setSuspendData(encoded);
    this.adapter.commit();
  }

  /** Report score so far, completion, and (once complete) pass/fail; then commit. */
  update(p: ProgressUpdate): void {
    if (!this.active || !this.adapter) return;
    const a = this.adapter;
    if (p.score) a.setScore(p.score.raw, 0, p.score.max);
    a.setCompletion(p.completed);
    if (p.completed && p.score) a.setSuccess(percent(p.score) >= this.passingScore);
    a.commit();
  }

  terminate(): void {
    if (!this.active || !this.adapter || this.terminated) return;
    this.terminated = true;
    this.adapter.setSessionTime((this.now() - this.started) / 1000);
    this.adapter.commit();
    this.adapter.terminate();
  }
}
