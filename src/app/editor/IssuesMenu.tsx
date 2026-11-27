import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import type { Issue } from './checks';

/** Top-bar button listing unfinished things; each entry jumps to the page and element. */
export function IssuesMenu({ issues, onGo }: { issues: Issue[]; onGo(issue: Issue): void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (issues.length === 0) return null;
  return (
    <div className="issues" ref={box}>
      <button
        type="button"
        className="warnbtn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="warn" size={15} /> {issues.length} to finish
      </button>
      {open && (
        <div className="issues-pop" role="dialog" aria-label="Things to finish">
          <p className="muted">
            These are not errors, but learners would see an empty or unscored activity.
          </p>
          <ul>
            {issues.map((it, i) => (
              <li key={`${it.elementId}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    onGo(it);
                    setOpen(false);
                  }}
                >
                  <strong>{it.pageName}</strong> · {it.block} {it.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
