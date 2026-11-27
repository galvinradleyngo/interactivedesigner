import { h } from '../../player/dom';
import type { BlockPlayer } from '../types';
import type { ShapeProps } from './type';

export const shapePlayer: BlockPlayer<ShapeProps> = {
  type: 'shape',
  render({ root, props }) {
    const s = h('div', { class: 'ap-shape', 'aria-hidden': 'true' });
    s.style.background = props.fill || 'transparent';
    s.style.opacity = String(props.opacity);
    s.style.borderRadius = props.shape === 'ellipse' ? '50%' : `calc(${props.radius} * var(--u))`;
    if (props.stroke && props.strokeWidth > 0)
      s.style.border = `calc(${props.strokeWidth} * var(--u)) solid ${props.stroke}`;
    root.append(s);
  },
};
