import { useEffect, useRef, useState } from 'react';
import { STAGE_W, stageHeight, type ProjectDoc } from '../../schema/types';
import { pruneMedia } from '../editor/model';
import { fetchPlayerAssets, indexHtml } from '../export';
import { Icon } from './Icon';

type DeviceId = 'desktop' | 'tablet' | 'phone';

/** Portrait sizes in CSS pixels. The iframe really is this size, so the player's responsive rules apply. */
const DEVICES: { id: DeviceId; label: string; w: number; h: number }[] = [
  { id: 'desktop', label: 'Desktop', w: 1280, h: 800 },
  { id: 'tablet', label: 'Tablet', w: 768, h: 1024 },
  { id: 'phone', label: 'Phone', w: 390, h: 844 },
];

interface Props {
  doc: ProjectDoc;
  startPage: number;
  /** Number of unfinished things found by the project checks. */
  issueCount: number;
  onClose(): void;
}

/** Full-screen preview: the real player, never reporting to an LMS, at a chosen device size. */
export function PreviewModal({ doc, startPage, issueCount, onClose }: Props) {
  const [srcDoc, setSrcDoc] = useState('');
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [landscape, setLandscape] = useState(false);
  const [restart, setRestart] = useState(0);
  const [box, setBox] = useState({ w: 1000, h: 600 });
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void fetchPlayerAssets().then(
      (a) => live && setSrcDoc(indexHtml(doc.title, pruneMedia(doc), 'preview', a, startPage)),
    );
    return () => {
      live = false;
    };
    // The preview is a snapshot taken when it opens; it does not follow later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = DEVICES.find((x) => x.id === device) ?? DEVICES[0]!;
  // YouTube refuses to play inside a fully sandboxed (null-origin) frame, so a video needs a real origin.
  const hasVideo = doc.pages.some((pg) => pg.elements.some((e) => e.type === 'interactiveVideo'));
  const wideProject = STAGE_W > stageHeight(doc.design) * 1.1;
  const full = device === 'desktop';
  const w = full ? box.w : landscape ? d.h : d.w;
  const h = full ? box.h : landscape ? d.w : d.h;
  const scale = full ? 1 : Math.min(1, (box.w - 32) / w, (box.h - 32) / h);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Preview">
      <div className="modal-bar">
        <strong>Preview</strong>
        <div className="seg" role="group" aria-label="Device size">
          {DEVICES.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={device === x.id}
              className={device === x.id ? 'on' : ''}
              onClick={() => setDevice(x.id)}
            >
              <Icon
                name={x.id === 'phone' ? 'phone' : x.id === 'tablet' ? 'tablet' : 'desktop'}
                size={15}
              />{' '}
              {x.label}
            </button>
          ))}
        </div>
        {!full && (
          <button
            type="button"
            onClick={() => setLandscape((v) => !v)}
            aria-pressed={landscape}
            title="Rotate the device"
          >
            <Icon name="rotate" size={15} /> {landscape ? 'Landscape' : 'Portrait'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setRestart((n) => n + 1)}
          title="Start over from the beginning"
        >
          <Icon name="undo" size={15} /> Restart
        </button>
        <span className="muted">
          {full
            ? 'Fits your window'
            : `${w} × ${h}${scale < 1 ? ` (shown at ${Math.round(scale * 100)}%)` : ''}`}
          {issueCount > 0 && ` · ${issueCount} unfinished ${issueCount === 1 ? 'item' : 'items'}`}
          {!full &&
            !landscape &&
            wideProject &&
            ' · Tip: wide pages look small upright; try a portrait Page shape in Settings'}
        </span>
        <span className="spacer" />
        <button type="button" onClick={onClose} autoFocus>
          <Icon name="close" size={16} /> Close
        </button>
      </div>
      <div className="preview-area" ref={area}>
        <div
          className={full ? 'device full' : 'device framed'}
          style={full ? undefined : { width: w * scale, height: h * scale }}
        >
          <iframe
            key={restart}
            title="Activity preview"
            sandbox={
              hasVideo
                ? 'allow-scripts allow-same-origin allow-presentation allow-popups'
                : 'allow-scripts'
            }
            srcDoc={srcDoc}
            style={
              full
                ? undefined
                : { width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }
            }
          />
        </div>
      </div>
    </div>
  );
}
