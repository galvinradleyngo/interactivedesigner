import { Icon } from '../../app/components/Icon';
import { Check, Color, Section, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import { newKey } from '../../schema/migrate';
import type { Card, CardFace, FlashProps } from './type';

export function FlashcardsPanel({
  props,
  el,
  doc,
  onChange,
  addImage,
  sub,
  setSub,
}: PanelProps<FlashProps>) {
  const set = (p: Partial<FlashProps>, key?: string) => onChange({ ...props, ...p }, key);
  const sel = props.cards.find((c) => c.id === sub) ?? null;
  const setCard = (id: string, p: Partial<Card>, key?: string) =>
    set({ cards: props.cards.map((c) => (c.id === id ? { ...c, ...p } : c)) }, key);
  const face = (c: Card, side: 'front' | 'back', label: string) => {
    const f: CardFace = c[side];
    return (
      <div className="face">
        <Txt
          label={`${label} text`}
          value={f.text}
          multiline
          onChange={(text) => setCard(c.id, { [side]: { ...f, text } }, `ct-${c.id}-${side}`)}
        />
        <ImagePicker
          label={`${label} picture (optional)`}
          value={f.image}
          media={doc.media}
          addImage={addImage}
          onChange={(image) => setCard(c.id, { [side]: { ...f, image } })}
        />
      </div>
    );
  };
  const move = (i: number, d: number) => {
    const cards = [...props.cards];
    const j = i + d;
    if (j < 0 || j >= cards.length) return;
    [cards[i], cards[j]] = [cards[j] as Card, cards[i] as Card];
    set({ cards });
  };

  return (
    <>
      <Section
        title={`Cards (${props.cards.length})`}
        actions={
          <button
            type="button"
            className="primary"
            onClick={() => {
              const c: Card = {
                id: newKey('c'),
                front: { text: 'Front', image: null },
                back: { text: 'Back', image: null },
              };
              set({ cards: [...props.cards, c] });
              setSub(c.id);
            }}
          >
            <Icon name="plus" size={15} /> Add card
          </button>
        }
      >
        <ul className="itemlist">
          {props.cards.map((c, i) => (
            <li key={c.id} className="row">
              <button
                type="button"
                className={`itembtn ${sub === c.id ? 'on' : ''}`}
                aria-pressed={sub === c.id}
                onClick={() => setSub(sub === c.id ? null : c.id)}
              >
                <span className="badge">{i + 1}</span> {c.front.text.split('\n')[0] || 'Card'}
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={`Move card ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <Icon name="up" size={14} />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={`Move card ${i + 1} down`}
                disabled={i === props.cards.length - 1}
                onClick={() => move(i, 1)}
              >
                <Icon name="down" size={14} />
              </button>
            </li>
          ))}
        </ul>
        {sel && (
          <div className="subedit">
            {face(sel, 'front', 'Front')}
            {face(sel, 'back', 'Back')}
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({ cards: props.cards.filter((c) => c.id !== sel.id) });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete card
            </button>
          </div>
        )}
      </Section>
      <Section title="Style">
        <Check
          label="Shuffle cards"
          checked={props.shuffle}
          onChange={(shuffle) => set({ shuffle })}
        />
        <div className="grid2">
          <Color
            label="Front colour"
            value={props.frontColor}
            fallback="#4f46e5"
            onChange={(frontColor) => set({ frontColor }, `fc-${el.id}`)}
          />
          <Color
            label="Back colour"
            value={props.backColor}
            fallback="#0f766e"
            onChange={(backColor) => set({ backColor }, `bc-${el.id}`)}
          />
          <Color
            label="Text colour"
            value={props.textColor}
            fallback="#ffffff"
            onChange={(textColor) => set({ textColor }, `tc-${el.id}`)}
          />
        </div>
      </Section>
    </>
  );
}
