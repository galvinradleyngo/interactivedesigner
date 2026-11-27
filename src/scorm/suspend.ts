/** SCORM 1.2 caps cmi.suspend_data at 4096 characters. */
export const SUSPEND_LIMIT_12 = 4096;
/** 2004 4th Ed. allows 64000; stay well inside it. */
export const SUSPEND_LIMIT_2004 = 64000;

/** Serialize progress, or return null if it would exceed the limit. */
export function encodeSuspend(state: unknown, limit: number): string | null {
  const s = JSON.stringify(state);
  return s.length <= limit ? s : null;
}

export function decodeSuspend(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
