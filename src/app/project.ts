import { migrate } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';
import { safeFileName } from '../scorm/names';

/** A project file holds one or more projects, with images embedded. */
export interface ProjectFile {
  format: 'interactivedesigner-project';
  version: 2;
  projects: ProjectDoc[];
  /** Folder name for each project (same order as `projects`), or null. Optional. */
  folders?: (string | null)[];
}

export function serializeProject(projects: ProjectDoc[], folderNames?: (string | null)[]): string {
  const file: ProjectFile = { format: 'interactivedesigner-project', version: 2, projects };
  if (folderNames && folderNames.some((n) => n))
    file.folders = projects.map((_, i) => folderNames[i] ?? null);
  return JSON.stringify(file);
}

/**
 * Parse and migrate a project file. Also accepts v1 backups (`activities`) and a bare project JSON.
 * `folders[i]` is the folder name the file puts project i in, if any.
 */
export function parseProjectFile(text: string): {
  projects: ProjectDoc[];
  folders: (string | null)[];
} {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON');
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  let list: unknown[] = [];
  let folders: unknown[] = [];
  if (obj.format === 'interactivedesigner-project') {
    list = (
      Array.isArray(obj.projects)
        ? obj.projects
        : Array.isArray(obj.activities)
          ? obj.activities
          : []
    ) as unknown[];
    folders = Array.isArray(obj.folders) ? (obj.folders as unknown[]) : [];
  } else if (
    Array.isArray(obj.pages) ||
    (typeof obj.type === 'string' && obj.content !== undefined)
  ) {
    list = [obj];
  }
  if (list.length === 0) throw new Error('No activities found in that file');
  return {
    projects: list.map((a) => migrate(a)),
    folders: list.map((_, i) =>
      typeof folders[i] === 'string' && (folders[i] as string).trim()
        ? (folders[i] as string).trim()
        : null,
    ),
  };
}

export const parseProject = (text: string): ProjectDoc[] => parseProjectFile(text).projects;

export const projectFileName = (title: string): string => safeFileName(title, 'idactivity.json');
