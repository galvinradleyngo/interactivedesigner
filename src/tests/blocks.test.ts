import { describe, expect, it } from 'vitest';
import { DEFS_BY_TYPE } from '../plugins/defs';
import { ddFraction, type DdProps } from '../plugins/dragDrop/type';
import { hotspotsDef, type HotspotProps } from '../plugins/hotspots/type';
import { aggregate, scoredBlocks } from '../plugins/scoring';
import { migrate, newProject } from '../schema/migrate';
import type { ProjectDoc, StageElement } from '../schema/types';

const hs = (over: Partial<HotspotProps> = {}): HotspotProps => ({
  ...hotspotsDef.createDefault(),
  mode: 'find',
  hotspots: [
    { id: 'a', x: 10, y: 10, label: 'A', html: '', image: null, correct: true },
    { id: 'b', x: 50, y: 50, label: 'B', html: '', image: null, correct: false },
  ],
  ...over,
});

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

const el = (id: string, type: string, props: Record<string, unknown>): StageElement => ({
  id,
  type,
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  props,
});
const withEls = (...els: StageElement[]): ProjectDoc => {
  const p = newProject('t');
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
  it('is only scored when some item has a correct zone', () => {
    const def = DEFS_BY_TYPE.get('dragDrop')!;
    expect(
      def.isScored?.({
        ...dd(),
        items: dd().items.map((i) => ({ ...i, zone: null })),
      } as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(def.isScored?.(dd() as unknown as Record<string, unknown>)).toBe(true);
  });
});

describe('hotspot scoring', () => {
  it('find mode is scored; explore is not', () => {
    expect(hotspotsDef.isScored?.(hs())).toBe(true);
    expect(hotspotsDef.isScored?.(hs({ mode: 'explore' }))).toBe(false);
  });
  it('correct pick = 1, wrong or none = 0', () => {
    expect(hotspotsDef.fraction?.(hs(), { pick: 'a', seen: [] })).toBe(1);
    expect(hotspotsDef.fraction?.(hs(), { pick: 'b', seen: [] })).toBe(0);
    expect(hotspotsDef.fraction?.(hs(), null)).toBe(0);
  });
});

describe('project aggregate', () => {
  const project = withEls(
    el('h', 'hotspots', { ...hs(), points: 10 }),
    el('d', 'dragDrop', { ...dd(), points: 30 }),
    el('t', 'text', {}),
    el('f', 'flashcards', {}),
  );
  it('lists only scored blocks with their points', () => {
    expect(scoredBlocks(project, DEFS_BY_TYPE)).toEqual([
      { id: 'h', points: 10 },
      { id: 'd', points: 30 },
    ]);
  });
  it('sums fraction x points; unattempted counts as 0', () => {
    const a = aggregate(project, DEFS_BY_TYPE, {
      h: { fraction: 1, done: true },
      d: { fraction: 0.5, done: true },
    });
    expect(a.score).toEqual({ raw: 25, max: 40 });
    expect(a.allScoredDone).toBe(true);
    const b = aggregate(project, DEFS_BY_TYPE, { h: { fraction: 1, done: true } });
    expect(b.score).toEqual({ raw: 10, max: 40 });
    expect(b.allScoredDone).toBe(false);
  });
  it('has no score when nothing is scored', () => {
    const a = aggregate(withEls(el('t', 'text', {})), DEFS_BY_TYPE, {});
    expect(a.score).toBeNull();
    expect(a.allScoredDone).toBe(true);
  });
  it('ignores zero-point blocks', () => {
    const p = withEls(el('h', 'hotspots', { ...hs(), points: 0 }));
    expect(scoredBlocks(p, DEFS_BY_TYPE)).toEqual([]);
  });
});

describe('ungraded', () => {
  const graded = (flag?: boolean) => {
    const p = withEls(
      el('h', 'hotspots', { ...hs(), points: 10 }),
      el('d', 'dragDrop', { ...dd(), points: 10, graded: false }),
    );
    p.settings = { ...p.settings, graded: flag ?? true };
    return p;
  };
  it('a project marked ungraded has no score and counts as done', () => {
    const a = aggregate(graded(false), DEFS_BY_TYPE, { h: { fraction: 1, done: true } });
    expect(a.score).toBeNull();
    expect(a.scoredCount).toBe(0);
    expect(a.allScoredDone).toBe(true);
    expect(scoredBlocks(graded(false), DEFS_BY_TYPE)).toEqual([]);
  });
  it('an activity marked ungraded is left out of the total', () => {
    expect(scoredBlocks(graded(), DEFS_BY_TYPE)).toEqual([{ id: 'h', points: 10 }]);
    const a = aggregate(graded(), DEFS_BY_TYPE, { h: { fraction: 1, done: true } });
    expect(a.score).toEqual({ raw: 10, max: 10 });
    expect(a.allScoredDone).toBe(true); // the ungraded drag and drop is not required
  });
  it('old projects without the flag stay graded', () => {
    const p = withEls(el('h', 'hotspots', hs() as unknown as Record<string, unknown>));
    expect(migrate(p).settings.graded).toBe(true);
  });
});

describe('migrate v1 -> v2', () => {
  it('wraps a single activity into one page with one block', () => {
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
    expect(p.schemaVersion).toBe(2);
    expect(p.pages).toHaveLength(1);
    const e = p.pages[0]!.elements[0]!;
    expect(e.type).toBe('multipleChoice');
    expect(e.props.intro).toBe('hi');
    expect(e.props.points).toBe(10);
    expect(p.settings.passingScore).toBe(70);
    expect(p.design.primary).toBe('#123456');
    expect(p.media).toHaveLength(1);
    expect('content' in p).toBe(false);
  });
  it('is stable on v2 and gives blank projects one page', () => {
    const p = newProject('x');
    expect(migrate(p)).toEqual(p);
    expect(migrate({ title: 'y' }).pages).toHaveLength(1);
    expect(() => migrate({ schemaVersion: 99 })).toThrow();
  });
});
