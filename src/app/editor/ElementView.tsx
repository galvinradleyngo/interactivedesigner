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
}

/** Renders a block with the real player code, in a static "editing" mode. */
export function ElementView({ el: source, doc, editText, peek, onTextCommit }: Props) {
  const el = peek ? { ...source, props: { ...source.props, _peek: true } } : source;
  const ref = useRef<HTMLDivElement>(null);
  const commit = useRef(onTextCommit);
  commit.current = onTextCommit;
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
  ]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    renderBlock(root, el, { project: doc, editing: true, resolveMedia: makeMediaResolver(doc) });
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
