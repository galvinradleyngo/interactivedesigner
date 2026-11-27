import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { migrate } from '../schema/migrate';
import type { ActivityDoc, MediaItem } from '../schema/types';
import { db, firebaseConfigured } from './firebase';

export interface ActivitySummary {
  id: string;
  title: string;
  type: string;
  updatedAt: number;
}

export interface ActivityStore {
  list(uid: string): Promise<ActivitySummary[]>;
  get(uid: string, id: string): Promise<ActivityDoc | null>;
  save(uid: string, id: string, a: ActivityDoc): Promise<void>;
  remove(uid: string, id: string): Promise<void>;
  newId(): string;
}

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

/**
 * Firestore layout (all under the owner's uid, which is what the rules check):
 *   users/{uid}/activities/{id}                -> activity fields; media[] holds metadata only
 *   users/{uid}/activities/{id}/media/{mediaId} -> { src }  (one doc per image, <1MB each)
 */
class FirestoreStore implements ActivityStore {
  newId = newId;
  private persistedMedia = new Map<string, Set<string>>();

  async list(uid: string): Promise<ActivitySummary[]> {
    const snap = await getDocs(
      query(collection(db(), 'users', uid, 'activities'), orderBy('updatedAt', 'desc')),
    );
    return snap.docs.map((d) => {
      const x = d.data();
      const ts = x.updatedAt as Timestamp | null;
      return {
        id: d.id,
        title: String(x.title ?? ''),
        type: String(x.type ?? ''),
        updatedAt: ts?.toMillis() ?? 0,
      };
    });
  }

  async get(uid: string, id: string): Promise<ActivityDoc | null> {
    const ref = doc(db(), 'users', uid, 'activities', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const mediaSnap = await getDocs(collection(ref, 'media'));
    const srcs = new Map(mediaSnap.docs.map((d) => [d.id, String(d.data().src ?? '')]));
    const data = snap.data();
    const media = ((data.media as MediaItem[] | undefined) ?? []).map((m) => ({
      ...m,
      src: srcs.get(m.id) ?? '',
    }));
    this.persistedMedia.set(id, new Set(srcs.keys()));
    return migrate({ ...data, media });
  }

  async save(uid: string, id: string, a: ActivityDoc): Promise<void> {
    const ref = doc(db(), 'users', uid, 'activities', id);
    const known = this.persistedMedia.get(id) ?? new Set<string>();
    const batch = writeBatch(db());
    const ids = new Set(a.media.map((m) => m.id));
    for (const m of a.media)
      if (!known.has(m.id)) batch.set(doc(ref, 'media', m.id), { src: m.src });
    for (const old of known) if (!ids.has(old)) batch.delete(doc(ref, 'media', old));
    await batch.commit();
    const meta = a.media.map(({ id: mid, name, mime }) => ({ id: mid, name, mime, src: '' }));
    await setDoc(ref, { ...a, media: meta, updatedAt: serverTimestamp() });
    this.persistedMedia.set(id, ids);
  }

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(db(), 'users', uid, 'activities', id);
    const m = await getDocs(collection(ref, 'media'));
    await Promise.all(m.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(ref);
    this.persistedMedia.delete(id);
  }
}

/** Fallback when Firebase isn't configured (also handy for trying the app locally). */
class LocalStore implements ActivityStore {
  newId = newId;
  private key = (uid: string) => `interactivedesigner:${uid}`;
  private read(uid: string): Record<string, { doc: ActivityDoc; updatedAt: number }> {
    try {
      return JSON.parse(localStorage.getItem(this.key(uid)) ?? '{}') as Record<
        string,
        { doc: ActivityDoc; updatedAt: number }
      >;
    } catch {
      return {};
    }
  }
  private write(uid: string, v: unknown) {
    localStorage.setItem(this.key(uid), JSON.stringify(v));
  }
  async list(uid: string) {
    return Object.entries(this.read(uid))
      .map(([id, v]) => ({ id, title: v.doc.title, type: v.doc.type, updatedAt: v.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async get(uid: string, id: string) {
    const v = this.read(uid)[id];
    return v ? migrate(v.doc) : null;
  }
  async save(uid: string, id: string, a: ActivityDoc) {
    const all = this.read(uid);
    all[id] = { doc: a, updatedAt: Date.now() };
    this.write(uid, all);
  }
  async remove(uid: string, id: string) {
    const all = this.read(uid);
    delete all[id];
    this.write(uid, all);
  }
}

export const store: ActivityStore = firebaseConfigured ? new FirestoreStore() : new LocalStore();
