import * as v from 'valibot';

import type { ElementActionResult } from '../../core/element-actions';
import type { DraftAction } from '../../core/types';

import { elementRefSegments } from '../../core/board-model';

/**
 * One timed moment of a scene: a caption, a recording, or only a mark that CSS and scripts can follow. Its
 * length comes from `duration`, else its audio, else the time it takes to read its text; a cue with none of
 * them is a mark of no length: it places a time for CSS and scripts and never becomes the current cue.
 */
export type VideoCue = {
  /** Names the cue for CSS (`--dpk-cue-<id>`, `cue="<id>"`); the cue's index in its scene otherwise. */
  readonly id?: string;
  /** The caption shown while the cue plays. */
  readonly text?: string;
  /** Whose voice the caption is (like WebVTT's `<v>`): shown before it unless the caption has a tone. */
  readonly voice?: string;
  /** The caption's color preset; wins over its voice's. */
  readonly tone?: CaptionTone;
  /** A recording, relative to the page. Its length sets the cue's length. */
  readonly audio?: string;
  /** Seconds; wins over the audio's own length. */
  readonly duration?: number;
  /** Seconds after the scene starts. Without it the cue follows the one before, with the pacing between. */
  readonly at?: number;
};

/** The color presets of a caption: a fill with an outline that keeps it readable on any picture. */
export const CAPTION_TONES = ['white', 'yellow', 'green', 'pink', 'blue', 'orange'] as const;
export type CaptionTone = (typeof CAPTION_TONES)[number];

/** How the captions of one voice look. */
export type VideoVoice = {
  readonly tone?: CaptionTone;
};

/** A reviewer's note kept with the video: written in the player, carried into the JSON by the agent. */
export type VideoNote = {
  readonly id: string;
  /** Seconds after the scene starts; without it the note is on the whole scene. */
  readonly at?: number;
  readonly body: string;
};

export type VideoScene = {
  readonly id: string;
  readonly title: string;
  readonly cues: readonly VideoCue[];
  readonly notes: readonly VideoNote[];
  /** Seconds. A scene without cues needs one; with cues it is the scene's shortest length. */
  readonly duration?: number;
};

export type VideoTrack = {
  readonly audio: string;
  readonly volume: number;
  /** The volume while a cue with audio plays. */
  readonly duck?: number;
  readonly loop: boolean;
  /** The scene the track starts with (the first by default). */
  readonly from?: string;
  /** The last scene the track plays through (the last by default). */
  readonly to?: string;
  /** Seconds after the start of `from`. */
  readonly offset: number;
  /** Seconds the track fades in over at its start and out over at its end. */
  readonly fade: number;
};

/** Seconds of silence around the cues that have no `at`. */
export type VideoPacing = {
  /** Before the first cue of a scene. */
  readonly lead: number;
  /** Between two cues. */
  readonly gap: number;
  /** After the last cue of a scene. */
  readonly tail: number;
};

export type VideoData = {
  readonly scenes: readonly VideoScene[];
  readonly tracks: readonly VideoTrack[];
  readonly pacing: VideoPacing;
  /** By the `voice` of the cues. */
  readonly voices: Readonly<Record<string, VideoVoice>>;
  /** Seconds one scene's picture crossfades into the next one's; 0 cuts. */
  readonly fade: number;
};

export type TimedCue = VideoCue & {
  /** `id`, or the cue's index in its scene. */
  readonly key: string;
  /** `tone`, else the tone of its voice. */
  readonly captionTone: CaptionTone | null;
  readonly start: number;
  readonly end: number;
};

export type TimedScene = {
  readonly id: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly cues: readonly TimedCue[];
};

export type TimedTrack = VideoTrack & {
  readonly start: number;
  readonly end: number;
  /** The audio's own length; `null` until it is known. */
  readonly length: number | null;
};

export type Timeline = {
  readonly duration: number;
  readonly scenes: readonly TimedScene[];
  readonly tracks: readonly TimedTrack[];
};

export const DEFAULT_PACING: VideoPacing = { lead: 0, gap: 0, tail: 0 };
export const DEFAULT_FADE = 0.45;

/** Seconds per character of a caption with neither audio nor a duration: about the speed of reading it. */
const READING_PACE = 0.12;
const SHORTEST_CAPTION = 1.5;

const graphemes = new Intl.Segmenter();

const ID = /^[A-Za-z0-9_-]+$/;
const id = (what: string) => v.pipe(v.string(), v.regex(ID, `${what} may only contain letters, digits, "_" and "-"`));

const seconds = v.pipe(v.number(), v.minValue(0));
const level = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

const cueSchema = v.strictObject({
  id: v.exactOptional(id('a cue id')),
  text: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  voice: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  tone: v.exactOptional(v.picklist(CAPTION_TONES)),
  audio: v.exactOptional(v.pipe(v.string(), v.minLength(1))),
  duration: v.exactOptional(seconds),
  at: v.exactOptional(seconds),
});

const noteSchema = v.strictObject({
  id: id('a note id'),
  at: v.exactOptional(seconds),
  body: v.pipe(v.string(), v.minLength(1)),
});

const sceneSchema = v.strictObject({
  id: id('a scene id'),
  title: v.pipe(v.string(), v.minLength(1)),
  cues: v.optional(v.array(cueSchema), []),
  notes: v.optional(v.array(noteSchema), []),
  duration: v.exactOptional(seconds),
});

const trackSchema = v.strictObject({
  audio: v.pipe(v.string(), v.minLength(1)),
  volume: v.optional(level, 1),
  duck: v.exactOptional(level),
  loop: v.optional(v.boolean(), false),
  from: v.exactOptional(v.string()),
  to: v.exactOptional(v.string()),
  offset: v.optional(seconds, 0),
  fade: v.optional(seconds, 0),
});

const videoSchema = v.strictObject({
  scenes: v.pipe(v.array(sceneSchema), v.minLength(1)),
  tracks: v.optional(v.array(trackSchema), []),
  pacing: v.optional(
    v.strictObject({
      lead: v.optional(seconds, DEFAULT_PACING.lead),
      gap: v.optional(seconds, DEFAULT_PACING.gap),
      tail: v.optional(seconds, DEFAULT_PACING.tail),
    }),
    DEFAULT_PACING,
  ),
  voices: v.optional(
    v.record(v.pipe(v.string(), v.minLength(1)), v.strictObject({ tone: v.exactOptional(v.picklist(CAPTION_TONES)) })),
    {},
  ),
  fade: v.optional(seconds, DEFAULT_FADE),
});

export const emptyVideoData = (): VideoData => ({
  scenes: [],
  tracks: [],
  pacing: DEFAULT_PACING,
  voices: {},
  fade: DEFAULT_FADE,
});

export const parseVideoData = (input: unknown): VideoData => {
  const data = v.parse(videoSchema, input);
  const order = new Map<string, number>();
  const notes = new Set<string>();
  for (const [index, scene] of data.scenes.entries()) {
    if (order.has(scene.id)) throw new Error(`duplicate scene id: ${scene.id}`);
    for (const note of scene.notes) {
      if (notes.has(note.id)) throw new Error(`duplicate note id: ${note.id}`);
      notes.add(note.id);
    }
    order.set(scene.id, index);
    if (scene.cues.length === 0 && scene.duration === undefined)
      throw new Error(`scene ${scene.id}: a scene without cues needs a duration`);
    const keys = new Set<string>();
    for (const [at, cue] of scene.cues.entries()) {
      const key = cue.id ?? String(at);
      if (keys.has(key)) throw new Error(`scene ${scene.id}: duplicate cue id "${key}"`);
      keys.add(key);
    }
  }
  for (const track of data.tracks) {
    for (const scene of [track.from, track.to]) {
      if (scene !== undefined && !order.has(scene)) throw new Error(`track ${track.audio}: unknown scene "${scene}"`);
    }
    if ((order.get(track.from ?? '') ?? 0) > (order.get(track.to ?? '') ?? Infinity))
      throw new Error(`track ${track.audio}: "from" comes after "to"`);
  }
  return data;
};

/** Every audio file the video plays, each once. */
export const audioSources = (data: VideoData): readonly string[] => [
  ...new Set([
    ...data.scenes.flatMap((scene) => scene.cues.flatMap((cue) => (cue.audio === undefined ? [] : [cue.audio]))),
    ...data.tracks.map((track) => track.audio),
  ]),
];

const cueLength = (cue: VideoCue, lengthOf: (src: string) => number | null): number =>
  cue.duration ??
  (cue.audio === undefined ? null : lengthOf(cue.audio)) ??
  (cue.text === undefined ? 0 : Math.max(SHORTEST_CAPTION, [...graphemes.segment(cue.text)].length * READING_PACE));

/**
 * Places every scene, cue and track on one clock. A cue lasts as long as its audio (`lengthOf`), so the video
 * follows the recording whenever it is regenerated. A cue with `at` sits where it says; the others follow the
 * cue before them, and the pacing adds the silence around them.
 */
export const layoutTimeline = (data: VideoData, lengthOf: (src: string) => number | null): Timeline => {
  const { lead, gap, tail } = data.pacing;
  let clock = 0;
  const scenes = data.scenes.map((scene): TimedScene => {
    const start = clock;
    let previous: number | null = null;
    let end = start + (scene.duration ?? 0);
    const cues = scene.cues.map((cue, index): TimedCue => {
      const cueStart = cue.at !== undefined ? start + cue.at : previous === null ? start + lead : previous + gap;
      const timed = {
        ...cue,
        key: cue.id ?? String(index),
        captionTone: cue.tone ?? (cue.voice === undefined ? undefined : data.voices[cue.voice]?.tone) ?? null,
        start: cueStart,
        end: cueStart + cueLength(cue, lengthOf),
      };
      previous = timed.end;
      end = Math.max(end, timed.end + (cue.at === undefined ? tail : 0));
      return timed;
    });
    clock = end;
    return { id: scene.id, title: scene.title, start, end, cues };
  });
  const duration = clock;
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const tracks = data.tracks.map((track): TimedTrack => {
    const length = lengthOf(track.audio);
    const start = (track.from === undefined ? 0 : (sceneById.get(track.from)?.start ?? 0)) + track.offset;
    const until = track.to === undefined ? duration : (sceneById.get(track.to)?.end ?? duration);
    const end = track.loop || length === null ? until : Math.min(until, start + length);
    return { ...track, start, end, length };
  });
  return { duration, scenes, tracks };
};

/** The scene playing at `time`: the last one that has started. */
export const sceneIndexAt = (timeline: Timeline, time: number): number => {
  let index = 0;
  for (const [at, scene] of timeline.scenes.entries()) if (time >= scene.start) index = at;
  return index;
};

/** The latest-starting cue of the current scene that plays at `time`; `linger` keeps it a little after its end. */
export const cueAt = (timeline: Timeline, time: number, linger = 0): TimedCue | null => {
  const cues = timeline.scenes[sceneIndexAt(timeline, time)]?.cues ?? [];
  let found: TimedCue | null = null;
  for (const cue of cues)
    if (time >= cue.start && time < cue.end + linger && (found === null || cue.start >= found.start)) found = cue;
  return found;
};

/** Whether a recording plays at `time`, which is when the ducking tracks go down. */
export const voicedAt = (timeline: Timeline, time: number): boolean =>
  timeline.scenes.some((scene) =>
    scene.cues.some((cue) => cue.audio !== undefined && time >= cue.start && time < cue.end),
  );

/**
 * Where a clip's audio should be at `time`: seconds into the file, or `null` while it is silent.
 * A looping clip wraps around its own length.
 */
export const clipTimeAt = (
  clip: { readonly start: number; readonly end: number; readonly loop?: boolean; readonly length: number | null },
  time: number,
): number | null => {
  if (time < clip.start || time >= clip.end) return null;
  const local = time - clip.start;
  if (clip.loop === true && clip.length !== null && clip.length > 0) return local % clip.length;
  return local;
};

/** How loud a clip with a `fade` is at `time`, from 0 to 1. */
export const fadeAt = (
  clip: { readonly start: number; readonly end: number; readonly fade?: number },
  time: number,
): number => {
  const fade = clip.fade ?? 0;
  if (fade <= 0) return 1;
  return Math.min(1, Math.max(0, Math.min(time - clip.start, clip.end - time) / fade));
};

/** `m:ss`, or `h:mm:ss` from an hour on. */
export const formatTime = (time: number): string => {
  const whole = Math.max(0, Math.floor(time));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const ref = (segments: readonly string[]): string =>
  `element:${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;

export const sceneTarget = (id: string, scene: string): string => ref([id, 'scene', scene]);

/**
 * A moment of the video: its scene and whole milliseconds into it. Naming the scene keeps the comment on
 * its picture when a recording before it changes length.
 */
export const momentTarget = (id: string, timeline: Timeline, time: number): string => {
  const scene = timeline.scenes[sceneIndexAt(timeline, time)];
  if (scene === undefined) return ref([id, 'at', '0']);
  return ref([id, 'scene', scene.id, 'at', String(Math.max(0, Math.round((time - scene.start) * 1000)))]);
};

export type Moment = { readonly scene: TimedScene; readonly time: number };

/**
 * The scene and the time a target of this video names: a moment, or with `scenes` also a whole scene (its
 * start). `null` for any other target or an unknown scene.
 */
export const momentOf = (
  id: string,
  timeline: Timeline,
  target: string,
  { scenes = false }: { readonly scenes?: boolean } = {},
): Moment | null => {
  const prefix = `${ref([id, 'scene'])}/`;
  if (!target.startsWith(prefix)) return null;
  const match = /^([^/]+)(?:\/at\/(\d+))?$/.exec(target.slice(prefix.length));
  if (match === null || (match[2] === undefined && !scenes)) return null;
  const scene = timeline.scenes.find((candidate) => candidate.id === decodeURIComponent(match[1] ?? ''));
  if (scene === undefined) return null;
  return { scene, time: Math.min(scene.end, scene.start + Number(match[2] ?? 0) / 1000) };
};

export const ADD_NOTE = 'ADD_NOTE';

const addNotePayload = v.strictObject({
  id: id('a note id'),
  at: v.exactOptional(seconds),
  body: v.pipe(v.string(), v.minLength(1)),
});

export type NoteTitles = {
  readonly noteTitle: (scene: string) => string;
};

/**
 * Replays the reviewer's `ADD_NOTE` actions over the authored scenes: each adds a note to the scene its target
 * names (`element:<id>/scene/<scene>`). A note whose id the scenes already hold was carried into the JSON, or
 * is a second one with that id; either way it is not added again.
 */
export const replayNotes = (
  m: NoteTitles,
  data: VideoData,
  actions: readonly DraftAction[],
): { readonly data: VideoData; readonly results: readonly ElementActionResult[] } => {
  const notes = new Map(data.scenes.map((scene) => [scene.id, [...scene.notes]]));
  const ids = new Set(data.scenes.flatMap((scene) => scene.notes.map((note) => note.id)));
  const results = actions.map((action): ElementActionResult => {
    if (action.type !== ADD_NOTE) return { id: action.id, title: action.type, stale: 'unsupported-action-type' };
    const segments = elementRefSegments(action.target.id);
    const sceneId = segments?.length === 3 && segments[1] === 'scene' ? segments[2] : undefined;
    const scene = data.scenes.find((candidate) => candidate.id === sceneId);
    const list = scene === undefined ? undefined : notes.get(scene.id);
    if (scene === undefined || list === undefined)
      return { id: action.id, title: m.noteTitle(sceneId ?? action.target.id), stale: 'target-missing' };
    const payload = v.safeParse(addNotePayload, action.payload);
    const title = m.noteTitle(scene.title);
    if (!payload.success || ids.has(payload.output.id)) return { id: action.id, title, stale: 'constraint-violated' };
    ids.add(payload.output.id);
    list.push(payload.output);
    return { id: action.id, title, summary: payload.output.body, tone: 'create' };
  });
  return {
    data: { ...data, scenes: data.scenes.map((scene) => ({ ...scene, notes: notes.get(scene.id) ?? scene.notes })) },
    results,
  };
};
