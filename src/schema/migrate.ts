import {
  DEFAULT_DESIGN,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  STAGE_H,
  STAGE_W,
  type ProjectDoc,
} from './types';

let n = 0;
/** Id for pages/elements; also used by the editor. */
export const newKey = (prefix: string): string =>
  `${prefix}${Date.now().toString(36)}${(n++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/**
 * Upgrade a stored project to the current schema. Add one `if (v < N)` block per
 * schema bump so old files keep loading.
 *  - v0/v1: a single activity (`type` + `content`) -> v2: pages with positioned elements.
 */
export function migrate(input: unknown): ProjectDoc {
  if (!input || typeof input !== 'object') throw new Error('Project is not an object');
  const d = { ...(input as Record<string, unknown>) };
  const v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new Error(`Project schema v${v} is newer than this app`);

  if (v < 2 && !Array.isArray(d.pages)) {
    const type = typeof d.type === 'string' ? d.type : 'multipleChoice';
    const content = (d.content && typeof d.content === 'object' ? d.content : {}) as Record<string, unknown>;
    d.pages = [
      {
        id: newKey('p'),
        name: 'Page 1',
        elements: [
          {
            id: newKey('e'),
            type,
            x: 40,
            y: 30,
            w: STAGE_W - 80,
            h: STAGE_H - 60,
            props: { points: 10, ...content },
          },
        ],
      },
    ];
    delete d.type;
    delete d.content;
  }

  d.schemaVersion = SCHEMA_VERSION;
  d.title = typeof d.title === 'string' ? d.title : 'Untitled project';
  d.settings = { ...DEFAULT_SETTINGS, ...(d.settings as object) };
  d.design = { ...DEFAULT_DESIGN, ...(d.design as object) };
  d.media = Array.isArray(d.media) ? d.media : [];
  if (!Array.isArray(d.pages) || d.pages.length === 0) {
    d.pages = [{ id: newKey('p'), name: 'Page 1', elements: [] }];
  }
  return d as unknown as ProjectDoc;
}

export function newProject(title = 'Untitled project'): ProjectDoc {
  return migrate({ title, pages: [{ id: newKey('p'), name: 'Page 1', elements: [] }] });
}
