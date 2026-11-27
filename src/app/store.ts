import { migrate } from '../schema/migrate';
import type { ProjectDoc } from '../schema/types';
import { randomId } from './ids';

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: number;
  /** null = not in a folder. */
  folderId: string | null;
  doc: ProjectDoc;
}

interface Row {
  id: string;
  doc: ProjectDoc;
  updatedAt: number;
  folderId?: string | null;
}

const DB_NAME = 'interactivedesigner';
const PROJECTS = 'activities'; // original store name, kept so existing data stays in place
const FOLDERS = 'folders';

let dbPromise: Promise<IDBDatabase> | null = null;

type BlockedListener = (blocked: boolean) => void;
const blockedListeners = new Set<BlockedListener>();

/**
 * Called with true while the database upgrade is waiting for another open tab (an older version
 * of this app) to let go, and false once storage is available. Returns an unsubscribe function.
 */
export function onStorageBlocked(cb: BlockedListener): () => void {
  blockedListeners.add(cb);
  return () => {
    blockedListeners.delete(cb);
  };
}
const notify = (blocked: boolean) => blockedListeners.forEach((l) => l(blocked));

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS))
        db.createObjectStore(PROJECTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FOLDERS)) db.createObjectStore(FOLDERS, { keyPath: 'id' });
    };
    // Another tab still holds an older connection open: the upgrade waits until it closes.
    req.onblocked = () => notify(true);
    req.onsuccess = () => {
      const db = req.result;
      // If a newer version of the app needs to upgrade, step aside instead of blocking it.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      notify(false);
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null; // allow a retry
      notify(false);
      reject(req.error ?? new Error('Could not open browser storage'));
    };
  });
  return dbPromise;
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('Browser storage error'));
  });

/** Run several operations in one transaction (so read-modify-write is atomic). */
async function tx<T>(
  names: string[],
  mode: IDBTransactionMode,
  fn: (store: (name: string) => IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await open();
  const t = db.transaction(names, mode);
  const done = new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('Browser storage error'));
    t.onabort = () => reject(t.error ?? new Error('Browser storage was blocked or is full'));
  });
  done.catch(() => undefined); // surfaced through the awaited result below
  try {
    const result = await fn((n) => t.objectStore(n));
    await done;
    return result;
  } catch (e) {
    try {
      t.abort();
    } catch {
      /* already finished */
    }
    throw e;
  }
}

export const newId = (): string => randomId(20);

const byName = (a: Folder, b: Folder) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Projects and folders live in this browser's IndexedDB. A project's folder is stored beside
 * the project (not inside it), so project files and exports are unaffected by folders.
 */
export const store = {
  newId,

  async list(): Promise<ProjectSummary[]> {
    const rows = await tx([PROJECTS], 'readonly', (s) => req<Row[]>(s(PROJECTS).getAll()));
    return rows
      .map((r) => ({
        id: r.id,
        title: r.doc.title,
        updatedAt: r.updatedAt,
        folderId: r.folderId ?? null,
        doc: migrate(r.doc),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async get(id: string): Promise<ProjectDoc | null> {
    const row = await tx([PROJECTS], 'readonly', (s) => req<Row | undefined>(s(PROJECTS).get(id)));
    return row ? migrate(row.doc) : null;
  },

  /** Save a project. `folderId` undefined keeps its current folder (autosave must not move it). */
  async save(id: string, doc: ProjectDoc, folderId?: string | null): Promise<void> {
    await tx([PROJECTS], 'readwrite', async (s) => {
      const existing = await req<Row | undefined>(s(PROJECTS).get(id));
      const next: Row = {
        id,
        doc,
        updatedAt: Date.now(),
        folderId: folderId === undefined ? (existing?.folderId ?? null) : folderId,
      };
      await req(s(PROJECTS).put(next));
    });
  },

  /** Copy a project (same folder, title "… (copy)") and return the copy's id. */
  async duplicate(id: string): Promise<string> {
    const copyId = newId();
    await tx([PROJECTS], 'readwrite', async (s) => {
      const row = await req<Row | undefined>(s(PROJECTS).get(id));
      if (!row) throw new Error('That activity no longer exists');
      const doc = structuredClone(row.doc);
      doc.title = `${row.doc.title} (copy)`;
      await req(
        s(PROJECTS).put({ id: copyId, doc, updatedAt: Date.now(), folderId: row.folderId ?? null }),
      );
    });
    return copyId;
  },

  async setFolder(id: string, folderId: string | null): Promise<void> {
    await tx([PROJECTS], 'readwrite', async (s) => {
      const row = await req<Row | undefined>(s(PROJECTS).get(id));
      if (row) await req(s(PROJECTS).put({ ...row, folderId }));
    });
  },

  async remove(id: string): Promise<void> {
    await tx([PROJECTS], 'readwrite', (s) => req(s(PROJECTS).delete(id)).then(() => undefined));
  },

  async listFolders(): Promise<Folder[]> {
    const rows = await tx([FOLDERS], 'readonly', (s) => req<Folder[]>(s(FOLDERS).getAll()));
    return rows.sort(byName);
  },

  async createFolder(name: string): Promise<Folder> {
    const clean = name.trim();
    if (!clean) throw new Error('Give the folder a name');
    const folder: Folder = { id: newId(), name: clean.slice(0, 80), createdAt: Date.now() };
    await tx([FOLDERS], 'readwrite', (s) => req(s(FOLDERS).put(folder)).then(() => undefined));
    return folder;
  },

  async renameFolder(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) throw new Error('Give the folder a name');
    await tx([FOLDERS], 'readwrite', async (s) => {
      const f = await req<Folder | undefined>(s(FOLDERS).get(id));
      if (f) await req(s(FOLDERS).put({ ...f, name: clean.slice(0, 80) }));
    });
  },

  /** Deletes the folder only. Its projects are kept and become unfiled. */
  async removeFolder(id: string): Promise<void> {
    await tx([FOLDERS, PROJECTS], 'readwrite', async (s) => {
      const rows = await req<Row[]>(s(PROJECTS).getAll());
      for (const r of rows)
        if (r.folderId === id) await req(s(PROJECTS).put({ ...r, folderId: null }));
      await req(s(FOLDERS).delete(id));
    });
  },
};
