import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../app/components/Icon';
import { beginDrag } from '../../app/editor/drag';
import type { OverlayProps } from '../../app/editor/types';
import { youtubeEngine, type VideoPlayer } from './engine';
import { newCheckpoint } from './Panel';
import {
  formatTime,
  parseYouTubeId,
  sortedCheckpoints,
  timelinePercent,
  timelineScale,
  type InteractiveVideoProps,
} from './type';

/**
 * On-canvas editing: the video with a timeline under it. Click the timeline to move the video, drag a
 * checkpoint to retime it, or add a question or prompt exactly where the video is.
 */
export function InteractiveVideoOverlay({
  props,
  onChange,
  sub,
  setSub,
  boxRef,
  hint,
}: OverlayProps<InteractiveVideoProps>) {
  const videoId = parseYouTubeId(props.url);
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const player = useRef<VideoPlayer | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(0);
  const latest = useRef({ props, onChange });
  latest.current = { props, onChange };
  const scale = timelineScale(props);
  const list = sortedCheckpoints(props.checkpoints);

  // A different video means starting again; leaving edit mode releases the player.
  useEffect(
    () => () => {
      player.current?.destroy();
      player.current = null;
    },
    [videoId],
  );

  useEffect(() => {
    if (state !== 'loading' || !host.current || !videoId) return;
    player.current = youtubeEngine.create(
      host.current,
      videoId,
      { captions: latest.current.props.captions, controls: true },
      {
        onReady: () => setState('ready'),
        onState: () => undefined,
        onError: (m) => {
          setError(m);
          setState('error');
        },
      },
    );
  }, [state, videoId]);

  useEffect(() => {
    if (state !== 'ready') return;
    const t = setInterval(() => {
      const p = player.current;
      if (!p) return;
      setCursor(p.getTime());
      const d = Math.round(p.getDuration());
      const cur = latest.current;
      if (d > 0 && cur.props.duration !== d)
        cur.onChange({ ...cur.props, duration: d }, 'duration');
    }, 250);
    return () => clearInterval(t);
  }, [state]);

  const setTime = (id: string, time: number, key: string) => {
    const cur = latest.current;
    cur.onChange(
      {
        ...cur.props,
        checkpoints: cur.props.checkpoints.map((c) => (c.id === id ? { ...c, time } : c)),
      },
      key,
    );
  };

  const here = () =>
    Math.round(state === 'ready' && player.current ? player.current.getTime() : cursor);
  const add = (kind: 'prompt' | 'question') => {
    const c = newCheckpoint(kind, here());
    onChange({ ...props, checkpoints: [...props.checkpoints, c] });
    setSub(c.id);
  };

  const onTrackDown = (e: React.PointerEvent) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * scale);
    setCursor(t);
    player.current?.seek(t);
    setSub(null);
  };

  return (
    <div className="ovl ivo" ref={boxRef}>
      <div className="ivo-video">
        {!videoId && <p className="ivo-msg">Paste a YouTube link in the Element panel first.</p>}
        {videoId && (state === 'idle' || state === 'error') && (
          <div className="ivo-msg">
            {state === 'error' && (
              <p className="warn" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => {
                setError('');
                setState('loading');
              }}
            >
              <Icon name="play" size={15} />{' '}
              {state === 'error' ? 'Try loading the video again' : 'Load the video'}
            </button>
            <p>
              Loads it from YouTube so you can play it and add checkpoints exactly where you pause.
              You can also add checkpoints on the timeline without loading it.
            </p>
          </div>
        )}
        {videoId && (state === 'loading' || state === 'ready') && (
          <div className="ivo-host" ref={host} />
        )}
      </div>

      <div className="ivo-bar">
        <div
          className="ivo-track"
          ref={track}
          onPointerDown={onTrackDown}
          aria-label="Timeline. Click to move the video."
        >
          <div className="ivo-cursor" style={{ left: `${timelinePercent(cursor, scale)}%` }} />
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ivo-marker ${c.kind === 'question' ? 'q' : 'p'} ${sub === c.id ? 'on' : ''}`}
              style={{ left: `${timelinePercent(c.time, scale)}%` }}
              aria-label={`${c.kind === 'question' ? 'Question' : 'Prompt'} at ${formatTime(c.time)}: ${c.title}. Drag to retime, arrow keys to nudge.`}
              title={`${formatTime(c.time)} · ${c.title}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSub(c.id);
                const el = track.current;
                if (!el) return;
                const key = `ivmove-${c.id}-${Date.now()}`;
                beginDrag({
                  event: e,
                  container: el,
                  unitsW: scale,
                  unitsH: 1,
                  mode: 'move',
                  start: { x: c.time, y: 0, w: 0, h: 0 },
                  clamp: (r) => ({ ...r, x: Math.min(scale, Math.max(0, Math.round(r.x))), y: 0 }),
                  onChange: (r) => setTime(c.id, Math.round(r.x), key),
                });
              }}
              onKeyDown={(e) => {
                const d = e.shiftKey ? 5 : 1;
                const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
                if (!dx) return;
                e.preventDefault();
                e.stopPropagation();
                setTime(c.id, Math.min(scale, Math.max(0, c.time + dx)), `ivnudge-${c.id}`);
              }}
            >
              {c.kind === 'question' ? '?' : '!'}
            </button>
          ))}
        </div>
        <div className="ivo-actions">
          <span className="ivo-time">
            {formatTime(cursor)} / {formatTime(scale)}
          </span>
          <button type="button" className="primary" onClick={() => add('question')}>
            <Icon name="plus" size={14} /> Question at {formatTime(here())}
          </button>
          <button type="button" onClick={() => add('prompt')}>
            <Icon name="plus" size={14} /> Prompt at {formatTime(here())}
          </button>
        </div>
      </div>
      {hint && <div className="ovl-hint">{hint}</div>}
    </div>
  );
}
