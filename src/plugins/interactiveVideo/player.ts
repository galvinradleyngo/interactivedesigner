import { h, rich } from '../../player/dom';
import { stripHtml } from '../../schema/html';
import type { BlockContext, BlockPlayer } from '../types';
import { getVideoEngine, type PlayState, type VideoPlayer } from './engine';
import { gate } from './gate';
import {
  checkpointScore,
  gradableQuestions,
  parseYouTubeId,
  sortedCheckpoints,
  videoFraction,
  type InteractiveVideoProps,
  type VideoCheckpoint,
  type VideoState,
} from './type';

export const interactiveVideoPlayer: BlockPlayer<InteractiveVideoProps> = {
  type: 'interactiveVideo',
  render(ctx: BlockContext<InteractiveVideoProps>) {
    const { props, root, editing } = ctx;
    const videoId = parseYouTubeId(props.url);
    const cps = sortedCheckpoints(props.checkpoints);
    root.classList.add('iv');

    // Editor canvas (no network) and unfinished blocks: a static placeholder.
    if (editing || !videoId) {
      if (!editing && !ctx.hints) return;
      root.append(
        h(
          'div',
          { class: 'iv-placeholder' },
          h('span', { class: 'iv-play', 'aria-hidden': 'true' }, '▶'),
          h('strong', {}, 'Interactive video'),
          h(
            'span',
            {},
            videoId
              ? `${cps.length} ${cps.length === 1 ? 'checkpoint' : 'checkpoints'} · plays from YouTube when previewed or exported`
              : 'Paste a YouTube link in the Element panel to get started',
          ),
        ),
      );
      return;
    }

    const { showFeedback } = ctx.settings;
    const saved = ctx.state as Partial<VideoState> | null;
    const answers: VideoState['a'] = { ...(saved?.a ?? {}) };

    const stage = h('div', { class: 'iv-stage' });
    const host = h('div', { class: 'iv-host' });
    const loading = h('div', { class: 'iv-loading' }, 'Loading video…');
    const status = h('p', { class: 'iv-status', 'aria-live': 'polite' });
    stage.append(host, loading);
    root.append(stage, status);

    let player: VideoPlayer | null = null;
    let ready = false;
    let ended = false;
    let playing = false;
    let openId: string | null = null;
    let panel: HTMLElement | null = null;
    let lastSaved = 0;

    const pending = () => cps.filter((c) => !answers[c.id]?.ok);
    const persist = () =>
      ctx.setState({
        t: Math.round(player?.getTime() ?? saved?.t ?? 0),
        a: answers,
      } satisfies VideoState);

    const updateStatus = () => {
      const done = cps.length - pending().length;
      status.textContent =
        cps.length === 0
          ? ''
          : done === cps.length
            ? `All ${cps.length} checkpoints done.`
            : `${done} of ${cps.length} checkpoints done. The video pauses at each one.`;
    };

    const reportIfDone = () => {
      if (gradableQuestions(props).length === 0 || pending().length > 0) return;
      ctx.report({ fraction: videoFraction(props, { a: answers }), done: true });
    };

    const closePanel = () => {
      panel?.remove();
      panel = null;
      openId = null;
    };

    function resume() {
      closePanel();
      persist();
      updateStatus();
      reportIfDone();
      if (ended && pending().length === 0) return; // finished: do not replay
      if (ended) return check(); // jumped to the end with more checkpoints still waiting
      player?.play();
    }

    function resolve(cp: VideoCheckpoint) {
      answers[cp.id] = { sel: answers[cp.id]?.sel ?? [], ok: true };
      resume();
    }

    function showCheckpoint(cp: VideoCheckpoint) {
      panel?.remove();
      openId = cp.id;
      const titleId = `${ctx.el.id}-${cp.id}-t`;
      const title = h(
        'h3',
        { id: titleId, tabindex: '-1' },
        cp.title || (cp.kind === 'question' ? 'Question' : 'Note'),
      );
      const card = h(
        'div',
        { class: 'iv-card', role: 'dialog', 'aria-labelledby': titleId },
        title,
        rich(cp.html),
      );

      if (cp.kind === 'prompt') {
        const go = h('button', { class: 'ap-btn', type: 'button' }, 'Continue');
        go.addEventListener('click', () => resolve(cp));
        card.append(h('div', { class: 'ap-actions' }, go));
      } else {
        card.append(questionBody(cp));
      }
      panel = h('div', { class: 'iv-panel' }, card);
      stage.append(panel);
      title.focus();
    }

    function questionBody(cp: VideoCheckpoint): HTMLElement {
      const type = cp.multi ? 'checkbox' : 'radio';
      const name = `${ctx.el.id}-${cp.id}`;
      const fs = h(
        'fieldset',
        { class: 'ap-fieldset' },
        h('legend', { class: 'ap-sr' }, stripHtml(cp.html) || cp.title),
      );
      if (cp.multi) fs.append(h('p', { class: 'ap-hint' }, 'Select all that apply.'));
      const inputs: HTMLInputElement[] = [];
      cp.options.forEach((o, i) => {
        const id = `${name}-${i}`;
        const input = h('input', { type, name, id, value: String(i) });
        inputs.push(input);
        const label = h('label', { class: 'ap-option', for: id }, input, h('span', {}, o.text));
        label.dataset.index = String(i);
        fs.append(label);
      });

      const feedback = h('div', { class: 'ap-feedback', 'aria-live': 'polite' });
      const submit = h(
        'button',
        { class: 'ap-btn', type: 'button' },
        showFeedback ? 'Check answer' : 'Continue',
      );
      const cont = h('button', { class: 'ap-btn', type: 'button' }, 'Continue');
      const retry = h('button', { class: 'ap-btn', type: 'button' }, 'Try again');
      cont.hidden = true;
      retry.hidden = true;
      const selected = () => inputs.filter((i) => i.checked).map((i) => Number(i.value));

      submit.addEventListener('click', () => {
        const sel = selected();
        if (sel.length === 0) {
          feedback.textContent = 'Choose an answer first.';
          return;
        }
        // The first answer is the one that counts toward the grade.
        if (!answers[cp.id]) answers[cp.id] = { sel, ok: false };
        if (!showFeedback) return resolve(cp);

        const score = checkpointScore(cp, sel);
        for (const l of Array.from(fs.querySelectorAll<HTMLElement>('.ap-option'))) {
          const idx = Number(l.dataset.index);
          const on = sel.includes(idx);
          l.classList.toggle('ap-correct', !!cp.options[idx]?.correct && (on || cp.multi));
          l.classList.toggle('ap-wrong', on && !cp.options[idx]?.correct);
        }
        feedback.replaceChildren(
          h('strong', {}, score === 1 ? 'Correct!' : score > 0 ? 'Partly correct.' : 'Not quite.'),
        );
        for (const i of sel) {
          const fb = cp.options[i]?.feedback;
          if (fb) feedback.append(h('p', {}, fb));
        }
        inputs.forEach((i) => (i.disabled = true));
        submit.hidden = true;
        if (props.requireCorrect && score < 1) {
          retry.hidden = false;
          retry.focus();
        } else {
          answers[cp.id] = { sel: answers[cp.id]?.sel ?? sel, ok: true };
          persist();
          cont.hidden = false;
          cont.focus();
        }
      });
      cont.addEventListener('click', () => resolve(cp));
      retry.addEventListener('click', () => {
        inputs.forEach((i) => {
          i.disabled = false;
          i.checked = false;
        });
        fs.querySelectorAll('.ap-correct, .ap-wrong').forEach((l) =>
          l.classList.remove('ap-correct', 'ap-wrong'),
        );
        feedback.replaceChildren();
        retry.hidden = true;
        submit.hidden = false;
      });
      return h('div', {}, fs, feedback, h('div', { class: 'ap-actions' }, submit, cont, retry));
    }

    /** Runs a few times a second: stop at checkpoints, and pull back anyone who skips ahead. */
    function check() {
      if (!player || !ready) return;
      if (openId) {
        if (playing) player.pause(); // keep the video stopped while a question is open
        return;
      }
      const action = gate(pending(), player.getTime(), ended);
      if (action.type === 'show') {
        const cp = cps.find((c) => c.id === action.id);
        if (!cp) return;
        openId = cp.id; // claim it first: pausing fires a state event that calls check() again
        if (action.seekTo !== null) player.seek(action.seekTo);
        player.pause();
        showCheckpoint(cp);
      } else if (playing && Date.now() - lastSaved > 10000) {
        lastSaved = Date.now();
        persist();
      }
    }

    function showError(message: string) {
      loading.remove();
      closePanel();
      stage.querySelector('.iv-error')?.remove();
      const retry = h('button', { class: 'ap-btn', type: 'button' }, 'Try again');
      retry.addEventListener('click', start);
      stage.append(
        h(
          'div',
          { class: 'iv-error', role: 'alert' },
          h('p', {}, message),
          h(
            'p',
            { class: 'iv-error-hint' },
            'The video needs an internet connection and a network that allows YouTube.',
          ),
          h(
            'div',
            { class: 'ap-actions' },
            retry,
            h(
              'a',
              {
                class: 'iv-link',
                href: `https://www.youtube.com/watch?v=${videoId}`,
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              'Open on YouTube',
            ),
          ),
        ),
      );
    }

    function start() {
      stage.querySelector('.iv-error')?.remove();
      stage.append(loading);
      player?.destroy();
      ready = false;
      player = getVideoEngine().create(
        host,
        videoId as string,
        { captions: props.captions },
        {
          onReady() {
            ready = true;
            loading.remove();
            const limit = pending()[0]?.time ?? Infinity;
            const t = Math.min(saved?.t ?? 0, limit);
            if (t > 1) player?.seek(t);
          },
          onState(s: PlayState) {
            playing = s === 'playing';
            if (s === 'playing') ended = false;
            if (s === 'ended') ended = true;
            if (s === 'paused' && !openId) persist();
            check();
          },
          onError: showError,
        },
      );
    }

    updateStatus();
    start();
    const timer = setInterval(() => {
      if (!root.isConnected) {
        clearInterval(timer);
        player?.destroy();
        return;
      }
      check();
    }, 200);
  },
};
