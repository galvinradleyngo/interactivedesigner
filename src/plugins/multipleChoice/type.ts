import type { ActivityTypeDef } from '../types';
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

let n = 0;
export const uid = (p: string): string => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

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

export const multipleChoiceType: ActivityTypeDef<McContent, number[][]> = {
  type: 'multipleChoice',
  label: 'Multiple choice',
  description: 'Single or multiple answer questions with per-option feedback.',
  contentVersion: 1,
  createDefault: () => ({ intro: '', questions: [newQuestion()] }),
  score: scoreMultipleChoice,
};
