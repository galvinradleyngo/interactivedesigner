import { h } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import type { FlipCardProps, FlipFace } from './type';

export const flipCardPlayer: BlockPlayer<FlipCardProps> = {
  type: 'flipCard',
  render(ctx: BlockContext<FlipCardProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const saved = ctx.state as { flipped?: boolean } | null;
    // The editor can "peek" at the back without changing anything.
    const peek = editing && (ctx.props as unknown as { _peek?: boolean })._peek === true;
    let flipped = peek || saved?.flipped === true;

    const radius =
      props.shape === 'ellipse'
        ? '50%'
        : props.shape === 'rect'
          ? '0'
          : `calc(${props.radius} * var(--u))`;

    const makeFace = (f: FlipFace, cls: string): HTMLElement => {
      const el = h('div', { class: `fx-face ${cls}` });
      el.style.background = f.fill;
      el.style.color = f.textColor;
      el.style.borderRadius = radius;
      const img = f.image ? resolveMedia(f.image) : '';
      if (img && f.imageLayout === 'background') {
        el.style.backgroundImage = `url("${img}")`;
        el.classList.add('fx-bg');
      } else if (img) {
        el.append(h('img', { class: 'fx-img', src: img, alt: '', draggable: 'false' }));
      }
      if (f.text) {
        const t = h('span', { class: 'fx-text' }, f.text);
        t.style.fontSize = `calc(${f.fontSize} * var(--u))`;
        el.append(t);
      }
      return el;
    };

    const btn = h('button', { class: `fx-card fx-${props.direction}`, type: 'button' });
    const inner = h('div', { class: 'fx-inner' });
    const front = makeFace(props.front, 'fx-front');
    const back = makeFace(props.back, 'fx-back');
    inner.append(front, back);
    btn.append(inner);
    root.append(btn);
    if (editing) btn.tabIndex = -1;

    const describe = (f: FlipFace) => f.text || 'picture';
    const paint = (animate: boolean) => {
      inner.classList.toggle('no-anim', !animate);
      btn.dataset.flipped = String(flipped);
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      btn.setAttribute('aria-pressed', String(flipped));
      btn.setAttribute(
        'aria-label',
        flipped
          ? `Back: ${describe(props.back)}.${props.flipBack ? ' Press to flip back.' : ''}`
          : `Front: ${describe(props.front)}. Press to flip.`,
      );
    };
    paint(false);

    btn.addEventListener('click', () => {
      if (editing) return;
      if (flipped && !props.flipBack) return;
      flipped = !flipped;
      ctx.setState({ flipped });
      paint(true);
    });
  },
};
