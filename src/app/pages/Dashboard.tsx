import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_DESIGN,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type ActivityDoc,
} from '../../schema/types';
import { editorPlugins, getEditorPlugin } from '../registry';
import { useAuth } from '../auth';
import { store, type ActivitySummary } from '../store';

export function Dashboard() {
  const { user, logout, localMode } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState('');
  const uid = user?.uid ?? '';

  const load = useCallback(() => {
    store.list(uid).then(setItems, (e: Error) => setError(e.message));
  }, [uid]);
  useEffect(load, [load]);

  const create = async (type: string) => {
    const plugin = getEditorPlugin(type);
    if (!plugin) return;
    const id = store.newId();
    const doc: ActivityDoc = {
      schemaVersion: SCHEMA_VERSION,
      type,
      title: `Untitled ${plugin.def.label}`,
      settings: { ...DEFAULT_SETTINGS },
      design: { ...DEFAULT_DESIGN },
      content: plugin.def.createDefault(),
      media: [],
    };
    await store.save(uid, id, doc);
    nav(`/edit/${id}`);
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>My activities</h1>
        <div className="row">
          <span>{user?.name}</span>
          {!localMode && <button onClick={() => void logout()}>Sign out</button>}
        </div>
      </header>
      {localMode && (
        <p className="notice" role="note">
          Firebase isn't configured, so activities are stored in this browser only. See the README
          to connect Firebase.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <section className="panel">
        <h2>New activity</h2>
        <div className="row wrap">
          {editorPlugins.map((p) => (
            <button
              key={p.def.type}
              className="primary"
              onClick={() => void create(p.def.type)}
              title={p.def.description}
            >
              + {p.def.label}
            </button>
          ))}
        </div>
      </section>

      {items === null ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No activities yet. Create one above.</p>
      ) : (
        <ul className="list">
          {items.map((a) => (
            <li key={a.id} className="panel row between">
              <div>
                <strong>{a.title || 'Untitled'}</strong>
                <div className="muted">
                  {getEditorPlugin(a.type)?.def.label ?? a.type} ·{' '}
                  {a.updatedAt ? new Date(a.updatedAt).toLocaleString() : ''}
                </div>
              </div>
              <div className="row wrap">
                <button onClick={() => nav(`/edit/${a.id}`)}>Open</button>
                <button
                  onClick={() => {
                    const t = window.prompt('New title', a.title);
                    if (t?.trim())
                      void run(async () => {
                        const d = await store.get(uid, a.id);
                        if (d) await store.save(uid, a.id, { ...d, title: t.trim() });
                      });
                  }}
                >
                  Rename
                </button>
                <button
                  onClick={() =>
                    void run(async () => {
                      const d = await store.get(uid, a.id);
                      if (d)
                        await store.save(uid, store.newId(), { ...d, title: `${d.title} (copy)` });
                    })
                  }
                >
                  Duplicate
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (window.confirm(`Delete "${a.title}"? This cannot be undone.`))
                      void run(() => store.remove(uid, a.id));
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
