import { describe, expect, it } from 'vitest';
import { BLOCK_DEFS, DEFS_BY_TYPE } from '../plugins/defs';
import { ddFraction, type DdProps } from '../plugins/dragDrop/type';
import { multipleChoiceDef } from '../plugins/multipleChoice/type';
import { aggregate, scoredBlocks } from '../plugins/scoring';
import { isGraded } from '../plugins/types';
import { migrate, newProject } from '../schema/migrate';
import {
  GRADABLE_TYPES,
  SCHEMA_VERSION,
  type ProjectDoc,
  type StageElement,
} from '../schema/types';

const dd = (): DdProps => ({
  points: 10,
  bgColor: '',
  background: null,
  zones: [
    { id: 'z1', label: 'Verbs', x: 0, y: 0, w: 40, h: 40, capacity: 0 },
    { id: 'z2', label: 'Nouns', x: 50, y: 0, w: 40, h: 40, capacity: 0 },
  ],
  items: [
    { id: 'i1', label: 'run', image: null, x: 0, y: 60, w: 20, h: 10, zone: 'z1' },
    { id: 'i2', label: 'jump', image: null, x: 0, y: 60, w: 20, h: 10, zone: 'z1' },
    { id: 'i3', label: 'cat', image: null, x: 0, y: 60, w: 20, h: 10, zone: 'z2' },
    { id: 'i4', label: 'the', image: null, x: 0, y: 60, w: 20, h: 10, zone: null },
  ],
});

const rec = (v: unknown) => v as Record<string, unknown>;
const el = (id: string, type: string, props: Record<string, unknown>): StageElement => ({
  id,
  type,
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  props,
});
const activity = (graded: boolean, ...els: StageElement[]): ProjectDoc => {
  const p = newProject('t');
  p.settings = { ...p.settings, graded };
  p.pages[0]!.elements = els;
  return p;
};

describe('drag and drop scoring', () => {
  it('scores right placements', () => {
    expect(ddFraction(dd(), { i1: 'z1', i2: 'z1', i3: 'z2' })).toBe(1);
    expect(ddFraction(dd(), { i1: 'z1' })).toBeCloseTo(1 / 3);
    expect(ddFraction(dd(), {})).toBe(0);
  });
  it('penalizes wrong zones and distractors, floored at 0', () => {
    expect(ddFraction(dd(), { i1: 'z1', i2: 'z1', i3: 'z2', i4: 'z1' })).toBeCloseTo(2 / 3);
    expect(ddFraction(dd(), { i1: 'z2', i3: 'z1' })).toBe(0);
  });
  it('only has something to grade when an item has a correct zone', () => {
    const def = DEFS_BY_TYPE.get('dragDrop')!;
    expect(
      def.isScored?.(rec({ ...dd(), items: dd().items.map((i) => ({ ...i, zone: null })) })),
    ).toBe(false);
    expect(def.isScored?.(rec(dd()))).toBe(true);
  });
});

describe('which interactions can be graded', () => {
  it('only multiple choice and drag and drop', () => {
    expect(
      BLOCK_DEFS.filter((d) => d.gradable)
        .map((d) => d.type)
        .sort(),
    ).toEqual(['dragDrop', 'multipleChoice']);
    expect([...GRADABLE_TYPES].sort()).toEqual(['dragDrop', 'multipleChoice']); // schema list stays in sync
  });
  it('hotspots, flip cards, timelines, flash cards and comparisons have no grading at all', () => {
    for (const t of [
      'hotspots',
      'flipCard',
      'timeline',
      'flashcards',
      'imageCompare',
      'text',
      'image',
      'shape',
      'button',
    ]) {
      const d = DEFS_BY_TYPE.get(t)!;
      expect(d.gradable).toBeFalsy();
      expect(d.isScored).toBeUndefined();
      expect(d.fraction).toBeUndefined();
    }
  });
});

describe('isGraded', () => {
  it('is off unless the activity is graded, and an interaction can opt out', () => {
    expect(isGraded({ graded: false }, {})).toBe(false);
    expect(isGraded({}, {})).toBe(false);
    expect(isGraded({ graded: true }, {})).toBe(true);
    expect(isGraded({ graded: true }, { graded: false })).toBe(false);
  });
});

describe('activity score', () => {
  const mc = (points: number) =>
    el('m', 'multipleChoice', { ...rec(multipleChoiceDef.createDefault()), points });
  const drag = (points: number) => el('d', 'dragDrop', { ...rec(dd()), points });

  it('new activities are not graded', () => {
    expect(newProject('x').settings.graded).toBe(false);
  });
  it('a graded activity lists only gradable interactions with their points', () => {
    const p = activity(
      true,
      mc(10),
      drag(30),
      el('t', 'text', {}),
      el('f', 'flashcards', {}),
      el('h', 'hotspots', { mode: 'find' }),
    );
    expect(scoredBlocks(p, DEFS_BY_TYPE)).toEqual([
      { id: 'm', points: 10 },
      { id: 'd', points: 30 },
    ]);
  });
  it('score = sum of fraction x points; unattempted counts 0', () => {
    const p = activity(true, mc(10), drag(30));
    const a = aggregate(p, DEFS_BY_TYPE, {
      m: { fraction: 1, done: true },
      d: { fraction: 0.5, done: true },
    });
    expect(a.score).toEqual({ raw: 25, max: 40 });
    expect(a.allScoredDone).toBe(true);
    const b = aggregate(p, DEFS_BY_TYPE, { m: { fraction: 1, done: true } });
    expect(b.score).toEqual({ raw: 10, max: 40 });
    expect(b.allScoredDone).toBe(false);
  });
  it('a not-graded activity has no score and counts as done', () => {
    const p = activity(false, mc(10), drag(30));
    expect(scoredBlocks(p, DEFS_BY_TYPE)).toEqual([]);
    const a = aggregate(p, DEFS_BY_TYPE, { m: { fraction: 1, done: true } });
    expect(a.score).toBeNull();
    expect(a.scoredCount).toBe(0);
    expect(a.allScoredDone).toBe(true);
  });
  it('an interaction switched off is left out and not required', () => {
    const p = activity(true, mc(10), { ...drag(30), props: { ...drag(30).props, graded: false } });
    expect(scoredBlocks(p, DEFS_BY_TYPE)).toEqual([{ id: 'm', points: 10 }]);
    const a = aggregate(p, DEFS_BY_TYPE, { m: { fraction: 1, done: true } });
    expect(a.score).toEqual({ raw: 10, max: 10 });
    expect(a.allScoredDone).toBe(true);
  });
  it('graded but with nothing gradable has no score', () => {
    expect(aggregate(activity(true, el('t', 'text', {})), DEFS_BY_TYPE, {}).score).toBeNull();
  });
  it('ignores zero-point interactions', () => {
    expect(scoredBlocks(activity(true, mc(0)), DEFS_BY_TYPE)).toEqual([]);
  });
});

describe('migrate: grading', () => {
  const oldDoc = (version: number, graded: boolean | undefined, ...els: StageElement[]) => ({
    schemaVersion: version,
    title: 't',
    settings: graded === undefined ? {} : { graded },
    design: {},
    media: [],
    pages: [{ id: 'p', name: 'Page 1', elements: els }],
  });
  const mcEl = el('m', 'multipleChoice', {});
  const hsEl = el('h', 'hotspots', {});

  it('older activities stay graded only if something can be graded', () => {
    expect(migrate(oldDoc(2, undefined, mcEl)).settings.graded).toBe(true); // before the flag existed
    expect(migrate(oldDoc(2, true, mcEl)).settings.graded).toBe(true);
    expect(migrate(oldDoc(2, true, hsEl)).settings.graded).toBe(false); // was graded by default, nothing to grade
    expect(migrate(oldDoc(2, false, mcEl)).settings.graded).toBe(false); // an explicit choice is kept
    expect(migrate(oldDoc(2, undefined, hsEl)).settings.graded).toBe(false);
  });
  it('current activities default to not graded', () => {
    expect(migrate(oldDoc(SCHEMA_VERSION, undefined, mcEl)).settings.graded).toBe(false);
    expect(migrate(oldDoc(SCHEMA_VERSION, true, mcEl)).settings.graded).toBe(true);
  });
});

describe('migrate v1 -> current', () => {
  it('wraps a single activity into one page with one interaction', () => {
    const v1 = {
      schemaVersion: 1,
      type: 'multipleChoice',
      title: 'Quiz',
      settings: { passingScore: 70 },
      design: { primary: '#123456' },
      content: { intro: 'hi', questions: [] },
      media: [{ id: 'm', src: 'x', name: 'n', mime: 'image/png' }],
    };
    const p = migrate(v1);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.pages).toHaveLength(1);
    const e = p.pages[0]!.elements[0]!;
    expect(e.type).toBe('multipleChoice');
    expect(e.props.intro).toBe('hi');
    expect(e.props.points).toBe(10);
    expect(p.settings.passingScore).toBe(70);
    expect(p.settings.graded).toBe(true); // a quiz that was graded stays graded
    expect(p.design.primary).toBe('#123456');
    expect(p.media).toHaveLength(1);
    expect('content' in p).toBe(false);
  });
  it('is stable on the current version and gives blank activities one page', () => {
    const p = newProject('x');
    expect(migrate(p)).toEqual(p);
    expect(migrate({ title: 'y' }).pages).toHaveLength(1);
    expect(() => migrate({ schemaVersion: 99 })).toThrow();
  });
});
