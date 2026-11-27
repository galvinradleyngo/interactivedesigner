/** Decides when the video must stop for a checkpoint. Pure, so it can be tested without a video. */

export interface GateCheckpoint {
  id: string;
  time: number;
}

export type GateAction =
  | { type: 'none' }
  /** Pause and show this checkpoint. `seekTo` is set when the learner jumped past it and must go back. */
  | { type: 'show'; id: string; seekTo: number | null };

/** How far past a checkpoint normal playback can drift between checks before we call it a skip. */
const DRIFT = 0.3;
/** Show slightly early so the pause lands on the checkpoint, not after it. */
const EARLY = 0.05;

/**
 * @param pending unresolved checkpoints, earliest first
 * @param t current playback time (seconds)
 * @param ended the video has reached its end
 */
export function gate(pending: readonly GateCheckpoint[], t: number, ended: boolean): GateAction {
  const next = pending[0];
  if (!next) return { type: 'none' };
  if (ended) return { type: 'show', id: next.id, seekTo: null };
  if (t < next.time - EARLY) return { type: 'none' };
  return { type: 'show', id: next.id, seekTo: t > next.time + DRIFT ? next.time : null };
}
