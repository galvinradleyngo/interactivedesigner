import type { BlockTypeDef } from '../types';
import { scoreQuestion } from '../multipleChoice/score';
import type { McQuestion } from '../multipleChoice/type';

export interface VideoOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

/** A pause point in the video: a prompt to read, or a multiple-choice question. */
export interface VideoCheckpoint {
  id: string;
  /** Seconds from the start of the video. */
  time: number;
  kind: 'prompt' | 'question';
  title: string;
  /** Rich text: the prompt, or the question. */
  html: string;
  multi: boolean;
  options: VideoOption[];
}

export interface InteractiveVideoProps {
  points: number;
  /** What the author pasted (any YouTube link, or a bare video id). */
  url: string;
  /** Questions must be answered correctly (retry until right) before the video continues. */
  requireCorrect: boolean;
  /** Show YouTube captions when the video starts. */
  captions: boolean;
  /** Video length in seconds (0 = not known yet). Filled in when the video is loaded in the editor. */
  duration: number;
  /** What earns the points when the activity is graded. */
  gradeBy: 'questions' | 'watched';
  /** For gradeBy 'watched': the share of the video (percent) the learner must watch for full marks. */
  watchPercent: number;
  checkpoints: VideoCheckpoint[];
}

/** Learner state: which checkpoints are done, and the first answer given to each question. */
export interface VideoState {
  /** Last position, seconds (to resume). */
  t: number;
  a: Record<string, { sel: number[]; ok: boolean }>;
  /** Furthest point reached by actually watching, seconds. */
  w?: number;
  /** Video length seen by the player, seconds. */
  d?: number;
}

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-character video id from a YouTube link (watch, youtu.be, embed, shorts, live) or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  if (ID.test(s)) return s;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.split('/')[1] ?? '';
    return ID.test(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && ID.test(v)) return v;
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:[/?]|$)/);
    if (m) return m[1] as string;
  }
  return null;
}

/** 83 -> "1:23", 3725 -> "1:02:05". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/**
 * Length of the timeline in seconds: the real video length when known, otherwise enough room
 * for the checkpoints so markers are still visible before the video has been loaded.
 */
export function timelineScale(p: Pick<InteractiveVideoProps, 'duration' | 'checkpoints'>): number {
  const last = p.checkpoints.reduce((m, c) => Math.max(m, c.time), 0);
  if (p.duration > 0) return Math.max(p.duration, last);
  return Math.max(60, Math.ceil(last * 1.15));
}

/** Position on a timeline as a percentage (0..100). */
export const timelinePercent = (time: number, scale: number): number =>
  scale > 0 ? Math.min(100, Math.max(0, (time / scale) * 100)) : 0;

export const sortedCheckpoints = (cps: readonly VideoCheckpoint[]): VideoCheckpoint[] =>
  [...cps].sort((a, b) => a.time - b.time);

const asQuestion = (c: VideoCheckpoint): McQuestion => ({
  id: c.id,
  text: c.html,
  multi: c.multi,
  shuffle: false,
  options: c.options,
});

/** Question checkpoints that can be marked right or wrong. */
export const gradableQuestions = (p: InteractiveVideoProps): VideoCheckpoint[] =>
  p.checkpoints.filter((c) => c.kind === 'question' && c.options.some((o) => o.correct));

/** Average of the first-attempt scores over the question checkpoints (0..1). */
export function videoFraction(
  p: InteractiveVideoProps,
  state: Pick<VideoState, 'a'> | null,
): number {
  const qs = gradableQuestions(p);
  if (qs.length === 0) return 0;
  let sum = 0;
  for (const c of qs) sum += scoreQuestion(asQuestion(c), state?.a[c.id]?.sel ?? []);
  return sum / qs.length;
}

/** Percent of the video watched, from the furthest point reached (0..100). */
export function watchedPercent(furthest: number, duration: number): number {
  return duration > 0 ? Math.min(100, (Math.max(0, furthest) / duration) * 100) : 0;
}

/** Clamp a setting typed by an author to a sensible 1..100. */
export const clampWatchPercent = (n: number): number =>
  Number.isFinite(n) ? Math.min(100, Math.max(1, Math.round(n))) : 90;

/** Has the learner watched enough? A small allowance absorbs the last fraction of a second. */
export function hasWatchedEnough(furthest: number, duration: number, percent: number): boolean {
  if (duration <= 0) return false;
  return furthest >= duration * (clampWatchPercent(percent) / 100) - 0.5;
}

/** Full marks (1) once enough of the video has been watched, otherwise 0. */
export function watchedFraction(
  p: Pick<InteractiveVideoProps, 'watchPercent' | 'duration'>,
  state: Pick<VideoState, 'w' | 'd'> | null,
): number {
  if (!state) return 0;
  return hasWatchedEnough(state.w ?? 0, state.d || p.duration, p.watchPercent) ? 1 : 0;
}

/** First-attempt score for one question checkpoint (0..1). */
export const checkpointScore = (c: VideoCheckpoint, selected: readonly number[]): number =>
  scoreQuestion(asQuestion(c), selected);

export const interactiveVideoDef: BlockTypeDef<InteractiveVideoProps> = {
  type: 'interactiveVideo',
  label: 'Interactive video',
  description:
    'A YouTube video that pauses for prompts and questions the learner must answer to continue.',
  category: 'interaction',
  icon: 'video',
  gradable: true,
  defaultSize: { w: 760, h: 440 },
  createDefault: () => ({
    points: 10,
    url: '',
    requireCorrect: false,
    captions: true,
    duration: 0,
    gradeBy: 'questions',
    watchPercent: 90,
    checkpoints: [],
  }),
  isScored: (p) => p.gradeBy === 'watched' || gradableQuestions(p).length > 0,
  fraction: (p, state) =>
    p.gradeBy === 'watched'
      ? watchedFraction(p, state as VideoState | null)
      : videoFraction(p, state as VideoState | null),
};
