import { h, rich } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import type { HotspotProps, HotspotState } from './type';

export const hotspotsPlayer: BlockPlayer<HotspotProps> = {
  type: 'hotspots',
  render(ctx: BlockContext<HotspotProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const { showFeedback, allowRetry } = ctx.settings;
    const find = props.mode === 'find';
    const saved = ctx.state as Partial<HotspotState> | null;
    const st: HotspotState = { seen: saved?.seen ?? [], pick: saved?.pick ?? null };
    const locked = () => find && st.pick !== null;

    const bg = resolveMedia(props.image);
    if (bg) root.append(h('img', { class: 'hs-img', src: bg, alt: '', draggable: 'false' }));
    else if (ctx.hints)
      root.append(
        h(
          'div',
          { class: 'ap-placeholder' },
          'Hotspots: choose an image in the Element panel to get started',
        ),
      );
    else if (props.hotspots.length === 0) return;
    if (props.markerColor) root.style.setProperty('--marker', props.markerColor);
    if (ctx.hints && bg && props.hotspots.length === 0)
      root.append(
        h(
          'div',
          { class: 'ap-hint-pill' },
          'Add hotspots: double-click the image while editing it on the canvas',
        ),
      );
    if (
      ctx.hints &&
      bg &&
      find &&
      props.hotspots.length > 0 &&
      !props.hotspots.some((x) => x.correct)
    )
      root.append(
        h('div', { class: 'ap-hint-pill' }, 'Mark at least one hotspot as the correct spot'),
      );

    const prompt = find ? h('div', { class: 'hs-prompt' }, props.prompt) : null;
    const live = h('div', { class: 'hs-live', 'aria-live': 'polite' });
    const retry = h('button', { class: 'ap-btn hs-retry', type: 'button' }, 'Try again');
    retry.hidden = true;
    const layer = h('div', { class: 'hs-layer' });
    root.append(layer);
    if (prompt) root.append(prompt);
    root.append(live, retry);
    let popup: HTMLElement | null = null;
    let opener: HTMLElement | null = null;

    const closePopup = (refocus: boolean) => {
      popup?.remove();
      popup = null;
      if (refocus) opener?.focus();
    };

    const markers = new Map<string, HTMLButtonElement>();
    props.hotspots.forEach((hs, i) => {
      const label = hs.label || `Hotspot ${i + 1}`;
      const b = h('button', { class: 'hs-marker', type: 'button', 'aria-label': label });
      b.style.left = `${hs.x}%`;
      b.style.top = `${hs.y}%`;
      b.append(h('span', { 'aria-hidden': 'true' }, find ? '' : '+'));
      if (editing) b.tabIndex = -1;
      if (st.seen.includes(hs.id)) b.classList.add('seen');
      markers.set(hs.id, b);
      layer.append(b);

      b.addEventListener('click', () => {
        if (editing || locked()) return;
        if (find) return choose(hs.id);
        closePopup(false);
        opener = b;
        if (!st.seen.includes(hs.id)) {
          st.seen.push(hs.id);
          b.classList.add('seen');
          ctx.setState(st);
        }
        const close = h(
          'button',
          { class: 'hs-close', type: 'button', 'aria-label': 'Close' },
          '×',
        );
        const img = hs.image ? resolveMedia(hs.image) : '';
        popup = h(
          'div',
          { class: 'hs-pop', role: 'dialog', 'aria-label': label },
          close,
          h('h3', {}, label),
          img ? h('img', { src: img, alt: '' }) : null,
          rich(hs.html),
        );
        popup.style.left = `${Math.min(Math.max(hs.x, 28), 72)}%`;
        if (hs.y > 55) popup.style.bottom = `calc(${100 - hs.y}% + 2.2em)`;
        else popup.style.top = `calc(${hs.y}% + 2.2em)`;
        popup.addEventListener('keydown', (e) => e.key === 'Escape' && closePopup(true));
        close.addEventListener('click', () => closePopup(true));
        root.append(popup);
        close.focus();
      });
    });

    function choose(id: string) {
      st.pick = id;
      ctx.setState(st);
      const ok = !!props.hotspots.find((x) => x.id === id)?.correct;
      ctx.report({ fraction: ok ? 1 : 0, done: true });
      reveal();
    }

    function reveal() {
      if (!find || st.pick === null) return;
      const ok = !!props.hotspots.find((x) => x.id === st.pick)?.correct;
      markers.forEach((m) => (m.disabled = true));
      if (showFeedback) {
        markers.get(st.pick)?.classList.add(ok ? 'ok' : 'bad');
        for (const hs of props.hotspots) if (hs.correct) markers.get(hs.id)?.classList.add('ok');
        live.textContent = ok ? 'Correct!' : 'Not quite. The correct spot is highlighted.';
        retry.hidden = !allowRetry;
      } else {
        live.textContent = 'Answer recorded.';
      }
    }

    retry.addEventListener('click', () => {
      st.pick = null;
      ctx.setState(st);
      ctx.report({ fraction: 0, done: false });
      markers.forEach((m) => {
        m.disabled = false;
        m.classList.remove('ok', 'bad');
      });
      live.textContent = '';
      retry.hidden = true;
    });
    if (!editing) reveal();
  },
};
