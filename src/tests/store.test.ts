import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { newProject } from '../schema/migrate';
import { store } from '../app/store';

const proj = (title: string) => newProject(title);

async function reset() {
  for (const p of await store.list()) await store.remove(p.id);
  for (const f of await store.listFolders()) await store.removeFolder(f.id);
}

describe('store: projects and folders', () => {
  beforeEach(reset);

  it('saves, lists and loads projects', async () => {
    const id = store.newId();
    await store.save(id, proj('A'));
    expect((await store.list()).map((p) => p.title)).toEqual(['A']);
    expect((await store.get(id))?.title).toBe('A');
    expect(await store.get('missing')).toBeNull();
  });

  it('creates, sorts and renames folders; rejects empty names', async () => {
    await store.createFolder('Week 2');
    const a = await store.createFolder('  Week 1  ');
    expect((await store.listFolders()).map((f) => f.name)).toEqual(['Week 1', 'Week 2']);
    await store.renameFolder(a.id, 'Intro');
    expect((await store.listFolders()).map((f) => f.name)).toEqual(['Intro', 'Week 2']);
    await expect(store.createFolder('   ')).rejects.toThrow();
    await expect(store.renameFolder(a.id, '')).rejects.toThrow();
  });

  it('moves a project into a folder and back out', async () => {
    const f = await store.createFolder('F');
    const id = store.newId();
    await store.save(id, proj('A'));
    expect((await store.list())[0]?.folderId).toBeNull();
    await store.setFolder(id, f.id);
    expect((await store.list())[0]?.folderId).toBe(f.id);
    await store.setFolder(id, null);
    expect((await store.list())[0]?.folderId).toBeNull();
  });

  it('autosave (save without a folder argument) keeps the project in its folder', async () => {
    const f = await store.createFolder('F');
    const id = store.newId();
    await store.save(id, proj('A'), f.id);
    await store.save(id, { ...proj('A edited') }); // what the editor does
    const [p] = await store.list();
    expect(p?.title).toBe('A edited');
    expect(p?.folderId).toBe(f.id);
  });

  it('save with an explicit null moves it out of the folder', async () => {
    const f = await store.createFolder('F');
    const id = store.newId();
    await store.save(id, proj('A'), f.id);
    await store.save(id, proj('A'), null);
    expect((await store.list())[0]?.folderId).toBeNull();
  });

  it('deleting a folder keeps its projects (unfiled)', async () => {
    const f = await store.createFolder('F');
    const other = await store.createFolder('Other');
    const a = store.newId();
    const b = store.newId();
    await store.save(a, proj('A'), f.id);
    await store.save(b, proj('B'), other.id);
    await store.removeFolder(f.id);
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.id === a)?.folderId).toBeNull();
    expect(list.find((p) => p.id === b)?.folderId).toBe(other.id);
    expect((await store.listFolders()).map((x) => x.name)).toEqual(['Other']);
  });

  it('duplicates a project into the same folder without touching the original', async () => {
    const f = await store.createFolder('F');
    const id = store.newId();
    const doc = proj('Quiz');
    doc.media = [{ id: 'm', name: 'a.png', mime: 'image/png', src: 'data:image/png;base64,AAAA' }];
    await store.save(id, doc, f.id);
    const copyId = await store.duplicate(id);
    expect(copyId).not.toBe(id);
    const list = await store.list();
    expect(list).toHaveLength(2);
    const copy = list.find((p) => p.id === copyId)!;
    expect(copy.title).toBe('Quiz (copy)');
    expect(copy.folderId).toBe(f.id);
    expect(copy.doc.media[0]?.src).toBe('data:image/png;base64,AAAA');
    expect(list.find((p) => p.id === id)?.title).toBe('Quiz');
    // editing the copy does not change the original
    await store.save(copyId, { ...copy.doc, title: 'Changed' });
    expect((await store.get(id))?.title).toBe('Quiz');
  });

  it('duplicating a missing project fails clearly', async () => {
    await expect(store.duplicate('nope')).rejects.toThrow(/no longer exists/);
  });
});
