import { Num, Section, Select, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import type { ImageProps } from './type';

export function ImagePanel({
  props,
  el,
  doc,
  onChange,
  patchEl,
  addImage,
}: PanelProps<ImageProps>) {
  const set = (p: Partial<ImageProps>, key?: string) => onChange({ ...props, ...p }, key);
  return (
    <Section title="Image">
      <ImagePicker
        label="Picture"
        value={props.src}
        media={doc.media}
        addImage={addImage}
        onChange={(src) => set({ src: src ?? '' })}
        onAspect={(r) => patchEl({ h: Math.max(20, Math.round(el.w / r)) })}
      />
      <Txt
        label="Alt text (for screen readers)"
        value={props.alt}
        onChange={(alt) => set({ alt }, `alt-${el.id}`)}
        placeholder="Describe the picture"
      />
      <div className="grid2">
        <Select
          label="Fit"
          value={props.fit}
          options={[
            { value: 'cover', label: 'Fill (crop)' },
            { value: 'contain', label: 'Fit inside' },
            { value: 'fill', label: 'Stretch' },
          ]}
          onChange={(fit) => set({ fit })}
        />
        <Num
          label="Corner radius"
          value={props.radius}
          min={0}
          max={200}
          onChange={(radius) => set({ radius }, `r-${el.id}`)}
        />
        <Num
          label="Opacity"
          value={Math.round(props.opacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => set({ opacity: v / 100 }, `o-${el.id}`)}
        />
      </div>
    </Section>
  );
}
