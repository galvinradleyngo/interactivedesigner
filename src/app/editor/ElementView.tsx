import { useEffect, useRef } from 'react';
import { renderBlock, makeMediaResolver } from '../../player/stage';
import { sanitizeHtml } from '../../schema/html';
import type { ProjectDoc, StageElement } from '../../schema/types';

interface Props {
  el: StageElement;
  doc: ProjectDoc;
  /** Text elements: let the user type directly into the element. */
  editText?: boolean;
  /** Editor-only: show the alternate side of two-sided blocks. */
  peek?: boolean;
  onTextCommit?(html: string): void;
  /** Plain-text field (a `data-edit` path such as `label` or `front.text`) being edited in place. */
  editField?: string | null;
  onFieldCommit?(path: string, text: string | null): void;
}

/** Renders a block with the real player code, in a static "editing" mode. */
export function ElementView({
  el: source,
  doc,
  editText,
  peek,
  onTextCommit,
  editField,
  onFieldCommit,
}: Props) {
  const el = peek ? { ...source, props: { ...source.props, _peek: true } } : source;
  const ref = useRef<HTMLDivElement>(null);
  const commit = useRef(onTextCommit);
  commit.current = onTextCommit;
  const fieldCommit = useRef(onFieldCommit);
  fieldCommit.current = onFieldCommit;
  const mediaKey = doc.media.map((m) => `${m.id}:${m.src.length}`).join(',');
  const key = JSON.stringify([
    el.type,
    el.props,
    doc.settings.showFeedback,
    doc.settings.allowRetry,
    doc.design.primary,
    doc.design.radius,
    mediaKey,
    !!editText,
    !!peek,
    editField ?? '',
  ]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    renderBlock(root, el, { project: doc, editing: true, resolveMedia: makeMediaResolver(doc) });
    if (editField) {
      const f = root.querySelector<HTMLElement>(`[data-edit="${editField}"]`);
      if (!f) return;
      f.contentEditable = 'true';
      f.spellcheck = true;
      f.setAttribute('role', 'textbox');
      f.style.outline = '2px solid #4f46e5';
      f.style.cursor = 'text';
      f.focus();
      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.selectNodeContents(f);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      let cancelled = false;
      const onBlur = () =>
        fieldCommit.current?.(editField, cancelled ? null : f.innerText.replace(/\n+$/, ''));
      const onKey = (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelled = true;
          f.blur();
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          f.blur();
        } else if (e.key === ' ' && f.closest('button')) {
          // A space inside a button would "click" it instead of typing.
          e.preventDefault();
          document.execCommand('insertText', false, ' ');
        }
      };
      f.addEventListener('blur', onBlur, { once: true });
      f.addEventListener('keydown', onKey);
      f.addEventListener('keyup', (e) => e.stopPropagation());
      return () => f.removeEventListener('keydown', onKey);
    }
    if (!editText || el.type !== 'text') return;
    const t = root.querySelector<HTMLElement>('.ap-text');
    if (!t) return;
    t.contentEditable = 'true';
    t.spellcheck = true;
    t.setAttribute('role', 'textbox');
    t.setAttribute('aria-label', 'Edit text');
    t.focus();
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.selectNodeContents(t);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    const onBlur = () => commit.current?.(sanitizeHtml(t.innerHTML));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        t.blur();
      }
    };
    t.addEventListener('blur', onBlur, { once: true });
    t.addEventListener('keydown', onKey);
    return () => t.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={ref} />;
}
