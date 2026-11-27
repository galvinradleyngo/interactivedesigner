import { h, rich } from '../../player/dom';
import { stripHtml } from '../../schema/html';
import type { BlockContext, BlockPlayer } from '../types';
import { getVideoEngine, type PlayState, type VideoPlayer } from './engine';
import { gate } from './gate';
import {
  checkpointScore,
  formatTime,
  gradableQuestions,
  hasWatchedEnough,
  parseYouTubeId,
  sortedCheckpoints,
  timelinePercent,
  timelineScale,
  videoFraction,
  type InteractiveVideoProps,
  type VideoCheckpoint,
  type VideoState,
} from './type';

/** Draw checkpoint markers on a progress track. */
function paintMarkers(
  track: HTMLElement,
  cps: VideoCheckpoint[],
  scale: number,
  isDone: (id: string) => boolean,
  nextId: string | null,
) {
  track.querySelectorAll('.iv-mark').forEach((m) => m.remove());
  for (const c of cps) {
    const m = h('span', {
      class: `iv-mark ${c.kind === 'question' ? 'q' : 'p'}${isDone(c.id) ? ' done' : ''}${c.id === nextId ? ' next' : ''}`,
      title: `${formatTime(c.time)}: ${c.title || (c.kind === 'question' ? 'Question' : 'Note')}`,
    });
    m.style.left = `${timelinePercent(c.time, scale)}%`;
    track.append(m);
  }
}

const ICONS = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
  replay:
    '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  volume:
    '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  muted:
    '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
} as const;

/** Show an icon on a control. The accessible name and tooltip carry the words. */
function setIcon(b: HTMLElement, icon: keyof typeof ICONS, label: string) {
  b.innerHTML = `<svg viewBox="0 0 24 24" width="1.25em" height="1.25em" aria-hidden="true" focusable="false">${ICONS[icon]}</svg>`;
  b.setAttribute('aria-label', label);
  b.title = label;
}

export const interactiveVideoPlayer: BlockPlayer<InteractiveVideoProps> = {
  type: 'interactiveVideo',
  render(ctx: BlockContext<InteractiveVideoProps>) {
    const { props, root, editing } = ctx;
    const videoId = parseYouTubeId(props.url);
    const cps = sortedCheckpoints(props.checkpoints);
    const watchedMode = props.gradeBy === 'watched';
    root.classList.add('iv');

    // Editor canvas (no network) and unfinished blocks: a static placeholder with the checkpoints visible.
    if (editing || !videoId) {
      if (!editing && !ctx.hints) return;
      const staticTrack = h('div', { class: 'iv-track iv-track-static', 'aria-hidden': 'true' });
      paintMarkers(staticTrack, cps, timelineScale(props), () => false, null);
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
              ? `${cps.length} ${cps.length === 1 ? 'checkpoint' : 'checkpoints'} · double-click to place them on the timeline`
              : 'Paste a YouTube link in the Element panel to get started',
          ),
          videoId ? staticTrack : null,
        ),
      );
      return;
    }

    const { showFeedback } = ctx.settings;
    const saved = ctx.state as Partial<VideoState> | null;
    const answers: VideoState['a'] = { ...(saved?.a ?? {}) };

    const stage = h('div', { class: 'iv-stage' });
    const host = h('div', { class: 'iv-host' });
    // Sits over the video: no right-click menu, no YouTube hover controls; a click plays or pauses.
    const shield = h('button', {
      class: 'iv-shield',
      type: 'button',
      tabindex: '-1',
      'aria-hidden': 'true',
    });
    const loading = h('div', { class: 'iv-loading' }, 'Loading video…');
    stage.append(host, shield, loading);

    const playBtn = h('button', { class: 'iv-btn iv-icon', type: 'button' });
    setIcon(playBtn, 'play', 'Play');
    const muteBtn = h('button', {
      class: 'iv-btn iv-icon',
      type: 'button',
      'aria-pressed': 'false',
    });
    setIcon(muteBtn, 'volume', 'Mute');
    const volume = h('input', {
      class: 'iv-volume',
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      value: '100',
      'aria-label': 'Volume',
    });
    const ccBtn = h(
      'button',
      {
        class: 'iv-btn iv-cc',
        type: 'button',
        'aria-pressed': String(props.captions),
        'aria-label': 'Closed captions',
        title: 'Closed captions',
      },
      'CC',
    );
    const fill = h('div', { class: 'iv-fill' });
    const track = h(
      'div',
      {
        class: 'iv-track',
        role: 'progressbar',
        'aria-label': 'Video progress. Skipping ahead is not allowed.',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0',
      },
      fill,
    );
    const timeLabel = h('span', { class: 'iv-time' }, '0:00 / –:––');
    const controls = h(
      'div',
      { class: 'iv-controls' },
      playBtn,
      track,
      timeLabel,
      muteBtn,
      volume,
      ccBtn,
    );
    playBtn.disabled = true;
    muteBtn.disabled = true;
    volume.disabled = true;
    ccBtn.disabled = true;
    const status = h('p', { class: 'iv-status', 'aria-live': 'polite' });
    root.append(stage, controls, status);

    let player: VideoPlayer | null = null;
    let ready = false;
    let ended = false;
    let playing = false;
    let muted = false;
    let captionsOn = props.captions;
    let openId: string | null = null;
    let panel: HTMLElement | null = null;
    let lastSaved = 0;
    let lastT = saved?.t ?? 0; // last honest position
    let lastAt = Date.now();
    let furthest = saved?.w ?? saved?.t ?? 0; // furthest point reached by watching
    let knownDuration = saved?.d ?? 0;
    let reportedWatched =
      watchedMode &&
      hasWatchedEnough(furthest, knownDuration || props.duration, props.watchPercent);
    let paintedScale = -1;

    const pending = () => cps.filter((c) => !answers[c.id]?.ok);
    const duration = () => {
      const d = player?.getDuration() || props.duration || knownDuration;
      if (d) knownDuration = d;
      return d;
    };
    const persist = () =>
      ctx.setState({
        t: Math.round(player?.getTime() ?? saved?.t ?? 0),
        a: answers,
        w: Math.round(furthest),
        d: Math.round(knownDuration),
      } satisfies VideoState);

    const repaintMarkers = () => {
      const scale = timelineScale({ duration: duration(), checkpoints: cps });
      paintedScale = scale;
      paintMarkers(track, cps, scale, (id) => !!answers[id]?.ok, pending()[0]?.id ?? null);
    };

    const updateStatus = () => {
      const done = cps.length - pending().length;
      const parts: string[] = [];
      if (cps.length > 0)
        parts.push(
          done === cps.length
            ? `All ${cps.length} checkpoints done.`
            : `${done} of ${cps.length} checkpoints done. The video pauses at each one.`,
        );
      if (watchedMode && ctx.graded)
        parts.push(`Watch at least ${props.watchPercent}% of the video to complete this.`);
      status.textContent = parts.join(' ');
      repaintMarkers();
    };

    const refreshControls = () => {
      const dur = duration();
      const t = player?.getTime() ?? 0;
      const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0;
      fill.style.width = `${pct}%`;
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
      timeLabel.textContent = `${formatTime(t)} / ${dur ? formatTime(dur) : '–:––'}`;
      if (playing) setIcon(playBtn, 'pause', 'Pause');
      else if (ended && pending().length === 0) setIcon(playBtn, 'replay', 'Watch again');
      else setIcon(playBtn, 'play', 'Play');
      if (timelineScale({ duration: dur, checkpoints: cps }) !== paintedScale) repaintMarkers();
    };

    const reportIfDone = () => {
      if (watchedMode || gradableQuestions(props).length === 0 || pending().length > 0) return;
      ctx.report({ fraction: videoFraction(props, { a: answers }), done: true });
    };
    const maybeReportWatched = () => {
      if (
        !watchedMode ||
        reportedWatched ||
        !hasWatchedEnough(furthest, duration(), props.watchPercent)
      )
        return;
      reportedWatched = true;
      persist();
      ctx.report({ fraction: 1, done: true });
    };

    const seekTo = (s: number) => {
      player?.seek(s);
      lastT = s;
      lastAt = Date.now();
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
      if (ended && pending().length === 0) return refreshControls(); // finished: do not replay
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

    /** Runs a few times a second: keep the learner honest, stop at checkpoints, track what was watched. */
    function check() {
      if (!player || !ready) return;
      const t = player.getTime();
      const now = Date.now();
      const elapsed = (now - lastAt) / 1000;
      // There are no seek controls, so a jump ahead of real time is a glitch or tampering: put them back.
      if (t - lastT > elapsed * 1.25 + 1) {
        seekTo(lastT);
        return refreshControls();
      }
      if (playing) furthest = Math.max(furthest, t);
      lastT = t;
      lastAt = now;
      maybeReportWatched();
      refreshControls();

      if (openId) {
        if (playing) player.pause(); // keep the video stopped while a question is open
        return;
      }
      const action = gate(pending(), t, ended);
      if (action.type === 'show') {
        const cp = cps.find((c) => c.id === action.id);
        if (!cp) return;
        openId = cp.id; // claim it first: pausing fires a state event that calls check() again
        if (action.seekTo !== null) seekTo(action.seekTo);
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

    const toggle = () => {
      if (!player || !ready || openId) return;
      if (playing) return player.pause();
      if (ended) {
        lastT = 0; // watching again from the start
        lastAt = Date.now();
      }
      player.play();
    };
    playBtn.addEventListener('click', toggle);
    shield.addEventListener('click', toggle);
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      player?.setMuted(muted);
      setIcon(muteBtn, muted ? 'muted' : 'volume', muted ? 'Unmute' : 'Mute');
      muteBtn.setAttribute('aria-pressed', String(muted));
    });

    volume.addEventListener('input', () => {
      const v = Number(volume.value);
      player?.setVolume(v);
      // Dragging the slider up un-mutes; dragging it to zero is the same as muting.
      const shouldMute = v === 0;
      if (shouldMute !== muted) {
        muted = shouldMute;
        player?.setMuted(muted);
        setIcon(muteBtn, muted ? 'muted' : 'volume', muted ? 'Unmute' : 'Mute');
        muteBtn.setAttribute('aria-pressed', String(muted));
      }
    });
    ccBtn.addEventListener('click', () => {
      captionsOn = !captionsOn;
      player?.setCaptions(captionsOn);
      ccBtn.setAttribute('aria-pressed', String(captionsOn));
    });

    function start() {
      stage.querySelector('.iv-error')?.remove();
      stage.append(loading);
      player?.destroy();
      ready = false;
      player = getVideoEngine().create(
        host,
        videoId as string,
        { captions: captionsOn, controls: false },
        {
          onReady() {
            ready = true;
            loading.remove();
            playBtn.disabled = false;
            muteBtn.disabled = false;
            volume.disabled = false;
            ccBtn.disabled = false;
            const limit = pending()[0]?.time ?? Infinity;
            const t = Math.min(saved?.t ?? 0, limit);
            if (t > 1) seekTo(t);
            if (furthest < t) furthest = t;
            refreshControls();
          },
          onState(s: PlayState) {
            playing = s === 'playing';
            if (s === 'playing') ended = false;
            if (s === 'ended') {
              ended = true;
              furthest = Math.max(furthest, duration());
            }
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
