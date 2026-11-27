import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../app/components/Icon';
import { youtubeEngine, type VideoPlayer } from './engine';
import { formatTime } from './type';

interface Props {
  videoId: string;
  captions: boolean;
  onAdd(kind: 'prompt' | 'question', time: number): void;
}

/** Load the real video in the editor so checkpoints can be placed by watching, not by typing times. */
export function Scrubber({ videoId, captions, onAdd }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<VideoPlayer | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [time, setTime] = useState(0);

  // A different video link means starting again.
  useEffect(() => {
    return () => {
      player.current?.destroy();
      player.current = null;
      setState('idle');
    };
  }, [videoId]);

  useEffect(() => {
    if (state !== 'loading' || !host.current) return;
    player.current = youtubeEngine.create(
      host.current,
      videoId,
      { captions },
      {
        onReady: () => setState('ready'),
        onState: () => undefined,
        onError: (m) => {
          setError(m);
          setState('error');
        },
      },
    );
  }, [state, videoId, captions]);

  useEffect(() => {
    if (state !== 'ready') return;
    const t = setInterval(() => setTime(player.current?.getTime() ?? 0), 250);
    return () => clearInterval(t);
  }, [state]);

  if (state === 'idle' || state === 'error') {
    return (
      <div className="scrub">
        {state === 'error' && (
          <p className="warn" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setError('');
            setState('loading');
          }}
        >
          <Icon name="play" size={15} />{' '}
          {state === 'error' ? 'Try loading the video again' : 'Load the video to pick times'}
        </button>
        <p className="muted">
          Loads the video from YouTube (needs an internet connection). Play or scrub it, then add a
          checkpoint where it is.
        </p>
      </div>
    );
  }

  const at = Math.round(time);
  return (
    <div className="scrub">
      <div className="scrub-host" ref={host} />
      {state === 'loading' && <p className="muted">Loading video…</p>}
      {state === 'ready' && (
        <div className="row wrap">
          <span className="scrub-time" aria-live="off">
            {formatTime(time)}
          </span>
          <button type="button" className="primary" onClick={() => onAdd('question', at)}>
            <Icon name="plus" size={15} /> Question at {formatTime(at)}
          </button>
          <button type="button" onClick={() => onAdd('prompt', at)}>
            <Icon name="plus" size={15} /> Prompt at {formatTime(at)}
          </button>
        </div>
      )}
    </div>
  );
}
