import './styles.css';
import { mount } from './runtime';
import type { MountOptions } from './runtime';

export { mount };

/**
 * Exported packages embed the activity as JSON in #activity-data (no network needed).
 * `mode` is 'scorm' there; the authoring preview calls mount() with mode 'preview'.
 */
function autoBoot(): void {
  const el = document.getElementById('activity-data');
  const target = document.getElementById('app');
  if (!el || !target) return;
  const raw = JSON.parse(el.textContent ?? 'null') as unknown;
  const mode = (el.getAttribute('data-mode') as MountOptions['mode']) ?? 'scorm';
  mount(target, raw, { mode });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoBoot);
else autoBoot();
