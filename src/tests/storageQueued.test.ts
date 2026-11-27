import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { onStorageBlocked, setSlowOpenMs, store } from '../app/store';

const DB = 'interactivedesigner';

describe('storage held up behind another tab', () => {
  it('tells the user when storage is slow to open, even without a "blocked" signal, then recovers', async () => {
    setSlowOpenMs(120);
    // An old tab holds a version-1 connection with a saved activity.
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('activities', { keyPath: 'id' });
      r.onsuccess = () => {
        const t = r.result.transaction('activities', 'readwrite');
        t.objectStore('activities').put({
          id: 'old1',
          updatedAt: 1,
          doc: {
            schemaVersion: 2,
            title: 'Kept',
            settings: {},
            design: {},
            media: [],
            pages: [{ id: 'p', name: 'Page 1', elements: [] }],
          },
        });
        t.oncomplete = () => resolve(r.result);
      };
      r.onerror = () => reject(r.error);
    });
    // An earlier tab already asked for version 2 and is stuck waiting on the old one.
    indexedDB.open(DB, 2).onupgradeneeded = () => undefined;

    const events: boolean[] = [];
    const off = onStorageBlocked((b) => events.push(b));
    const list = store.list(); // this tab queues behind the stuck one
    await new Promise((r) => setTimeout(r, 400));
    expect(events).toContain(true); // the user is told, instead of a silent "Loading…"

    old.close(); // closing the old tab frees everything
    const items = await list;
    expect(items.map((p) => p.title)).toEqual(['Kept']);
    expect(events.at(-1)).toBe(false);
    off();
  });
});
