import { useCallback, useReducer } from 'react';

interface State<T> {
  past: T[];
  present: T | null;
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

type Action<T> =
  | { type: 'reset'; value: T }
  | { type: 'set'; value: T; key?: string; now: number }
  | { type: 'undo' }
  | { type: 'redo' };

const LIMIT = 100;
const COALESCE_MS = 1200;

function reducer<T>(s: State<T>, a: Action<T>): State<T> {
  switch (a.type) {
    case 'reset':
      return { past: [], present: a.value, future: [], lastKey: null, lastAt: 0 };
    case 'set': {
      if (s.present === null) return s;
      const same = a.key !== undefined && a.key === s.lastKey && a.now - s.lastAt < COALESCE_MS;
      // Edits with the same key in quick succession (typing, one drag) form one undo step.
      const past = same ? s.past : [...s.past, s.present].slice(-LIMIT);
      return { past, present: a.value, future: [], lastKey: a.key ?? null, lastAt: a.now };
    }
    case 'undo': {
      const prev = s.past[s.past.length - 1];
      if (prev === undefined || s.present === null) return s;
      return {
        past: s.past.slice(0, -1),
        present: prev,
        future: [s.present, ...s.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case 'redo': {
      const next = s.future[0];
      if (next === undefined || s.present === null) return s;
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
  }
}

/** Undo/redo state. `change(fn, key)` coalesces consecutive edits that share a key. */
export function useHistory<T>() {
  const [s, dispatch] = useReducer(reducer as (s: State<T>, a: Action<T>) => State<T>, {
    past: [],
    present: null,
    future: [],
    lastKey: null,
    lastAt: 0,
  });
  return {
    present: s.present,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
    reset: useCallback((value: T) => dispatch({ type: 'reset', value }), []),
    set: useCallback(
      (value: T, key?: string) => dispatch({ type: 'set', value, key, now: Date.now() }),
      [],
    ),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
  };
}

export { reducer as historyReducer };
export type { State as HistoryState };
