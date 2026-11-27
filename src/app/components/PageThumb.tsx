import { useEffect, useRef } from 'react';
import {
  applyPageBackground,
  applyStageShape,
  applyTheme,
  makeMediaResolver,
  paintElement,
} from '../../player/stage';
import type { Page, ProjectDoc } from '../../schema/types';

/** A live miniature of a page, drawn with the real player code (static, non-interactive). */
export function PageThumb({ doc, page }: { doc: ProjectDoc; page: Page }) {
  const ref = useRef<HTMLDivElement>(null);
  const mediaKey = doc.media.map((m) => `${m.id}:${m.src.length}`).join(',');
  const key = JSON.stringify([page, doc.design, doc.settings.showFeedback, mediaKey]);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    const resolve = makeMediaResolver(doc);
    applyTheme(stage, doc.design);
    applyStageShape(stage, doc.design);
    stage.replaceChildren();
    applyPageBackground(stage, page, doc.design, resolve);
    for (const el of page.elements)
      if (!el.hidden)
        paintElement(stage, el, { project: doc, editing: true, resolveMedia: resolve });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={ref} className="ap-stage thumb" aria-hidden="true" />;
}
