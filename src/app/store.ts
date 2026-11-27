import { migrate } from '../schema/migrate';
import type { ActivityDoc } from '../schema/types';
import { randomId } from './ids';

export interface ActivitySummary {
  id: string;
  title: string;
  type: string;
  updatedAt: number;
}

interface Row {
  id: string;
  doc: ActivityDoc;
  updatedAt: number;
}

const DB_NAME = 'interactivedesigner';
const STORE = 'activities';

let dbPromise: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open browser storage'));
  });
  return dbPromise;
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error ?? new Error('Browser storage error'));
    t.onabort = () => reject(t.error ?? new Error('Browser storage was blocked or is full'));
  });
}

export const newId = (): string => randomId(20);

/** Activities live in this browser's IndexedDB. Use project files for backups and sharing. */
export const store = {
  newId,
  async list(): Promise<ActivitySummary[]> {
    const rows = await tx<Row[]>('readonly', (s) => s.getAll());
    return rows
      .map((r) => ({ id: r.id, title: r.doc.title, type: r.doc.type, updatedAt: r.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id: string): Promise<ActivityDoc | null> {
    const row = await tx<Row | undefined>('readonly', (s) => s.get(id));
    return row ? migrate(row.doc) : null;
  },
  async save(id: string, doc: ActivityDoc): Promise<void> {
    await tx('readwrite', (s) => s.put({ id, doc, updatedAt: Date.now() } satisfies Row));
  },
  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
  },
};
