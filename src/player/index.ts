import './styles.css';
import { mount } from './runtime';
import type { MountOptions } from './runtime';

export { mount };

/**
 * Exported packages embed the project as JSON in #activity-data (no network needed).
 * `data-mode` is 'scorm' there; the authoring preview sets 'preview' and `data-start`.
 */
function autoBoot(): void {
  const el = document.getElementById('activity-data');
  const target = document.getElementById('app');
  if (!el || !target) return;
  const raw = JSON.parse(el.textContent ?? 'null') as unknown;
  const mode = (el.getAttribute('data-mode') as MountOptions['mode']) ?? 'scorm';
  const start = Number(el.getAttribute('data-start'));
  mount(target, raw, { mode, startPage: Number.isFinite(start) ? start : undefined });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoBoot);
else autoBoot();
