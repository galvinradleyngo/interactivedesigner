import type { ProjectDoc, ScoreResult } from '../schema/types';
import { blockPoints, isGraded, type BlockTypeDef } from './types';

export interface BlockResult {
  fraction: number;
  done: boolean;
}

export interface Aggregate {
  /** null when the project has no scored blocks. */
  score: ScoreResult | null;
  scoredCount: number;
  allScoredDone: boolean;
}

/** Ids and points of the scored blocks in a project. */
export function scoredBlocks(
  project: ProjectDoc,
  defs: ReadonlyMap<string, BlockTypeDef>,
): { id: string; points: number }[] {
  const out: { id: string; points: number }[] = [];
  for (const page of project.pages) {
    for (const el of page.elements) {
      const def = defs.get(el.type);
      if (
        def?.gradable &&
        def.isScored?.(el.props) &&
        isGraded(project.settings, el.props) &&
        blockPoints(el.props) > 0
      )
        out.push({ id: el.id, points: blockPoints(el.props) });
    }
  }
  return out;
}

/** Overall score = sum of each scored block's fraction x points. Unattempted blocks count 0. */
export function aggregate(
  project: ProjectDoc,
  defs: ReadonlyMap<string, BlockTypeDef>,
  results: Readonly<Record<string, BlockResult | undefined>>,
): Aggregate {
  const scored = scoredBlocks(project, defs);
  if (scored.length === 0) return { score: null, scoredCount: 0, allScoredDone: true };
  let raw = 0;
  let max = 0;
  let allDone = true;
  for (const b of scored) {
    const r = results[b.id];
    max += b.points;
    if (r?.done) raw += Math.min(1, Math.max(0, r.fraction)) * b.points;
    else allDone = false;
  }
  return {
    score: { raw: Math.round(raw * 100) / 100, max },
    scoredCount: scored.length,
    allScoredDone: allDone,
  };
}
