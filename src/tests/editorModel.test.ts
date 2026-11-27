import { describe, expect, it } from 'vitest';
import { historyReducer, type HistoryState } from '../app/editor/history';
import { resizeRect, snapRect, snapTargets } from '../app/editor/geometry';
import * as m from '../app/editor/model';
import { newProject } from '../schema/migrate';
import { STAGE_H, STAGE_W } from '../schema/types';

const base = () => newProject('t');
const pid = (d = base()) => d.pages[0]!.id;

describe('model: elements', () => {
  it('adds a centred element with defaults', () => {
    const d = base();
    const el = m.newElement('text');
    const d2 = m.addElement(d, pid(d), el);
    expect(d2.pages[0]!.elements).toHaveLength(1);
    expect(el.x + el.w / 2).toBeCloseTo(STAGE_W / 2, 0);
    expect(el.y + el.h / 2).toBeCloseTo(STAGE_H / 2, 0);
    expect(d.pages[0]!.elements).toHaveLength(0); // immutable
  });
  it('rejects unknown types', () => {
    expect(() => m.newElement('nope')).toThrow();
  });
  it('updates, duplicates and removes', () => {
    let d = base();
    const el = m.newElement('shape');
    d = m.addElement(d, pid(d), el);
    d = m.updateElement(d, pid(d), el.id, { x: 10, y: 20 });
    expect(d.pages[0]!.elements[0]).toMatchObject({ x: 10, y: 20 });
    const dup = m.duplicateElement(d, pid(d), el.id);
    expect(dup.doc.pages[0]!.elements).toHaveLength(2);
    expect(dup.id).not.toBe(el.id);
    expect(dup.doc.pages[0]!.elements[1]).toMatchObject({ x: 30, y: 40 });
    expect(m.removeElement(dup.doc, pid(d), el.id).pages[0]!.elements).toHaveLength(1);
  });
  it('duplicate is a deep copy', () => {
    let d = base();
    const el = m.newElement('hotspots');
    d = m.addElement(d, pid(d), el);
    const { doc } = m.duplicateElement(d, pid(d), el.id);
    const [a, b] = doc.pages[0]!.elements;
    expect(a!.props).not.toBe(b!.props);
  });
  it('reorders z-order', () => {
    let d = base();
    const [a, b, c] = ['text', 'shape', 'image'].map((t) => m.newElement(t));
    for (const e of [a!, b!, c!]) d = m.addElement(d, pid(d), e);
    const order = (doc = d) => doc.pages[0]!.elements.map((e) => e.type);
    expect(order(m.reorder(d, pid(d), a!.id, 'front'))).toEqual(['shape', 'image', 'text']);
    expect(order(m.reorder(d, pid(d), c!.id, 'back'))).toEqual(['image', 'text', 'shape']);
    expect(order(m.reorder(d, pid(d), a!.id, 'forward'))).toEqual(['shape', 'text', 'image']);
    expect(order(m.reorder(d, pid(d), c!.id, 'backward'))).toEqual(['text', 'image', 'shape']);
    expect(order(m.reorder(d, pid(d), c!.id, 'front'))).toEqual(order());
  });
  it('aligns to the stage', () => {
    let d = base();
    const el = { ...m.newElement('shape'), x: 100, y: 100, w: 200, h: 100 };
    d = m.addElement(d, pid(d), el);
    const get = (dd: typeof d) => dd.pages[0]!.elements[0]!;
    expect(get(m.alignElement(d, pid(d), el.id, 'left')).x).toBe(0);
    expect(get(m.alignElement(d, pid(d), el.id, 'right')).x).toBe(STAGE_W - 200);
    expect(get(m.alignElement(d, pid(d), el.id, 'center')).x).toBe(380);
    expect(get(m.alignElement(d, pid(d), el.id, 'top')).y).toBe(0);
    expect(get(m.alignElement(d, pid(d), el.id, 'bottom')).y).toBe(STAGE_H - 100);
    expect(get(m.alignElement(d, pid(d), el.id, 'middle')).y).toBe(220);
  });
});

describe('model: pages', () => {
  it('adds, duplicates (new element ids), moves and deletes pages', () => {
    let d = base();
    d = m.addElement(d, pid(d), m.newElement('text'));
    const added = m.addPage(d);
    expect(added.doc.pages).toHaveLength(2);
    const dup = m.duplicatePage(added.doc, pid(d));
    expect(dup.doc.pages).toHaveLength(3);
    expect(dup.doc.pages[1]!.elements[0]!.id).not.toBe(d.pages[0]!.elements[0]!.id);
    const moved = m.movePage(dup.doc, dup.id!, 1);
    expect(moved.pages[2]!.id).toBe(dup.id);
    expect(m.movePage(moved, dup.id!, 1)).toBe(moved);
    expect(m.deletePage(moved, dup.id!).pages).toHaveLength(2);
  });
  it('never deletes the last page', () => {
    const d = base();
    expect(m.deletePage(d, pid(d)).pages).toHaveLength(1);
  });
});

describe('model: media pruning', () => {
  it('keeps only referenced media', () => {
    let d = base();
    d = {
      ...d,
      media: ['a', 'b', 'c'].map((id) => ({ id, name: id, mime: 'image/png', src: 'data:x' })),
    };
    const img = m.newElement('image');
    img.props.src = 'media:a';
    d = m.addElement(d, pid(d), img);
    d = { ...d, design: { ...d.design, backgroundImage: 'media:c' } };
    expect([...m.mediaRefs(d)].sort()).toEqual(['a', 'c']);
    expect(m.pruneMedia(d).media.map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('geometry', () => {
  const r = { x: 100, y: 100, w: 200, h: 100 };
  const min = { minW: 20, minH: 20 };
  it('resizes from each side without moving the opposite edge', () => {
    expect(resizeRect(r, 'e', 50, 0, min)).toEqual({ x: 100, y: 100, w: 250, h: 100 });
    expect(resizeRect(r, 'w', 50, 0, min)).toEqual({ x: 150, y: 100, w: 150, h: 100 });
    expect(resizeRect(r, 'n', 0, -30, min)).toEqual({ x: 100, y: 70, w: 200, h: 130 });
    expect(resizeRect(r, 'se', 10, 10, min)).toEqual({ x: 100, y: 100, w: 210, h: 110 });
  });
  it('enforces minimum size and keeps the far edge fixed', () => {
    const out = resizeRect(r, 'w', 500, 0, min);
    expect(out.w).toBe(20);
    expect(out.x + out.w).toBe(300);
  });
  it('keeps aspect ratio on corners', () => {
    const out = resizeRect(r, 'se', 100, 0, { ...min, keepAspect: true });
    expect(out.w / out.h).toBeCloseTo(2);
    const nw = resizeRect(r, 'nw', -100, 0, { ...min, keepAspect: true });
    expect(nw.x + nw.w).toBe(300);
    expect(nw.y + nw.h).toBe(200);
  });
  it('snaps a moving rect to stage centre and other elements', () => {
    const targets = snapTargets([{ x: 600, y: 50, w: 100, h: 100 }], 960, 540);
    const centred = snapRect({ x: 377, y: 10, w: 200, h: 100 }, 'move', targets, 6);
    expect(centred.rect.x).toBe(380);
    expect(centred.guides.x).toContain(480);
    const toOther = snapRect({ x: 403, y: 300, w: 200, h: 100 }, 'move', targets, 6);
    expect(toOther.rect.x).toBe(400); // right edge 603 -> 600
    expect(snapRect({ x: 300, y: 300, w: 200, h: 100 }, 'move', targets, 6).rect).toEqual({
      x: 300,
      y: 300,
      w: 200,
      h: 100,
    });
  });
  it('snaps only the edge being resized', () => {
    const targets = snapTargets([], 960, 540);
    const out = snapRect({ x: 100, y: 100, w: 857, h: 100 }, 'e', targets, 6);
    expect(out.rect).toEqual({ x: 100, y: 100, w: 860, h: 100 });
    const west = snapRect({ x: 4, y: 100, w: 200, h: 100 }, 'w', targets, 6);
    expect(west.rect).toEqual({ x: 0, y: 100, w: 204, h: 100 });
  });
});

describe('history', () => {
  const init = (): HistoryState<number> =>
    historyReducer<number>(
      { past: [], present: null, future: [], lastKey: null, lastAt: 0 },
      { type: 'reset', value: 0 },
    );
  const set = (s: HistoryState<number>, v: number, key?: string, now = 0) =>
    historyReducer(s, { type: 'set', value: v, key, now });
  it('undoes and redoes', () => {
    let s = set(set(init(), 1, undefined, 0), 2, undefined, 10);
    s = historyReducer(s, { type: 'undo' });
    expect(s.present).toBe(1);
    s = historyReducer(s, { type: 'redo' });
    expect(s.present).toBe(2);
    expect(historyReducer(s, { type: 'redo' }).present).toBe(2);
  });
  it('coalesces edits with the same key within the window', () => {
    let s = init();
    for (let i = 1; i <= 5; i++) s = set(s, i, 'drag', i * 10);
    expect(s.past).toHaveLength(1);
    s = historyReducer(s, { type: 'undo' });
    expect(s.present).toBe(0);
  });
  it('does not coalesce different keys or stale edits; new edits clear redo', () => {
    let s = set(set(init(), 1, 'a', 0), 2, 'b', 10);
    expect(s.past).toHaveLength(2);
    s = set(s, 3, 'b', 99999);
    expect(s.past).toHaveLength(3);
    s = historyReducer(historyReducer(s, { type: 'undo' }), { type: 'undo' });
    s = set(s, 9);
    expect(s.future).toHaveLength(0);
  });
});
