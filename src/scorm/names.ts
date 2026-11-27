/** Filename for the zip, derived from the activity title. */
export function safeFileName(title: string, ext = 'zip'): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._ -]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return `${base || 'activity'}.${ext}`;
}

/** XML NCName-safe identifier (letters, digits, `_`, `-`, `.`; starts with a letter or `_`). */
export function safeIdentifier(raw: string, fallback = 'ID'): string {
  let id = raw
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  if (!id || !/^[A-Za-z_]/.test(id)) id = `${fallback}_${id}`;
  return id;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
