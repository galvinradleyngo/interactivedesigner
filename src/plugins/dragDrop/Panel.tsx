import { Icon } from '../../app/components/Icon';
import { Color, Num, Section, Select, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import { newKey } from '../../schema/migrate';
import type { DdItem, DdProps, DdZone } from './type';

export function newZone(n: number, at?: { x: number; y: number }): DdZone {
  return {
    id: newKey('z'),
    label: `Zone ${n}`,
    x: at?.x ?? 6 + ((n - 1) % 2) * 46,
    y: at?.y ?? 6,
    w: 42,
    h: 46,
    capacity: 0,
  };
}
export function newItem(n: number, at?: { x: number; y: number }): DdItem {
  return {
    id: newKey('i'),
    label: `Item ${n}`,
    image: null,
    x: at?.x ?? 4 + ((n - 1) % 4) * 23,
    y: at?.y ?? 66 + Math.floor((n - 1) / 4) * 14,
    w: 20,
    h: 11,
    zone: null,
  };
}

/** Sub-selection ids look like `i:<id>` (item) or `z:<id>` (zone). */
export function DragDropPanel({
  props,
  el,
  doc,
  onChange,
  addImage,
  sub,
  setSub,
  startBlockEdit,
}: PanelProps<DdProps>) {
  const set = (p: Partial<DdProps>, key?: string) => onChange({ ...props, ...p }, key);
  const selItem = sub?.startsWith('i:')
    ? props.items.find((i) => i.id === sub.slice(2))
    : undefined;
  const selZone = sub?.startsWith('z:')
    ? props.zones.find((z) => z.id === sub.slice(2))
    : undefined;
  const setItem = (id: string, p: Partial<DdItem>, key?: string) =>
    set({ items: props.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }, key);
  const setZone = (id: string, p: Partial<DdZone>, key?: string) =>
    set({ zones: props.zones.map((z) => (z.id === id ? { ...z, ...p } : z)) }, key);

  return (
    <>
      <Section
        title="Layout"
        actions={
          <button type="button" onClick={startBlockEdit}>
            <Icon name="edit" size={15} /> Edit on canvas
          </button>
        }
      >
        <p className="muted">
          Choose “Edit on canvas” to drag items and zones into place and resize them.
        </p>
        <div className="grid2">
          <Color
            label="Background colour"
            value={props.bgColor}
            fallback="#f8fafc"
            clearable
            onChange={(bgColor) => set({ bgColor }, `bg-${el.id}`)}
          />
        </div>
        <ImagePicker
          label="Background picture (e.g. a diagram to label)"
          value={props.background}
          media={doc.media}
          addImage={addImage}
          onChange={(background) => set({ background })}
        />
      </Section>

      <Section
        title={`Drop zones (${props.zones.length})`}
        actions={
          <button
            type="button"
            className="primary"
            onClick={() => {
              const z = newZone(props.zones.length + 1);
              set({ zones: [...props.zones, z] });
              setSub(`z:${z.id}`);
            }}
          >
            <Icon name="plus" size={15} /> Add zone
          </button>
        }
      >
        <ul className="itemlist">
          {props.zones.map((z) => (
            <li key={z.id}>
              <button
                type="button"
                className={`itembtn ${sub === `z:${z.id}` ? 'on' : ''}`}
                aria-pressed={sub === `z:${z.id}`}
                onClick={() => setSub(sub === `z:${z.id}` ? null : `z:${z.id}`)}
              >
                {z.label || 'Zone'}
              </button>
            </li>
          ))}
        </ul>
        {selZone && (
          <div className="subedit">
            <Txt
              label="Zone label"
              value={selZone.label}
              onChange={(label) => setZone(selZone.id, { label }, `zl-${selZone.id}`)}
            />
            <Num
              label="Max items (0 = unlimited)"
              value={selZone.capacity}
              min={0}
              max={50}
              onChange={(capacity) => setZone(selZone.id, { capacity })}
            />
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({
                  zones: props.zones.filter((z) => z.id !== selZone.id),
                  items: props.items.map((i) => (i.zone === selZone.id ? { ...i, zone: null } : i)),
                });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete zone
            </button>
          </div>
        )}
      </Section>

      <Section
        title={`Draggable items (${props.items.length})`}
        actions={
          <button
            type="button"
            className="primary"
            onClick={() => {
              const i = newItem(props.items.length + 1);
              set({ items: [...props.items, i] });
              setSub(`i:${i.id}`);
            }}
          >
            <Icon name="plus" size={15} /> Add item
          </button>
        }
      >
        <ul className="itemlist">
          {props.items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className={`itembtn ${sub === `i:${i.id}` ? 'on' : ''}`}
                aria-pressed={sub === `i:${i.id}`}
                onClick={() => setSub(sub === `i:${i.id}` ? null : `i:${i.id}`)}
              >
                {i.label || 'Item'}
                <span className="tag">
                  {i.zone
                    ? props.zones.find((z) => z.id === i.zone)?.label || 'zone'
                    : 'distractor'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selItem && (
          <div className="subedit">
            <Txt
              label="Item text"
              value={selItem.label}
              onChange={(label) => setItem(selItem.id, { label }, `il-${selItem.id}`)}
            />
            <ImagePicker
              label="Item picture (optional)"
              value={selItem.image}
              media={doc.media}
              addImage={addImage}
              onChange={(image) => setItem(selItem.id, { image })}
            />
            <Select
              label="Belongs in"
              value={selItem.zone ?? ''}
              options={[
                { value: '', label: 'Nowhere (distractor)' },
                ...props.zones.map((z) => ({ value: z.id, label: z.label || 'Zone' })),
              ]}
              onChange={(zone) => setItem(selItem.id, { zone: zone || null })}
            />
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({ items: props.items.filter((i) => i.id !== selItem.id) });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete item
            </button>
          </div>
        )}
        {props.items.length > 0 && !props.items.some((i) => i.zone) && (
          <p className="warn">No item has a correct zone yet, so this interaction is not graded.</p>
        )}
      </Section>
    </>
  );
}
