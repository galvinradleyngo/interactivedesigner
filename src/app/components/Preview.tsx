import { useEffect, useState } from 'react';
import type { ActivityDoc } from '../../schema/types';
import { fetchPlayerAssets, indexHtml } from '../export';

/** Live preview: the real player in a sandboxed iframe (never reports to an LMS). */
export function Preview({ doc }: { doc: ActivityDoc }) {
  const [assets, setAssets] = useState<{ js: string; css: string } | null>(null);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    fetchPlayerAssets().then(setAssets, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!assets) return;
    const t = setTimeout(() => {
      const media = doc.media; // data:/https: sources work directly inside srcdoc
      setHtml(indexHtml(doc.title, { ...doc, media }, 'preview', assets));
    }, 400);
    return () => clearTimeout(t);
  }, [doc, assets, nonce]);

  if (error) return <p role="alert">Preview unavailable: {error}</p>;
  return (
    <div className="preview">
      <div className="preview-bar">
        <strong>Live preview</strong>
        <button type="button" onClick={() => setNonce((n) => n + 1)}>
          Restart
        </button>
      </div>
      <iframe title="Activity preview" sandbox="allow-scripts" srcDoc={html} />
    </div>
  );
}
