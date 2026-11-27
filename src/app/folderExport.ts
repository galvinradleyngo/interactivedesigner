import JSZip from 'jszip';
import type { ProjectDoc } from '../schema/types';
import { safeFileName } from '../scorm/names';

/** Make file names unique by adding -2, -3... before the extension. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${stem}-${n}${ext}`;
  });
}

export interface FolderExportResult {
  blob: Blob;
  fileName: string;
  built: number;
  failed: { title: string; error: string }[];
}

/**
 * Build one zip holding a SCORM package (.zip) for every project in a folder.
 * `build` produces a single package; failures are collected so one bad project does not stop the rest.
 */
export async function packFolder(
  folderName: string,
  projects: { title: string; doc: ProjectDoc }[],
  build: (doc: ProjectDoc) => Promise<{ blob: Blob; fileName: string }>,
  onProgress?: (done: number, total: number, title: string) => void,
): Promise<FolderExportResult> {
  const outer = new JSZip();
  const failed: FolderExportResult['failed'] = [];
  const made: { name: string; blob: Blob }[] = [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i] as (typeof projects)[number];
    onProgress?.(i, projects.length, p.title);
    try {
      const r = await build(p.doc);
      made.push({ name: r.fileName, blob: r.blob });
    } catch (e) {
      failed.push({ title: p.title, error: (e as Error).message });
    }
  }
  onProgress?.(projects.length, projects.length, '');
  const names = uniqueNames(made.map((m) => m.name));
  made.forEach((m, i) => outer.file(names[i] as string, m.blob));
  const blob = await outer.generateAsync({ type: 'blob', compression: 'STORE' }); // inner zips are already compressed
  return {
    blob,
    fileName: safeFileName(`${folderName} SCORM packages`),
    built: made.length,
    failed,
  };
}
