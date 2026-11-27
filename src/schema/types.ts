/** Shared, framework-free types. Imported by both the authoring app and the player. */

export const SCHEMA_VERSION = 1;

export type ScormVersion = '2004' | '1.2';

export interface ActivitySettings {
  /** Passing score as a percentage, 0-100. */
  passingScore: number;
  scormVersion: ScormVersion;
  showFeedback: boolean;
  allowRetry: boolean;
}

export type FontChoice = 'system' | 'serif' | 'rounded' | 'mono';

/** Per-activity visual design (no global themes). */
export interface Design {
  primary: string;
  background: string;
  text: string;
  font: FontChoice;
  radius: number;
  /** `media:<id>` reference, a URL, or null. */
  backgroundImage: string | null;
}

export interface MediaItem {
  id: string;
  /** data: URI, http(s) URL, or (after export) a relative path inside the package. */
  src: string;
  name: string;
  mime: string;
}

export interface ActivityDoc<C = unknown> {
  schemaVersion: number;
  type: string;
  title: string;
  settings: ActivitySettings;
  design: Design;
  content: C;
  media: MediaItem[];
}

export const DEFAULT_SETTINGS: ActivitySettings = {
  passingScore: 80,
  scormVersion: '2004',
  showFeedback: true,
  allowRetry: true,
};

export const DEFAULT_DESIGN: Design = {
  primary: '#1d4ed8',
  background: '#ffffff',
  text: '#1f2937',
  font: 'system',
  radius: 10,
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
