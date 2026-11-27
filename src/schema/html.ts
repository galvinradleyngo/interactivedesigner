const ALLOWED = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'A',
  'SUP',
  'SUB',
  'H3',
  'H4',
]);
const SAFE_HREF = /^(https?:|mailto:|#)/i;

/** Allow-list HTML sanitizer for rich text (used on save and on render). */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }
      const el = child as Element;
      walk(el);
      if (!ALLOWED.has(el.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(el.tagName)) el.remove();
        else el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const keep =
          el.tagName === 'A' && attr.name === 'href' && SAFE_HREF.test(attr.value.trim());
        if (!keep) el.removeAttribute(attr.name);
      }
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text version, for labels and validation. */
export function stripHtml(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}
