import { describe, expect, it } from 'vitest';
import {
  Scorm12Adapter,
  Scorm2004Adapter,
  clockDuration,
  findApi,
  isoDuration,
} from '../scorm/api';
import type { Api12, Api2004 } from '../scorm/api';
import { Reporter } from '../scorm/reporter';
import { SUSPEND_LIMIT_12, decodeSuspend, encodeSuspend } from '../scorm/suspend';

function mock12(store: Record<string, string> = {}) {
  const calls: string[] = [];
  const api: Api12 = {
    LMSInitialize: () => (calls.push('Initialize'), 'true'),
    LMSFinish: () => (calls.push('Finish'), 'true'),
    LMSGetValue: (k) => store[k] ?? '',
    LMSSetValue: (k, v) => ((store[k] = v), calls.push(`Set ${k}=${v}`), 'true'),
    LMSCommit: () => (calls.push('Commit'), 'true'),
    LMSGetLastError: () => '0',
  };
  return { api, calls, store };
}
function mock2004(store: Record<string, string> = {}) {
  const calls: string[] = [];
  const api: Api2004 = {
    Initialize: () => (calls.push('Initialize'), 'true'),
    Terminate: () => (calls.push('Terminate'), 'true'),
    GetValue: (k) => store[k] ?? '',
    SetValue: (k, v) => ((store[k] = v), calls.push(`Set ${k}=${v}`), 'true'),
    Commit: () => (calls.push('Commit'), 'true'),
    GetLastError: () => '0',
  };
  return { api, calls, store };
}

describe('SCORM 2004 reporting', () => {
  it('initializes, reports score/completion/success, commits, terminates', () => {
    const m = mock2004();
    let t = 0;
    const r = new Reporter(new Scorm2004Adapter(m.api), 80, () => t);
    r.start();
    r.update({ score: { raw: 90, max: 100 }, completed: true });
    t = 65_000;
    r.terminate();
    r.terminate(); // idempotent
    expect(m.calls[0]).toBe('Initialize');
    expect(m.store['cmi.score.raw']).toBe('90');
    expect(m.store['cmi.score.min']).toBe('0');
    expect(m.store['cmi.score.max']).toBe('100');
    expect(m.store['cmi.score.scaled']).toBe('0.9');
    expect(m.store['cmi.completion_status']).toBe('completed');
    expect(m.store['cmi.success_status']).toBe('passed');
    expect(m.store['cmi.session_time']).toBe('PT0H1M5S');
    expect(m.calls.filter((c) => c === 'Terminate')).toHaveLength(1);
    expect(m.calls.at(-1)).toBe('Terminate');
    expect(m.calls[m.calls.length - 2]).toBe('Commit');
  });
  it('fails below the passing score', () => {
    const m = mock2004();
    const r = new Reporter(new Scorm2004Adapter(m.api), 80);
    r.start();
    r.update({ score: { raw: 79, max: 100 }, completed: true });
    expect(m.store['cmi.success_status']).toBe('failed');
    expect(m.store['cmi.score.scaled']).toBe('0.79');
  });
});

describe('SCORM 1.2 reporting', () => {
  it('uses cmi.core.* and a single lesson_status', () => {
    const m = mock12();
    const r = new Reporter(new Scorm12Adapter(m.api), 80);
    r.start();
    expect(m.store['cmi.core.lesson_status']).toBe('incomplete');
    r.update({ score: { raw: 50, max: 100 }, completed: true });
    expect(m.store['cmi.core.score.raw']).toBe('50');
    expect(m.store['cmi.core.score.max']).toBe('100');
    expect(m.store['cmi.core.lesson_status']).toBe('failed');
    r.terminate();
    expect(m.calls.at(-1)).toBe('Finish');
    expect(m.store['cmi.core.session_time']).toMatch(/^\d{4}:\d{2}:\d{2}$/);
  });
  it('reports passed', () => {
    const m = mock12();
    const r = new Reporter(new Scorm12Adapter(m.api), 80);
    r.start();
    r.update({ score: { raw: 100, max: 100 }, completed: true });
    expect(m.store['cmi.core.lesson_status']).toBe('passed');
  });
});

describe('ungraded reporting (no score)', () => {
  it('2004: reports completion only, never score or success', () => {
    const m = mock2004();
    const r = new Reporter(new Scorm2004Adapter(m.api), 80);
    r.start();
    r.update({ score: null, completed: true });
    expect(m.store['cmi.completion_status']).toBe('completed');
    expect(m.store['cmi.score.raw']).toBeUndefined();
    expect(m.store['cmi.score.scaled']).toBeUndefined();
    expect(m.store['cmi.success_status']).toBeUndefined();
  });
  it('1.2: status is completed, with no score fields', () => {
    const m = mock12();
    const r = new Reporter(new Scorm12Adapter(m.api), 80);
    r.start();
    r.update({ score: null, completed: true });
    expect(m.store['cmi.core.lesson_status']).toBe('completed');
    expect(m.store['cmi.core.score.raw']).toBeUndefined();
  });
});

describe('suspend_data', () => {
  it('saves and restores progress', () => {
    const m = mock2004();
    const r1 = new Reporter(new Scorm2004Adapter(m.api), 80);
    r1.start();
    r1.saveProgress({ i: 2, a: [[0], [1]] });
    const r2 = new Reporter(new Scorm2004Adapter(m.api), 80);
    expect(r2.start()).toEqual({ i: 2, a: [[0], [1]] });
  });
  it('skips saving when 1.2 limit exceeded', () => {
    const big = { x: 'a'.repeat(SUSPEND_LIMIT_12) };
    expect(encodeSuspend(big, SUSPEND_LIMIT_12)).toBeNull();
    const m = mock12();
    const r = new Reporter(new Scorm12Adapter(m.api), 80);
    r.start();
    r.saveProgress(big);
    expect(m.store['cmi.suspend_data']).toBeUndefined();
  });
  it('decodes garbage as null', () => {
    expect(decodeSuspend('{nope')).toBeNull();
    expect(decodeSuspend('')).toBeNull();
  });
});

describe('standalone (no LMS)', () => {
  it('is a no-op without an adapter', () => {
    const r = new Reporter(null, 80);
    expect(r.start()).toBeNull();
    expect(() => {
      r.saveProgress({});
      r.update({ score: { raw: 1, max: 1 }, completed: true });
      r.terminate();
    }).not.toThrow();
    expect(r.connected).toBe(false);
  });
});

describe('findApi', () => {
  it('walks up parent windows', () => {
    const api = {};
    const top = { API_1484_11: api } as unknown as Window;
    const mid = { parent: top } as unknown as Window;
    const leaf = { parent: mid } as unknown as Window;
    (top as unknown as { parent: Window }).parent = top;
    expect(findApi(leaf, 'API_1484_11')).toBe(api);
    expect(findApi(leaf, 'API')).toBeNull();
  });
  it('falls back to the opener chain', () => {
    const api = {};
    const opener = { API: api } as unknown as Window;
    (opener as unknown as { parent: Window }).parent = opener;
    const self = { opener } as unknown as Window;
    (self as unknown as { parent: Window }).parent = self;
    expect(findApi(self, 'API')).toBe(api);
  });
});

describe('durations', () => {
  it('formats session time', () => {
    expect(isoDuration(3723)).toBe('PT1H2M3S');
    expect(clockDuration(3723)).toBe('0001:02:03');
  });
});
