import type { ScoreResult } from '../../schema/types';
import type { McContent, McQuestion } from './type';

/**
 * Score one question as a fraction 0..1.
 * Single answer: all-or-nothing. Multi answer: (right picks - wrong picks) / total right, floored at 0.
 */
export function scoreQuestion(q: McQuestion, selected: readonly number[]): number {
  const chosen = new Set(selected);
  const correct = q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
  if (correct.length === 0) return 0;
  const right = correct.filter((i) => chosen.has(i)).length;
  const wrong = [...chosen].filter((i) => !q.options[i]?.correct).length;
  if (!q.multi) return right === 1 && wrong === 0 ? 1 : 0;
  return Math.max(0, (right - wrong) / correct.length);
}

/** `answers[i]` = selected option indexes for question i (original option order). */
export function scoreMultipleChoice(
  content: McContent,
  answers: readonly (readonly number[])[],
): ScoreResult {
  const total = content.questions.length;
  if (total === 0) return { raw: 0, max: 100 };
  const sum = content.questions.reduce((acc, q, i) => acc + scoreQuestion(q, answers[i] ?? []), 0);
  return { raw: Math.round((sum / total) * 100), max: 100 };
}
