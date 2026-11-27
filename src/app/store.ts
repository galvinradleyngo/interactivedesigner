import { migrate } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';
import { randomId } from './ids';

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: number;
  doc: ProjectDoc;
}

interface Row {
  id: string;
  doc: ProjectDoc;
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

/** Projects live in this browser's IndexedDB. Use project files for backups and sharing. */
export const store = {
  newId,
  async list(): Promise<ProjectSummary[]> {
    const rows = await tx<Row[]>('readonly', (s) => s.getAll());
    return rows
      .map((r) => ({ id: r.id, title: r.doc.title, updatedAt: r.updatedAt, doc: migrate(r.doc) }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id: string): Promise<ProjectDoc | null> {
    const row = await tx<Row | undefined>('readonly', (s) => s.get(id));
    return row ? migrate(row.doc) : null;
  },
  async save(id: string, doc: ProjectDoc): Promise<void> {
    await tx('readwrite', (s) => s.put({ id, doc, updatedAt: Date.now() } satisfies Row));
  },
  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
  },
};
