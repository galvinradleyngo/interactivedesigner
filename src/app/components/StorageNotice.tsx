import { useEffect, useState } from 'react';
import { onStorageBlocked } from '../store';

/** Explains why the app is waiting when storage is blocked by another (older) tab. */
export function StorageNotice() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => onStorageBlocked(setBlocked), []);
  if (!blocked) return null;
  return (
    <p role="alert" className="banner error">
      <span>
        Waiting for another tab. Your saved activities are held by another tab or window of
        Interactive Designer, possibly an older one, or one stuck on “Loading…”. Close{' '}
        <strong>all</strong> other tabs and windows of this site (or quit and reopen the browser),
        and this page will continue by itself. Nothing has been lost.
      </span>
    </p>
  );
}
