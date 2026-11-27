export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Resize `start` by dragging `handle` by (dx, dy). Optionally keep aspect ratio (corners only). */
export function resizeRect(
  start: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  opts: { minW: number; minH: number; keepAspect?: boolean },
): Rect {
  let { x, y, w, h } = start;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  if (handle.includes('e')) w = Math.max(opts.minW, start.w + dx);
  if (handle.includes('s')) h = Math.max(opts.minH, start.h + dy);
  if (handle.includes('w')) {
    w = Math.max(opts.minW, start.w - dx);
    x = right - w;
  }
  if (handle.includes('n')) {
    h = Math.max(opts.minH, start.h - dy);
    y = bottom - h;
  }
  if (opts.keepAspect && handle.length === 2 && start.h > 0) {
    const ratio = start.w / start.h;
    // Use whichever dimension changed more.
    if (Math.abs(w - start.w) / start.w >= Math.abs(h - start.h) / start.h)
      h = Math.max(opts.minH, w / ratio);
    else w = Math.max(opts.minW, h * ratio);
    if (handle.includes('w')) x = right - w;
    if (handle.includes('n')) y = bottom - h;
  }
  return { x, y, w, h };
}

export interface SnapTargets {
  xs: number[];
  ys: number[];
}

/** Snap lines from the stage (edges, centre) and other elements (edges, centres). */
export function snapTargets(others: Rect[], stageW: number, stageH: number): SnapTargets {
  const xs = [0, stageW / 2, stageW];
  const ys = [0, stageH / 2, stageH];
  for (const r of others) {
    xs.push(r.x, r.x + r.w / 2, r.x + r.w);
    ys.push(r.y, r.y + r.h / 2, r.y + r.h);
  }
  return { xs, ys };
}

function best(
  lines: number[],
  targets: number[],
  threshold: number,
): { delta: number; at: number } | null {
  let out: { delta: number; at: number } | null = null;
  for (const l of lines) {
    for (const t of targets) {
      const d = t - l;
      if (Math.abs(d) <= threshold && (!out || Math.abs(d) < Math.abs(out.delta)))
        out = { delta: d, at: t };
    }
  }
  return out;
}

/**
 * Snap the edges being moved to nearby targets. `mode` is 'move' (left, centre, right
 * and top, middle, bottom all snap) or a resize handle (only the edges that move snap).
 */
export function snapRect(
  rect: Rect,
  mode: 'move' | Handle,
  targets: SnapTargets,
  threshold: number,
): { rect: Rect; guides: { x: number[]; y: number[] } } {
  let { x, y, w, h } = rect;
  const guides = { x: [] as number[], y: [] as number[] };

  const xLines =
    mode === 'move'
      ? [x, x + w / 2, x + w]
      : [...(mode.includes('w') ? [x] : []), ...(mode.includes('e') ? [x + w] : [])];
  const yLines =
    mode === 'move'
      ? [y, y + h / 2, y + h]
      : [...(mode.includes('n') ? [y] : []), ...(mode.includes('s') ? [y + h] : [])];

  const sx = best(xLines, targets.xs, threshold);
  if (sx) {
    guides.x.push(sx.at);
    if (mode === 'move') x += sx.delta;
    else if (mode.includes('w')) {
      x += sx.delta;
      w -= sx.delta;
    } else w += sx.delta;
  }
  const sy = best(yLines, targets.ys, threshold);
  if (sy) {
    guides.y.push(sy.at);
    if (mode === 'move') y += sy.delta;
    else if (mode.includes('n')) {
      y += sy.delta;
      h -= sy.delta;
    } else h += sy.delta;
  }
  return { rect: { x, y, w, h }, guides };
}

export const roundRect = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  w: Math.round(r.w),
  h: Math.round(r.h),
});
