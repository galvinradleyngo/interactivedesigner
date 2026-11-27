import { Icon } from '../../app/components/Icon';
import { RichText } from '../../app/components/RichText';
import { Color, Section, Select, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import { newKey } from '../../schema/migrate';
import type { TimelineEvent, TimelineProps } from './type';

export function TimelinePanel({
  props,
  el,
  doc,
  onChange,
  addImage,
  sub,
  setSub,
}: PanelProps<TimelineProps>) {
  const set = (p: Partial<TimelineProps>, key?: string) => onChange({ ...props, ...p }, key);
  const sel = props.events.find((e) => e.id === sub) ?? null;
  const setEv = (id: string, p: Partial<TimelineEvent>, key?: string) =>
    set({ events: props.events.map((e) => (e.id === id ? { ...e, ...p } : e)) }, key);
  const move = (i: number, d: number) => {
    const events = [...props.events];
    const j = i + d;
    if (j < 0 || j >= events.length) return;
    [events[i], events[j]] = [events[j] as TimelineEvent, events[i] as TimelineEvent];
    set({ events });
  };

  return (
    <>
      <Section title="Timeline">
        <Select
          label="Layout"
          value={props.orientation}
          options={[
            { value: 'horizontal', label: 'Horizontal (left to right)' },
            { value: 'vertical', label: 'Vertical (top to bottom)' },
          ]}
          onChange={(orientation) => set({ orientation })}
        />
        <Color
          label="Line colour"
          value={props.color}
          fallback="#4f46e5"
          clearable
          onChange={(color) => set({ color }, `c-${el.id}`)}
        />
        <p className="muted">
          Tip: horizontal fits up to about 8 events across a wide block; vertical suits long
          timelines in a tall block.
        </p>
      </Section>
      <Section
        title={`Events (${props.events.length})`}
        actions={
          <button
            type="button"
            className="primary"
            onClick={() => {
              const ev: TimelineEvent = {
                id: newKey('t'),
                date: `Event ${props.events.length + 1}`,
                title: 'New event',
                html: '<p>Details.</p>',
                image: null,
              };
              set({ events: [...props.events, ev] });
              setSub(ev.id);
            }}
          >
            <Icon name="plus" size={15} /> Add event
          </button>
        }
      >
        <ul className="itemlist">
          {props.events.map((ev, i) => (
            <li key={ev.id} className="row">
              <button
                type="button"
                className={`itembtn ${sub === ev.id ? 'on' : ''}`}
                aria-pressed={sub === ev.id}
                onClick={() => setSub(sub === ev.id ? null : ev.id)}
              >
                <span className="badge">{i + 1}</span> {ev.date} · {ev.title}
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={`Move event ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <Icon name="up" size={14} />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={`Move event ${i + 1} down`}
                disabled={i === props.events.length - 1}
                onClick={() => move(i, 1)}
              >
                <Icon name="down" size={14} />
              </button>
            </li>
          ))}
        </ul>
        {sel && (
          <div className="subedit">
            <Txt
              label="Date or label"
              value={sel.date}
              onChange={(date) => setEv(sel.id, { date }, `td-${sel.id}`)}
            />
            <Txt
              label="Title"
              value={sel.title}
              onChange={(title) => setEv(sel.id, { title }, `tt-${sel.id}`)}
            />
            <RichText
              label="Details"
              value={sel.html}
              onChange={(html) => setEv(sel.id, { html }, `th-${sel.id}`)}
            />
            <ImagePicker
              label="Picture (optional)"
              value={sel.image}
              media={doc.media}
              addImage={addImage}
              onChange={(image) => setEv(sel.id, { image })}
            />
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({ events: props.events.filter((e) => e.id !== sel.id) });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete event
            </button>
          </div>
        )}
      </Section>
    </>
  );
}
