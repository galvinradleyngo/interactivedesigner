import { beginDrag } from '../../app/editor/drag';
import type { OverlayProps } from '../../app/editor/types';
import { newHotspot } from './Panel';
import type { HotspotProps } from './type';

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** On-canvas editing: drag markers, double-click empty space to add one. */
export function HotspotsOverlay({
  props,
  onChange,
  sub,
  setSub,
  boxRef,
  hint,
}: OverlayProps<HotspotProps>) {
  return (
    <div
      className="ovl"
      ref={boxRef}
      onPointerDown={(e) => e.target === e.currentTarget && setSub(null)}
      onDoubleClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        const h = newHotspot(
          props.hotspots.length + 1,
          clamp(((e.clientX - r.left) / r.width) * 100),
          clamp(((e.clientY - r.top) / r.height) * 100),
        );
        onChange({ ...props, hotspots: [...props.hotspots, h] });
        setSub(h.id);
      }}
    >
      {props.hotspots.map((h, i) => (
        <button
          key={h.id}
          type="button"
          className={`ovl-marker ${sub === h.id ? 'on' : ''}`}
          style={{ left: `${h.x}%`, top: `${h.y}%` }}
          aria-label={`Hotspot ${i + 1}: ${h.label}. Drag to move, arrow keys to nudge.`}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSub(h.id);
            const box = boxRef.current;
            if (!box) return;
            const key = `hsmove-${h.id}-${Date.now()}`;
            beginDrag({
              event: e,
              container: box,
              unitsW: 100,
              unitsH: 100,
              mode: 'move',
              start: { x: h.x, y: h.y, w: 0, h: 0 },
              clamp: (r) => ({ ...r, x: clamp(r.x), y: clamp(r.y) }),
              onChange: (r) =>
                onChange(
                  {
                    ...props,
                    hotspots: props.hotspots.map((x) =>
                      x.id === h.id
                        ? { ...x, x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10 }
                        : x,
                    ),
                  },
                  key,
                ),
            });
          }}
          onKeyDown={(e) => {
            const d = e.shiftKey ? 5 : 1;
            const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
            const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
            if (!dx && !dy) return;
            e.preventDefault();
            e.stopPropagation();
            onChange(
              {
                ...props,
                hotspots: props.hotspots.map((x) =>
                  x.id === h.id ? { ...x, x: clamp(x.x + dx), y: clamp(x.y + dy) } : x,
                ),
              },
              `hsnudge-${h.id}`,
            );
          }}
        >
          {i + 1}
        </button>
      ))}
      {hint && <div className="ovl-hint">{hint}</div>}
    </div>
  );
}
