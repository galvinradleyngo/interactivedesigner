import { h, shuffled } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import type { CardFace, FlashProps } from './type';

interface FlashState {
  i: number;
  seed: number;
}

export const flashcardsPlayer: BlockPlayer<FlashProps> = {
  type: 'flashcards',
  render(ctx: BlockContext<FlashProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const cards = props.cards;
    const saved = ctx.state as Partial<FlashState> | null;
    const seed = typeof saved?.seed === 'number' ? saved.seed : Math.floor(Math.random() * 1e9);
    const order = props.shuffle
      ? shuffled(
          cards.map((_, i) => i),
          seed,
        )
      : cards.map((_, i) => i);
    let pos = Math.min(Math.max(saved?.i ?? 0, 0), Math.max(0, order.length - 1));
    let back = false;

    if (cards.length === 0) {
      root.append(
        h('div', { class: 'ap-placeholder' }, editing ? 'Flash cards: add cards in the panel' : ''),
      );
      return;
    }

    const card = h('button', { class: 'fc-card', type: 'button' });
    const counter = h('span', { class: 'fc-count', 'aria-live': 'polite' });
    const prev = h('button', { class: 'ap-btn', type: 'button' }, 'Previous');
    const next = h('button', { class: 'ap-btn', type: 'button' }, 'Next');
    const flip = h('p', { class: 'fc-hint' }, 'Select the card to flip it');
    if (editing) [card, prev, next].forEach((n) => (n.tabIndex = -1));
    root.append(card, h('div', { class: 'fc-nav' }, prev, counter, next), flip);

    const face = (f: CardFace) => {
      const img = f.image ? resolveMedia(f.image) : '';
      return [
        img ? h('img', { src: img, alt: '', draggable: 'false' }) : null,
        f.text ? h('span', { class: 'fc-text' }, f.text) : null,
      ];
    };

    function paint() {
      const c = cards[order[pos] ?? 0];
      if (!c) return;
      const f = back ? c.back : c.front;
      card.replaceChildren(...face(f).filter((n): n is HTMLElement => n !== null));
      card.style.background = back ? props.backColor : props.frontColor;
      card.style.color = props.textColor;
      card.dataset.side = back ? 'back' : 'front';
      card.setAttribute(
        'aria-label',
        `Card ${pos + 1} of ${order.length}, ${back ? 'back' : 'front'}: ${f.text || 'picture'}. Press to flip.`,
      );
      counter.textContent = `Card ${pos + 1} of ${order.length}`;
      prev.disabled = pos === 0;
      next.disabled = pos === order.length - 1;
    }

    card.addEventListener('click', () => {
      back = !back;
      paint();
    });
    const go = (d: number) => {
      pos = Math.min(Math.max(pos + d, 0), order.length - 1);
      back = false;
      ctx.setState({ i: pos, seed } satisfies FlashState);
      paint();
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    paint();
  },
};
