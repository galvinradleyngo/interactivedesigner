import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { newProject } from '../../schema/migrate';
import type { ProjectDoc } from '../../schema/types';
import { Icon } from '../components/Icon';
import { PageThumb } from '../components/PageThumb';
import { download } from '../export';
import { parseProject, projectFileName, serializeProject } from '../project';
import { store, type ProjectSummary } from '../store';

const OFFLINE_FILE = 'interactive-designer-offline.html';
const isSingleFile = import.meta.env.MODE === 'single';

const activityLabels = (doc: ProjectDoc): string[] => {
  const set = new Set<string>();
  for (const p of doc.pages)
    for (const e of p.elements)
      if (DEFS_BY_TYPE.get(e.type)?.category === 'activity')
        set.add(DEFS_BY_TYPE.get(e.type)?.label ?? e.type);
  return [...set];
};

export function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
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

  const create = () =>
    run(async () => {
      const id = store.newId();
      await store.save(id, newProject('Untitled project'));
      nav(`/edit/${id}`);
    });

  const exportOne = (p: ProjectSummary) =>
    download(
      new Blob([serializeProject([p.doc])], { type: 'application/json' }),
      projectFileName(p.title),
    );

  const backupAll = () => {
    if (!items?.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    download(
      new Blob([serializeProject(items.map((i) => i.doc))], { type: 'application/json' }),
      `interactive-designer-backup-${stamp}.idproject.json`,
    );
  };

  const importFiles = (files: FileList | null) =>
    run(async () => {
      let n = 0;
      for (const f of Array.from(files ?? [])) {
        for (const doc of parseProject(await f.text())) {
          await store.save(store.newId(), doc);
          n++;
        }
      }
      setInfo(`Imported ${n} ${n === 1 ? 'project' : 'projects'}.`);
    });

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="brand">
          <span className="logo">
            <Icon name="layers" size={20} />
          </span>
          <span>Interactive Designer</span>
        </div>
        <div className="row">
          <button type="button" onClick={() => fileInput.current?.click()}>
            <Icon name="folder" size={16} /> Open project file
          </button>
          <button type="button" onClick={backupAll} disabled={!items?.length}>
            <Icon name="download" size={16} /> Back up all
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

      <main className="dash-main">
        <h1>Projects</h1>
        <p className="lede">
          Start with a blank canvas, add activities and elements, then export a SCORM package for
          Canvas.
        </p>
        {error && (
          <p role="alert" className="banner error">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="banner">
            {info}
          </p>
        )}

        <ul className="cards">
          <li>
            <button type="button" className="card newcard" onClick={() => void create()}>
              <span className="plus">
                <Icon name="plus" size={28} />
              </span>
              <strong>New blank project</strong>
              <small>A blank canvas, ready for activities</small>
            </button>
          </li>
          {items?.map((p) => {
            const labels = activityLabels(p.doc);
            const ungraded = p.doc.settings.graded === false;
            return (
              <li key={p.id}>
                <article className="card">
                  <button
                    type="button"
                    className="thumbbtn"
                    onClick={() => nav(`/edit/${p.id}`)}
                    aria-label={`Open ${p.title || 'Untitled'}`}
                  >
                    <PageThumb
                      doc={p.doc}
                      page={p.doc.pages[0] ?? { id: 'x', name: '', elements: [] }}
                    />
                  </button>
                  <div className="card-body">
                    <h2>{p.title || 'Untitled'}</h2>
                    <p className="muted">
                      {p.doc.pages.length} {p.doc.pages.length === 1 ? 'page' : 'pages'} · edited{' '}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                    <div className="chips">
                      {ungraded && <span className="chip tag-ungraded">Ungraded</span>}
                      {labels.length ? (
                        labels.map((l) => (
                          <span key={l} className="chip">
                            {l}
                          </span>
                        ))
                      ) : (
                        <span className="chip quiet">No activities yet</span>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" onClick={() => nav(`/edit/${p.id}`)}>
                      Open
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label={`Rename ${p.title}`}
                      title="Rename"
                      onClick={() => {
                        const t = window.prompt('New title', p.title);
                        if (t?.trim())
                          void run(() => store.save(p.id, { ...p.doc, title: t.trim() }));
                      }}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label={`Duplicate ${p.title}`}
                      title="Duplicate"
                      onClick={() =>
                        void run(() =>
                          store.save(store.newId(), { ...p.doc, title: `${p.title} (copy)` }),
                        )
                      }
                    >
                      <Icon name="copy" size={15} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label={`Export project file for ${p.title}`}
                      title="Save as project file"
                      onClick={() => exportOne(p)}
                    >
                      <Icon name="download" size={15} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn danger"
                      aria-label={`Delete ${p.title}`}
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete "${p.title}"? This cannot be undone.`))
                          void run(() => store.remove(p.id));
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        {items === null && <p>Loading…</p>}

        <p className="footnote" role="note">
          Projects are saved in this browser on this device and work offline. Use{' '}
          <strong>Back up all</strong> or the download button on a project to keep copies or share
          work.
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
      </main>
    </div>
  );
}
