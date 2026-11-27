import { HANDLES, type Handle, type Rect } from '../../app/editor/geometry';
import { beginDrag } from '../../app/editor/drag';
import type { OverlayProps } from '../../app/editor/types';
import { newItem, newZone } from './Panel';
import type { DdProps } from './type';

const MIN = 6;
const clampRect = (r: Rect): Rect => {
  const w = Math.min(100, Math.max(MIN, r.w));
  const h = Math.min(100, Math.max(MIN, r.h));
  return { x: Math.min(100 - w, Math.max(0, r.x)), y: Math.min(100 - h, Math.max(0, r.y)), w, h };
};
const r1 = (r: Rect): Rect => ({
  x: Math.round(r.x * 10) / 10,
  y: Math.round(r.y * 10) / 10,
  w: Math.round(r.w * 10) / 10,
  h: Math.round(r.h * 10) / 10,
});

/** On-canvas editing: drag and resize items and drop zones in the block. */
export function DragDropOverlay({
  props,
  onChange,
  sub,
  setSub,
  boxRef,
  hint,
}: OverlayProps<DdProps>) {
  const update = (kind: 'i' | 'z', id: string, r: Rect, key: string) =>
    onChange(
      kind === 'i'
        ? { ...props, items: props.items.map((x) => (x.id === id ? { ...x, ...r1(r) } : x)) }
        : { ...props, zones: props.zones.map((x) => (x.id === id ? { ...x, ...r1(r) } : x)) },
      key,
    );

  const start = (
    e: React.PointerEvent,
    kind: 'i' | 'z',
    id: string,
    rect: Rect,
    mode: 'move' | Handle,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSub(`${kind}:${id}`);
    const box = boxRef.current;
    if (!box) return;
    const key = `dd-${kind}${id}-${mode}-${Date.now()}`;
    beginDrag({
      event: e,
      container: box,
      unitsW: 100,
      unitsH: 100,
      mode,
      start: rect,
      min: { w: MIN, h: MIN },
      clamp: clampRect,
      onChange: (r) => update(kind, id, r, key),
    });
  };

  const box = (kind: 'i' | 'z', id: string, rect: Rect, label: string) => {
    const on = sub === `${kind}:${id}`;
    return (
      <div
        key={`${kind}${id}`}
        className={`ovl-box ${kind === 'z' ? 'zone' : 'item'} ${on ? 'on' : ''}`}
        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
        tabIndex={0}
        role="button"
        aria-label={`${kind === 'z' ? 'Zone' : 'Item'}: ${label}. Drag to move.`}
        onPointerDown={(e) => start(e, kind, id, rect, 'move')}
        onFocus={() => setSub(`${kind}:${id}`)}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 5 : 1;
          const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
          const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
          if (!dx && !dy) return;
          e.preventDefault();
          e.stopPropagation();
          update(kind, id, clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy }), `ddnudge-${id}`);
        }}
      >
        {kind === 'i' && <span className="ovl-label">{label}</span>}
        {on &&
          HANDLES.map((h) => (
            <span
              key={h}
              className={`handle h-${h}`}
              onPointerDown={(e) => start(e, kind, id, rect, h)}
            />
          ))}
      </div>
    );
  };

  return (
    <div
      className="ovl"
      ref={boxRef}
      onPointerDown={(e) => e.target === e.currentTarget && setSub(null)}
      onDoubleClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        const at = {
          x: Math.max(0, ((e.clientX - r.left) / r.width) * 100 - 10),
          y: Math.max(0, ((e.clientY - r.top) / r.height) * 100 - 5),
        };
        if (e.shiftKey) {
          const z = newZone(props.zones.length + 1, {
            x: Math.min(58, at.x),
            y: Math.min(54, at.y),
          });
          onChange({ ...props, zones: [...props.zones, z] });
          setSub(`z:${z.id}`);
        } else {
          const i = newItem(props.items.length + 1, {
            x: Math.min(80, at.x),
            y: Math.min(89, at.y),
          });
          onChange({ ...props, items: [...props.items, i] });
          setSub(`i:${i.id}`);
        }
      }}
    >
      {props.zones.map((z) => box('z', z.id, z, z.label || 'Zone'))}
      {props.items.map((i) => box('i', i.id, i, i.label || 'Item'))}
      {hint && <div className="ovl-hint">{hint}</div>}
    </div>
  );
}
