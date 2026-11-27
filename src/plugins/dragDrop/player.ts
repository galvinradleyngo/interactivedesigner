import { h } from '../../player/dom';
import type { BlockContext, BlockPlayer } from '../types';
import { ddFraction, type DdItem, type DdProps, type DdState } from './type';

export const dragDropPlayer: BlockPlayer<DdProps> = {
  type: 'dragDrop',
  render(ctx: BlockContext<DdProps>) {
    const { props, root, editing, resolveMedia } = ctx;
    const { showFeedback, allowRetry } = ctx.settings;
    const saved = ctx.state as Partial<DdState> | null;
    const st: DdState = { place: { ...(saved?.place ?? {}) }, checked: !!saved?.checked };
    let picked: string | null = null;

    root.style.background = props.bgColor || '';
    if (ctx.hints && props.zones.length === 0 && props.items.length === 0)
      root.append(
        h(
          'div',
          { class: 'ap-placeholder' },
          'Drag and drop: add drop zones and items in the Element panel',
        ),
      );
    else if (ctx.hints && !props.items.some((i) => i.zone))
      root.append(h('div', { class: 'ap-hint-pill' }, 'Set which zone each item belongs in'));
    const bg = resolveMedia(props.background);
    if (bg) root.append(h('img', { class: 'dd-bg', src: bg, alt: '', draggable: 'false' }));

    const live = h('div', { class: 'dd-live', 'aria-live': 'polite' });
    const hint = h(
      'p',
      { class: 'ap-sr' },
      'Pick up an item with Enter or Space, then choose a zone and press Enter to drop it. Or drag it with the mouse or touch.',
    );
    hint.id = `${ctx.el.id}-hint`;
    const check = h(
      'button',
      { class: 'ap-btn dd-check', type: 'button' },
      showFeedback ? 'Check' : 'Submit',
    );
    const retry = h('button', { class: 'ap-btn dd-retry', type: 'button' }, 'Try again');
    const actions = h('div', { class: 'dd-actions' }, live, retry, check);
    root.append(hint);

    const zoneEls = new Map<string, { box: HTMLElement; slot: HTMLElement }>();
    for (const z of props.zones) {
      const slot = h('div', { class: 'dd-slot' });
      const box = h(
        'div',
        {
          class: 'dd-zone',
          role: 'group',
          'aria-label': `Zone: ${z.label || 'unnamed'}`,
          tabindex: editing ? '-1' : '0',
        },
        h('div', { class: 'dd-zlabel' }, z.label),
        slot,
      );
      box.style.left = `${z.x}%`;
      box.style.top = `${z.y}%`;
      box.style.width = `${z.w}%`;
      box.style.height = `${z.h}%`;
      zoneEls.set(z.id, { box, slot });
      root.append(box);
      box.addEventListener('click', () => dropInto(z.id));
      box.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === box) {
          e.preventDefault();
          dropInto(z.id);
        }
      });
    }

    const itemEls = new Map<string, HTMLButtonElement>();
    for (const it of props.items) {
      const label = it.label || 'Item';
      const b = h('button', {
        class: 'dd-item',
        type: 'button',
        'aria-describedby': hint.id,
        'aria-pressed': 'false',
      });
      const img = it.image ? resolveMedia(it.image) : '';
      if (img) b.append(h('img', { src: img, alt: '', draggable: 'false' }));
      if (it.label || !img) b.append(h('span', {}, label));
      if (!img) b.setAttribute('aria-label', label);
      if (editing) b.tabIndex = -1;
      itemEls.set(it.id, b);
      root.append(b);
      if (!editing) wireDrag(it, b);
    }
    root.append(actions);

    const home = (it: DdItem, b: HTMLElement) => {
      b.classList.remove('placed', 'dragging');
      b.style.position = '';
      b.style.left = `${it.x}%`;
      b.style.top = `${it.y}%`;
      b.style.width = `${it.w}%`;
      b.style.height = `${it.h}%`;
      b.style.zIndex = '';
    };
    /** Graded: "2 of 3 placed correctly". Ungraded: plain-language feedback with no tally. */
    const resultText = (): string => {
      const total = props.items.filter((i) => i.zone).length;
      const right = props.items.filter((i) => i.zone && st.place[i.id] === i.zone).length;
      if (ctx.graded) return `${right} of ${total} placed correctly.`;
      const wrong = props.items.some((i) => st.place[i.id] && st.place[i.id] !== i.zone);
      return right === total && !wrong
        ? 'All placed correctly.'
        : 'Some items are not in the right zone yet.';
    };
    const count = (zoneId: string) => Object.values(st.place).filter((z) => z === zoneId).length;
    const zoneOf = (id: string) => props.zones.find((z) => z.id === id);

    function layout() {
      for (const it of props.items) {
        const b = itemEls.get(it.id);
        if (!b) continue;
        const z = st.place[it.id];
        const target = z ? zoneEls.get(z) : undefined;
        if (target) {
          b.classList.remove('dragging');
          b.classList.add('placed');
          b.removeAttribute('style');
          target.slot.append(b);
        } else {
          root.append(b);
          home(it, b);
        }
        b.classList.toggle('picked', picked === it.id);
        b.setAttribute('aria-pressed', String(picked === it.id));
        b.classList.remove('ok', 'bad');
        if (st.checked && showFeedback && z) b.classList.add(it.zone === z ? 'ok' : 'bad');
        b.disabled = st.checked;
      }
      root.append(actions);
      check.hidden = st.checked;
      check.disabled = Object.keys(st.place).length === 0;
      retry.hidden = !(st.checked && showFeedback && allowRetry);
    }

    function place(itemId: string, zoneId: string | null) {
      if (zoneId) {
        const z = zoneOf(zoneId);
        if (!z) return;
        if (st.place[itemId] !== zoneId && z.capacity > 0 && count(zoneId) >= z.capacity) {
          live.textContent = `${z.label || 'That zone'} is full.`;
          return;
        }
        st.place[itemId] = zoneId;
        live.textContent = `Placed ${props.items.find((i) => i.id === itemId)?.label ?? 'item'} in ${z.label || 'zone'}.`;
      } else {
        delete st.place[itemId];
      }
      picked = null;
      ctx.setState(st);
      layout();
    }

    function dropInto(zoneId: string) {
      if (editing || st.checked || !picked) return;
      place(picked, zoneId);
    }

    function wireDrag(it: DdItem, b: HTMLButtonElement) {
      let drag: { sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
      b.addEventListener('pointerdown', (e) => {
        if (st.checked || e.button !== 0) return;
        const r = b.getBoundingClientRect();
        drag = {
          sx: e.clientX,
          sy: e.clientY,
          ox: e.clientX - r.left,
          oy: e.clientY - r.top,
          moved: false,
        };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener('pointermove', (e) => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
        const rootR = root.getBoundingClientRect();
        if (!drag.moved) {
          const r = b.getBoundingClientRect();
          drag.moved = true;
          root.append(b);
          b.classList.remove('placed');
          b.classList.add('dragging');
          b.style.width = `${r.width}px`;
          b.style.height = `${r.height}px`;
          b.style.zIndex = '20';
        }
        b.style.position = 'absolute';
        b.style.left = `${e.clientX - rootR.left - drag.ox}px`;
        b.style.top = `${e.clientY - rootR.top - drag.oy}px`;
      });
      const finish = (e: PointerEvent) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
        if (!d.moved) return;
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let hit: string | null = null;
        for (const [id, z] of zoneEls) {
          const zr = z.box.getBoundingClientRect();
          if (cx >= zr.left && cx <= zr.right && cy >= zr.top && cy <= zr.bottom) hit = id;
        }
        const wasPlaced = st.place[it.id];
        // Dropped on a full zone keeps the item where it was; dropped nowhere sends it home.
        if (hit) {
          const z = zoneOf(hit);
          if (z && st.place[it.id] !== hit && z.capacity > 0 && count(hit) >= z.capacity) {
            live.textContent = `${z.label || 'That zone'} is full.`;
            if (wasPlaced) place(it.id, wasPlaced);
            else place(it.id, null);
            return;
          }
        }
        place(it.id, hit);
      };
      b.addEventListener('pointerup', finish);
      b.addEventListener('pointercancel', finish);
      b.addEventListener('click', () => {
        if (st.checked) return;
        picked = picked === it.id ? null : it.id;
        layout();
      });
    }

    check.addEventListener('click', () => {
      st.checked = true;
      picked = null;
      ctx.setState(st);
      const frac = ddFraction(props, st.place);
      ctx.report({ fraction: frac, done: true });
      const total = props.items.filter((i) => i.zone).length;
      const right = props.items.filter((i) => i.zone && st.place[i.id] === i.zone).length;
      live.textContent = showFeedback
        ? `${right} of ${total} placed correctly.`
        : 'Answer recorded.';
      layout();
    });
    retry.addEventListener('click', () => {
      st.place = {};
      st.checked = false;
      ctx.setState(st);
      ctx.report({ fraction: 0, done: false });
      live.textContent = '';
      layout();
    });
    layout();
    if (st.checked && showFeedback) live.textContent = resultText();
  },
};
