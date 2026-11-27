import { useRef, useState } from 'react';
import type { MediaItem } from '../../schema/types';
import { Icon } from './Icon';

interface Props {
  label: string;
  value: string | null | undefined;
  media: MediaItem[];
  addImage(file: File): Promise<string>;
  onChange(ref: string | null): void;
  /** Called with the natural aspect ratio (w/h) of a newly uploaded image. */
  onAspect?(ratio: number): void;
  emptyLabel?: string;
}

const ratioOf = (src: string): Promise<number> =>
  new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : 0);
    i.onerror = () => res(0);
    i.src = src;
  });

export function ImagePicker({
  label,
  value,
  media,
  addImage,
  onChange,
  onAspect,
  emptyLabel = 'No image',
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = value?.startsWith('media:') ? media.find((m) => `media:${m.id}` === value) : null;

  const upload = async (file: File) => {
    setError('');
    setBusy(true);
    try {
      const ref = await addImage(file);
      onChange(ref);
      if (onAspect) {
        // The item is added to state asynchronously; read the ratio from the file itself.
        const url = URL.createObjectURL(file);
        const r = await ratioOf(url);
        URL.revokeObjectURL(url);
        if (r) onAspect(r);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="imgpick">
        <div className="imgpick-thumb">
          {current ? <img src={current.src} alt="" /> : <span>{emptyLabel}</span>}
        </div>
        <div className="imgpick-actions">
          <button type="button" onClick={() => input.current?.click()} disabled={busy}>
            <Icon name="upload" size={15} /> {busy ? 'Adding…' : current ? 'Replace' : 'Upload'}
          </button>
          {media.length > 0 && (
            <select
              aria-label={`${label}: choose from library`}
              value=""
              onChange={(e) => e.target.value && onChange(`media:${e.target.value}`)}
            >
              <option value="">From library…</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          {value && (
            <button type="button" className="link" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          aria-label={`${label}: upload file`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
