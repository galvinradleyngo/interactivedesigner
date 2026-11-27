import { migrate } from '../schema/migrate';
import type { ActivityDoc, Design, ScormVersion } from '../schema/types';
import { connect } from '../scorm/api';
import { Reporter } from '../scorm/reporter';
import type { PlayerContext } from '../plugins/types';
import { getPlayerPlugin } from './registry';

export interface MountOptions {
  /** 'scorm' reports to an LMS if found; 'preview' never reports. */
  mode: 'scorm' | 'preview';
  scormVersion?: ScormVersion;
  /** Use window objects from here (tests). */
  win?: Window;
}

const FONTS: Record<Design['font'], string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, Consolas, "Courier New", monospace',
};

export function applyDesign(
  root: HTMLElement,
  design: Design,
  resolve: (r: string) => string,
): void {
  const s = root.style;
  s.setProperty('--primary', design.primary);
  s.setProperty('--bg', design.background);
  s.setProperty('--text', design.text);
  s.setProperty('--radius', `${design.radius}px`);
  s.setProperty('--font', FONTS[design.font] ?? FONTS.system);
  s.backgroundImage = design.backgroundImage ? `url("${resolve(design.backgroundImage)}")` : '';
}

export function mount(container: HTMLElement, raw: unknown, opts: MountOptions): () => void {
  const doc: ActivityDoc = migrate(raw);
  const win = opts.win ?? window;
  const mediaMap = new Map(doc.media.map((m) => [m.id, m.src]));
  const resolveMedia = (ref: string | null | undefined): string => {
    if (!ref) return '';
    return ref.startsWith('media:') ? (mediaMap.get(ref.slice(6)) ?? '') : ref;
  };

  const adapter =
    opts.mode === 'scorm' ? connect(opts.scormVersion ?? doc.settings.scormVersion, win) : null;
  const reporter = new Reporter(adapter, doc.settings.passingScore);
  const restored = reporter.start();

  const plugin = getPlayerPlugin(doc.type);
  container.classList.add('ap-root');
  container.replaceChildren();
  applyDesign(container, doc.design, resolveMedia);

  if (!plugin) {
    container.textContent = `Unknown activity type: ${doc.type}`;
    return () => undefined;
  }

  const ctx: PlayerContext = {
    root: container,
    doc,
    resolveMedia,
    restored,
    saveProgress: (s) => reporter.saveProgress(s),
    finish: (score) => reporter.finish(score),
    reset: () => reporter.reset(),
  };
  plugin.render(ctx);

  const end = () => reporter.terminate();
  win.addEventListener('pagehide', end);
  win.addEventListener('beforeunload', end);
  return () => {
    win.removeEventListener('pagehide', end);
    win.removeEventListener('beforeunload', end);
    end();
  };
}
