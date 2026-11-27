import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { newProject } from '../../schema/migrate';
import type { ProjectDoc } from '../../schema/types';
import { Icon } from '../components/Icon';
import { PageThumb } from '../components/PageThumb';
import { buildScormZip, download } from '../export';
import { packFolder } from '../folderExport';
import { parseProjectFile, projectFileName, serializeProject } from '../project';
import { store, type Folder, type ProjectSummary } from '../store';

const OFFLINE_FILE = 'interactive-designer-offline.html';
const isSingleFile = import.meta.env.MODE === 'single';

/** What the main list shows: everything, projects not in a folder, or one folder. */
type View = { kind: 'all' } | { kind: 'unfiled' } | { kind: 'folder'; id: string };

const activityLabels = (doc: ProjectDoc): string[] => {
  const set = new Set<string>();
  for (const p of doc.pages)
    for (const e of p.elements) {
      const d = DEFS_BY_TYPE.get(e.type);
      if (d?.category === 'activity') set.add(d.label);
    }
  return [...set];
};

export function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>({ kind: 'all' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState('');
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([store.list(), store.listFolders()]);
      setItems(p);
      setFolders(f);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
    await load();
  };

  const currentFolder =
    view.kind === 'folder' ? (folders.find((f) => f.id === view.id) ?? null) : null;
  // If the selected folder disappeared (deleted elsewhere), fall back to everything.
  useEffect(() => {
    if (view.kind === 'folder' && folders.length > 0 && !currentFolder) setView({ kind: 'all' });
  }, [view, folders, currentFolder]);

  const counts = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const p of items ?? []) m.set(p.folderId, (m.get(p.folderId) ?? 0) + 1);
    return m;
  }, [items]);

  const visible = useMemo(() => {
    const all = items ?? [];
    if (view.kind === 'all') return all;
    if (view.kind === 'unfiled') return all.filter((p) => !p.folderId);
    return all.filter((p) => p.folderId === view.id);
  }, [items, view]);

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? null;

  const create = () =>
    run(async () => {
      const id = store.newId();
      await store.save(id, newProject('Untitled project'), currentFolder?.id ?? null);
      nav(`/edit/${id}`);
    });

  const duplicate = (p: ProjectSummary) =>
    run(async () => {
      await store.duplicate(p.id);
      setInfo(`Duplicated “${p.title}”.`);
    });

  const exportOne = (p: ProjectSummary) =>
    download(
      new Blob([serializeProject([p.doc], [folderName(p.folderId)])], { type: 'application/json' }),
      projectFileName(p.title),
    );

  const backupAll = () => {
    if (!items?.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    download(
      new Blob(
        [
          serializeProject(
            items.map((i) => i.doc),
            items.map((i) => folderName(i.folderId)),
          ),
        ],
        { type: 'application/json' },
      ),
      `interactive-designer-backup-${stamp}.idproject.json`,
    );
  };

  /** Find a folder by name (case-insensitive) or create it. */
  const folderIdForName = async (
    name: string | null,
    known: Folder[],
  ): Promise<{ id: string | null; folders: Folder[] }> => {
    if (!name) return { id: null, folders: known };
    const hit = known.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (hit) return { id: hit.id, folders: known };
    const made = await store.createFolder(name);
    return { id: made.id, folders: [...known, made] };
  };

  const importFiles = (files: FileList | null) =>
    run(async () => {
      let n = 0;
      let known = folders;
      for (const f of Array.from(files ?? [])) {
        const parsed = parseProjectFile(await f.text());
        for (let i = 0; i < parsed.projects.length; i++) {
          // Use the folder named in the file; otherwise the folder you are looking at.
          const target = await folderIdForName(parsed.folders[i] ?? null, known);
          known = target.folders;
          await store.save(
            store.newId(),
            parsed.projects[i] as ProjectDoc,
            target.id ?? currentFolder?.id ?? null,
          );
          n++;
        }
      }
      setInfo(`Imported ${n} ${n === 1 ? 'project' : 'projects'}.`);
    });

  const addFolder = () =>
    run(async () => {
      const f = await store.createFolder(newFolder ?? '');
      setNewFolder(null);
      setView({ kind: 'folder', id: f.id });
    });

  /* Folder downloads */
  const downloadFolderScorm = async () => {
    if (!currentFolder || visible.length === 0) return;
    setError('');
    setInfo('');
    try {
      const r = await packFolder(
        currentFolder.name,
        visible.map((p) => ({ title: p.title, doc: p.doc })),
        buildScormZip,
        (done, total, title) =>
          setBusy(
            done < total ? `Building SCORM package ${done + 1} of ${total}: ${title}…` : 'Zipping…',
          ),
      );
      if (r.built > 0) download(r.blob, r.fileName);
      setInfo(
        `Downloaded ${r.built} SCORM ${r.built === 1 ? 'package' : 'packages'} from “${currentFolder.name}” in ${r.fileName}. Unzip it to get one .zip per project to upload to Canvas.` +
          (r.failed.length
            ? ` Skipped ${r.failed.length}: ${r.failed.map((f) => `${f.title} (${f.error})`).join('; ')}`
            : ''),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const downloadFolderFile = () => {
    if (!currentFolder || visible.length === 0) return;
    download(
      new Blob(
        [
          serializeProject(
            visible.map((p) => p.doc),
            visible.map(() => currentFolder.name),
          ),
        ],
        { type: 'application/json' },
      ),
      projectFileName(`${currentFolder.name} projects`),
    );
    setInfo(
      `Saved ${visible.length} ${visible.length === 1 ? 'project' : 'projects'} from “${currentFolder.name}” as one project file.`,
    );
  };

  const heading =
    view.kind === 'all'
      ? 'All projects'
      : view.kind === 'unfiled'
        ? 'Unfiled'
        : (currentFolder?.name ?? 'Folder');

  const viewBtn = (label: string, v: View, count: number, icon: string) => {
    const on =
      v.kind === view.kind && (v.kind !== 'folder' || (view.kind === 'folder' && view.id === v.id));
    return (
      <button
        type="button"
        className={`folderbtn ${on ? 'on' : ''}`}
        aria-current={on}
        onClick={() => setView(v)}
      >
        <Icon name={icon} size={16} />
        <span className="folder-label">{label}</span>
        <span className="count">{count}</span>
      </button>
    );
  };

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

      <div className="dash-body">
        <nav className="sidebar" aria-label="Folders">
          <ul className="folderlist">
            <li>{viewBtn('All projects', { kind: 'all' }, items?.length ?? 0, 'layers')}</li>
            <li>{viewBtn('Unfiled', { kind: 'unfiled' }, counts.get(null) ?? 0, 'page')}</li>
          </ul>
          <h2 className="group">Folders</h2>
          <ul className="folderlist">
            {folders.map((f) => (
              <li key={f.id}>
                {viewBtn(f.name, { kind: 'folder', id: f.id }, counts.get(f.id) ?? 0, 'folder')}
              </li>
            ))}
          </ul>
          {newFolder === null ? (
            <button type="button" className="wide" onClick={() => setNewFolder('')}>
              <Icon name="plus" size={15} /> New folder
            </button>
          ) : (
            <form
              className="newfolder"
              onSubmit={(e) => {
                e.preventDefault();
                void addFolder();
              }}
            >
              <input
                type="text"
                autoFocus
                value={newFolder}
                aria-label="Folder name"
                placeholder="Folder name"
                maxLength={80}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setNewFolder(null)}
              />
              <div className="row">
                <button type="submit" className="primary" disabled={!newFolder.trim()}>
                  Create
                </button>
                <button type="button" onClick={() => setNewFolder(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </nav>

        <main className="dash-main">
          <div className="dash-head">
            <h1>{heading}</h1>
            {currentFolder && (
              <div className="row wrap">
                <button
                  type="button"
                  className="primary"
                  disabled={!visible.length || !!busy}
                  onClick={() => void downloadFolderScorm()}
                  title="One zip containing a SCORM package for each project in this folder"
                >
                  <Icon name="download" size={16} /> Download SCORM packages
                </button>
                <button
                  type="button"
                  disabled={!visible.length}
                  onClick={downloadFolderFile}
                  title="One project file you can open here later or share with a colleague"
                >
                  <Icon name="download" size={16} /> Save as project file
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const n = window.prompt('Rename folder', currentFolder.name);
                    if (n?.trim()) void run(() => store.renameFolder(currentFolder.id, n));
                  }}
                >
                  <Icon name="edit" size={15} /> Rename
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the folder “${currentFolder.name}”? Its ${visible.length} ${visible.length === 1 ? 'project is' : 'projects are'} not deleted; they move to Unfiled.`,
                      )
                    ) {
                      void run(() => store.removeFolder(currentFolder.id));
                      setView({ kind: 'all' });
                    }
                  }}
                >
                  <Icon name="trash" size={15} /> Delete folder
                </button>
              </div>
            )}
          </div>
          <p className="lede">
            {currentFolder
              ? 'Projects in this folder. New projects you create here are added to it.'
              : 'Start with a blank canvas, add activities and elements, then export a SCORM package for Canvas.'}
          </p>
          {busy && (
            <p role="status" className="banner">
              {busy}
            </p>
          )}
          {error && (
            <p role="alert" className="banner error">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="banner">
              {info}{' '}
              <button type="button" className="link" onClick={() => setInfo('')}>
                Dismiss
              </button>
            </p>
          )}

          <ul className="cards">
            <li>
              <button type="button" className="card newcard" onClick={() => void create()}>
                <span className="plus">
                  <Icon name="plus" size={28} />
                </span>
                <strong>New blank project</strong>
                <small>
                  {currentFolder
                    ? `In “${currentFolder.name}”`
                    : 'A blank canvas, ready for activities'}
                </small>
              </button>
            </li>
            {visible.map((p) => {
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
                      <label className="moveto">
                        <span className="field-label">Folder</span>
                        <select
                          aria-label={`Folder for ${p.title}`}
                          value={p.folderId ?? ''}
                          onChange={(e) =>
                            void run(() => store.setFolder(p.id, e.target.value || null))
                          }
                        >
                          <option value="">Unfiled</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => nav(`/edit/${p.id}`)}>
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicate(p)}
                        title="Make a copy of this project"
                      >
                        <Icon name="copy" size={15} /> Duplicate
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
                        aria-label={`Save project file for ${p.title}`}
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
          {items !== null && visible.length === 0 && view.kind !== 'all' && (
            <p className="muted">
              Nothing here yet. Create a project, or move one in with its Folder menu.
            </p>
          )}

          <p className="footnote" role="note">
            Projects are saved in this browser on this device and work offline. Use{' '}
            <strong>Back up all</strong> or a folder’s download buttons to keep copies or share
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
    </div>
  );
}
