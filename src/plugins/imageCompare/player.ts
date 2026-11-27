import { h } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import type { CompareProps } from './type';

export const imageComparePlayer: BlockPlayer<CompareProps> = {
  type: 'imageCompare',
  render(ctx: BlockContext<CompareProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const before = resolveMedia(props.before);
    const after = resolveMedia(props.after);
    if (!before || !after) {
      if (editing)
        root.append(
          h(
            'div',
            { class: 'ap-placeholder' },
            'Image comparison: choose both images in the panel',
          ),
        );
      return;
    }
    const top = h('img', {
      class: 'ic-img ic-before',
      src: before,
      alt: props.labelBefore,
      draggable: 'false',
    });
    const bottom = h('img', {
      class: 'ic-img',
      src: after,
      alt: props.labelAfter,
      draggable: 'false',
    });
    const line = h(
      'div',
      { class: 'ic-line', 'aria-hidden': 'true' },
      h('span', { class: 'ic-handle' }, '↔'),
    );
    const range = h('input', {
      class: 'ic-range',
      type: 'range',
      min: '0',
      max: '100',
      step: '1',
      value: String(props.start),
      'aria-label': `Comparison slider: ${props.labelBefore} on the left, ${props.labelAfter} on the right`,
    });
    if (editing) range.tabIndex = -1;
    root.append(
      bottom,
      top,
      line,
      h('span', { class: 'ic-label ic-l1' }, props.labelBefore),
      h('span', { class: 'ic-label ic-l2' }, props.labelAfter),
      range,
    );
    const set = (v: number) => {
      top.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
      line.style.left = `${v}%`;
    };
    range.addEventListener('input', () => set(Number(range.value)));
    set(props.start);
  },
};
