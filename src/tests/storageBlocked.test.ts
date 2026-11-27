import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { onStorageBlocked, store } from '../app/store';

const DB = 'interactivedesigner';

/** An "old tab": a version-1 connection with one saved project, kept open. */
function openOldVersion(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('activities', { keyPath: 'id' });
    r.onsuccess = () => {
      const t = r.result.transaction('activities', 'readwrite');
      t.objectStore('activities').put({
        id: 'old1',
        updatedAt: 1,
        doc: {
          schemaVersion: 2,
          title: 'Saved by the old version',
          settings: {},
          design: {},
          media: [],
          pages: [{ id: 'p', name: 'Page 1', elements: [] }],
        },
      });
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
    };
    r.onerror = () => reject(r.error);
  });
}

describe('storage upgrade with an old tab still open', () => {
  it('reports that it is blocked, then continues and keeps the old data once the old tab closes', async () => {
    const old = await openOldVersion();
    const events: boolean[] = [];
    const off = onStorageBlocked((b) => events.push(b));

    const pending = store.list(); // starts the 1 -> 2 upgrade, which the old connection blocks
    await new Promise((r) => setTimeout(r, 50));
    expect(events).toEqual([true]);

    old.close(); // the old tab lets go
    const projects = await pending;
    expect(events).toEqual([true, false]);
    expect(projects.map((p) => p.title)).toEqual(['Saved by the old version']);
    expect(await store.listFolders()).toEqual([]); // folders store exists after the upgrade
    off();
  });

  it('steps aside when a newer version wants to upgrade (does not block it)', async () => {
    await store.list(); // our connection is open at v2
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(DB, 3);
      r.onblocked = () => reject(new Error('our connection blocked the newer version'));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    expect(upgraded.version).toBe(3);
    upgraded.close();
  });
});
