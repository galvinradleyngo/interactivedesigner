import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ActivityDoc, FontChoice, ScormVersion } from '../../schema/types';
import { Preview } from '../components/Preview';
import { buildScormZip, download } from '../export';
import { addImage } from '../media';
import { getEditorPlugin } from '../registry';
import { store } from '../store';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

export function Editor() {
  const { id = '' } = useParams();
  const [doc, setDoc] = useState<ActivityDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const latest = useRef<ActivityDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    store.get(id).then(
      (d) => (d ? ((latest.current = d), setDoc(d)) : setMissing(true)),
      (e: Error) => setMsg(e.message),
    );
  }, [id]);

  const save = useCallback(async () => {
    const d = latest.current;
    if (!d) return;
    clearTimeout(timer.current);
    setSaveState('saving');
    try {
      await store.save(id, d);
      setSaveState(latest.current === d ? 'saved' : 'dirty');
    } catch (e) {
      setSaveState('error');
      setMsg(`Save failed: ${(e as Error).message}`);
    }
  }, [id]);

  const update = useCallback(
    (fn: (d: ActivityDoc) => ActivityDoc) => {
      if (!latest.current) return;
      const next = fn(latest.current);
      latest.current = next;
      setDoc(next);
      setSaveState('dirty');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 2000);
    },
    [save],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // Flush pending changes when leaving the editor (route change or unmount).
  const dirty = useRef(false);
  useEffect(() => {
    dirty.current = saveState === 'dirty';
  }, [saveState]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirty.current && latest.current) void store.save(id, latest.current);
    },
    [id],
  );

  if (missing)
    return (
      <p className="page">
        Activity not found. <Link to="/">Back</Link>
      </p>
    );
  if (!doc) return <p className="page">{msg || 'Loading…'}</p>;
  const plugin = getEditorPlugin(doc.type);
  if (!plugin) return <p className="page">Unknown activity type "{doc.type}".</p>;
  const { Editor: TypeEditor } = plugin;

  const addImg = async (file: File): Promise<string> => {
    const m = await addImage(file);
    update((d) => ({ ...d, media: [...d.media, m] }));
    return `media:${m.id}`;
  };

  const exportZip = async () => {
    setBusy(true);
    setMsg('');
    try {
      await save();
      const { blob, fileName } = await buildScormZip(latest.current ?? doc);
      download(blob, fileName);
      setMsg(
        `Exported ${fileName} (SCORM ${doc.settings.scormVersion === '2004' ? '2004 4th Edition' : '1.2'}).`,
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const s = doc.settings;
  const d = doc.design;
  const setS = (p: Partial<typeof s>) =>
    update((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const setD = (p: Partial<typeof d>) => update((x) => ({ ...x, design: { ...x.design, ...p } }));
  const bgMedia = d.backgroundImage?.startsWith('media:')
    ? doc.media.find((m) => `media:${m.id}` === d.backgroundImage)
    : null;
  const label = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    error: 'Save failed',
  }[saveState];

  return (
    <div className="editor">
      <header className="topbar">
        <Link to="/">← Activities</Link>
        <input
          className="title"
          aria-label="Activity title"
          value={doc.title}
          onChange={(e) => update((x) => ({ ...x, title: e.target.value }))}
        />
        <span className={`save ${saveState}`} role="status">
          {label}
        </span>
        <button
          onClick={() => void save()}
          disabled={saveState === 'saved' || saveState === 'saving'}
        >
          Save
        </button>
        <button className="primary" disabled={busy} onClick={() => void exportZip()}>
          {busy ? 'Exporting…' : 'Export SCORM'}
        </button>
      </header>
      {msg && (
        <p role="status" className={saveState === 'error' ? 'error' : 'notice'}>
          {msg}
        </p>
      )}

      <div className="split">
        <div className="left">
          <TypeEditor
            content={doc.content as never}
            onChange={((c: unknown) => update((x) => ({ ...x, content: c }))) as never}
            doc={doc as never}
            addImage={addImg}
          />

          <section className="panel">
            <h3>Settings</h3>
            <div className="grid">
              <label>
                Passing score (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={s.passingScore}
                  onChange={(e) =>
                    setS({ passingScore: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                  }
                />
              </label>
              <label>
                SCORM version
                <select
                  value={s.scormVersion}
                  onChange={(e) => setS({ scormVersion: e.target.value as ScormVersion })}
                >
                  <option value="2004">SCORM 2004 4th Edition</option>
                  <option value="1.2">SCORM 1.2</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.showFeedback}
                  onChange={(e) => setS({ showFeedback: e.target.checked })}
                />{' '}
                Show feedback
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.allowRetry}
                  onChange={(e) => setS({ allowRetry: e.target.checked })}
                />{' '}
                Allow retry
              </label>
            </div>
          </section>

          <section className="panel">
            <h3>Design</h3>
            <div className="grid">
              <label>
                Accent color{' '}
                <input
                  type="color"
                  value={d.primary}
                  onChange={(e) => setD({ primary: e.target.value })}
                />
              </label>
              <label>
                Background color{' '}
                <input
                  type="color"
                  value={d.background}
                  onChange={(e) => setD({ background: e.target.value })}
                />
              </label>
              <label>
                Text color{' '}
                <input
                  type="color"
                  value={d.text}
                  onChange={(e) => setD({ text: e.target.value })}
                />
              </label>
              <label>
                Font
                <select
                  value={d.font}
                  onChange={(e) => setD({ font: e.target.value as FontChoice })}
                >
                  <option value="system">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="rounded">Rounded</option>
                  <option value="mono">Monospace</option>
                </select>
              </label>
              <label>
                Corner radius ({d.radius}px)
                <input
                  type="range"
                  min={0}
                  max={28}
                  value={d.radius}
                  onChange={(e) => setD({ radius: Number(e.target.value) })}
                />
              </label>
              <div>
                <label>
                  Background image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        addImg(f).then(
                          (ref) => setD({ backgroundImage: ref }),
                          (err: Error) => setMsg(err.message),
                        );
                      e.target.value = '';
                    }}
                  />
                </label>
                {bgMedia && (
                  <button onClick={() => setD({ backgroundImage: null })}>
                    Remove ({bgMedia.name})
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
        <div className="right">
          <Preview doc={doc} />
        </div>
      </div>
    </div>
  );
}
