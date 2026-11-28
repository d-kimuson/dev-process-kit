import { clipTimeAt, fadeAt, voicedAt, type Timeline } from './model';

/** Seconds an audio clip may run ahead of or behind the video's clock before it is moved back in step. */
const DRIFT = 0.3;
/** Milliseconds a clip that was just started or moved plays before its drift counts: the output starts late. */
const SETTLE = 600;
/** Seconds a ducking track takes to move about two thirds of the way to its new volume. */
const DUCK_EASE = 0.2;
/** A file that does not answer by then plays as silence instead of holding the video. */
const METADATA_TIMEOUT = 8000;
/** `HTMLMediaElement.readyState` values (HTML spec). */
const HAVE_METADATA = 1;
const HAVE_FUTURE_DATA = 3;

type Clip = {
  readonly audio: HTMLAudioElement;
  readonly start: number;
  readonly end: number;
  readonly loop: boolean;
  readonly length: number | null;
  readonly volume: number;
  readonly duck: number | null;
  readonly fade: number;
};

/** How far the audio is from where it should be; a looping clip measures around the loop. */
const drift = (clip: Clip, actual: number, expected: number): number => {
  const gap = Math.abs(actual - expected);
  return clip.loop && clip.length !== null ? Math.min(gap, clip.length - gap) : gap;
};

const lengthOf = (audio: HTMLAudioElement): Promise<number | null> =>
  new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      audio.removeEventListener('loadedmetadata', done);
      audio.removeEventListener('error', done);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.addEventListener('loadedmetadata', done);
    audio.addEventListener('error', done);
    const timer = setTimeout(done, METADATA_TIMEOUT);
    if (audio.readyState >= HAVE_METADATA) done();
  });

/**
 * Plays every recorded cue and track of a video against one clock that it does not own. Each clip is an `<audio>` of
 * its own, started, stopped and moved by `sync()`: a clip is moved only when it drifts past `DRIFT`, so the
 * sound stays smooth without frame-exact timing, and a track with a `duck` volume eases down while a recorded cue
 * plays. Files load only their metadata until the video first plays.
 */
export class VideoMixer {
  readonly #audios = new Map<string, HTMLAudioElement>();
  #clips: readonly Clip[] = [];
  /** How far each ducking clip has eased down, from 0 (its volume) to 1 (its duck volume). */
  readonly #ducked = new Map<Clip, number>();
  /** When each clip last started or moved; its drift is not corrected for `SETTLE` after. */
  readonly #moved = new Map<Clip, number>();
  #lastSync = 0;
  #timeline: Timeline | null = null;
  #volume = 1;
  #muted = false;

  #buffering = false;

  /** Loads each file's metadata and resolves with its length (`null` for a file that failed to load). */
  async measure(sources: readonly string[], resolveUrl: (src: string) => string): Promise<Map<string, number | null>> {
    this.#release();
    const lengths = await Promise.all(
      sources.map(async (src) => {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = resolveUrl(src);
        this.#audios.set(src, audio);
        return [src, await lengthOf(audio)] as const;
      }),
    );
    return new Map(lengths);
  }

  /** Builds one clip per cue with audio and per track; a file used twice gets a second `<audio>`. */
  load(timeline: Timeline): void {
    this.stop();
    this.#timeline = timeline;
    this.#buffering = false;
    this.#ducked.clear();
    this.#moved.clear();
    const used = new Set<string>();
    const audioFor = (src: string): HTMLAudioElement | null => {
      const source = this.#audios.get(src);
      if (source === undefined) return null;
      if (!used.has(src)) {
        used.add(src);
        return source;
      }
      const copy = new Audio();
      copy.preload = source.preload;
      copy.src = source.src;
      return copy;
    };
    const clips: Clip[] = [];
    for (const cue of timeline.scenes.flatMap((scene) => scene.cues)) {
      const audio = cue.audio === undefined ? null : audioFor(cue.audio);
      if (audio === null) continue;
      clips.push({
        audio,
        start: cue.start,
        end: cue.end,
        loop: false,
        length: null,
        volume: 1,
        duck: null,
        fade: 0,
      });
    }
    for (const track of timeline.tracks) {
      const audio = audioFor(track.audio);
      if (audio === null) continue;
      clips.push({
        audio,
        start: track.start,
        end: track.end,
        loop: track.loop,
        length: track.length,
        volume: track.volume,
        duck: track.duck ?? null,
        fade: track.fade,
      });
      audio.loop = track.loop;
    }
    this.#clips = clips;
  }

  setVolume(volume: number, muted: boolean): void {
    this.#volume = Math.min(1, Math.max(0, volume));
    this.#muted = muted;
  }

  /** Puts every clip where the clock says. `jump` moves them at once, after a seek or a start. */
  sync(time: number, playing: boolean, jump: boolean): void {
    const timeline = this.#timeline;
    if (timeline === null) return;
    if (playing && !this.#buffering) {
      this.#buffering = true;
      for (const { audio } of this.#clips) audio.preload = 'auto';
    }
    const now = performance.now();
    const ease = 1 - Math.exp(-(now - this.#lastSync) / 1000 / DUCK_EASE);
    this.#lastSync = now;
    const speaking = voicedAt(timeline, time);
    for (const clip of this.#clips) {
      const { audio } = clip;
      const local = playing ? clipTimeAt(clip, time) : null;
      if (local === null) {
        if (!audio.paused) audio.pause();
        continue;
      }
      const starting = jump || audio.paused;
      if (starting || (this.#settled(clip, now) && drift(clip, audio.currentTime, local) > DRIFT)) {
        audio.currentTime = local;
        this.#moved.set(clip, now);
      }
      const ducked = Number(speaking && clip.duck !== null);
      const mix = starting ? ducked : (this.#ducked.get(clip) ?? ducked) * (1 - ease) + ducked * ease;
      this.#ducked.set(clip, mix);
      const level = clip.volume + ((clip.duck ?? clip.volume) - clip.volume) * mix;
      audio.muted = this.#muted;
      audio.volume = Math.min(1, Math.max(0, level * fadeAt(clip, time) * this.#volume));
      if (audio.paused) audio.play().catch(() => {});
    }
  }

  /** A clip that is loading, seeking or just started reports a time behind the sound; it is not moved then. */
  #settled(clip: Clip, now: number): boolean {
    const { audio } = clip;
    return (
      !audio.seeking && audio.readyState >= HAVE_FUTURE_DATA && now - (this.#moved.get(clip) ?? -Infinity) >= SETTLE
    );
  }

  stop(): void {
    for (const { audio } of this.#clips) audio.pause();
  }

  /** Lets go of the files of the data before, so a replaced video does not keep downloading them. */
  #release(): void {
    this.stop();
    for (const audio of new Set([...this.#audios.values(), ...this.#clips.map((clip) => clip.audio)])) {
      audio.removeAttribute('src');
      audio.load();
    }
    this.#audios.clear();
    this.#clips = [];
  }
}
