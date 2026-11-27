import { useEffect, useState } from 'react';
import { onStorageBlocked } from '../store';

/** Explains why the app is waiting when storage is blocked by another (older) tab. */
export function StorageNotice() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => onStorageBlocked(setBlocked), []);
  if (!blocked) return null;
  return (
    <p role="alert" className="banner error">
      Waiting for another tab. An older copy of Interactive Designer is open in another tab or
      window and is holding your saved projects. Close that tab (or reload it), and this page will
      continue automatically. Nothing has been lost.
    </p>
  );
}
