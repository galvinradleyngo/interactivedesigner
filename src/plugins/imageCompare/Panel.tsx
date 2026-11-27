import { Num, Section, Txt } from '../../app/components/fields';
import { ImagePicker } from '../../app/components/ImagePicker';
import type { PanelProps } from '../../app/editor/types';
import type { CompareProps } from './type';

export function ImageComparePanel({
  props,
  el,
  doc,
  onChange,
  patchEl,
  addImage,
}: PanelProps<CompareProps>) {
  const set = (p: Partial<CompareProps>, key?: string) => onChange({ ...props, ...p }, key);
  return (
    <Section title="Images">
      <ImagePicker
        label="Left image"
        value={props.before}
        media={doc.media}
        addImage={addImage}
        onChange={(before) => set({ before })}
        onAspect={(r) => patchEl({ h: Math.max(60, Math.round(el.w / r)) })}
      />
      <Txt
        label="Left label"
        value={props.labelBefore}
        onChange={(labelBefore) => set({ labelBefore }, `lb-${el.id}`)}
      />
      <ImagePicker
        label="Right image"
        value={props.after}
        media={doc.media}
        addImage={addImage}
        onChange={(after) => set({ after })}
      />
      <Txt
        label="Right label"
        value={props.labelAfter}
        onChange={(labelAfter) => set({ labelAfter }, `la-${el.id}`)}
      />
      <Num
        label="Starting slider position"
        value={props.start}
        min={0}
        max={100}
        suffix="%"
        onChange={(start) => set({ start }, `st-${el.id}`)}
      />
      <p className="muted">
        Use two images of the same size for the best result. Drag the slider in the preview to try
        it.
      </p>
    </Section>
  );
}
