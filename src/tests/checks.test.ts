import { describe, expect, it } from 'vitest';
import { checkProject } from '../app/editor/checks';
import { addElement, newElement } from '../app/editor/model';
import { newProject } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';

const withBlock = (
  type: string,
  patch: Record<string, unknown> = {},
  graded = true,
): ProjectDoc => {
  const el = newElement(type);
  el.props = { ...el.props, ...patch };
  const p = newProject('t');
  p.settings = { ...p.settings, graded };
  return addElement(p, p.pages[0]!.id, el);
};
const msgs = (d: ProjectDoc) => checkProject(d).map((i) => `${i.block} ${i.message}`);

describe('checkProject', () => {
  it('a blank project has nothing to finish', () => {
    expect(checkProject(newProject('t'))).toEqual([]);
  });
  it('flags a fresh hotspots block (the blank-preview case)', () => {
    expect(msgs(withBlock('hotspots'))).toEqual([
      'Hotspots needs a background image',
      'Hotspots has no hotspots yet',
    ]);
  });
  it('flags a find-the-spot quiz without a correct hotspot', () => {
    const d = withBlock('hotspots', {
      image: 'media:a',
      mode: 'find',
      hotspots: [{ id: 'a', x: 1, y: 1, label: '', html: '', image: null, correct: false }],
    });
    expect(msgs(d)).toEqual(['Hotspots is a quiz but no hotspot is marked as the correct spot']);
  });
  it('flags empty drag and drop, and unscored ones only when graded', () => {
    expect(msgs(withBlock('dragDrop'))).toEqual([
      'Drag and drop has no drop zones',
      'Drag and drop has no items to drag',
    ]);
    const items = [{ id: 'i', label: 'a', image: null, x: 0, y: 0, w: 10, h: 10, zone: null }];
    const zones = [{ id: 'z', label: 'z', x: 0, y: 0, w: 10, h: 10, capacity: 0 }];
    expect(msgs(withBlock('dragDrop', { items, zones }))).toEqual([
      'Drag and drop has no item with a correct zone, so it is not graded',
    ]);
    expect(msgs(withBlock('dragDrop', { items, zones }, false))).toEqual([]);
  });
  it('flags missing images, cards and quiz answers', () => {
    expect(msgs(withBlock('imageCompare', { before: 'media:a' }))).toEqual([
      'Image comparison needs both images',
    ]);
    expect(msgs(withBlock('flashcards', { cards: [] }))).toEqual(['Flash cards has no cards']);
    expect(msgs(withBlock('image'))).toEqual(['Image has no picture']);
    expect(msgs(withBlock('multipleChoice'))).toEqual([]);
    const bad = withBlock('multipleChoice', {
      questions: [
        {
          id: 'q',
          text: '<p></p>',
          multi: false,
          shuffle: false,
          options: [{ id: 'a', text: 'x', correct: false, feedback: '' }],
        },
      ],
    });
    expect(msgs(bad)).toEqual([
      'Multiple choice question 1 has no text',
      'Multiple choice question 1 has no correct answer marked',
    ]);
  });
  it('flags buttons that point to missing pages and skips hidden blocks', () => {
    expect(msgs(withBlock('button', { action: 'page', page: 5 }))).toEqual([
      'Button links to page 5, which does not exist',
    ]);
    const d = withBlock('hotspots');
    d.pages[0]!.elements[0]!.hidden = true;
    expect(checkProject(d)).toEqual([]);
  });
  it('reports where the problem is', () => {
    const [i] = checkProject(withBlock('flashcards', { cards: [] }));
    expect(i?.pageName).toBe('Page 1');
    expect(i?.elementId).toBeTruthy();
  });
});

describe('checkProject: flip card and timeline', () => {
  it('flags empty flip card sides', () => {
    const d = withBlock('flipCard', {
      front: { text: '', image: null },
      back: { text: 'Answer', image: null },
    });
    expect(msgs(d)).toEqual(['Flip card has nothing on the front']);
    expect(msgs(withBlock('flipCard'))).toEqual([]);
  });
  it('flags a timeline without events', () => {
    expect(msgs(withBlock('timeline', { events: [] }))).toEqual(['Timeline has no events']);
    expect(msgs(withBlock('timeline'))).toEqual([]);
  });
});

describe('checkProject: off-page elements', () => {
  it('flags elements outside the page after a shape change', () => {
    const d = withBlock('text');
    d.pages[0]!.elements[0]!.y = 700; // below a 16:9 page (540 high)
    expect(msgs(d)).toEqual(['Text is outside the page']);
    d.design = { ...d.design, pageShape: '9:16' };
    expect(msgs(d)).toEqual([]);
  });
});

describe('checkProject: interactive video', () => {
  const q = (over: Record<string, unknown> = {}) => ({
    id: 'k1',
    time: 83,
    kind: 'question',
    title: 'Q',
    html: '<p>Which?</p>',
    multi: false,
    options: [
      { id: 'a', text: 'A', correct: true, feedback: '' },
      { id: 'b', text: 'B', correct: false, feedback: '' },
    ],
    ...over,
  });
  const video = (patch: Record<string, unknown>) =>
    withBlock('interactiveVideo', { url: 'https://youtu.be/M7lc1UVf-VE', ...patch });

  it('a fresh video block needs a link and checkpoints', () => {
    expect(msgs(withBlock('interactiveVideo'))).toEqual([
      'Interactive video needs a YouTube link',
      'Interactive video has no checkpoints, so it will just play the video',
    ]);
  });
  it('accepts a link with a good question', () => {
    expect(msgs(video({ checkpoints: [q()] }))).toEqual([]);
  });
  it('rejects a link that is not YouTube', () => {
    expect(msgs(video({ url: 'https://vimeo.com/12345678', checkpoints: [q()] }))).toEqual([
      'Interactive video needs a YouTube link',
    ]);
  });
  it('flags questions with no text or no correct answer, with their time', () => {
    const noCorrect = q({
      options: [
        { id: 'a', text: 'A', correct: false, feedback: '' },
        { id: 'b', text: 'B', correct: false, feedback: '' },
      ],
    });
    expect(
      msgs(video({ checkpoints: [noCorrect, q({ id: 'k2', time: 5, html: '<p></p>' })] })),
    ).toEqual([
      'Interactive video question at 1:23 has no correct answer marked',
      'Interactive video question at 0:05 has no text',
    ]);
  });
  it('does not require answers on prompts', () => {
    expect(
      msgs(
        video({
          checkpoints: [
            {
              id: 'p',
              time: 4,
              kind: 'prompt',
              title: 'N',
              html: '<p>Hi</p>',
              multi: false,
              options: [],
            },
          ],
        }),
      ),
    ).toEqual([]);
  });
});
