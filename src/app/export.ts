import JSZip from 'jszip';
import type { ActivityDoc, MediaItem } from '../schema/types';
import { buildManifest } from '../scorm/manifest';
import { safeFileName } from '../scorm/names';

const base = import.meta.env.BASE_URL;

async function fetchText(path: string): Promise<string> {
  const r = await fetch(`${base}${path}`);
  if (!r.ok) throw new Error(`Could not load ${path}`);
  return r.text();
}

export async function fetchPlayerAssets(): Promise<{ js: string; css: string }> {
  const [js, css] = await Promise.all([
    fetchText('player/player.js'),
    fetchText('player/player.css'),
  ]);
  return { js, css };
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

async function mediaBlob(m: MediaItem): Promise<Blob> {
  try {
    const r = await fetch(m.src);
    if (!r.ok) throw new Error(String(r.status));
    return await r.blob();
  } catch {
    throw new Error(
      `Could not fetch image "${m.name}" for the package. If it is stored in Firebase Storage, the bucket needs CORS configured (see README).`,
    );
  }
}

/** Embed JSON inside a <script> tag safely. */
const scriptJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');

export function indexHtml(
  title: string,
  data: unknown,
  mode: 'scorm' | 'preview',
  inline?: { js: string; css: string },
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const head = inline
    ? `<style>${inline.css}</style>`
    : '<link rel="stylesheet" href="player.css">';
  const script = inline
    ? `<script>${inline.js.replace(/<\/script/gi, '<\\/script')}</script>`
    : '<script src="player.js"></script>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${head}
</head>
<body>
<div id="app"></div>
<script type="application/json" id="activity-data" data-mode="${mode}">${scriptJson(data)}</script>
${script}
</body>
</html>
`;
}

/** Build the SCORM zip entirely in the browser. */
export async function buildScormZip(
  activity: ActivityDoc,
): Promise<{ blob: Blob; fileName: string }> {
  const { js, css } = await fetchPlayerAssets();
  const zip = new JSZip();
  const pkgMedia: MediaItem[] = [];

  for (const m of activity.media) {
    const blob = await mediaBlob(m);
    const ext = EXT[blob.type] ?? EXT[m.mime] ?? 'bin';
    const path = `media/${m.id.replace(/[^\w-]/g, '')}.${ext}`;
    zip.file(path, blob);
    pkgMedia.push({ ...m, src: path });
  }

  const data: ActivityDoc = { ...activity, media: pkgMedia };
  const content = JSON.stringify(data, null, 2);
  zip.file('content.json', content);
  zip.file('player.js', js);
  zip.file('player.css', css);
  zip.file('index.html', indexHtml(activity.title, data, 'scorm'));

  const files = Object.keys(zip.files).filter((f) => !zip.files[f]?.dir);
  zip.file(
    'imsmanifest.xml',
    buildManifest({
      version: activity.settings.scormVersion,
      title: activity.title,
      id: `${safeFileName(activity.title, 'x')}-${Date.now().toString(36)}`,
      files,
      passingScore: activity.settings.passingScore,
    }),
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { blob, fileName: safeFileName(activity.title) };
}

export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
