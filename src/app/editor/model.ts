import { DEFS_BY_TYPE } from '../../plugins/defs';
import { newKey } from '../../schema/migrate';
import {
  STAGE_H,
  STAGE_W,
  stageHeight,
  type Page,
  type ProjectDoc,
  type StageElement,
} from '../../schema/types';

/** Pure, immutable editing operations on a project. */

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function pageIndex(doc: ProjectDoc, pageId: string): number {
  return doc.pages.findIndex((p) => p.id === pageId);
}

const mapPage = (doc: ProjectDoc, pageId: string, fn: (p: Page) => Page): ProjectDoc => ({
  ...doc,
  pages: doc.pages.map((p) => (p.id === pageId ? fn(p) : p)),
});

export function newElement(
  type: string,
  at?: { x: number; y: number },
  stageH: number = STAGE_H,
): StageElement {
  const def = DEFS_BY_TYPE.get(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  const { w, h } = def.defaultSize;
  return {
    id: newKey('e'),
    type,
    x: Math.round(at ? at.x : (STAGE_W - w) / 2),
    y: Math.round(at ? at.y : (stageH - h) / 2),
    w,
    h,
    props: clone(def.createDefault()) as Record<string, unknown>,
  };
}

export const addElement = (doc: ProjectDoc, pageId: string, el: StageElement): ProjectDoc =>
  mapPage(doc, pageId, (p) => ({ ...p, elements: [...p.elements, el] }));

export const updateElement = (
  doc: ProjectDoc,
  pageId: string,
  id: string,
  patch: Partial<StageElement>,
): ProjectDoc =>
  mapPage(doc, pageId, (p) => ({
    ...p,
    elements: p.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  }));

export const updateProps = (
  doc: ProjectDoc,
  pageId: string,
  id: string,
  props: Record<string, unknown>,
): ProjectDoc => updateElement(doc, pageId, id, { props });

export const removeElement = (doc: ProjectDoc, pageId: string, id: string): ProjectDoc =>
  mapPage(doc, pageId, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) }));

/** Copy an element (offset a little) and put it on top. `ids` get fresh keys for nested items. */
export function duplicateElement(
  doc: ProjectDoc,
  pageId: string,
  id: string,
  offset = 20,
): { doc: ProjectDoc; id: string | null } {
  const page = doc.pages.find((p) => p.id === pageId);
  const src = page?.elements.find((e) => e.id === id);
  if (!src) return { doc, id: null };
  const copy: StageElement = {
    ...clone(src),
    id: newKey('e'),
    x: Math.min(src.x + offset, STAGE_W - 20),
    y: Math.min(src.y + offset, stageHeight(doc.design) - 20),
  };
  if (copy.name) copy.name = `${copy.name} copy`;
  return { doc: addElement(doc, pageId, copy), id: copy.id };
}

export type ZMove = 'front' | 'back' | 'forward' | 'backward';
export function reorder(doc: ProjectDoc, pageId: string, id: string, move: ZMove): ProjectDoc {
  return mapPage(doc, pageId, (p) => {
    const els = [...p.elements];
    const i = els.findIndex((e) => e.id === id);
    if (i < 0) return p;
    const [item] = els.splice(i, 1);
    if (!item) return p;
    const j =
      move === 'front'
        ? els.length
        : move === 'back'
          ? 0
          : move === 'forward'
            ? Math.min(els.length, i + 1)
            : Math.max(0, i - 1);
    els.splice(j, 0, item);
    return { ...p, elements: els };
  });
}

export type AlignTo = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export function alignElement(doc: ProjectDoc, pageId: string, id: string, to: AlignTo): ProjectDoc {
  const el = doc.pages.find((p) => p.id === pageId)?.elements.find((e) => e.id === id);
  if (!el) return doc;
  const H = stageHeight(doc.design);
  const patch: Partial<StageElement> =
    to === 'left'
      ? { x: 0 }
      : to === 'center'
        ? { x: Math.round((STAGE_W - el.w) / 2) }
        : to === 'right'
          ? { x: STAGE_W - el.w }
          : to === 'top'
            ? { y: 0 }
            : to === 'middle'
              ? { y: Math.round((H - el.h) / 2) }
              : { y: H - el.h };
  return updateElement(doc, pageId, id, patch);
}

/* Pages */

export function addPage(doc: ProjectDoc, afterIndex?: number): { doc: ProjectDoc; id: string } {
  const page: Page = { id: newKey('p'), name: `Page ${doc.pages.length + 1}`, elements: [] };
  const at = afterIndex === undefined ? doc.pages.length : afterIndex + 1;
  const pages = [...doc.pages];
  pages.splice(at, 0, page);
  return { doc: { ...doc, pages }, id: page.id };
}

export function duplicatePage(
  doc: ProjectDoc,
  pageId: string,
): { doc: ProjectDoc; id: string | null } {
  const i = pageIndex(doc, pageId);
  const src = doc.pages[i];
  if (!src) return { doc, id: null };
  const copy: Page = {
    ...clone(src),
    id: newKey('p'),
    name: `${src.name} copy`,
    elements: src.elements.map((e) => ({ ...clone(e), id: newKey('e') })),
  };
  const pages = [...doc.pages];
  pages.splice(i + 1, 0, copy);
  return { doc: { ...doc, pages }, id: copy.id };
}

/** Removes a page; a project always keeps at least one page. */
export function deletePage(doc: ProjectDoc, pageId: string): ProjectDoc {
  if (doc.pages.length <= 1) return doc;
  return { ...doc, pages: doc.pages.filter((p) => p.id !== pageId) };
}

export function movePage(doc: ProjectDoc, pageId: string, delta: -1 | 1): ProjectDoc {
  const i = pageIndex(doc, pageId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= doc.pages.length) return doc;
  const pages = [...doc.pages];
  [pages[i], pages[j]] = [pages[j] as Page, pages[i] as Page];
  return { ...doc, pages };
}

export const updatePage = (doc: ProjectDoc, pageId: string, patch: Partial<Page>): ProjectDoc =>
  mapPage(doc, pageId, (p) => ({ ...p, ...patch }));

/* Media */

const MEDIA_REF = /media:([A-Za-z0-9_-]+)/g;

/** Ids of media referenced anywhere in pages or design. */
export function mediaRefs(doc: ProjectDoc): Set<string> {
  const json = JSON.stringify({ pages: doc.pages, design: doc.design });
  return new Set(Array.from(json.matchAll(MEDIA_REF), (m) => m[1] as string));
}

/** Drop media nothing refers to (done at export, so undo never loses images). */
export function pruneMedia(doc: ProjectDoc): ProjectDoc {
  const used = mediaRefs(doc);
  return { ...doc, media: doc.media.filter((m) => used.has(m.id)) };
}

/** Set `props.a.b` from the path "a.b" without mutating the original. */
export function setPath(
  props: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path.split('.');
  if (!head) return props;
  if (rest.length === 0) return { ...props, [head]: value };
  const child = props[head];
  const base =
    child && typeof child === 'object' && !Array.isArray(child)
      ? (child as Record<string, unknown>)
      : {};
  return { ...props, [head]: setPath(base, rest.join('.'), value) };
}

/** Read "a.b" from props (undefined if missing). */
export function getPath(props: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
      props,
    );
}
