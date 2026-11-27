import { Color, Num, Section, Select, Txt } from '../../app/components/fields';
import type { PanelProps } from '../../app/editor/types';
import type { ButtonProps } from './type';

export function ButtonPanel({ props, el, doc, onChange }: PanelProps<ButtonProps>) {
  const set = (p: Partial<ButtonProps>, key?: string) => onChange({ ...props, ...p }, key);
  return (
    <Section title="Button">
      <Txt label="Label" value={props.label} onChange={(label) => set({ label }, `l-${el.id}`)} />
      <Select
        label="When clicked"
        value={props.action}
        options={[
          { value: 'next', label: 'Go to next page' },
          { value: 'prev', label: 'Go to previous page' },
          { value: 'page', label: 'Go to a specific page' },
          { value: 'none', label: 'Do nothing' },
        ]}
        onChange={(action) => set({ action })}
      />
      {props.action === 'page' && (
        <Num
          label="Page number"
          value={props.page}
          min={1}
          max={doc.pages.length}
          onChange={(page) => set({ page })}
        />
      )}
      <div className="grid2">
        <Color
          label="Colour"
          value={props.fill}
          fallback="#4f46e5"
          clearable
          onChange={(fill) => set({ fill }, `f-${el.id}`)}
        />
        <Color
          label="Text colour"
          value={props.color}
          fallback="#ffffff"
          onChange={(color) => set({ color }, `c-${el.id}`)}
        />
        <Num
          label="Font size"
          value={props.fontSize}
          min={8}
          max={120}
          onChange={(fontSize) => set({ fontSize }, `fs-${el.id}`)}
        />
        <Num
          label="Corner radius"
          value={props.radius}
          min={0}
          max={100}
          onChange={(radius) => set({ radius }, `r-${el.id}`)}
        />
      </div>
    </Section>
  );
}
