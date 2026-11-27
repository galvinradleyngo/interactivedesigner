import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import {
  STAGE_W,
  stageHeight,
  type Page,
  type ProjectDoc,
  type StageElement,
} from '../../schema/types';
import { FONTS, makeMediaResolver } from '../../player/stage';
import { EDITOR_BLOCKS } from '../registry';
import { Icon } from '../components/Icon';
import { beginDrag } from './drag';
import { ElementView } from './ElementView';
import { HANDLES, roundRect, snapRect, snapTargets, type Handle, type Rect } from './geometry';
import { SelectionToolbar } from './SelectionToolbar';
import { getPath, reorder as reorderEl, setPath, updateElement, updateProps } from './model';

interface Props {
  doc: ProjectDoc;
  page: Page;
  selectedId: string | null;
  onSelect(id: string | null): void;
  change(fn: (d: ProjectDoc) => ProjectDoc, key?: string): void;
  zoom: number;
  snapOn: boolean;
  editingBlock: string | null;
  setEditingBlock(id: string | null): void;
  sub: string | null;
  setSub(id: string | null): void;
  editingText: string | null;
  setEditingText(id: string | null): void;
  /** Elements currently showing their alternate side (editor-only). */
  peek?: Record<string, boolean>;
  onDuplicate(id: string): void;
  onDelete(id: string): void;
  onReplaceImage(id: string, file: File): void;
  /** A palette tile (or picture file) was dropped on the page at this spot, in page units. */
  onDropBlock(type: string, at: { x: number; y: number }): void;
  onDropFile(file: File, at: { x: number; y: number }): void;
}

const OVERLAY_HINTS: Record<string, string> = {
  hotspots: 'Double-click to add a hotspot · drag to move · Esc when done',
  dragDrop:
    'Double-click to add an item (Shift+double-click for a zone) · drag to move · handles to resize · Esc when done',
  interactiveVideo:
    'Click the timeline to move the video · drag a checkpoint to retime it · Esc when done',
};

const pct = (r: Rect, H: number) => ({
  left: `${(r.x / STAGE_W) * 100}%`,
  top: `${(r.y / H) * 100}%`,
  width: `${(r.w / STAGE_W) * 100}%`,
  height: `${(r.h / H) * 100}%`,
});

export function Canvas(p: Props) {
  const { doc, page, selectedId } = p;
  const H = stageHeight(doc.design);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayBox = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(760);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] } | null>(null);
  const [editField, setEditField] = useState<{ id: string; path: string } | null>(null);
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const measure = () =>
      setFit(Math.max(280, Math.min(w.clientWidth - 48, (w.clientHeight - 48) * (STAGE_W / H))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    return () => ro.disconnect();
  }, [H]);

  const resolve = useMemo(() => makeMediaResolver(doc), [doc]);
  const bgImg =
    page.backgroundImage === undefined ? doc.design.backgroundImage : page.backgroundImage;
  const bgUrl = bgImg ? resolve(bgImg) : '';
  const stageW = Math.round(fit * p.zoom);
  const visible = page.elements.filter((e) => !e.hidden);
  const selected = visible.find((e) => e.id === selectedId) ?? null;
  const blockEl = p.editingBlock
    ? (page.elements.find((e) => e.id === p.editingBlock) ?? null)
    : null;

  const themeVars = {
    '--primary': doc.design.primary,
    '--text': doc.design.text,
    '--radius': `${doc.design.radius}px`,
    '--font': FONTS[doc.design.font],
  } as React.CSSProperties;

  const snap = (self: StageElement) => (r: Rect, mode: 'move' | Handle, unitsPerPx: number) => {
    if (!p.snapOn) return { rect: r, guides: { x: [], y: [] } };
    const others = visible.filter((e) => e.id !== self.id);
    return snapRect(r, mode, snapTargets(others, STAGE_W, H), 8 * unitsPerPx);
  };

  const startDrag = (e: React.PointerEvent, el: StageElement, mode: 'move' | Handle) => {
    const stage = stageRef.current;
    if (!stage) return;
    const key = `geo-${el.id}-${mode}-${Date.now()}`;
    beginDrag({
      event: e,
      container: stage,
      unitsW: STAGE_W,
      unitsH: H,
      mode,
      start: { x: el.x, y: el.y, w: el.w, h: el.h },
      min: { w: 16, h: 16 },
      keepAspect: el.type === 'image' && mode !== 'move' && mode.length === 2 ? true : undefined,
      snap: snap(el),
      // Keep at least a handle's worth on the stage so elements can't be lost off-canvas.
      clamp: (r) => ({
        ...r,
        x: Math.min(STAGE_W - 24, Math.max(24 - r.w, r.x)),
        y: Math.min(H - 24, Math.max(24 - r.h, r.y)),
      }),
      onChange: (r, g) => {
        setGuides(g);
        p.change((d) => updateElement(d, page.id, el.id, roundRect(r)), key);
      },
      onEnd: () => setGuides(null),
    });
  };

  const onElDown = (e: React.PointerEvent, el: StageElement) => {
    if (e.button !== 0) return;
    if (p.editingBlock === el.id || p.editingText === el.id) return;
    e.stopPropagation();
    if (p.editingBlock && p.editingBlock !== el.id) p.setEditingBlock(null);
    if (p.editingText && p.editingText !== el.id) p.setEditingText(null);
    p.onSelect(el.id);
    if (!el.locked) startDrag(e, el, 'move');
  };

  /** Start editing whatever is natural for this element: its text, its on-canvas editor or a label. */
  const startEdit = (el: StageElement, path?: string | null) => {
    if (el.locked) return;
    if (el.type === 'text') p.setEditingText(el.id);
    else if (EDITOR_BLOCKS[el.type]?.Overlay) p.setEditingBlock(el.id);
    else if (path) setEditField({ id: el.id, path });
    else {
      const first = stageRef.current
        ?.querySelector<HTMLElement>(`[data-id="${el.id}"] [data-edit]`)
        ?.getAttribute('data-edit');
      if (first) setEditField({ id: el.id, path: first });
    }
  };
  const onElDouble = (e: React.MouseEvent, el: StageElement) =>
    startEdit(el, (e.target as HTMLElement).closest('[data-edit]')?.getAttribute('data-edit'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
      if (!selected || p.editingBlock || p.editingText || editField) return;
      e.preventDefault();
      startEdit(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pageUnits = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: STAGE_W / 2, y: H / 2 };
    return {
      x: ((e.clientX - r.left) / r.width) * STAGE_W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const Overlay = blockEl ? EDITOR_BLOCKS[blockEl.type]?.Overlay : undefined;
  const blockDef = blockEl ? DEFS_BY_TYPE.get(blockEl.type) : undefined;

  return (
    <div className="canvas-scroll" ref={wrapRef}>
      <div className="stagebox" style={{ width: stageW, ...themeVars }}>
        <div
          ref={stageRef}
          className="ap-stage ed-stage"
          style={{
            aspectRatio: `${STAGE_W} / ${H}`,
            backgroundColor: page.background ?? doc.design.background,
            backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
          }}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            p.onSelect(null);
            p.setEditingBlock(null);
            p.setEditingText(null);
          }}
          aria-label={`Canvas for ${page.name}`}
          onDragOver={(e) => {
            const t = Array.from(e.dataTransfer.types);
            if (t.includes('application/x-id-block') || t.includes('Files')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setDropping(true);
            }
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            setDropping(false);
            const type = e.dataTransfer.getData('application/x-id-block');
            const at = pageUnits(e);
            if (type) {
              e.preventDefault();
              p.onDropBlock(type, at);
              return;
            }
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) {
              e.preventDefault();
              p.onDropFile(file, at);
            }
          }}
        >
          {visible.map((el) => (
            <div
              key={el.id}
              className={`ap-el ed-el ${selectedId === el.id ? 'is-sel' : ''} ${el.locked ? 'is-locked' : ''} ${p.editingText === el.id ? 'is-texting' : ''}`}
              style={pct(el, H)}
              data-id={el.id}
              onPointerDown={(e) => onElDown(e, el)}
              onDoubleClick={(e) => onElDouble(e, el)}
            >
              <ElementView
                el={el}
                doc={doc}
                editText={p.editingText === el.id}
                peek={!!p.peek?.[el.id]}
                editField={editField?.id === el.id ? editField.path : null}
                onFieldCommit={(path, text) => {
                  setEditField(null);
                  if (text === null || text === getPath(el.props, path)) return;
                  p.change((d) => updateProps(d, page.id, el.id, setPath(el.props, path, text)));
                }}
                onTextCommit={(html) => {
                  p.setEditingText(null);
                  p.change((d) => updateProps(d, page.id, el.id, { ...el.props, html }));
                }}
              />
            </div>
          ))}
        </div>

        {/* Overlay layer sits above the stage so handles are never clipped. */}
        <div className={`ed-layer ${dropping ? 'is-dropping' : ''}`}>
          {page.elements.length === 0 && (
            <div className="ed-empty">
              <strong>Blank canvas</strong>
              <span>Add text, pictures or an interaction from the panel on the left.</span>
            </div>
          )}
          {guides?.x.map((x) => (
            <div
              key={`gx${x}`}
              className="guide guide-v"
              style={{ left: `${(x / STAGE_W) * 100}%` }}
            />
          ))}
          {guides?.y.map((y) => (
            <div key={`gy${y}`} className="guide guide-h" style={{ top: `${(y / H) * 100}%` }} />
          ))}

          {selected && !blockEl && (
            <div className={`ed-sel ${selected.locked ? 'locked' : ''}`} style={pct(selected, H)}>
              {selected.locked && (
                <span className="lockbadge">
                  <Icon name="lock" size={14} />
                </span>
              )}
              {!selected.locked &&
                HANDLES.map((h) => (
                  <span
                    key={h}
                    className={`handle h-${h}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      startDrag(e, selected, h);
                    }}
                  />
                ))}
            </div>
          )}

          {selected && !blockEl && !p.editingText && !editField && (
            <SelectionToolbar
              el={selected}
              rect={pct(selected, H)}
              nearTop={selected.y < 70}
              hasEditor={!!EDITOR_BLOCKS[selected.type]?.Overlay}
              onEdit={() => startEdit(selected)}
              onProps={(patch, key) =>
                p.change(
                  (d) => updateProps(d, page.id, selected.id, { ...selected.props, ...patch }),
                  key,
                )
              }
              onDuplicate={() => p.onDuplicate(selected.id)}
              onDelete={() => p.onDelete(selected.id)}
              onReplaceImage={(f) => p.onReplaceImage(selected.id, f)}
              onZ={(m) => p.change((d) => reorderEl(d, page.id, selected.id, m))}
            />
          )}

          {blockEl && Overlay && (
            <div className="ed-ovl-wrap" style={pct(blockEl, H)}>
              <div className="ed-ovl-bar">
                <span>Editing {blockDef?.label}</span>
                <button type="button" className="primary" onClick={() => p.setEditingBlock(null)}>
                  Done
                </button>
              </div>
              <Overlay
                props={{ ...(blockDef?.createDefault() ?? {}), ...blockEl.props } as never}
                onChange={
                  ((props: Record<string, unknown>, key?: string) =>
                    p.change((d) => updateProps(d, page.id, blockEl.id, props), key)) as never
                }
                sub={p.sub}
                setSub={p.setSub}
                boxRef={overlayBox}
                hint={OVERLAY_HINTS[blockEl.type]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
