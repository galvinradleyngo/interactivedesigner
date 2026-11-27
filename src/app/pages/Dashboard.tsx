import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_DESIGN,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type ActivityDoc,
} from '../../schema/types';
import { download } from '../export';
import { parseProject, projectFileName, serializeProject } from '../project';
import { editorPlugins, getEditorPlugin } from '../registry';
import { store, type ActivitySummary } from '../store';

const OFFLINE_FILE = 'interactive-designer-offline.html';
const isSingleFile = import.meta.env.MODE === 'single';

export function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    store.list().then(setItems, (e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const create = (type: string) =>
    run(async () => {
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
      await store.save(id, doc);
      nav(`/edit/${id}`);
    });

  const exportOne = (a: ActivitySummary) =>
    run(async () => {
      const d = await store.get(a.id);
      if (d)
        download(
          new Blob([serializeProject([d])], { type: 'application/json' }),
          projectFileName(d.title),
        );
    });

  const backupAll = () =>
    run(async () => {
      const docs: ActivityDoc[] = [];
      for (const a of items ?? []) {
        const d = await store.get(a.id);
        if (d) docs.push(d);
      }
      if (docs.length === 0) throw new Error('Nothing to back up yet');
      const stamp = new Date().toISOString().slice(0, 10);
      download(
        new Blob([serializeProject(docs)], { type: 'application/json' }),
        `interactive-designer-backup-${stamp}.idproject.json`,
      );
    });

  const importFiles = (files: FileList | null) =>
    run(async () => {
      let n = 0;
      for (const f of Array.from(files ?? [])) {
        for (const doc of parseProject(await f.text())) {
          await store.save(store.newId(), doc);
          n++;
        }
      }
      setInfo(`Imported ${n} ${n === 1 ? 'activity' : 'activities'}.`);
    });

  return (
    <div className="page">
      <header className="topbar">
        <h1>My activities</h1>
        <div className="row wrap">
          <button onClick={() => fileInput.current?.click()}>Open project file…</button>
          <button onClick={() => void backupAll()} disabled={!items?.length}>
            Back up all
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            aria-label="Open project file"
            onChange={(e) => {
              void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </header>
      <p className="notice" role="note">
        Your activities are saved in this browser, on this device only, and work offline. Browsers
        can clear site data, so use <strong>Back up all</strong> or <strong>Export project</strong>{' '}
        to keep copies or share work with a colleague.
        {!isSingleFile && (
          <>
            {' '}
            <a href={`./${OFFLINE_FILE}`} download>
              Download the single-file offline version
            </a>
            .
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="notice">
          {info}
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
        <p>No activities yet. Create one above, or open a project file.</p>
      ) : (
        <ul className="list">
          {items.map((a) => (
            <li key={a.id} className="panel row between">
              <div>
                <strong>{a.title || 'Untitled'}</strong>
                <div className="muted">
                  {getEditorPlugin(a.type)?.def.label ?? a.type} ·{' '}
                  {new Date(a.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="row wrap">
                <button onClick={() => nav(`/edit/${a.id}`)}>Open</button>
                <button
                  onClick={() => {
                    const t = window.prompt('New title', a.title);
                    if (t?.trim())
                      void run(async () => {
                        const d = await store.get(a.id);
                        if (d) await store.save(a.id, { ...d, title: t.trim() });
                      });
                  }}
                >
                  Rename
                </button>
                <button
                  onClick={() =>
                    void run(async () => {
                      const d = await store.get(a.id);
                      if (d) await store.save(store.newId(), { ...d, title: `${d.title} (copy)` });
                    })
                  }
                >
                  Duplicate
                </button>
                <button onClick={() => void exportOne(a)}>Export project</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (window.confirm(`Delete "${a.title}"? This cannot be undone.`))
                      void run(() => store.remove(a.id));
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
