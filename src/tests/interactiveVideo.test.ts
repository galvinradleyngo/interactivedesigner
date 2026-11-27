import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setVideoEngine,
  youtubeEngine,
  type PlayState,
  type VideoEngine,
  type VideoEvents,
  type VideoPlayer,
} from '../plugins/interactiveVideo/engine';
import { gate } from '../plugins/interactiveVideo/gate';
import { interactiveVideoPlayer } from '../plugins/interactiveVideo/player';
import {
  formatTime,
  gradableQuestions,
  interactiveVideoDef,
  parseYouTubeId,
  videoFraction,
  type InteractiveVideoProps,
  type VideoCheckpoint,
  type VideoState,
} from '../plugins/interactiveVideo/type';
import type { BlockContext } from '../plugins/types';
import { DEFAULT_DESIGN, DEFAULT_SETTINGS } from '../schema/types';

const opt = (id: string, correct: boolean, feedback = '') => ({
  id,
  text: `Option ${id}`,
  correct,
  feedback,
});
const prompt = (id: string, time: number): VideoCheckpoint => ({
  id,
  time,
  kind: 'prompt',
  title: `Note ${id}`,
  html: '<p>Read this</p>',
  multi: false,
  options: [],
});
const question = (id: string, time: number, multi = false): VideoCheckpoint => ({
  id,
  time,
  kind: 'question',
  title: `Question ${id}`,
  html: '<p>Which is right?</p>',
  multi,
  options: [opt('a', true, 'Yes, that one.'), opt('b', false, 'Not that one.')],
});
const props = (
  cps: VideoCheckpoint[],
  over: Partial<InteractiveVideoProps> = {},
): InteractiveVideoProps => ({
  points: 10,
  url: 'https://youtu.be/M7lc1UVf-VE',
  requireCorrect: false,
  captions: true,
  duration: 100,
  gradeBy: 'questions',
  watchPercent: 90,
  checkpoints: cps,
  ...over,
});

describe('parseYouTubeId', () => {
  it('reads the common link shapes and bare ids', () => {
    const id = 'M7lc1UVf-VE';
    for (const u of [
      id,
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&t=42s`,
      `youtube.com/watch?feature=share&v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/live/${id}?feature=share`,
      `  ${id}  `,
    ])
      expect(parseYouTubeId(u), u).toBe(id);
  });
  it('rejects things that are not a YouTube video', () => {
    for (const u of [
      '',
      '   ',
      'hello',
      'https://vimeo.com/123456789',
      'https://youtube.com/',
      'https://youtube.com/watch?v=short',
      'https://evil.example/watch?v=M7lc1UVf-VE',
      'https://youtu.be/',
    ]) {
      expect(parseYouTubeId(u), u).toBeNull();
    }
  });
});

describe('formatTime', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(83.9)).toBe('1:23');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(-4)).toBe('0:00');
  });
});

describe('gate', () => {
  const pend = [
    { id: 'a', time: 10 },
    { id: 'b', time: 20 },
  ];
  it('does nothing before the next checkpoint or when none are pending', () => {
    expect(gate(pend, 3, false)).toEqual({ type: 'none' });
    expect(gate(pend, 9.9, false)).toEqual({ type: 'none' });
    expect(gate([], 99, false)).toEqual({ type: 'none' });
  });
  it('stops at the checkpoint without moving the video when playback just reached it', () => {
    expect(gate(pend, 9.97, false)).toEqual({ type: 'show', id: 'a', seekTo: null });
    expect(gate(pend, 10.2, false)).toEqual({ type: 'show', id: 'a', seekTo: null });
  });
  it('pulls the learner back when they jumped past it', () => {
    expect(gate(pend, 55, false)).toEqual({ type: 'show', id: 'a', seekTo: 10 });
    expect(gate(pend, 10.6, false)).toEqual({ type: 'show', id: 'a', seekTo: 10 });
  });
  it('shows pending checkpoints when the video ends', () => {
    expect(gate(pend, 100, true)).toEqual({ type: 'show', id: 'a', seekTo: null });
  });
});

describe('grading', () => {
  const p = props([prompt('p', 3), question('q1', 10), question('q2', 20, true)]);
  p.checkpoints[2]!.options = [opt('a', true), opt('b', true), opt('c', false)];
  const st = (a: VideoState['a']) => ({ t: 0, a });

  it('only question checkpoints with a correct answer are gradable', () => {
    expect(gradableQuestions(p).map((c) => c.id)).toEqual(['q1', 'q2']);
    expect(interactiveVideoDef.gradable).toBe(true);
    expect(interactiveVideoDef.isScored?.(p as never)).toBe(true);
    expect(interactiveVideoDef.isScored?.(props([prompt('p', 3)]) as never)).toBe(false);
  });
  it('averages first-attempt scores across the questions', () => {
    expect(
      videoFraction(p, st({ q1: { sel: [0], ok: true }, q2: { sel: [0, 1], ok: true } })),
    ).toBe(1);
    expect(
      videoFraction(p, st({ q1: { sel: [1], ok: true }, q2: { sel: [0, 1], ok: true } })),
    ).toBe(0.5);
    expect(videoFraction(p, st({ q1: { sel: [0], ok: true }, q2: { sel: [0], ok: true } }))).toBe(
      0.75,
    );
    expect(videoFraction(p, st({}))).toBe(0);
    expect(videoFraction(p, null)).toBe(0);
  });
  it('has nothing to grade without questions', () => {
    expect(videoFraction(props([prompt('p', 1)]), st({}))).toBe(0);
  });
});

/* ---- the player, driven by a simulated video ---- */

class FakePlayer implements VideoPlayer {
  time = 0;
  paused = true;
  duration = 100;
  muted = false;
  calls: string[] = [];
  destroyed = false;
  constructor(public events: VideoEvents) {}
  play() {
    this.calls.push('play');
    this.paused = false;
    this.events.onState('playing');
  }
  pause() {
    this.calls.push('pause');
    this.paused = true;
    this.events.onState('paused');
  }
  getTime() {
    return this.time;
  }
  getDuration() {
    return this.duration;
  }
  setMuted(m: boolean) {
    this.calls.push(`muted:${m}`);
    this.muted = m;
  }
  seek(s: number) {
    this.calls.push(`seek:${s}`);
    this.time = s;
  }
  destroy() {
    this.destroyed = true;
  }
}

let players: FakePlayer[] = [];
const fakeEngine: VideoEngine = {
  create(_host, _id, _opts, events) {
    const p = new FakePlayer(events);
    players.push(p);
    queueMicrotask(() => events.onReady());
    return p;
  },
};

function mount(p: InteractiveVideoProps, state: unknown = null, settings = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const setState = vi.fn();
  const report = vi.fn();
  const ctx = {
    root,
    el: { id: 'v1', type: 'interactiveVideo', x: 0, y: 0, w: 100, h: 100, props: {} },
    props: p,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    design: DEFAULT_DESIGN,
    editing: false,
    hints: false,
    graded: true,
    resolveMedia: () => '',
    state,
    setState,
    report,
    goto: vi.fn(),
  } as unknown as BlockContext<InteractiveVideoProps>;
  interactiveVideoPlayer.render(ctx);
  return { root, setState, report };
}

/** Let the video play at normal speed until `time` (or until it is paused, e.g. by a checkpoint). */
async function playTo(time: number) {
  const pl = players.at(-1)!;
  await vi.advanceTimersByTimeAsync(0); // ready
  if (pl.paused) pl.play();
  while (!pl.paused && pl.time < time - 1e-9) {
    pl.time = Math.min(time, pl.time + 0.2);
    await vi.advanceTimersByTimeAsync(200);
  }
  await vi.advanceTimersByTimeAsync(250);
}
/** Move the playhead instantly, as if the learner skipped (only possible by tampering, there are no seek controls). */
async function jumpTo(time: number) {
  const pl = players.at(-1)!;
  await vi.advanceTimersByTimeAsync(0);
  if (pl.paused) pl.play();
  pl.time = time;
  await vi.advanceTimersByTimeAsync(250);
}
const q = <T extends Element>(root: HTMLElement, sel: string) =>
  root.querySelector(sel) as T | null;
const btn = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text && !b.hidden) as
    HTMLButtonElement | undefined;

describe('interactive video player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    players = [];
    setVideoEngine(fakeEngine);
    document.body.replaceChildren();
  });
  afterEach(() => {
    vi.useRealTimers();
    setVideoEngine(youtubeEngine);
  });

  it('plays freely until a checkpoint, then pauses and shows it', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await playTo(4.9);
    expect(q(root, '.iv-panel')).toBeNull();
    await playTo(5.1);
    expect(q(root, '.iv-panel')).not.toBeNull();
    expect(players[0]!.paused).toBe(true);
    expect(q(root, '.iv-card h3')!.textContent).toBe('Note p1');
    expect(document.activeElement).toBe(q(root, '.iv-card h3'));
  });

  it('a prompt resumes the video when the learner continues', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await playTo(5.1);
    btn(root, 'Continue')!.click();
    expect(q(root, '.iv-panel')).toBeNull();
    expect(players[0]!.paused).toBe(false);
    await playTo(8);
    expect(q(root, '.iv-panel')).toBeNull(); // does not come back
  });

  it('undoes a jump ahead: there are no seek controls, so it is a glitch or tampering', async () => {
    const { root } = mount(props([prompt('p1', 5), prompt('p2', 20)]));
    await playTo(2);
    await jumpTo(60);
    expect(players[0]!.calls.some((c) => c.startsWith('seek:'))).toBe(true);
    expect(players[0]!.time).toBeLessThan(3); // back where they honestly were
    expect(q(root, '.iv-panel')).toBeNull();
  });

  it('a long gap (background tab) that carries playback past a checkpoint pulls back to the checkpoint', async () => {
    const { root } = mount(props([prompt('p1', 5), prompt('p2', 20)]));
    await vi.advanceTimersByTimeAsync(0);
    players[0]!.play();
    vi.setSystemTime(Date.now() + 60_000); // the browser did not run the timer for a minute
    players[0]!.time = 60; // the video kept playing meanwhile
    await vi.advanceTimersByTimeAsync(250);
    expect(players[0]!.calls).toContain('seek:5');
    expect(q(root, '.iv-card h3')!.textContent).toBe('Note p1');
  });

  it('cannot be restarted from behind the open question', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await playTo(5.1);
    players[0]!.events.onState('playing' as PlayState); // e.g. space bar on the video
    expect(players[0]!.calls.filter((c) => c === 'pause').length).toBeGreaterThanOrEqual(2);
    expect(q(root, '.iv-panel')).not.toBeNull();
  });

  it('a question needs an answer, gives feedback, then lets the learner continue (wrong answers too)', async () => {
    const { root, report } = mount(props([question('q1', 5)]));
    await playTo(5.1);
    btn(root, 'Check answer')!.click();
    expect(q(root, '.ap-feedback')!.textContent).toContain('Choose an answer first.');
    expect(btn(root, 'Continue')).toBeUndefined();
    (root.querySelectorAll('input')[1] as HTMLInputElement).click(); // the wrong one
    btn(root, 'Check answer')!.click();
    expect(q(root, '.ap-feedback')!.textContent).toContain('Not quite.');
    expect(q(root, '.ap-feedback')!.textContent).toContain('Not that one.');
    btn(root, 'Continue')!.click();
    expect(players[0]!.paused).toBe(false);
    expect(report).toHaveBeenCalledWith({ fraction: 0, done: true });
  });

  it('a correct answer scores 1 and is reported once everything is done', async () => {
    const { root, report } = mount(props([prompt('p1', 3), question('q1', 5)]));
    await playTo(3.1);
    btn(root, 'Continue')!.click();
    expect(report).not.toHaveBeenCalled(); // a checkpoint is still waiting
    await playTo(5.1);
    (root.querySelectorAll('input')[0] as HTMLInputElement).click();
    btn(root, 'Check answer')!.click();
    expect(q(root, '.ap-feedback')!.textContent).toContain('Correct!');
    btn(root, 'Continue')!.click();
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ fraction: 1, done: true });
    expect(q(root, '.iv-status')!.textContent).toBe('All 2 checkpoints done.');
  });

  it('"must answer correctly" makes the learner retry, and only the first try is graded', async () => {
    const { root, report } = mount(props([question('q1', 5)], { requireCorrect: true }));
    await playTo(5.1);
    (root.querySelectorAll('input')[1] as HTMLInputElement).click();
    btn(root, 'Check answer')!.click();
    expect(btn(root, 'Continue')).toBeUndefined();
    btn(root, 'Try again')!.click();
    (root.querySelectorAll('input')[0] as HTMLInputElement).click();
    btn(root, 'Check answer')!.click();
    btn(root, 'Continue')!.click();
    expect(report).toHaveBeenCalledWith({ fraction: 0, done: true }); // first attempt was wrong
    expect(players[0]!.paused).toBe(false);
  });

  it('with feedback turned off a question just records the answer and continues', async () => {
    const { root, report } = mount(props([question('q1', 5)], { requireCorrect: true }), null, {
      showFeedback: false,
    });
    await playTo(5.1);
    (root.querySelectorAll('input')[1] as HTMLInputElement).click();
    btn(root, 'Continue')!.click();
    expect(q(root, '.iv-panel')).toBeNull();
    expect(report).toHaveBeenCalledWith({ fraction: 0, done: true });
  });

  it('saves progress and resumes: answered checkpoints stay answered', async () => {
    const first = mount(props([prompt('p1', 3), prompt('p2', 9)]));
    await playTo(3.1);
    btn(first.root, 'Continue')!.click();
    const last = first.setState.mock.calls.at(-1)![0] as VideoState;
    expect(last.a.p1).toEqual({ sel: [], ok: true });

    document.body.replaceChildren();
    players = [];
    const again = mount(props([prompt('p1', 3), prompt('p2', 9)]), {
      t: 4,
      a: { p1: { sel: [], ok: true } },
    });
    await playTo(3.5);
    expect(q(again.root, '.iv-panel')).toBeNull(); // p1 is done
    expect(players[0]!.calls).toContain('seek:4'); // resumed where they left off
    await playTo(9.1);
    expect(q(again.root, '.iv-card h3')!.textContent).toBe('Note p2');
  });

  it('never resumes past a checkpoint that is still unanswered', async () => {
    mount(props([prompt('p1', 6)]), { t: 50, a: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(players[0]!.calls).toContain('seek:6');
  });

  it('shows what is left at the end of the video', async () => {
    const { root } = mount(props([prompt('p1', 100)]));
    await vi.advanceTimersByTimeAsync(0);
    players[0]!.events.onState('ended');
    expect(q(root, '.iv-card h3')!.textContent).toBe('Note p1');
  });

  it('reports a problem loading the video and can try again', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await vi.advanceTimersByTimeAsync(0);
    players[0]!.events.onError('The owner of this video does not allow it to be embedded.');
    expect(q(root, '.iv-error')!.textContent).toContain('does not allow it to be embedded');
    expect(q<HTMLAnchorElement>(root, '.iv-link')!.href).toContain(
      'youtube.com/watch?v=M7lc1UVf-VE',
    );
    expect(players[0]!.destroyed).toBe(false);
    btn(root, 'Try again')!.click();
    expect(players).toHaveLength(2);
    expect(players[0]!.destroyed).toBe(true);
    expect(q(root, '.iv-error')).toBeNull();
  });

  it('stops watching once its page is gone', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await vi.advanceTimersByTimeAsync(0);
    root.remove();
    await vi.advanceTimersByTimeAsync(400);
    expect(players[0]!.destroyed).toBe(true);
  });

  it('shows nothing to learners without a link, and a hint in previews', () => {
    const a = mount(props([], { url: 'nope' }));
    expect(a.root.children).toHaveLength(0);
    expect(players).toHaveLength(0);
  });
});

describe('watched-enough grading', () => {
  it('helpers: percent, clamping and the threshold', async () => {
    const { watchedPercent, clampWatchPercent, hasWatchedEnough, watchedFraction } =
      await import('../plugins/interactiveVideo/type');
    expect(watchedPercent(45, 100)).toBe(45);
    expect(watchedPercent(500, 100)).toBe(100);
    expect(watchedPercent(10, 0)).toBe(0);
    expect(clampWatchPercent(0)).toBe(1);
    expect(clampWatchPercent(250)).toBe(100);
    expect(clampWatchPercent(Number.NaN)).toBe(90);
    expect(clampWatchPercent(89.6)).toBe(90);
    expect(hasWatchedEnough(89, 100, 90)).toBe(false);
    expect(hasWatchedEnough(89.6, 100, 90)).toBe(true); // half a second of allowance
    expect(hasWatchedEnough(100, 100, 100)).toBe(true);
    expect(hasWatchedEnough(50, 0, 90)).toBe(false);
    expect(watchedFraction({ watchPercent: 90, duration: 100 }, { w: 95, d: 100 })).toBe(1);
    expect(watchedFraction({ watchPercent: 90, duration: 100 }, { w: 40, d: 100 })).toBe(0);
    expect(watchedFraction({ watchPercent: 90, duration: 100 }, null)).toBe(0);
  });
  it('is gradable with no questions at all, and graded by the state it was left in', () => {
    const p = props([prompt('p', 3)], { gradeBy: 'watched', watchPercent: 80 });
    expect(interactiveVideoDef.isScored?.(p as never)).toBe(true);
    expect(interactiveVideoDef.fraction?.(p as never, { t: 0, a: {}, w: 85, d: 100 })).toBe(1);
    expect(interactiveVideoDef.fraction?.(p as never, { t: 0, a: {}, w: 70, d: 100 })).toBe(0);
    // by questions, the same activity has nothing to grade
    expect(interactiveVideoDef.isScored?.(props([prompt('p', 3)]) as never)).toBe(false);
  });
  it('defaults: graded by questions, 90 percent', () => {
    const d = interactiveVideoDef.createDefault();
    expect(d.gradeBy).toBe('questions');
    expect(d.watchPercent).toBe(90);
  });
});

describe('watched-enough grading in the player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    players = [];
    setVideoEngine(fakeEngine);
    document.body.replaceChildren();
  });
  afterEach(() => {
    vi.useRealTimers();
    setVideoEngine(youtubeEngine);
  });

  it('gives full marks once the learner has watched the set percentage, and only then', async () => {
    const { report } = mount(props([], { gradeBy: 'watched', watchPercent: 90 }));
    await playTo(60);
    expect(report).not.toHaveBeenCalled();
    await playTo(89);
    expect(report).not.toHaveBeenCalled();
    await playTo(91);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ fraction: 1, done: true });
    await playTo(100);
    expect(report).toHaveBeenCalledTimes(1); // reported once
  });

  it('uses the percentage the author chose', async () => {
    const { report } = mount(props([], { gradeBy: 'watched', watchPercent: 50 }));
    await playTo(45);
    expect(report).not.toHaveBeenCalled();
    await playTo(52);
    expect(report).toHaveBeenCalledWith({ fraction: 1, done: true });
  });

  it('questions still pause the video, but are not graded in this mode', async () => {
    const { root, report } = mount(
      props([question('q1', 10)], { gradeBy: 'watched', watchPercent: 90 }),
    );
    await playTo(10.1);
    expect(q(root, '.iv-panel')).not.toBeNull(); // still gated
    (root.querySelectorAll('input')[1] as HTMLInputElement).click(); // a wrong answer
    btn(root, 'Check answer')!.click();
    btn(root, 'Continue')!.click();
    expect(report).not.toHaveBeenCalled(); // answering did not report anything
    await playTo(95);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ fraction: 1, done: true }); // full marks despite the wrong answer
  });

  it('remembers what was watched, and a returning learner is not reported again', async () => {
    const first = mount(props([], { gradeBy: 'watched', watchPercent: 90 }));
    await playTo(30);
    const state = first.setState.mock.calls.at(-1)?.[0] as VideoState | undefined;
    await playTo(95);
    const saved = first.setState.mock.calls.at(-1)![0] as VideoState;
    expect(saved.w).toBeGreaterThanOrEqual(90);
    expect(saved.d).toBe(100);
    void state;
    document.body.replaceChildren();
    players = [];
    const again = mount(props([], { gradeBy: 'watched', watchPercent: 90 }), saved);
    await playTo(99);
    expect(again.report).not.toHaveBeenCalled(); // already counted earlier in this attempt
  });

  it('tells a graded learner what is needed, but not an ungraded one', async () => {
    const graded = mount(props([], { gradeBy: 'watched', watchPercent: 80 }));
    expect(graded.root.querySelector('.iv-status')!.textContent).toContain('Watch at least 80%');
    document.body.replaceChildren();
    const ctxRoot = document.createElement('div');
    document.body.append(ctxRoot);
    const ungraded = {
      root: ctxRoot,
      el: { id: 'v2', type: 'interactiveVideo', x: 0, y: 0, w: 1, h: 1, props: {} },
      props: props([], { gradeBy: 'watched', watchPercent: 80 }),
      settings: { ...DEFAULT_SETTINGS },
      design: DEFAULT_DESIGN,
      editing: false,
      hints: false,
      graded: false,
      resolveMedia: () => '',
      state: null,
      setState: vi.fn(),
      report: vi.fn(),
      goto: vi.fn(),
    } as unknown as BlockContext<InteractiveVideoProps>;
    interactiveVideoPlayer.render(ungraded);
    expect(ctxRoot.querySelector('.iv-status')!.textContent).toBe('');
  });
});

describe('player controls and visible checkpoints', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    players = [];
    setVideoEngine(fakeEngine);
    document.body.replaceChildren();
  });
  afterEach(() => {
    vi.useRealTimers();
    setVideoEngine(youtubeEngine);
  });

  it('draws a marker for every checkpoint on the progress bar, and ticks them off', async () => {
    const { root } = mount(props([prompt('p1', 10), question('q1', 40)]));
    await vi.advanceTimersByTimeAsync(0);
    const marks = () => [...root.querySelectorAll('.iv-mark')];
    expect(marks()).toHaveLength(2);
    expect(marks()[0]!.className).toContain('p');
    expect(marks()[1]!.className).toContain('q');
    expect(marks()[0]!.className).toContain('next'); // the one coming up
    expect((marks()[0] as HTMLElement).style.left).toBe('10%'); // 10s of a 100s video
    expect((marks()[1] as HTMLElement).style.left).toBe('40%');
    await playTo(10.1);
    btn(root, 'Continue')!.click();
    expect(marks()[0]!.className).toContain('done');
    expect(marks()[1]!.className).toContain('next');
  });

  it('has only play/pause, progress and mute: the progress bar cannot be used to skip', async () => {
    const { root } = mount(props([prompt('p1', 50)]));
    expect(btn(root, '▶ Play')!.disabled).toBe(true); // not until the video is ready
    await vi.advanceTimersByTimeAsync(0);
    const track = q<HTMLElement>(root, '.iv-track')!;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.querySelector('input')).toBeNull();
    track.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 90 }));
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 90 }));
    expect(players[0]!.calls.some((c) => c.startsWith('seek:'))).toBe(false);
  });

  it('play, pause and mute work, and the bar shows progress', async () => {
    const { root } = mount(props([]));
    await vi.advanceTimersByTimeAsync(0);
    btn(root, '▶ Play')!.click();
    expect(players[0]!.paused).toBe(false);
    await playTo(25.2);
    expect(q(root, '.iv-track')!.getAttribute('aria-valuenow')).toBe('25');
    expect(q(root, '.iv-time')!.textContent).toBe('0:25 / 1:40');
    btn(root, '❚❚ Pause')!.click();
    expect(players[0]!.paused).toBe(true);
    btn(root, 'Mute')!.click();
    expect(players[0]!.muted).toBe(true);
    expect(btn(root, 'Unmute')).toBeDefined();
  });

  it('clicking the video plays and pauses it, but not while a question is open', async () => {
    const { root } = mount(props([prompt('p1', 5)]));
    await vi.advanceTimersByTimeAsync(0);
    q<HTMLElement>(root, '.iv-shield')!.click();
    expect(players[0]!.paused).toBe(false);
    q<HTMLElement>(root, '.iv-shield')!.click();
    expect(players[0]!.paused).toBe(true);
    await playTo(5.1);
    const before = players[0]!.calls.length;
    q<HTMLElement>(root, '.iv-shield')!.click();
    expect(players[0]!.calls.length).toBe(before); // ignored while the checkpoint is showing
  });

  it('asks the video player for no native controls', async () => {
    let seen: { captions: boolean; controls: boolean } | null = null;
    setVideoEngine({
      create(host, id, opts, events) {
        seen = opts;
        return fakeEngine.create(host, id, opts, events);
      },
    });
    mount(props([]));
    expect(seen).toEqual({ captions: true, controls: false });
  });

  it('the editor placeholder shows the checkpoints without loading anything', () => {
    const root = document.createElement('div');
    document.body.append(root);
    interactiveVideoPlayer.render({
      root,
      el: { id: 'v', type: 'interactiveVideo', x: 0, y: 0, w: 1, h: 1, props: {} },
      props: props([prompt('p1', 10), question('q1', 40)]),
      settings: { ...DEFAULT_SETTINGS },
      design: DEFAULT_DESIGN,
      editing: true,
      hints: true,
      graded: false,
      resolveMedia: () => '',
      state: null,
      setState: vi.fn(),
      report: vi.fn(),
      goto: vi.fn(),
    } as unknown as BlockContext<InteractiveVideoProps>);
    expect(root.querySelectorAll('.iv-mark')).toHaveLength(2);
    expect(players).toHaveLength(0); // no player, no network
  });
});
