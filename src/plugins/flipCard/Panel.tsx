import { Check, Color, Num, Section, Select, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import type { FlipCardProps, FlipFace } from './type';

export function FlipCardPanel({
  props,
  el,
  doc,
  onChange,
  addImage,
  peek,
  setPeek,
}: PanelProps<FlipCardProps>) {
  const set = (p: Partial<FlipCardProps>, key?: string) => onChange({ ...props, ...p }, key);
  const setFace = (side: 'front' | 'back', p: Partial<FlipFace>, key?: string) =>
    set({ [side]: { ...props[side], ...p } }, key);

  const faceEditor = (side: 'front' | 'back', title: string) => {
    const f = props[side];
    return (
      <Section title={title}>
        <Txt
          label="Text"
          value={f.text}
          multiline
          placeholder="Text on this side (optional)"
          onChange={(text) => setFace(side, { text }, `${side}t-${el.id}`)}
        />
        <ImagePicker
          label="Picture (optional)"
          value={f.image}
          media={doc.media}
          addImage={addImage}
          onChange={(image) => setFace(side, { image })}
        />
        {f.image && (
          <Select
            label="Picture layout"
            value={f.imageLayout}
            options={[
              { value: 'background', label: 'Fill the whole side (text on top)' },
              { value: 'top', label: 'Above the text' },
            ]}
            onChange={(imageLayout) => setFace(side, { imageLayout })}
          />
        )}
        <div className="grid2">
          <Color
            label="Colour"
            value={f.fill}
            fallback="#4f46e5"
            onChange={(fill) => setFace(side, { fill }, `${side}f-${el.id}`)}
          />
          <Color
            label="Text colour"
            value={f.textColor}
            fallback="#ffffff"
            onChange={(textColor) => setFace(side, { textColor }, `${side}c-${el.id}`)}
          />
          <Num
            label="Text size"
            value={f.fontSize}
            min={8}
            max={120}
            onChange={(fontSize) => setFace(side, { fontSize }, `${side}s-${el.id}`)}
          />
        </div>
      </Section>
    );
  };

  return (
    <>
      <Section title="Flip card">
        <Check
          label="Show the back on the canvas (editing aid)"
          checked={peek}
          onChange={setPeek}
        />
        <div className="grid2">
          <Select
            label="Shape"
            value={props.shape}
            options={[
              { value: 'rounded', label: 'Rounded' },
              { value: 'rect', label: 'Square corners' },
              { value: 'ellipse', label: 'Ellipse' },
            ]}
            onChange={(shape) => set({ shape })}
          />
          <Select
            label="Flips"
            value={props.direction}
            options={[
              { value: 'horizontal', label: 'Left to right' },
              { value: 'vertical', label: 'Top to bottom' },
            ]}
            onChange={(direction) => set({ direction })}
          />
          {props.shape === 'rounded' && (
            <Num
              label="Corner radius"
              value={props.radius}
              min={0}
              max={200}
              onChange={(radius) => set({ radius }, `r-${el.id}`)}
            />
          )}
        </div>
        <Check
          label="Click again to flip back"
          checked={props.flipBack}
          onChange={(flipBack) => set({ flipBack })}
        />
        <p className="muted">
          Copy and paste (Ctrl/Cmd+C, V) or duplicate this card to make a grid of them.
        </p>
      </Section>
      {faceEditor('front', 'Front')}
      {faceEditor('back', 'Back')}
    </>
  );
}
