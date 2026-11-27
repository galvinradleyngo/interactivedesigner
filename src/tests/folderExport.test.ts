import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { packFolder, uniqueNames } from '../app/folderExport';
import { parseProjectFile, serializeProject } from '../app/project';
import { newProject } from '../schema/migrate';

describe('uniqueNames', () => {
  it('adds -2, -3 before the extension and ignores case differences', () => {
    expect(uniqueNames(['Quiz.zip', 'Quiz.zip', 'Other.zip', 'quiz.zip', 'Quiz.zip'])).toEqual([
      'Quiz.zip',
      'Quiz-2.zip',
      'Other.zip',
      'quiz-3.zip',
      'Quiz-4.zip',
    ]);
    expect(uniqueNames([])).toEqual([]);
  });
});

describe('packFolder', () => {
  const projects = ['One', 'Two', 'One'].map((title) => ({ title, doc: newProject(title) }));
  const build = async (doc: { title: string }) => ({
    blob: new Blob([`pkg:${doc.title}`]),
    fileName: `${doc.title}.zip`,
  });

  it('puts one package per project in a single zip, with unique names', async () => {
    const r = await packFolder('Week 1', projects, build);
    expect(r.built).toBe(3);
    expect(r.failed).toEqual([]);
    expect(r.fileName).toBe('Week-1-SCORM-packages.zip');
    const zip = await JSZip.loadAsync(await r.blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['One-2.zip', 'One.zip', 'Two.zip']);
    expect(await zip.file('Two.zip')!.async('string')).toBe('pkg:Two');
  });

  it('reports failures but still packs the rest', async () => {
    const flaky = async (doc: { title: string }) => {
      if (doc.title === 'Two') throw new Error('image missing');
      return build(doc);
    };
    const seen: string[] = [];
    const r = await packFolder('F', projects, flaky, (d, t, title) =>
      seen.push(`${d}/${t}:${title}`),
    );
    expect(r.built).toBe(2);
    expect(r.failed).toEqual([{ title: 'Two', error: 'image missing' }]);
    expect(seen[0]).toBe('0/3:One');
    expect(seen.at(-1)).toBe('3/3:');
  });

  it('an empty folder still produces a valid zip', async () => {
    const r = await packFolder('Empty', [], build);
    expect(r.built).toBe(0);
    expect(Object.keys((await JSZip.loadAsync(await r.blob.arrayBuffer())).files)).toEqual([]);
  });
});

describe('project files with folders', () => {
  it('round-trips folder names and omits them when unused', () => {
    const docs = [newProject('A'), newProject('B'), newProject('C')];
    const withFolders = parseProjectFile(serializeProject(docs, ['Week 1', null, 'Week 2']));
    expect(withFolders.folders).toEqual(['Week 1', null, 'Week 2']);
    const plain = serializeProject(docs, [null, null, null]);
    expect(JSON.parse(plain).folders).toBeUndefined();
    expect(parseProjectFile(plain).folders).toEqual([null, null, null]);
  });
  it('old files without folder info import as unfiled', () => {
    expect(parseProjectFile(JSON.stringify(newProject('Solo'))).folders).toEqual([null]);
  });
  it('ignores bad folder values', () => {
    const file = JSON.stringify({
      format: 'interactivedesigner-project',
      version: 2,
      projects: [newProject('A')],
      folders: [42],
    });
    expect(parseProjectFile(file).folders).toEqual([null]);
  });
});
