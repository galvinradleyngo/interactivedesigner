import { stripHtml } from '../../schema/html';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { STAGE_W, stageHeight, type ProjectDoc } from '../../schema/types';

export interface Issue {
  pageId: string;
  pageName: string;
  elementId: string;
  /** e.g. "Hotspots" */
  block: string;
  message: string;
}

/** Things an author probably wants to finish before previewing or exporting. */
export function checkProject(doc: ProjectDoc): Issue[] {
  const out: Issue[] = [];
  const graded = doc.settings.graded !== false;
  const H = stageHeight(doc.design);
  for (const page of doc.pages) {
    for (const el of page.elements) {
      if (el.hidden) continue;
      const block = DEFS_BY_TYPE.get(el.type)?.label ?? el.type;
      const add = (message: string) =>
        out.push({ pageId: page.id, pageName: page.name, elementId: el.id, block, message });
      // Entirely outside the page (e.g. after changing the page shape): learners could never see it.
      if (el.x >= STAGE_W || el.y >= H || el.x + el.w <= 0 || el.y + el.h <= 0)
        add('is outside the page');
      const p = el.props as Record<string, unknown>;
      const arr = (k: string): Record<string, unknown>[] =>
        Array.isArray(p[k]) ? (p[k] as Record<string, unknown>[]) : [];

      switch (el.type) {
        case 'hotspots':
          if (!p.image) add('needs a background image');
          if (arr('hotspots').length === 0) add('has no hotspots yet');
          else if (p.mode === 'find' && !arr('hotspots').some((h) => h.correct))
            add('is a quiz but no hotspot is marked as the correct spot');
          break;
        case 'dragDrop':
          if (arr('zones').length === 0) add('has no drop zones');
          if (arr('items').length === 0) add('has no items to drag');
          if (graded && arr('items').length > 0 && !arr('items').some((i) => i.zone))
            add('has no item with a correct zone, so it is not scored');
          break;
        case 'flashcards':
          if (arr('cards').length === 0) add('has no cards');
          break;
        case 'flipCard': {
          const empty = (f: unknown) => {
            const x = (f ?? {}) as Record<string, unknown>;
            return !String(x.text ?? '').trim() && !x.image;
          };
          if (empty(p.front)) add('has nothing on the front');
          if (empty(p.back)) add('has nothing on the back');
          break;
        }
        case 'timeline':
          if (arr('events').length === 0) add('has no events');
          break;
        case 'imageCompare':
          if (!p.before || !p.after) add('needs both images');
          break;
        case 'image':
          if (!p.src) add('has no picture');
          break;
        case 'multipleChoice':
          arr('questions').forEach((q, i) => {
            const opts = Array.isArray(q.options) ? (q.options as Record<string, unknown>[]) : [];
            if (!stripHtml(String(q.text ?? '')).trim()) add(`question ${i + 1} has no text`);
            if (!opts.some((o) => o.correct)) add(`question ${i + 1} has no correct answer marked`);
          });
          break;
        case 'button':
          if (p.action === 'page' && Number(p.page) > doc.pages.length)
            add(`links to page ${String(p.page)}, which does not exist`);
          break;
      }
    }
  }
  return out;
}
