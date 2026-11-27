import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../app/project';
import { newProject } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';

const doc = (title: string): ProjectDoc => ({
  ...newProject(title),
  media: [{ id: 'm1', name: 'a.png', mime: 'image/png', src: 'data:image/png;base64,AAAA' }],
});

describe('project files', () => {
  it('round-trips projects with embedded media', () => {
    const out = parseProject(serializeProject([doc('A'), doc('B')]));
    expect(out.map((d) => d.title)).toEqual(['A', 'B']);
    expect(out[0]?.media[0]?.src).toBe('data:image/png;base64,AAAA');
    expect(out[0]?.pages).toHaveLength(1);
  });
  it('accepts a bare project JSON', () => {
    expect(parseProject(JSON.stringify(doc('Solo')))).toHaveLength(1);
  });
  it('rejects garbage and empty files', () => {
    expect(() => parseProject('nope')).toThrow(/valid JSON/);
    expect(() => parseProject('{"hello":1}')).toThrow(/No projects/);
    expect(() => parseProject(serializeProject([]))).toThrow(/No projects/);
  });
  it('opens v1 backups (activities[] with a single activity each)', () => {
    const v1 = {
      type: 'multipleChoice',
      title: 'Old',
      content: { intro: '', questions: [] },
      media: [],
    };
    const file = { format: 'interactivedesigner-project', version: 1, activities: [v1] };
    const [p] = parseProject(JSON.stringify(file));
    expect(p?.title).toBe('Old');
    expect(p?.pages[0]?.elements[0]?.type).toBe('multipleChoice');
  });
});
