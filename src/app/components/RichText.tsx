import { useEffect, useRef } from 'react';
import { sanitizeHtml } from '../../schema/html';

const BTNS: { cmd: string; label: string; title: string; arg?: string }[] = [
  { cmd: 'bold', label: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'I', title: 'Italic' },
  { cmd: 'underline', label: 'U', title: 'Underline' },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
];

/** Small contentEditable editor; output is sanitized on every change. */
export function RichText({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange(html: string): void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value && document.activeElement !== el)
      el.innerHTML = sanitizeHtml(value);
  }, [value]);

  const emit = () => ref.current && onChange(sanitizeHtml(ref.current.innerHTML));
  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  return (
    <div className="rt">
      <div className="rt-bar" role="toolbar" aria-label={`${label} formatting`}>
        {BTNS.map((b) => (
          <button
            key={b.cmd}
            type="button"
            title={b.title}
            aria-label={b.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(b.cmd, b.arg)}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          aria-label="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt('Link address (https://…)');
            if (url) run('createLink', url);
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        className="rt-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
