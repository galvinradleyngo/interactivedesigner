import { h, rich } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import type { TimelineProps } from './type';

export const timelinePlayer: BlockPlayer<TimelineProps> = {
  type: 'timeline',
  render(ctx: BlockContext<TimelineProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const events = props.events;
    const vertical = props.orientation === 'vertical';
    root.classList.add(vertical ? 'tl-vertical' : 'tl-horizontal');
    if (props.color) root.style.setProperty('--tl', props.color);

    if (events.length === 0) {
      if (ctx.hints)
        root.append(
          h('div', { class: 'ap-placeholder' }, 'Timeline: add events in the Element panel'),
        );
      return;
    }
    const saved = ctx.state as { i?: number } | null;
    let sel = Math.min(Math.max(saved?.i ?? 0, 0), events.length - 1);

    const list = h('div', {
      class: 'tl-track',
      role: 'tablist',
      'aria-label': 'Timeline events',
      'aria-orientation': vertical ? 'vertical' : 'horizontal',
    });
    const panel = h('div', { class: 'tl-panel', role: 'tabpanel', 'aria-live': 'polite' });
    const tabs: HTMLButtonElement[] = [];
    const uid = ctx.el.id;

    events.forEach((ev, i) => {
      const tab = h('button', {
        class: 'tl-tab',
        type: 'button',
        role: 'tab',
        id: `${uid}-t${i}`,
        'aria-controls': `${uid}-p`,
      });
      tab.append(
        h('span', { class: 'tl-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'tl-date' }, ev.date),
        h('span', { class: 'tl-name' }, ev.title),
      );
      if (editing) tab.tabIndex = -1;
      tab.addEventListener('click', () => !editing && select(i, true));
      tab.addEventListener('keydown', (e) => {
        const next = vertical ? 'ArrowDown' : 'ArrowRight';
        const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
        const to =
          e.key === next
            ? i + 1
            : e.key === prev
              ? i - 1
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? events.length - 1
                  : -1;
        if (to >= 0 && to < events.length) {
          e.preventDefault();
          select(to, true);
          tabs[to]?.focus();
        }
      });
      tabs.push(tab);
      list.append(tab);
    });
    panel.id = `${uid}-p`;

    const prev = h('button', { class: 'ap-btn tl-btn', type: 'button' }, 'Previous');
    const next = h('button', { class: 'ap-btn tl-btn', type: 'button' }, 'Next');
    if (editing) [prev, next].forEach((b) => (b.tabIndex = -1));
    prev.addEventListener('click', () => select(sel - 1, true));
    next.addEventListener('click', () => select(sel + 1, true));
    const nav = h('div', { class: 'tl-nav' }, prev, next);

    function select(i: number, persist: boolean) {
      sel = Math.min(Math.max(i, 0), events.length - 1);
      const ev = events[sel];
      if (!ev) return;
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === sel));
        t.tabIndex = editing ? -1 : k === sel ? 0 : -1;
        t.classList.toggle('on', k === sel);
        t.classList.toggle('past', k < sel);
      });
      panel.setAttribute('aria-labelledby', `${uid}-t${sel}`);
      const img = ev.image ? resolveMedia(ev.image) : '';
      panel.replaceChildren(
        ...(img ? [h('img', { class: 'tl-img', src: img, alt: '', draggable: 'false' })] : []),
        h(
          'div',
          { class: 'tl-body' },
          h('p', { class: 'tl-when' }, ev.date),
          h('h3', {}, ev.title),
          rich(ev.html),
        ),
      );
      panel.classList.remove('tl-enter');
      void panel.offsetWidth; // restart the entrance animation
      panel.classList.add('tl-enter');
      prev.disabled = sel === 0;
      next.disabled = sel === events.length - 1;
      if (persist) ctx.setState({ i: sel });
    }

    if (vertical) {
      const side = h('div', { class: 'tl-side' }, list, nav);
      root.append(side, panel);
    } else {
      root.append(list, panel, nav);
    }
    select(sel, false);
  },
};
