import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { MediaItem } from '../schema/types';
import { getApp, useStorage } from './firebase';

/** Firestore docs max out at 1MB; keep each inline image well under that. */
const MAX_INLINE_CHARS = 750_000;
const MAX_DIM = 1280;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

const readDataUrl = (f: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read file'));
    r.readAsDataURL(f);
  });

/** Downscale and compress an image until it fits the inline limit. */
export async function shrinkImage(file: File): Promise<{ src: string; mime: string }> {
  if (file.type === 'image/svg+xml') {
    const src = await readDataUrl(file);
    if (src.length > MAX_INLINE_CHARS) throw new Error('SVG is too large (max ~500 KB)');
    return { src, mime: file.type };
  }
  const img = await loadImage(file);
  let scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const keepAlpha =
    file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    const quality = Math.max(0.5, 0.85 - attempt * 0.08);
    const mime = keepAlpha && attempt < 2 ? 'image/webp' : 'image/jpeg';
    const src = c.toDataURL(mime, quality);
    if (src.length <= MAX_INLINE_CHARS) return { src, mime: src.slice(5, src.indexOf(';')) };
    scale *= 0.8;
  }
  throw new Error('Image is too large even after compression');
}

/** Add an image: Firebase Storage when enabled, otherwise a compressed inline data URI. */
export async function addImage(file: File, uid: string): Promise<MediaItem> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  if (useStorage) {
    const path = `users/${uid}/media/${id}-${file.name.replace(/[^\w.-]+/g, '_')}`;
    const r = ref(getStorage(getApp()), path);
    await uploadBytes(r, file, { contentType: file.type });
    return { id, name: file.name, mime: file.type, src: await getDownloadURL(r) };
  }
  const { src, mime } = await shrinkImage(file);
  return { id, name: file.name, mime, src };
}
