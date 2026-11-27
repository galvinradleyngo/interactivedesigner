import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../app/project';
import { multipleChoiceType } from '../plugins/multipleChoice/type';
import {
  DEFAULT_DESIGN,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type ActivityDoc,
} from '../schema/types';

const doc = (title: string): ActivityDoc => ({
  schemaVersion: SCHEMA_VERSION,
  type: 'multipleChoice',
  title,
  settings: { ...DEFAULT_SETTINGS },
  design: { ...DEFAULT_DESIGN },
  content: multipleChoiceType.createDefault(),
  media: [{ id: 'm1', name: 'a.png', mime: 'image/png', src: 'data:image/png;base64,AAAA' }],
});

describe('project files', () => {
  it('round-trips activities with embedded media', () => {
    const out = parseProject(serializeProject([doc('A'), doc('B')]));
    expect(out.map((d) => d.title)).toEqual(['A', 'B']);
    expect(out[0]?.media[0]?.src).toBe('data:image/png;base64,AAAA');
  });
  it('accepts a bare activity JSON', () => {
    expect(parseProject(JSON.stringify(doc('Solo')))).toHaveLength(1);
  });
  it('rejects garbage and empty projects', () => {
    expect(() => parseProject('nope')).toThrow(/valid JSON/);
    expect(() => parseProject('{"hello":1}')).toThrow(/No activities/);
    expect(() => parseProject(serializeProject([]))).toThrow(/No activities/);
  });
  it('migrates old unversioned activities', () => {
    const old = { type: 'multipleChoice', title: 'Old', content: {} };
    expect(parseProject(JSON.stringify(old))[0]?.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
