import { newKey } from '../../schema/migrate';
import type { BlockTypeDef } from '../types';
import { scoreMultipleChoice } from './score';

export interface McOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}
export interface McQuestion {
  id: string;
  /** Rich text (sanitized HTML). */
  text: string;
  multi: boolean;
  shuffle: boolean;
  options: McOption[];
}
export interface McContent {
  intro: string;
  questions: McQuestion[];
}
export interface McProps extends McContent {
  points: number;
}

export const uid = (p: string): string => newKey(p);

export function newQuestion(): McQuestion {
  return {
    id: uid('q'),
    text: '<p>Type your question here</p>',
    multi: false,
    shuffle: false,
    options: [
      { id: uid('o'), text: 'Option A', correct: true, feedback: '' },
      { id: uid('o'), text: 'Option B', correct: false, feedback: '' },
    ],
  };
}

/** Learner state: selected option indexes per question, in original option order. */
export interface McState {
  i: number;
  a: number[][];
  c: number[];
  s: number;
  done: boolean;
}

export const multipleChoiceDef: BlockTypeDef<McProps> = {
  type: 'multipleChoice',
  label: 'Multiple choice',
  description: 'Single or multiple answer questions with per-option feedback.',
  category: 'activity',
  icon: 'quiz',
  defaultSize: { w: 720, h: 440 },
  createDefault: () => ({ points: 10, intro: '', questions: [newQuestion()] }),
  isScored: () => true,
  fraction: (p, state) => {
    const s = state as McState | null;
    return scoreMultipleChoice(p, s?.a ?? []).raw / 100;
  },
};
