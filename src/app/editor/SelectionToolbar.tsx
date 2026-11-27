import { useRef } from 'react';
import type { StageElement } from '../../schema/types';
import { Icon } from '../components/Icon';

interface Props {
  el: StageElement;
  rect: { left: string; top: string; width: string; height: string };
  /** Not enough room above the element: show the toolbar below it. */
  nearTop: boolean;
  hasEditor: boolean;
  onEdit(): void;
  onProps(patch: Record<string, unknown>, key?: string): void;
  onDuplicate(): void;
  onDelete(): void;
  onReplaceImage(file: File): void;
  onZ(move: 'forward' | 'backward'): void;
}

const EDIT_LABEL: Record<string, string> = {
  text: 'Edit text',
  button: 'Edit label',
  flipCard: 'Edit text',
};

/** Quick controls that float next to the selected element, so most edits never need the side panel. */
export function SelectionToolbar(p: Props) {
  const { el } = p;
  const file = useRef<HTMLInputElement>(null);
  const pr = el.props as Record<string, unknown>;
  const num = (k: string, d: number) => (typeof pr[k] === 'number' ? (pr[k] as number) : d);
  const str = (k: string, d: string) =>
    typeof pr[k] === 'string' && pr[k] ? (pr[k] as string) : d;
  const canEdit = p.hasEditor || el.type in EDIT_LABEL;
  const editLabel = p.hasEditor
    ? `Edit ${el.type === 'interactiveVideo' ? 'checkpoints' : 'on canvas'}`
    : EDIT_LABEL[el.type];

  return (
    <div
      className={`ed-tools ${p.nearTop ? 'below' : ''}`}
      style={{ left: p.rect.left, top: p.rect.top, width: p.rect.width, height: p.rect.height }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="ed-tools-bar" role="toolbar" aria-label="Quick edit">
        {!el.locked && canEdit && (
          <button type="button" className="tb-edit" onClick={p.onEdit}>
            {editLabel}
          </button>
        )}
        {!el.locked && el.type === 'text' && (
          <>
            <button
              type="button"
              aria-label="Smaller text"
              title="Smaller text"
              onClick={() =>
                p.onProps({ fontSize: Math.max(8, num('fontSize', 28) - 2) }, `fs-${el.id}`)
              }
            >
              A−
            </button>
            <button
              type="button"
              aria-label="Larger text"
              title="Larger text"
              onClick={() =>
                p.onProps({ fontSize: Math.min(160, num('fontSize', 28) + 2) }, `fs-${el.id}`)
              }
            >
              A+
            </button>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Align ${a}`}
                aria-pressed={str('align', 'left') === a}
                title={`Align ${a}`}
                onClick={() => p.onProps({ align: a })}
              >
                <Icon name={`align${a}`} size={15} />
              </button>
            ))}
            <label className="tb-color" title="Text colour">
              <span style={{ color: str('color', '#1f2937') }}>A</span>
              <input
                type="color"
                aria-label="Text colour"
                value={str('color', '#1f2937')}
                onChange={(e) => p.onProps({ color: e.target.value }, `col-${el.id}`)}
              />
            </label>
          </>
        )}
        {!el.locked && el.type === 'shape' && (
          <label className="tb-color" title="Fill colour">
            <span className="swatch" style={{ background: str('fill', '#e0e7ff') }} />
            <input
              type="color"
              aria-label="Fill colour"
              value={str('fill', '#e0e7ff')}
              onChange={(e) => p.onProps({ fill: e.target.value }, `fill-${el.id}`)}
            />
          </label>
        )}
        {!el.locked && el.type === 'image' && (
          <>
            <button type="button" onClick={() => file.current?.click()}>
              {pr.src ? 'Replace picture' : 'Choose picture'}
            </button>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              aria-label="Replace picture: upload file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onReplaceImage(f);
                e.target.value = '';
              }}
            />
          </>
        )}
        {!el.locked && (
          <>
            <button
              type="button"
              aria-label="Bring forward"
              title="Bring forward"
              onClick={() => p.onZ('forward')}
            >
              <Icon name="front" size={15} />
            </button>
            <button
              type="button"
              aria-label="Send backward"
              title="Send backward"
              onClick={() => p.onZ('backward')}
            >
              <Icon name="back2" size={15} />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Duplicate"
          title="Duplicate (Ctrl+D)"
          onClick={p.onDuplicate}
        >
          <Icon name="copy" size={15} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          title="Delete"
          className="danger"
          onClick={p.onDelete}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}
