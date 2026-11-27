import { h } from '../../player/dom';
import type { BlockPlayer } from '../types';
import type { ButtonProps } from './type';

export const buttonPlayer: BlockPlayer<ButtonProps> = {
  type: 'button',
  render({ root, props, goto, editing }) {
    const b = h(
      'button',
      { class: 'ap-btn ap-fillbtn', type: 'button', 'data-edit': 'label' },
      props.label,
    );
    b.style.fontSize = `calc(${props.fontSize} * var(--u))`;
    b.style.color = props.color;
    b.style.borderRadius = `calc(${props.radius} * var(--u))`;
    if (props.fill) b.style.background = props.fill;
    if (editing) b.tabIndex = -1;
    b.addEventListener('click', () => {
      if (props.action === 'next') goto('next');
      else if (props.action === 'prev') goto('prev');
      else if (props.action === 'page') goto(Math.max(0, Math.floor(props.page) - 1));
    });
    root.append(b);
  },
};
