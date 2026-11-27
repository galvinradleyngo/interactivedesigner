import { DEFS_BY_TYPE } from '../plugins/defs';
import { aggregate, type BlockResult } from '../plugins/scoring';
import { migrate } from '../schema/migrate';
import { percent, type ProjectDoc, type ScormVersion } from '../schema/types';
import { connect } from '../scorm/api';
import { Reporter } from '../scorm/reporter';
import { h } from './dom';
import { applyPageBackground, applyTheme, makeMediaResolver, paintElement, type StageEnv } from './stage';

export interface MountOptions {
  /** 'scorm' reports to an LMS if one is found; 'preview' never reports. */
  mode: 'scorm' | 'preview';
  scormVersion?: ScormVersion;
  /** 0-based page to open first (preview only). */
  startPage?: number;
  /** Use window objects from here (tests). */
  win?: Window;
}

interface Saved {
  v: 2;
  p: number;
  s: Record<string, unknown>;
  /** id -> [fraction, done] */
  r: Record<string, [number, 0 | 1]>;
  vis: number[];
}

function validSaved(x: unknown): x is Saved {
  const s = x as Saved | null;
  return !!s && s.v === 2 && typeof s.p === 'number' && typeof s.s === 'object' && typeof s.r === 'object' && Array.isArray(s.vis);
}

export function mount(container: HTMLElement, raw: unknown, opts: MountOptions): () => void {
  const doc: ProjectDoc = migrate(raw);
  const win = opts.win ?? window;
  const resolveMedia = makeMediaResolver(doc);
  const adapter = opts.mode === 'scorm' ? connect(opts.scormVersion ?? doc.settings.scormVersion, win) : null;
  const reporter = new Reporter(adapter, doc.settings.passingScore);
  const restored = reporter.start();
  const saved: Saved = validSaved(restored) ? restored : { v: 2, p: 0, s: {}, r: {}, vis: [] };

  const results: Record<string, BlockResult> = {};
  for (const [id, [fraction, done]] of Object.entries(saved.r)) results[id] = { fraction, done: done === 1 };
  const visited = new Set<number>(saved.vis.filter((n) => Number.isInteger(n) && n >= 0 && n < doc.pages.length));
  const blockState: Record<string, unknown> = { ...saved.s };
  let page = Math.min(Math.max(opts.startPage ?? saved.p, 0), doc.pages.length - 1);

  container.classList.add('ap-root');
  container.replaceChildren();
  applyTheme(container, doc.design);

  const stage = h('div', { class: 'ap-stage' });
  const status = h('p', { class: 'ap-status', 'aria-live': 'polite' });
  const pageLabel = h('span', { class: 'ap-pagelabel' });
  const prev = h('button', { class: 'ap-btn ap-navbtn', type: 'button' }, 'Previous');
  const next = h('button', { class: 'ap-btn ap-navbtn', type: 'button' }, 'Next');
  const nav = h('nav', { class: 'ap-nav', 'aria-label': 'Pages' }, prev, pageLabel, next);
  if (doc.pages.length < 2) nav.hidden = true;
  container.append(h('div', { class: 'ap-shell' }, h('div', { class: 'ap-stagewrap' }, stage), nav, status));

  const persist = () => {
    const r: Saved['r'] = {};
    for (const [id, v] of Object.entries(results)) r[id] = [Math.round(v.fraction * 1000) / 1000, v.done ? 1 : 0];
    reporter.saveProgress({ v: 2, p: page, s: blockState, r, vis: [...visited].sort((a, b) => a - b) } satisfies Saved);
  };

  const refreshProgress = () => {
    const agg = aggregate(doc, DEFS_BY_TYPE, results);
    const completed = agg.allScoredDone && visited.size === doc.pages.length;
    reporter.update({ score: agg.score, completed });
    if (agg.score) {
      const pct = percent(agg.score);
      status.textContent = completed
        ? `Final score: ${pct}% — ${pct >= doc.settings.passingScore ? 'Passed' : `not passed (passing score ${doc.settings.passingScore}%)`}`
        : `Score so far: ${pct}%`;
    } else {
      status.textContent = '';
    }
  };

  const env: StageEnv = {
    project: doc,
    editing: false,
    resolveMedia,
    getState: (id) => blockState[id],
    setState: (id, s) => {
      blockState[id] = s;
      persist();
    },
    report: (id, r) => {
      results[id] = r;
      persist();
      refreshProgress();
    },
    goto: (t) => showPage(t === 'next' ? page + 1 : t === 'prev' ? page - 1 : t, true),
  };

  function showPage(i: number, focus = false) {
    if (i < 0 || i >= doc.pages.length) return;
    page = i;
    visited.add(i);
    const pg = doc.pages[i];
    if (!pg) return;
    stage.replaceChildren();
    applyPageBackground(stage, pg, doc.design, resolveMedia);
    for (const el of pg.elements) if (!el.hidden) paintElement(stage, el, env);
    pageLabel.textContent = `Page ${i + 1} of ${doc.pages.length}`;
    prev.disabled = i === 0;
    next.disabled = i === doc.pages.length - 1;
    persist();
    refreshProgress();
    if (focus) stage.setAttribute('tabindex', '-1'), stage.focus({ preventScroll: true });
  }

  prev.addEventListener('click', () => showPage(page - 1, true));
  next.addEventListener('click', () => showPage(page + 1, true));
  showPage(page);

  const end = () => reporter.terminate();
  win.addEventListener('pagehide', end);
  win.addEventListener('beforeunload', end);
  return () => {
    win.removeEventListener('pagehide', end);
    win.removeEventListener('beforeunload', end);
    end();
  };
}
