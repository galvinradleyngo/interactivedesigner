import { describe, expect, it } from 'vitest';
import { scoreMultipleChoice, scoreQuestion } from '../plugins/multipleChoice/score';
import type { McContent, McQuestion } from '../plugins/multipleChoice/type';

const opt = (correct: boolean) => ({ id: 'x', text: 't', correct, feedback: '' });
const single: McQuestion = {
  id: 'a',
  text: '',
  multi: false,
  shuffle: false,
  options: [opt(true), opt(false), opt(false)],
};
const multi: McQuestion = {
  id: 'b',
  text: '',
  multi: true,
  shuffle: false,
  options: [opt(true), opt(true), opt(false), opt(false)],
};

describe('scoreQuestion', () => {
  it('single: all or nothing', () => {
    expect(scoreQuestion(single, [0])).toBe(1);
    expect(scoreQuestion(single, [1])).toBe(0);
    expect(scoreQuestion(single, [])).toBe(0);
  });
  it('multi: proportional with wrong-pick penalty, floored at 0', () => {
    expect(scoreQuestion(multi, [0, 1])).toBe(1);
    expect(scoreQuestion(multi, [0])).toBe(0.5);
    expect(scoreQuestion(multi, [0, 2])).toBe(0);
    expect(scoreQuestion(multi, [2, 3])).toBe(0);
  });
  it('no correct options scores 0', () => {
    expect(scoreQuestion({ ...single, options: [opt(false)] }, [0])).toBe(0);
  });
});

describe('scoreMultipleChoice', () => {
  const c: McContent = { intro: '', questions: [single, multi] };
  it('averages questions into a 0-100 raw score', () => {
    expect(scoreMultipleChoice(c, [[0], [0, 1]])).toEqual({ raw: 100, max: 100 });
    expect(scoreMultipleChoice(c, [[0], [0]])).toEqual({ raw: 75, max: 100 });
    expect(scoreMultipleChoice(c, [[], []])).toEqual({ raw: 0, max: 100 });
  });
  it('handles missing answers and empty content', () => {
    expect(scoreMultipleChoice(c, [[0]]).raw).toBe(50);
    expect(scoreMultipleChoice({ intro: '', questions: [] }, [])).toEqual({ raw: 0, max: 100 });
  });
});
