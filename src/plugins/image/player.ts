import { h } from '../../player/dom';
import type { BlockPlayer } from '../types';
import type { ImageProps } from './type';

export const imagePlayer: BlockPlayer<ImageProps> = {
  type: 'image',
  render({ root, props, resolveMedia, editing }) {
    const src = resolveMedia(props.src);
    if (!src) {
      if (editing) root.append(h('div', { class: 'ap-placeholder' }, 'Image: choose a file in the panel'));
      return;
    }
    const img = h('img', { class: 'ap-img', src, alt: props.alt, draggable: 'false' });
    img.style.objectFit = props.fit;
    img.style.opacity = String(props.opacity);
    img.style.borderRadius = `calc(${props.radius} * var(--u))`;
    root.append(img);
  },
};
