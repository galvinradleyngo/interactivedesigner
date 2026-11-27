/** Shared, framework-free types. Imported by both the authoring app and the player. */

export const SCHEMA_VERSION = 2;

/** Logical stage size. Element rects are in these units and scale to any screen. */
export const STAGE_W = 960;
export const STAGE_H = 540;

export type ScormVersion = '2004' | '1.2';

export interface ProjectSettings {
  /** Passing score as a percentage, 0-100. */
  passingScore: number;
  scormVersion: ScormVersion;
  showFeedback: boolean;
  allowRetry: boolean;
}

export type FontChoice = 'system' | 'serif' | 'rounded' | 'mono';

/** Project-wide look; pages can override the background. */
export interface Design {
  primary: string;
  background: string;
  text: string;
  font: FontChoice;
  radius: number;
  /** `media:<id>` reference or null. */
  backgroundImage: string | null;
}

export interface MediaItem {
  id: string;
  /** data: URI, http(s) URL, or (after export) a relative path inside the package. */
  src: string;
  name: string;
  mime: string;
}

export interface StageElement {
  id: string;
  /** Block type: 'text' | 'image' | 'shape' | 'button' or an activity type. */
  type: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
  hidden?: boolean;
  props: Record<string, unknown>;
}

export interface Page {
  id: string;
  name: string;
  /** Overrides the project background when set. */
  background?: string;
  /** undefined = inherit, null = none, string = media ref. */
  backgroundImage?: string | null;
  /** Painted bottom to top. */
  elements: StageElement[];
}

export interface ProjectDoc {
  schemaVersion: number;
  title: string;
  settings: ProjectSettings;
  design: Design;
  pages: Page[];
  media: MediaItem[];
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  passingScore: 80,
  scormVersion: '2004',
  showFeedback: true,
  allowRetry: true,
};

export const DEFAULT_DESIGN: Design = {
  primary: '#4f46e5',
  background: '#ffffff',
  text: '#1f2937',
  font: 'system',
  radius: 12,
  backgroundImage: null,
};

/** Result of scoring: raw points earned out of max. */
export interface ScoreResult {
  raw: number;
  max: number;
}

export function percent(s: ScoreResult): number {
  return s.max > 0 ? Math.round((s.raw / s.max) * 100) : 0;
}
