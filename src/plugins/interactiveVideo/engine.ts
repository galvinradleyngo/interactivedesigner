/**
 * The video player behind a small interface, so the interaction logic can be tested with a fake
 * player. The real implementation uses YouTube's IFrame Player API (needs an internet connection).
 */

export interface VideoPlayer {
  play(): void;
  pause(): void;
  /** Current position in seconds. */
  getTime(): number;
  seek(seconds: number): void;
  destroy(): void;
}

export type PlayState = 'playing' | 'paused' | 'ended' | 'other';

export interface VideoEvents {
  onReady(): void;
  onState(state: PlayState): void;
  /** The video could not be loaded or played (blocked, offline, removed, embedding disabled). */
  onError(message: string): void;
}

export interface VideoEngine {
  create(
    host: HTMLElement,
    videoId: string,
    options: { captions: boolean },
    events: VideoEvents,
  ): VideoPlayer;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YTApi {
  Player: new (el: HTMLElement, options: unknown) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_URL = 'https://www.youtube.com/iframe_api';
let apiPromise: Promise<YTApi> | null = null;

function loadApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player unavailable'));
    };
    const s = document.createElement('script');
    s.src = API_URL;
    s.async = true;
    s.onerror = () => {
      apiPromise = null; // allow a retry
      reject(new Error('Could not reach YouTube'));
    };
    document.head.append(s);
  });
  return apiPromise;
}

const ERRORS: Record<number, string> = {
  2: 'This video link is not valid.',
  5: 'The video could not be played in this browser.',
  100: 'This video was not found or is private.',
  101: 'The owner of this video does not allow it to be embedded.',
  150: 'The owner of this video does not allow it to be embedded.',
};

export const youtubeEngine: VideoEngine = {
  create(host, videoId, options, events) {
    let yt: YTPlayer | null = null;
    let destroyed = false;
    const mount = document.createElement('div');
    host.append(mount);
    const failTimer = setTimeout(() => {
      if (!yt && !destroyed)
        events.onError(
          'The video did not load. It needs an internet connection that allows YouTube.',
        );
    }, 12000);

    loadApi().then(
      (api) => {
        if (destroyed) return;
        const secure = location.protocol === 'http:' || location.protocol === 'https:';
        yt = new api.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            playsinline: 1,
            fs: 0, // our questions are drawn over the video, which YouTube's own full screen would hide
            iv_load_policy: 3,
            cc_load_policy: options.captions ? 1 : 0,
            ...(secure ? { origin: location.origin } : {}),
          },
          events: {
            onReady: () => {
              clearTimeout(failTimer);
              events.onReady();
            },
            onStateChange: (e: { data: number }) =>
              events.onState(
                e.data === 1
                  ? 'playing'
                  : e.data === 2
                    ? 'paused'
                    : e.data === 0
                      ? 'ended'
                      : 'other',
              ),
            onError: (e: { data: number }) =>
              events.onError(ERRORS[e.data] ?? 'The video could not be played.'),
          },
        });
      },
      (err: Error) => {
        clearTimeout(failTimer);
        if (!destroyed) events.onError(err.message);
      },
    );

    return {
      play: () => yt?.playVideo(),
      pause: () => yt?.pauseVideo(),
      getTime: () => (yt ? yt.getCurrentTime() : 0),
      seek: (s) => yt?.seekTo(s, true),
      destroy: () => {
        destroyed = true;
        clearTimeout(failTimer);
        try {
          yt?.destroy();
        } catch {
          /* already gone */
        }
        mount.remove();
      },
    };
  },
};

let engine: VideoEngine = youtubeEngine;
/** Swap the engine (tests use a fake player). */
export function setVideoEngine(e: VideoEngine): void {
  engine = e;
}
export const getVideoEngine = (): VideoEngine => engine;
