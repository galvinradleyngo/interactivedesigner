import type { ScormVersion } from '../schema/types';

/** Minimal shapes of the two SCORM runtime APIs. */
export interface Api12 {
  LMSInitialize(s: string): string;
  LMSFinish(s: string): string;
  LMSGetValue(k: string): string;
  LMSSetValue(k: string, v: string): string;
  LMSCommit(s: string): string;
  LMSGetLastError(): string;
}
export interface Api2004 {
  Initialize(s: string): string;
  Terminate(s: string): string;
  GetValue(k: string): string;
  SetValue(k: string, v: string): string;
  Commit(s: string): string;
  GetLastError(): string;
}

/** Walk up parent windows, then the opener chain, looking for the API object. */
export function findApi<T>(start: Window, name: 'API' | 'API_1484_11'): T | null {
  const probe = (w: Window): T | null => {
    let cur: Window = w;
    for (let i = 0; i < 20; i++) {
      try {
        const candidate = (cur as unknown as Record<string, unknown>)[name];
        if (candidate) return candidate as T;
      } catch {
        return null; // cross-origin
      }
      if (!cur.parent || cur.parent === cur) return null;
      cur = cur.parent;
    }
    return null;
  };
  const direct = probe(start);
  if (direct) return direct;
  try {
    if (start.opener) return probe(start.opener as Window);
  } catch {
    /* ignore */
  }
  return null;
}

/** Version-neutral adapter used by the reporter. */
export interface ScormAdapter {
  readonly version: ScormVersion;
  initialize(): boolean;
  getSuspendData(): string;
  setSuspendData(data: string): void;
  setScore(raw: number, min: number, max: number): void;
  setCompletion(completed: boolean): void;
  setSuccess(passed: boolean): void;
  setSessionTime(seconds: number): void;
  commit(): void;
  terminate(): void;
}

/** ISO 8601 duration for SCORM 2004, e.g. PT1H2M3S. */
export function isoDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
}
/** HHHH:MM:SS for SCORM 1.2. */
export function clockDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(s / 3600), 4)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export class Scorm12Adapter implements ScormAdapter {
  readonly version = '1.2' as const;
  private completed = false;
  private success: boolean | null = null;
  constructor(private api: Api12) {}

  initialize(): boolean {
    return String(this.api.LMSInitialize('')) === 'true';
  }
  getSuspendData(): string {
    return this.api.LMSGetValue('cmi.suspend_data') || '';
  }
  setSuspendData(data: string): void {
    this.api.LMSSetValue('cmi.suspend_data', data);
  }
  setScore(raw: number, min: number, max: number): void {
    this.api.LMSSetValue('cmi.core.score.min', String(min));
    this.api.LMSSetValue('cmi.core.score.max', String(max));
    this.api.LMSSetValue('cmi.core.score.raw', String(raw));
  }
  setCompletion(completed: boolean): void {
    this.completed = completed;
    this.writeStatus();
  }
  setSuccess(passed: boolean): void {
    this.success = passed;
    this.writeStatus();
  }
  private writeStatus(): void {
    // SCORM 1.2 has a single lesson_status: pass/fail wins over completed.
    const status =
      this.success === true
        ? 'passed'
        : this.success === false
          ? 'failed'
          : this.completed
            ? 'completed'
            : 'incomplete';
    this.api.LMSSetValue('cmi.core.lesson_status', status);
    this.api.LMSSetValue('cmi.core.exit', this.completed ? '' : 'suspend');
  }
  setSessionTime(seconds: number): void {
    this.api.LMSSetValue('cmi.core.session_time', clockDuration(seconds));
  }
  commit(): void {
    this.api.LMSCommit('');
  }
  terminate(): void {
    this.api.LMSFinish('');
  }
}

export class Scorm2004Adapter implements ScormAdapter {
  readonly version = '2004' as const;
  constructor(private api: Api2004) {}

  initialize(): boolean {
    return String(this.api.Initialize('')) === 'true';
  }
  getSuspendData(): string {
    return this.api.GetValue('cmi.suspend_data') || '';
  }
  setSuspendData(data: string): void {
    this.api.SetValue('cmi.suspend_data', data);
  }
  setScore(raw: number, min: number, max: number): void {
    this.api.SetValue('cmi.score.min', String(min));
    this.api.SetValue('cmi.score.max', String(max));
    this.api.SetValue('cmi.score.raw', String(raw));
    const range = max - min;
    const scaled = range > 0 ? Math.min(1, Math.max(-1, (raw - min) / range)) : 0;
    this.api.SetValue('cmi.score.scaled', String(Number(scaled.toFixed(4))));
  }
  setCompletion(completed: boolean): void {
    this.api.SetValue('cmi.completion_status', completed ? 'completed' : 'incomplete');
    this.api.SetValue('cmi.exit', completed ? 'normal' : 'suspend');
  }
  setSuccess(passed: boolean): void {
    this.api.SetValue('cmi.success_status', passed ? 'passed' : 'failed');
  }
  setSessionTime(seconds: number): void {
    this.api.SetValue('cmi.session_time', isoDuration(seconds));
  }
  commit(): void {
    this.api.Commit('');
  }
  terminate(): void {
    this.api.Terminate('');
  }
}

/** Locate the LMS API for the requested version; null when running standalone. */
export function connect(version: ScormVersion, win: Window = window): ScormAdapter | null {
  if (version === '1.2') {
    const api = findApi<Api12>(win, 'API');
    return api ? new Scorm12Adapter(api) : null;
  }
  const api = findApi<Api2004>(win, 'API_1484_11');
  return api ? new Scorm2004Adapter(api) : null;
}
