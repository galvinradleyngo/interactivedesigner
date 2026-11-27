import { RichText } from '../../app/components/RichText';
import { Color, Num, Section, Select } from '../../app/components/fields';
import type { PanelProps } from '../../app/editor/types';
import type { TextProps } from './type';

export function TextPanel({ props, el, onChange }: PanelProps<TextProps>) {
  const set = (p: Partial<TextProps>, key?: string) => onChange({ ...props, ...p }, key);
  return (
    <>
      <Section title="Text">
        <RichText
          label="Text"
          value={props.html}
          onChange={(html) => set({ html }, `html-${el.id}`)}
        />
        <p className="muted">Tip: double-click the text on the canvas to type directly.</p>
      </Section>
      <Section title="Style">
        <div className="grid2">
          <Num
            label="Font size"
            value={props.fontSize}
            min={8}
            max={200}
            onChange={(fontSize) => set({ fontSize }, `fs-${el.id}`)}
          />
          <Select
            label="Align"
            value={props.align}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centre' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(align) => set({ align })}
          />
          <Color
            label="Text colour"
            value={props.color}
            fallback="#1f2937"
            clearable
            onChange={(color) => set({ color }, `c-${el.id}`)}
          />
          <Color
            label="Background"
            value={props.fill}
            fallback="#ffffff"
            clearable
            onChange={(fill) => set({ fill }, `f-${el.id}`)}
          />
          <Num
            label="Padding"
            value={props.padding}
            min={0}
            max={80}
            onChange={(padding) => set({ padding }, `p-${el.id}`)}
          />
        </div>
      </Section>
    </>
  );
}
