import { migrate } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';
import { safeFileName } from '../scorm/names';

/** A project file holds one or more projects, with images embedded. */
export interface ProjectFile {
  format: 'interactivedesigner-project';
  version: 2;
  projects: ProjectDoc[];
}

export function serializeProject(projects: ProjectDoc[]): string {
  const file: ProjectFile = { format: 'interactivedesigner-project', version: 2, projects };
  return JSON.stringify(file);
}

/**
 * Parse and migrate a project file. Also accepts v1 backups (`activities`) and a bare project JSON.
 */
export function parseProject(text: string): ProjectDoc[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON');
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  let list: unknown[] = [];
  if (obj.format === 'interactivedesigner-project') {
    const arr = Array.isArray(obj.projects)
      ? obj.projects
      : Array.isArray(obj.activities)
        ? obj.activities
        : [];
    list = arr as unknown[];
  } else if (
    Array.isArray(obj.pages) ||
    (typeof obj.type === 'string' && obj.content !== undefined)
  ) {
    list = [obj];
  }
  if (list.length === 0) throw new Error('No projects found in that file');
  return list.map((a) => migrate(a));
}

export const projectFileName = (title: string): string => safeFileName(title, 'idproject.json');
