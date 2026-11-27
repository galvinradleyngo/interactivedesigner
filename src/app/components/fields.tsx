import { useState, type ReactNode } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <span className="num">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v))
              onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
    </Field>
  );
}

export function Txt({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/** Colour input; an empty value means "use the project default". */
export function Color({
  label,
  value,
  onChange,
  fallback = '#000000',
  clearable = false,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  fallback?: string;
  clearable?: boolean;
}) {
  return (
    <Field label={label}>
      <span className="color">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="color-hex">{value || 'default'}</span>
        {clearable && value && (
          <button type="button" className="link" onClick={() => onChange('')}>
            Reset
          </button>
        )}
      </span>
    </Field>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const secKey = (title: string) => `idsec:${title.replace(/\s*\(\d+\)$/, '')}`;
const readOpen = (title: string, dflt: boolean): boolean => {
  try {
    const v = localStorage.getItem(secKey(title));
    return v === null ? dflt : v === '1';
  } catch {
    return dflt;
  }
};

/** An inspector section that can be folded away. The choice is remembered per section title. */
export function Section({
  title,
  children,
  actions,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => readOpen(title, defaultOpen));
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(secKey(title), open ? '0' : '1');
    } catch {
      /* not saved: still works for this visit */
    }
  };
  return (
    <section className={`section ${open ? '' : 'is-closed'}`}>
      <div className="section-head">
        <button type="button" className="section-toggle" aria-expanded={open} onClick={toggle}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="chev">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h3>{title}</h3>
        </button>
        {open && actions}
      </div>
      {open && children}
    </section>
  );
}
