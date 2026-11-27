import { SCHEMA_VERSION, DEFAULT_DESIGN, DEFAULT_SETTINGS, type ActivityDoc } from './types';

/**
 * Upgrade a stored activity to the current schema. Add one `if (v < N)` block
 * per schema bump so old activities keep loading.
 */
export function migrate(input: unknown): ActivityDoc {
  if (!input || typeof input !== 'object') throw new Error('Activity is not an object');
  const d = { ...(input as Record<string, unknown>) };
  let v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;

  if (v < 1) {
    d.settings = { ...DEFAULT_SETTINGS, ...(d.settings as object) };
    d.design = { ...DEFAULT_DESIGN, ...(d.design as object) };
    d.media = Array.isArray(d.media) ? d.media : [];
    v = 1;
  }
  if (v > SCHEMA_VERSION) throw new Error(`Activity schema v${v} is newer than this app`);

  d.schemaVersion = SCHEMA_VERSION;
  d.settings = { ...DEFAULT_SETTINGS, ...(d.settings as object) };
  d.design = { ...DEFAULT_DESIGN, ...(d.design as object) };
  return d as unknown as ActivityDoc;
}
