/** Shared, framework-free types. Imported by both the authoring app and the player. */

export const SCHEMA_VERSION = 4;

/** Interactions that can be graded. Must match the `gradable` flag in plugins/defs (tested). */
export const GRADABLE_TYPES: readonly string[] = ['multipleChoice', 'dragDrop', 'interactiveVideo'];

/** Logical stage size. Element rects are in these units and scale to any screen. */
export const STAGE_W = 960;
export const STAGE_H = 540;

/** Page shapes. The logical width is always STAGE_W; only the height changes. */
export type PageShape = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export const PAGE_SHAPES: { id: PageShape; label: string; hint: string; h: number }[] = [
  { id: '16:9', label: 'Widescreen 16:9', hint: 'Desktop and laptop, slides', h: 540 },
  { id: '4:3', label: 'Standard 4:3', hint: 'Tablets held sideways, classic slides', h: 720 },
  { id: '1:1', label: 'Square 1:1', hint: 'Works on any screen', h: 960 },
  { id: '3:4', label: 'Portrait tablet 3:4', hint: 'Tablets held upright', h: 1280 },
  { id: '9:16', label: 'Portrait phone 9:16', hint: 'Phones held upright', h: 1707 },
];
/** Logical page height for a design (defaults to widescreen). */
export function stageHeight(design: { pageShape?: PageShape } | undefined): number {
  return PAGE_SHAPES.find((s) => s.id === design?.pageShape)?.h ?? STAGE_H;
}

export type ScormVersion = '2004' | '1.2';

export interface ProjectSettings {
  /** Passing score as a percentage, 0-100. */
  passingScore: number;
  scormVersion: ScormVersion;
  showFeedback: boolean;
  allowRetry: boolean;
  /**
   * true = graded: gradable interactions count toward a score that is reported to the LMS.
   * false (the default) = no scores, points or pass/fail anywhere; only completion is reported.
   */
  graded: boolean;
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
  pageShape: PageShape;
  /** Colour around the page in the player. Empty = transparent (blends with the LMS page). */
  surround: string;
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
  graded: false,
};

export const DEFAULT_DESIGN: Design = {
  primary: '#4f46e5',
  background: '#ffffff',
  text: '#1f2937',
  font: 'system',
  radius: 12,
  backgroundImage: null,
  pageShape: '16:9',
  surround: '',
};

/** Result of scoring: raw points earned out of max. */
export interface ScoreResult {
  raw: number;
  max: number;
}

export function percent(s: ScoreResult): number {
  return s.max > 0 ? Math.round((s.raw / s.max) * 100) : 0;
}
