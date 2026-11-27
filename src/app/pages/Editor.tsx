import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  STAGE_W,
  stageHeight,
  type Page,
  type ProjectDoc,
  type StageElement,
} from '../../schema/types';
import { newKey } from '../../schema/migrate';
import { Icon } from '../components/Icon';
import { PreviewModal } from '../components/Preview';
import { StorageNotice } from '../components/StorageNotice';
import { Canvas } from '../editor/Canvas';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { checkProject, type Issue } from '../editor/checks';
import { IssuesMenu } from '../editor/IssuesMenu';
import { useHistory } from '../editor/history';
import { Inspector, type InspectorTab } from '../editor/Inspector';
import { LeftPanel } from '../editor/LeftPanel';
import * as model from '../editor/model';
import { buildScormZip, download } from '../export';
import { addImage as addImageFile } from '../media';
import { store } from '../store';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (el.matches?.('input, textarea, select') || el.isContentEditable);
};

export function Editor() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const h = useHistory<ProjectDoc>();
  const doc = h.present;
  const docRef = useRef<ProjectDoc | null>(null);
  docRef.current = doc;

  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pageId, setPageId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [peek, setPeek] = useState<Record<string, boolean>>({});
  const [openTab, setOpenTab] = useState<{ tab: InspectorTab; n: number } | undefined>();
  const [sub, setSub] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snapOn, setSnapOn] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const clipboard = useRef<StageElement | null>(null);
  const loaded = useRef(false);
  const lastSaved = useRef<ProjectDoc | null>(null);

  useEffect(() => {
    store.get(id).then(
      (d) => {
        if (!d) return setMissing(true);
        loaded.current = true;
        lastSaved.current = d;
        h.reset(d);
        setPageId(d.pages[0]?.id ?? '');
      },
      (e: Error) => setLoadError(e.message),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Apply an edit to the latest project. `key` merges rapid edits into one undo step. */
  const change = useCallback(
    (fn: (d: ProjectDoc) => ProjectDoc, key?: string) => {
      h.set(fn, key);
    },
    [h],
  );

  const issues = useMemo(() => (doc ? checkProject(doc) : []), [doc]);
  const goIssue = (it: Issue) => {
    setPageId(it.pageId);
    setSelectedId(it.elementId);
    setOpenTab({ tab: 'element', n: Date.now() });
  };

  const page: Page | undefined = doc?.pages.find((p) => p.id === pageId) ?? doc?.pages[0];
  const pgId = page?.id ?? '';
  const selected = page?.elements.find((e) => e.id === selectedId) ?? null;

  /* Autosave */
  const save = useCallback(async () => {
    const d = docRef.current;
    if (!d || d === lastSaved.current) return;
    setSaveState('saving');
    try {
      await store.save(id, d);
      lastSaved.current = d;
      setSaveState(docRef.current === d ? 'saved' : 'dirty');
    } catch (e) {
      setSaveState('error');
      setMsg(`Could not save: ${(e as Error).message}`);
    }
  }, [id]);

  useEffect(() => {
    if (!doc || !loaded.current || doc === lastSaved.current) return;
    setSaveState('dirty');
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
  }, [doc, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (docRef.current !== lastSaved.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      // Flush on leaving the editor so no edit is lost.
      const d = docRef.current;
      if (d && d !== lastSaved.current) void store.save(id, d);
    };
  }, [id]);

  /* Selection helpers */
  const select = useCallback((elId: string | null) => {
    setSelectedId(elId);
    setSub(null);
    if (elId === null) setEditingBlock(null);
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setEditingBlock(null);
    setEditingText(null);
    setSub(null);
  }, [pgId]);

  /* Actions */
  const addElement = (type: string) => {
    if (!page) return;
    const el = model.newElement(type, undefined, stageHeight(doc?.design));
    change((d) => model.addElement(d, pgId, el));
    setSelectedId(el.id);
    setSub(null);
    setEditingBlock(null);
  };
  /** Add a block centred on a spot of the page (a palette tile was dropped there). */
  const addElementAt = (type: string, at: { x: number; y: number }) => {
    if (!page) return;
    const H = stageHeight(doc?.design);
    const el = model.newElement(type, undefined, H);
    el.x = Math.round(Math.min(STAGE_W - 24, Math.max(0, at.x - el.w / 2)));
    el.y = Math.round(Math.min(H - 24, Math.max(0, at.y - el.h / 2)));
    change((d) => model.addElement(d, pgId, el));
    setSelectedId(el.id);
    setSub(null);
    setEditingBlock(null);
  };
  const deleteEl = useCallback(
    (elId: string) => {
      change((d) => model.removeElement(d, pgId, elId));
      setSelectedId(null);
      setEditingBlock(null);
    },
    [change, pgId],
  );
  const duplicateEl = useCallback(
    (elId: string) => {
      const cur = docRef.current;
      if (!cur) return;
      const r = model.duplicateElement(cur, pgId, elId);
      if (r.id) {
        h.set(r.doc);
        setSelectedId(r.id);
      }
    },
    [h, pgId],
  );
  const patchEl = useCallback(
    (elId: string, patch: Partial<StageElement>, key?: string) =>
      change((d) => model.updateElement(d, pgId, elId, patch), key),
    [change, pgId],
  );

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
        return;
      }
      if (mod && k === 'y' && !typing) {
        e.preventDefault();
        h.redo();
        return;
      }
      if (mod && k === 's') {
        e.preventDefault();
        void save();
        return;
      }
      if (typing) return;
      if (e.key === 'Escape') {
        if (editingBlock) setEditingBlock(null);
        else setSelectedId(null);
        return;
      }
      const cur = docRef.current;
      const sel = cur?.pages.find((p) => p.id === pgId)?.elements.find((x) => x.id === selectedId);
      if (mod && k === 'v' && clipboard.current && cur) {
        e.preventDefault();
        const src = clipboard.current;
        const copy: StageElement = {
          ...model.clone(src),
          id: newKey('e'),
          x: Math.min(src.x + 20, STAGE_W - 24),
          y: Math.min(src.y + 20, stageHeight(cur.design) - 24),
        };
        clipboard.current = copy;
        h.set(model.addElement(cur, pgId, copy));
        setSelectedId(copy.id);
        return;
      }
      if (!sel) return;
      if (mod && k === 'c') {
        e.preventDefault();
        clipboard.current = model.clone(sel);
      } else if (mod && k === 'd') {
        e.preventDefault();
        duplicateEl(sel.id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteEl(sel.id);
      } else if (e.key.startsWith('Arrow') && !sel.locked && !editingBlock) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        patchEl(sel.id, { x: sel.x + dx, y: sel.y + dy }, `nudge-${sel.id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h, save, pgId, selectedId, editingBlock, duplicateEl, deleteEl, patchEl]);

  const addImage = useCallback(
    async (file: File): Promise<string> => {
      const m = await addImageFile(file);
      change((d) => ({ ...d, media: [...d.media, m] }));
      return `media:${m.id}`;
    },
    [change],
  );

  const fail = (e: unknown) =>
    setMsg(e instanceof Error ? e.message : 'Could not add that picture.');
  /** A picture file dropped or pasted: it becomes an image element in the picture's own proportions. */
  const addImageElement = useCallback(
    async (file: File, at?: { x: number; y: number }) => {
      const cur = docRef.current;
      if (!cur) return;
      try {
        const m = await addImageFile(file);
        const ratio = await new Promise<number>((res) => {
          const im = new Image();
          im.onload = () =>
            res(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1.5);
          im.onerror = () => res(1.5);
          im.src = m.src;
        });
        const H = stageHeight(cur.design);
        const w = Math.round(Math.min(480, STAGE_W * 0.6, H * 0.7 * ratio));
        const hgt = Math.round(w / ratio);
        const el = model.newElement('image', undefined, H);
        el.w = w;
        el.h = hgt;
        el.x = Math.round(Math.min(STAGE_W - 24, Math.max(0, (at ? at.x : STAGE_W / 2) - w / 2)));
        el.y = Math.round(Math.min(H - 24, Math.max(0, (at ? at.y : H / 2) - hgt / 2)));
        el.props = {
          ...el.props,
          src: `media:${m.id}`,
          alt: m.name.replace(/\.[^.]+$/, ''),
          fit: 'cover',
        };
        change((d) => model.addElement({ ...d, media: [...d.media, m] }, pgId, el));
        setSelectedId(el.id);
      } catch (e) {
        fail(e);
      }
    },
    [change, pgId],
  );
  const replaceImage = async (elId: string, file: File) => {
    try {
      const m = await addImageFile(file);
      change((d) =>
        model.updateProps({ ...d, media: [...d.media, m] }, pgId, elId, {
          ...(d.pages.find((x) => x.id === pgId)?.elements.find((x) => x.id === elId)?.props ?? {}),
          src: `media:${m.id}`,
        }),
      );
    } catch (e) {
      fail(e);
    }
  };

  /* Pasting a picture from the clipboard puts it on the page. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (!f) return;
      e.preventDefault();
      void addImageElement(f);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImageElement]);

  const setGraded = (graded: boolean) => {
    if (!doc) return;
    change((d) => ({ ...d, settings: { ...d.settings, graded } }));
    if (graded) {
      setOpenTab({ tab: 'grading', n: Date.now() });
      const anyGradable = doc.pages.some((pg) =>
        pg.elements.some((e) => DEFS_BY_TYPE.get(e.type)?.gradable),
      );
      setMsg(
        anyGradable
          ? 'Graded is on. Choose which interactions count and their points in the Grading tab.'
          : 'Graded is on, but there is nothing to grade yet. Add a Multiple choice or Drag and drop interaction.',
      );
    }
  };

  const duplicateProject = async () => {
    try {
      await save();
      const copyId = await store.duplicate(id);
      nav(`/edit/${copyId}`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const exportZip = async () => {
    if (!doc) return;
    setBusy(true);
    setMsg('');
    try {
      await save();
      const { blob, fileName } = await buildScormZip(docRef.current ?? doc);
      download(blob, fileName);
      setMsg(
        `Exported ${fileName} (SCORM ${doc.settings.scormVersion === '2004' ? '2004 4th Edition' : '1.2'}${doc.settings.graded ? ', graded' : ', not graded'}).${issues.length ? ` Note: ${issues.length} unfinished ${issues.length === 1 ? 'item' : 'items'}, see “to finish” in the top bar.` : ''}`,
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (missing)
    return (
      <p className="page">
        Activity not found. <Link to="/">Back to activities</Link>
      </p>
    );
  if (loadError) return <p className="page error">{loadError}</p>;
  if (!doc || !page)
    return (
      <div className="page">
        <StorageNotice />
        <p>Loading…</p>
      </div>
    );

  const saveLabel = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    error: 'Save failed',
  }[saveState];
  const pageIdx = doc.pages.findIndex((p) => p.id === pgId);

  return (
    <div className="editor">
      <header className="topbar">
        <Link
          to="/"
          className="iconbtn big"
          aria-label="Back to activities"
          title="Back to activities"
        >
          <Icon name="back" />
        </Link>
        <input
          className="titleinput"
          aria-label="Activity title"
          value={doc.title}
          onChange={(e) => change((d) => ({ ...d, title: e.target.value }), 'title')}
        />
        <span className={`savestate ${saveState}`} role="status">
          {saveLabel}
        </span>
        <div className="spacer" />
        <div className="gradecontrol">
          <label
            className={`gradeswitch ${doc.settings.graded ? 'on' : ''}`}
            title="Graded activities send a score to the LMS gradebook. Not graded: only completion is reported."
          >
            <input
              type="checkbox"
              role="switch"
              checked={doc.settings.graded}
              onChange={(e) => setGraded(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-knob" />
            </span>
            <span className="gradelabel">{doc.settings.graded ? 'Graded' : 'Not graded'}</span>
          </label>
          <button
            type="button"
            className="link"
            onClick={() => setOpenTab({ tab: 'grading', n: Date.now() })}
          >
            Grading
          </button>
        </div>
        <div className="row" role="group" aria-label="History">
          <button
            type="button"
            className="iconbtn big"
            onClick={h.undo}
            disabled={!h.canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="iconbtn big"
            onClick={h.redo}
            disabled={!h.canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void duplicateProject()}
          title="Make a copy of this activity and open it"
        >
          <Icon name="copy" size={16} /> Duplicate
        </button>
        <div className="row zoom" role="group" aria-label="Zoom">
          <button
            type="button"
            className="iconbtn"
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
            aria-label="Zoom out"
          >
            <Icon name="zoomout" size={16} />
          </button>
          <button type="button" className="link" onClick={() => setZoom(1)} title="Fit to window">
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="iconbtn"
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            aria-label="Zoom in"
          >
            <Icon name="zoomin" size={16} />
          </button>
        </div>
        <label className="check snap" title="Snap to edges and other elements (hold Alt to bypass)">
          <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />{' '}
          Snap
        </label>
        <IssuesMenu issues={issues} onGo={goIssue} />
        <button type="button" onClick={() => void save().then(() => setPreview(true))}>
          <Icon name="play" size={16} /> Preview
        </button>
        <button type="button" className="primary" disabled={busy} onClick={() => void exportZip()}>
          <Icon name="download" size={16} /> {busy ? 'Exporting…' : 'Export SCORM'}
        </button>
      </header>
      {msg && (
        <p role="status" className={saveState === 'error' ? 'banner error' : 'banner'}>
          {msg}{' '}
          <button type="button" className="link" onClick={() => setMsg('')}>
            Dismiss
          </button>
        </p>
      )}

      <div className="workspace">
        <LeftPanel
          doc={doc}
          page={page}
          pageId={pgId}
          selectedId={selectedId}
          onAdd={addElement}
          onSelectPage={setPageId}
          onSelectEl={select}
          onAddPage={() => {
            const r = model.addPage(doc, pageIdx);
            h.set(r.doc);
            setPageId(r.id);
          }}
          onDuplicatePage={(pid) => {
            const r = model.duplicatePage(doc, pid);
            if (r.id) {
              h.set(r.doc);
              setPageId(r.id);
            }
          }}
          onDeletePage={(pid) => {
            if (!window.confirm('Delete this page and everything on it?')) return;
            const idx = doc.pages.findIndex((p) => p.id === pid);
            h.set(model.deletePage(doc, pid));
            setPageId(
              doc.pages[Math.max(0, idx - 1)]?.id === pid
                ? (doc.pages[1]?.id ?? '')
                : (doc.pages[Math.max(0, idx - 1)]?.id ?? ''),
            );
          }}
          onMovePage={(pid, d) => change((x) => model.movePage(x, pid, d))}
          onRenamePage={(pid, name) =>
            change((x) => model.updatePage(x, pid, { name }), `pn-${pid}`)
          }
          onToggle={(elId, field) => {
            const el = page.elements.find((e) => e.id === elId);
            if (el) patchEl(elId, { [field]: !el[field] });
          }}
          onZ={(elId, move) => change((d) => model.reorder(d, pgId, elId, move))}
        />

        <main className="center" aria-label="Canvas">
          <Canvas
            doc={doc}
            page={page}
            selectedId={selectedId}
            onSelect={select}
            change={change}
            zoom={zoom}
            snapOn={snapOn}
            editingBlock={editingBlock}
            setEditingBlock={(b) => {
              setEditingBlock(b);
              if (b) setSub(null);
            }}
            sub={sub}
            setSub={setSub}
            editingText={editingText}
            setEditingText={setEditingText}
            peek={peek}
            onDuplicate={duplicateEl}
            onDelete={deleteEl}
            onReplaceImage={(id, f) => void replaceImage(id, f)}
            onDropBlock={addElementAt}
            onDropFile={(f, at) => void addImageElement(f, at)}
          />
          <div className="pagebar">
            {doc.pages.length > 1 ? (
              <>
                <button
                  type="button"
                  className="iconbtn"
                  disabled={pageIdx === 0}
                  onClick={() => setPageId(doc.pages[pageIdx - 1]?.id ?? pgId)}
                  aria-label="Previous page"
                >
                  <Icon name="back" size={16} />
                </button>
                <span>
                  Page {pageIdx + 1} of {doc.pages.length}: {page.name}
                </span>
                <button
                  type="button"
                  className="iconbtn"
                  disabled={pageIdx === doc.pages.length - 1}
                  onClick={() => setPageId(doc.pages[pageIdx + 1]?.id ?? pgId)}
                  aria-label="Next page"
                >
                  <Icon name="back" size={16} />
                </button>
              </>
            ) : (
              <span>{page.name} (add pages from the Pages tab)</span>
            )}
          </div>
        </main>

        <Inspector
          openTab={openTab}
          onGo={(pageId, elId) => {
            setPageId(pageId);
            setSelectedId(elId);
            setOpenTab({ tab: 'element', n: Date.now() });
          }}
          doc={doc}
          page={page}
          el={selected}
          change={change}
          patchEl={(patch, key) => selected && patchEl(selected.id, patch, key)}
          setProps={(props, key) =>
            selected && change((d) => model.updateProps(d, pgId, selected.id, props), key)
          }
          patchPage={(patch, key) => change((d) => model.updatePage(d, pgId, patch), key)}
          addImage={addImage}
          sub={sub}
          setSub={setSub}
          startBlockEdit={() => selected && setEditingBlock(selected.id)}
          peek={!!(selected && peek[selected.id])}
          setPeek={(v) => selected && setPeek((m) => ({ ...m, [selected.id]: v }))}
          onAlign={(to) => selected && change((d) => model.alignElement(d, pgId, selected.id, to))}
          onZ={(m) => selected && change((d) => model.reorder(d, pgId, selected.id, m))}
          onDuplicate={() => selected && duplicateEl(selected.id)}
          onDelete={() => selected && deleteEl(selected.id)}
        />
      </div>
      {preview && (
        <PreviewModal
          doc={doc}
          startPage={pageIdx}
          issueCount={issues.length}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
