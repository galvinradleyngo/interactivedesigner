import type { PointerEvent as ReactPointerEvent } from 'react';
import { resizeRect, type Handle, type Rect } from './geometry';

export interface DragOptions {
  event: ReactPointerEvent | PointerEvent;
  /** Element whose on-screen box maps to the logical units. */
  container: HTMLElement;
  unitsW: number;
  unitsH: number;
  mode: 'move' | Handle;
  start: Rect;
  min?: { w: number; h: number };
  keepAspect?: boolean;
  /** Optional snapping; receives the candidate rect and the pixel-to-unit scale. */
  snap?(
    rect: Rect,
    mode: 'move' | Handle,
    unitsPerPx: number,
  ): { rect: Rect; guides: { x: number[]; y: number[] } };
  clamp?(rect: Rect, mode: 'move' | Handle): Rect;
  onChange(rect: Rect, guides: { x: number[]; y: number[] }): void;
  onEnd?(moved: boolean): void;
}

/** Start a pointer drag (move or resize). Works with mouse, touch and pen. */
export function beginDrag(o: DragOptions): void {
  const e = o.event;
  const box = o.container.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return;
  const kx = o.unitsW / box.width;
  const ky = o.unitsH / box.height;
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;
  const min = o.min ?? { w: 1, h: 1 };

  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - sx) * kx;
    const dy = (ev.clientY - sy) * ky;
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
    moved = true;
    let r: Rect =
      o.mode === 'move'
        ? { ...o.start, x: o.start.x + dx, y: o.start.y + dy }
        : resizeRect(o.start, o.mode, dx, dy, {
            minW: min.w,
            minH: min.h,
            keepAspect: o.keepAspect ?? ev.shiftKey,
          });
    let guides = { x: [] as number[], y: [] as number[] };
    if (o.snap && !ev.altKey) {
      const s = o.snap(r, o.mode, kx);
      r = s.rect;
      guides = s.guides;
    }
    if (o.clamp) r = o.clamp(r, o.mode);
    o.onChange(r, guides);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    o.onEnd?.(moved);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}
