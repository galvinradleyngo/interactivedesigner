import { h, shuffled } from '../../player/dom';
import { sanitizeHtml } from '../../schema/html';
import { percent } from '../../schema/types';
import type { PlayerContext, PlayerPlugin } from '../types';
import { scoreMultipleChoice, scoreQuestion } from './score';
import type { McContent, McQuestion } from './type';

interface Saved {
  i: number;
  a: number[][];
  c: number[];
  s: number;
  done: boolean;
}

function valid(x: unknown, n: number): x is Saved {
  const s = x as Saved | null;
  return (
    !!s && typeof s.i === 'number' && Array.isArray(s.a) && Array.isArray(s.c) && s.a.length === n
  );
}

function richBlock(html: string, cls: string): HTMLElement {
  const d = h('div', { class: cls });
  d.innerHTML = sanitizeHtml(html);
  return d;
}

export const multipleChoicePlayer: PlayerPlugin<McContent> = {
  type: 'multipleChoice',
  render(ctx: PlayerContext<McContent>) {
    const { content } = ctx.doc;
    const { showFeedback, allowRetry, passingScore } = ctx.doc.settings;
    const qs = content.questions;
    const fresh = (): Saved => ({
      i: 0,
      a: qs.map(() => []),
      c: [],
      s: Math.floor(Math.random() * 1e9),
      done: false,
    });
    let st: Saved = valid(ctx.restored, qs.length) ? (ctx.restored as Saved) : fresh();
    const checked = new Set<number>(st.c);
    const root = ctx.root;
    let firstRender = true;

    const persist = () => {
      st.c = [...checked];
      ctx.saveProgress(st);
    };

    const order = (q: McQuestion, qi: number): number[] => {
      const idx = q.options.map((_, i) => i);
      return q.shuffle ? shuffled(idx, st.s + qi * 101) : idx;
    };

    function results() {
      const score = scoreMultipleChoice(content, st.a);
      const pct = percent(score);
      const passed = pct >= passingScore;
      root.replaceChildren(
        h(
          'main',
          { class: 'ap-card', 'aria-live': 'polite' },
          h('h1', { class: 'ap-title', tabindex: '-1' }, 'Results'),
          h('p', { class: 'ap-score' }, `You scored ${pct}%`),
          h(
            'p',
            { class: passed ? 'ap-pass' : 'ap-fail' },
            passed ? 'Passed' : `Passing score is ${passingScore}%`,
          ),
          ...(allowRetry
            ? [
                (() => {
                  const b = h('button', { class: 'ap-btn', type: 'button' }, 'Try again');
                  b.addEventListener('click', () => {
                    st = fresh();
                    checked.clear();
                    ctx.reset();
                    persist();
                    question();
                  });
                  return b;
                })(),
              ]
            : []),
        ),
      );
      if (!firstRender) (root.querySelector('.ap-title') as HTMLElement | null)?.focus();
    }

    function question() {
      if (st.done) return results();
      const qi = st.i;
      const q = qs[qi];
      if (!q) {
        st.done = true;
        persist();
        ctx.finish(scoreMultipleChoice(content, st.a));
        return results();
      }
      const type = q.multi ? 'checkbox' : 'radio';
      const name = `q${qi}`;
      const isChecked = checked.has(qi) && showFeedback;
      const fs = h('fieldset', { class: 'ap-fieldset' });
      const legend = h('legend', { class: 'ap-legend', tabindex: '-1' });
      legend.append(richBlock(q.text, 'ap-rich'));
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
      const next = h(
        'button',
        { class: 'ap-btn', type: 'button' },
        qi === qs.length - 1 ? 'Finish' : 'Next',
      );
      const check = h('button', { class: 'ap-btn', type: 'button' }, 'Check answer');

      const showResult = () => {
        const sel = selected();
        const frac = scoreQuestion(q, sel);
        for (const l of Array.from(fs.querySelectorAll<HTMLElement>('.ap-option'))) {
          const o = q.options[Number(l.dataset.index)];
          const on = sel.includes(Number(l.dataset.index));
          l.classList.toggle('ap-correct', !!o?.correct && (on || q.multi));
          l.classList.toggle('ap-wrong', on && !o?.correct);
        }
        const verdict = frac === 1 ? 'Correct!' : frac > 0 ? 'Partly correct.' : 'Not quite.';
        feedback.replaceChildren(h('strong', {}, verdict));
        for (const i of sel) {
          const fb = q.options[i]?.feedback;
          if (fb) feedback.append(h('p', {}, fb));
        }
        inputs.forEach((i) => (i.disabled = true));
        check.hidden = true;
        next.hidden = false;
        next.focus();
      };

      const advance = () => {
        st.a[qi] = selected();
        st.i = qi + 1;
        persist();
        question();
      };

      next.addEventListener('click', advance);
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
      if (showFeedback) {
        actions.append(check, next);
        next.hidden = true;
      } else {
        actions.append(next);
      }

      root.replaceChildren(
        h(
          'main',
          { class: 'ap-card' },
          ...(qi === 0 && content.intro ? [richBlock(content.intro, 'ap-rich ap-intro')] : []),
          h('p', { class: 'ap-progress' }, `Question ${qi + 1} of ${qs.length}`),
          fs,
          feedback,
          actions,
        ),
      );
      if (isChecked) {
        check.hidden = true;
        inputs.forEach((i) => (i.disabled = false));
        showResult();
      }
      // Move focus for keyboard/screen-reader users, but not on initial load.
      if (!firstRender) legend.focus();
      firstRender = false;
    }

    question();
  },
};
