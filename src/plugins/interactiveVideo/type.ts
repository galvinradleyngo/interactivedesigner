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
  checkpoints: VideoCheckpoint[];
}

/** Learner state: which checkpoints are done, and the first answer given to each question. */
export interface VideoState {
  /** Last position, seconds (to resume). */
  t: number;
  a: Record<string, { sel: number[]; ok: boolean }>;
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
    checkpoints: [],
  }),
  isScored: (p) => gradableQuestions(p).length > 0,
  fraction: (p, state) => videoFraction(p, state as VideoState | null),
};
