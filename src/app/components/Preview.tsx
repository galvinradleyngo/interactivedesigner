import { useEffect, useState } from 'react';
import type { ProjectDoc } from '../../schema/types';
import { pruneMedia } from '../editor/model';
import { fetchPlayerAssets, indexHtml } from '../export';
import { Icon } from './Icon';

/** Full-screen preview: the real player, never reporting to an LMS. */
export function PreviewModal({
  doc,
  startPage,
  onClose,
}: {
  doc: ProjectDoc;
  startPage: number;
  onClose(): void;
}) {
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    let live = true;
    void fetchPlayerAssets().then(
      (a) => live && setSrcDoc(indexHtml(doc.title, pruneMedia(doc), 'preview', a, startPage)),
    );
    return () => {
      live = false;
    };
    // The preview is a snapshot taken when it opens; it does not follow later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Preview">
      <div className="modal-bar">
        <strong>Preview</strong>
        <span className="muted">Interact as a learner would. Nothing is saved or reported.</span>
        <button type="button" onClick={onClose} autoFocus>
          <Icon name="close" size={16} /> Close
        </button>
      </div>
      <iframe title="Project preview" sandbox="allow-scripts" srcDoc={srcDoc} />
    </div>
  );
}
