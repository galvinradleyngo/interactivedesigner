import { migrate } from '../schema/migrate';
import type { ActivityDoc } from '../schema/types';
import { safeFileName } from '../scorm/names';

/** A project file holds one or more activities, with images embedded. */
export interface ProjectFile {
  format: 'interactivedesigner-project';
  version: 1;
  activities: ActivityDoc[];
}

export function serializeProject(activities: ActivityDoc[]): string {
  const file: ProjectFile = { format: 'interactivedesigner-project', version: 1, activities };
  return JSON.stringify(file);
}

/** Parse and migrate a project file (also accepts a bare activity JSON, e.g. examples/). */
export function parseProject(text: string): ActivityDoc[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON');
  }
  const obj = data as Partial<ProjectFile> & Partial<ActivityDoc>;
  const list: unknown[] =
    obj && obj.format === 'interactivedesigner-project' && Array.isArray(obj.activities)
      ? obj.activities
      : obj && typeof obj.type === 'string' && obj.content !== undefined
        ? [obj]
        : [];
  if (list.length === 0) throw new Error('No activities found in that file');
  return list.map((a) => {
    const doc = migrate(a);
    if (typeof doc.type !== 'string' || typeof doc.title !== 'string')
      throw new Error('Activity is missing a title or type');
    return { ...doc, media: Array.isArray(doc.media) ? doc.media : [] };
  });
}

export const projectFileName = (title: string): string => safeFileName(title, 'idproject.json');
