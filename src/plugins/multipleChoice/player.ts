import { h, rich, shuffled } from '../../player/dom';
import { percent } from '../../schema/types';
import type { BlockContext, BlockPlayer } from '../types';
import { scoreMultipleChoice, scoreQuestion } from './score';
import type { McProps, McQuestion, McState } from './type';

function valid(x: unknown, n: number): x is McState {
  const s = x as McState | null;
  return !!s && typeof s.i === 'number' && Array.isArray(s.a) && Array.isArray(s.c) && s.a.length === n;
}

export const multipleChoicePlayer: BlockPlayer<McProps> = {
  type: 'multipleChoice',
  render(ctx: BlockContext<McProps>) {
    const { props: content, root, editing } = ctx;
    const { showFeedback, allowRetry } = ctx.settings;
    const qs = content.questions;
    const fresh = (): McState => ({ i: 0, a: qs.map(() => []), c: [], s: Math.floor(Math.random() * 1e9), done: false });
    let st: McState = valid(ctx.state, qs.length) ? (ctx.state as McState) : fresh();
    const checked = new Set<number>(st.c);
    let firstRender = true;

    const persist = () => {
      st.c = [...checked];
      ctx.setState(st);
    };
    const order = (q: McQuestion, qi: number): number[] => {
      const idx = q.options.map((_, i) => i);
      return q.shuffle ? shuffled(idx, st.s + qi * 101) : idx;
    };
    const card = (...kids: (Node | null | false)[]) => {
      const c = h('div', { class: 'ap-mc' }, ...kids);
      root.replaceChildren(c);
      return c;
    };

    function results() {
      const score = scoreMultipleChoice(content, st.a);
      const title = h('h2', { class: 'ap-title', tabindex: '-1' }, 'Results');
      card(
        title,
        h('p', { class: 'ap-score' }, `You scored ${percent(score)}%`),
        allowRetry
          ? (() => {
              const b = h('button', { class: 'ap-btn', type: 'button' }, 'Try again');
              b.addEventListener('click', () => {
                st = fresh();
                checked.clear();
                persist();
                ctx.report({ fraction: 0, done: false });
                question();
              });
              return b;
            })()
          : null,
      );
      if (!firstRender) title.focus();
      firstRender = false;
    }

    function question() {
      if (st.done) return results();
      const qi = st.i;
      const q = qs[qi];
      if (!q) {
        st.done = true;
        persist();
        ctx.report({ fraction: scoreMultipleChoice(content, st.a).raw / 100, done: true });
        return results();
      }
      const type = q.multi ? 'checkbox' : 'radio';
      const name = `${ctx.el.id}-q${qi}`;
      const fs = h('fieldset', { class: 'ap-fieldset' });
      const legend = h('legend', { class: 'ap-legend', tabindex: '-1' });
      legend.append(rich(q.text));
      if (q.multi) legend.append(h('span', { class: 'ap-hint' }, 'Select all that apply.'));
      fs.append(legend);

      const feedback = h('div', { class: 'ap-feedback', 'aria-live': 'polite' });
      const inputs: HTMLInputElement[] = [];
      for (const oi of order(q, qi)) {
        const o = q.options[oi];
        if (!o) continue;
        const id = `${name}-${oi}`;
        const input = h('input', { type, name, id, value: String(oi) });
        input.checked = (st.a[qi] ?? []).includes(oi);
        inputs.push(input);
        const label = h('label', { class: 'ap-option', for: id }, input, h('span', {}, o.text));
        label.dataset.index = String(oi);
        fs.append(label);
      }

      const selected = () => inputs.filter((i) => i.checked).map((i) => Number(i.value));
      const next = h('button', { class: 'ap-btn', type: 'button' }, qi === qs.length - 1 ? 'Finish' : 'Next');
      const check = h('button', { class: 'ap-btn', type: 'button' }, 'Check answer');

      const showResult = () => {
        const sel = selected();
        const frac = scoreQuestion(q, sel);
        for (const l of Array.from(fs.querySelectorAll<HTMLElement>('.ap-option'))) {
          const idx = Number(l.dataset.index);
          const o = q.options[idx];
          const on = sel.includes(idx);
          l.classList.toggle('ap-correct', !!o?.correct && (on || q.multi));
          l.classList.toggle('ap-wrong', on && !o?.correct);
        }
        feedback.replaceChildren(h('strong', {}, frac === 1 ? 'Correct!' : frac > 0 ? 'Partly correct.' : 'Not quite.'));
        for (const i of sel) {
          const fb = q.options[i]?.feedback;
          if (fb) feedback.append(h('p', {}, fb));
        }
        inputs.forEach((i) => (i.disabled = true));
        check.hidden = true;
        next.hidden = false;
        if (!firstRender) next.focus();
      };

      next.addEventListener('click', () => {
        st.a[qi] = selected();
        st.i = qi + 1;
        persist();
        question();
      });
      check.addEventListener('click', () => {
        if (selected().length === 0) {
          feedback.textContent = 'Select an answer first.';
          return;
        }
        st.a[qi] = selected();
        checked.add(qi);
        persist();
        showResult();
      });
      inputs.forEach((i) =>
        i.addEventListener('change', () => {
          st.a[qi] = selected();
          persist();
        }),
      );

      const actions = h('div', { class: 'ap-actions' });
      if (showFeedback && !editing) {
        actions.append(check, next);
        next.hidden = true;
      } else {
        actions.append(next);
      }

      card(
        qi === 0 && content.intro ? rich(content.intro, 'ap-rich ap-intro') : null,
        h('p', { class: 'ap-progress' }, `Question ${qi + 1} of ${qs.length}`),
        fs,
        feedback,
        actions,
      );
      if (checked.has(qi) && showFeedback) {
        check.hidden = true;
        showResult();
      }
      if (!firstRender) legend.focus();
      firstRender = false;
    }

    question();
  },
};
