import { Icon } from '../../app/components/Icon';
import { RichText } from '../../app/components/RichText';
import { Check, Color, Section, Select, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import { newKey } from '../../schema/migrate';
import type { Hotspot, HotspotProps } from './type';

export function newHotspot(n: number, x = 50, y = 50): Hotspot {
  return {
    id: newKey('h'),
    x,
    y,
    label: `Hotspot ${n}`,
    html: '<p>Describe this spot.</p>',
    image: null,
    correct: false,
  };
}

export function HotspotsPanel({
  props,
  el,
  doc,
  onChange,
  patchEl,
  addImage,
  sub,
  setSub,
  startBlockEdit,
}: PanelProps<HotspotProps>) {
  const set = (p: Partial<HotspotProps>, key?: string) => onChange({ ...props, ...p }, key);
  const sel = props.hotspots.find((h) => h.id === sub) ?? null;
  const setHs = (id: string, p: Partial<Hotspot>, key?: string) =>
    set({ hotspots: props.hotspots.map((h) => (h.id === id ? { ...h, ...p } : h)) }, key);

  return (
    <>
      <Section title="Image">
        <ImagePicker
          label="Background image"
          value={props.image}
          media={doc.media}
          addImage={addImage}
          onChange={(image) => set({ image })}
          onAspect={(r) => patchEl({ h: Math.max(60, Math.round(el.w / r)) })}
        />
      </Section>
      <Section title="Behaviour">
        <Select
          label="Mode"
          value={props.mode}
          options={[
            { value: 'explore', label: 'Explore (click to reveal, not scored)' },
            { value: 'find', label: 'Find the spot (scored quiz)' },
          ]}
          onChange={(mode) => set({ mode })}
        />
        {props.mode === 'find' && (
          <>
            <Txt
              label="Question shown to learners"
              value={props.prompt}
              onChange={(prompt) => set({ prompt }, `pr-${el.id}`)}
            />
            <p className="muted">Tick “Correct spot” on the hotspot(s) that count as right.</p>
          </>
        )}
        <Color
          label="Marker colour"
          value={props.markerColor}
          fallback="#4f46e5"
          clearable
          onChange={(markerColor) => set({ markerColor }, `mc-${el.id}`)}
        />
      </Section>
      <Section
        title={`Hotspots (${props.hotspots.length})`}
        actions={
          <div className="row">
            <button type="button" onClick={startBlockEdit}>
              <Icon name="edit" size={15} /> Edit on canvas
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                const h = newHotspot(
                  props.hotspots.length + 1,
                  30 + ((props.hotspots.length * 12) % 40),
                  40 + ((props.hotspots.length * 9) % 30),
                );
                set({ hotspots: [...props.hotspots, h] });
                setSub(h.id);
              }}
            >
              <Icon name="plus" size={15} /> Add
            </button>
          </div>
        }
      >
        {props.hotspots.length === 0 && (
          <p className="muted">
            No hotspots yet. Add one, or choose “Edit on canvas” and double-click the image.
          </p>
        )}
        <ul className="itemlist">
          {props.hotspots.map((h, i) => (
            <li key={h.id}>
              <button
                type="button"
                className={`itembtn ${sub === h.id ? 'on' : ''}`}
                onClick={() => setSub(sub === h.id ? null : h.id)}
                aria-pressed={sub === h.id}
              >
                <span className="badge">{i + 1}</span> {h.label || `Hotspot ${i + 1}`}
                {props.mode === 'find' && h.correct && <span className="tag">correct</span>}
              </button>
            </li>
          ))}
        </ul>
        {sel && (
          <div className="subedit">
            <Txt
              label="Title"
              value={sel.label}
              onChange={(label) => setHs(sel.id, { label }, `hl-${sel.id}`)}
            />
            {props.mode === 'explore' && (
              <>
                <RichText
                  label="Pop-up text"
                  value={sel.html}
                  onChange={(html) => setHs(sel.id, { html }, `hh-${sel.id}`)}
                />
                <ImagePicker
                  label="Pop-up picture (optional)"
                  value={sel.image}
                  media={doc.media}
                  addImage={addImage}
                  onChange={(image) => setHs(sel.id, { image })}
                />
              </>
            )}
            {props.mode === 'find' && (
              <Check
                label="Correct spot"
                checked={sel.correct}
                onChange={(correct) => setHs(sel.id, { correct })}
              />
            )}
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({ hotspots: props.hotspots.filter((h) => h.id !== sel.id) });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete hotspot
            </button>
          </div>
        )}
      </Section>
    </>
  );
}
