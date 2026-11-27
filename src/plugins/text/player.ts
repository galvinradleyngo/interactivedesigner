import { rich } from '../../player/dom';
import type { BlockPlayer } from '../types';
import type { TextProps } from './type';

export const textPlayer: BlockPlayer<TextProps> = {
  type: 'text',
  render({ root, props }) {
    const body = rich(props.html, 'ap-text');
    body.style.fontSize = `calc(${props.fontSize} * var(--u))`;
    body.style.textAlign = props.align;
    body.style.padding = `calc(${props.padding} * var(--u))`;
    if (props.color) body.style.color = props.color;
    if (props.fill) body.style.background = props.fill;
    root.append(body);
  },
};
