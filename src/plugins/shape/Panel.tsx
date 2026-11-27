import { Color, Num, Section, Select } from '../../app/components/fields';
import type { PanelProps } from '../../app/editor/types';
import type { ShapeProps } from './type';

export function ShapePanel({ props, el, onChange }: PanelProps<ShapeProps>) {
  const set = (p: Partial<ShapeProps>, key?: string) => onChange({ ...props, ...p }, key);
  return (
    <Section title="Shape">
      <div className="grid2">
        <Select
          label="Shape"
          value={props.shape}
          options={[
            { value: 'rect', label: 'Rectangle' },
            { value: 'ellipse', label: 'Ellipse' },
          ]}
          onChange={(shape) => set({ shape })}
        />
        <Num
          label="Corner radius"
          value={props.radius}
          min={0}
          max={300}
          onChange={(radius) => set({ radius }, `r-${el.id}`)}
        />
        <Color
          label="Fill"
          value={props.fill}
          fallback="#e0e7ff"
          clearable
          onChange={(fill) => set({ fill }, `f-${el.id}`)}
        />
        <Num
          label="Opacity"
          value={Math.round(props.opacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => set({ opacity: v / 100 }, `o-${el.id}`)}
        />
        <Color
          label="Outline"
          value={props.stroke}
          fallback="#334155"
          clearable
          onChange={(stroke) =>
            set(
              { stroke, strokeWidth: stroke && !props.strokeWidth ? 3 : props.strokeWidth },
              `s-${el.id}`,
            )
          }
        />
        <Num
          label="Outline width"
          value={props.strokeWidth}
          min={0}
          max={40}
          onChange={(strokeWidth) => set({ strokeWidth }, `sw-${el.id}`)}
        />
      </div>
    </Section>
  );
}
