import { describe, expect, it } from 'vitest';

import {
  audioSources,
  clipTimeAt,
  cueAt,
  fadeAt,
  formatTime,
  layoutTimeline,
  momentOf,
  momentTarget,
  parseVideoData,
  replayNotes,
  sceneIndexAt,
  sceneTarget,
  voicedAt,
} from './model';

const data = parseVideoData({
  pacing: { lead: 1, gap: 0.5, tail: 2 },
  scenes: [
    {
      id: 'intro',
      title: 'Intro',
      cues: [
        { voice: 'Ann', text: 'Hello', audio: 'a.m4a' },
        { id: 'hi', text: 'Hi', duration: 1 },
      ],
    },
    { id: 'logo', title: 'Logo', duration: 4, cues: [{ id: 'flash', at: 1, duration: 0.5 }] },
    { id: 'end', title: 'End', cues: [{ text: 'abcdefghijklmnopqrst' }] },
  ],
  tracks: [
    { audio: 'bgm.m4a', volume: 0.3, duck: 0.1, loop: true },
    { audio: 'chime.m4a', from: 'logo', offset: 0.5 },
  ],
});

const lengths: Record<string, number> = { 'a.m4a': 3, 'bgm.m4a': 10, 'chime.m4a': 2 };
const timeline = layoutTimeline(data, (src) => lengths[src] ?? null);

describe('parseVideoData', () => {
  it('fills the defaults', () => {
    const parsed = parseVideoData({ scenes: [{ id: 's', title: 'S', duration: 3 }] });
    expect(parsed).toEqual({
      scenes: [{ id: 's', title: 'S', duration: 3, cues: [], notes: [] }],
      tracks: [],
      pacing: { lead: 0, gap: 0, tail: 0 },
      voices: {},
      fade: 0.45,
    });
  });

  it.each([
    [{ scenes: [] }, /Invalid length/],
    [{ scenes: [{ id: 'a b', title: 'S', duration: 1 }] }, /scene id/],
    [{ scenes: [{ id: 's', title: 'S' }] }, /a scene without cues needs a duration/],
    [
      {
        scenes: [
          { id: 's', title: 'S', duration: 1 },
          { id: 's', title: 'T', duration: 1 },
        ],
      },
      /duplicate scene id: s/,
    ],
    [{ scenes: [{ id: 's', title: 'S', cues: [{ text: 'a' }, { id: '0' }] }] }, /duplicate cue id "0"/],
    [{ scenes: [{ id: 's', title: 'S', cues: [{ speaker: 'x' }] }] }, /speaker/],
    [{ scenes: [{ id: 's', title: 'S', duration: 1 }], tracks: [{ audio: 'a', from: 'x' }] }, /unknown scene "x"/],
    [
      {
        scenes: [
          { id: 's', title: 'S', duration: 1 },
          { id: 't', title: 'T', duration: 1 },
        ],
        tracks: [{ audio: 'a', from: 't', to: 's' }],
      },
      /"from" comes after "to"/,
    ],
  ])('rejects %j', (input, message) => {
    expect(() => parseVideoData(input)).toThrow(message);
  });
});

describe('layoutTimeline', () => {
  it('lays the cues out with the pacing, each as long as its audio or its duration, keyed by id or index', () => {
    const [intro] = timeline.scenes;
    expect(intro?.cues.map(({ key, start, end }) => [key, start, end])).toEqual([
      ['0', 1, 4],
      ['hi', 4.5, 5.5],
    ]);
    expect([intro?.start, intro?.end]).toEqual([0, 7.5]);
  });

  it('places a cue with "at" from its scene start, within the scene duration', () => {
    expect(timeline.scenes[1]).toMatchObject({ start: 7.5, end: 11.5 });
    expect(timeline.scenes[1]?.cues[0]).toMatchObject({ key: 'flash', start: 8.5, end: 9 });
  });

  it('gives a caption its own tone, else the tone of its voice', () => {
    const tones = layoutTimeline(
      parseVideoData({
        voices: { Ann: { tone: 'green' } },
        scenes: [
          {
            id: 's',
            title: 'S',
            cues: [
              { voice: 'Ann', text: 'a' },
              { voice: 'Ann', tone: 'pink', text: 'b' },
              { voice: 'Bob', text: 'c' },
              { text: 'd' },
            ],
          },
        ],
      }),
      () => null,
    );
    expect(tones.scenes[0]?.cues.map((cue) => cue.captionTone)).toEqual(['green', 'pink', null, null]);
    expect(() => parseVideoData({ scenes: [{ id: 's', title: 'S', cues: [{ text: 'a', tone: 'red' }] }] })).toThrow();
  });

  it('gives a caption without audio or duration the time it takes to read it', () => {
    const end = timeline.scenes[2];
    expect(end?.cues[0]?.end).toBeCloseTo(11.5 + 1 + 2.4);
    expect(timeline.duration).toBeCloseTo(11.5 + 1 + 2.4 + 2);
  });

  it('runs a looping track from the first scene to the end, and a one-shot track for its own length', () => {
    expect(timeline.tracks.map(({ start, end }) => [start, end])).toEqual([
      [0, timeline.duration],
      [8, 10],
    ]);
  });

  it('keeps a track whose length is unknown until the end of its last scene', () => {
    const unknown = layoutTimeline(data, () => null);
    expect(unknown.tracks[1]).toMatchObject({ start: (unknown.scenes[1]?.start ?? 0) + 0.5, end: unknown.duration });
  });
});

describe('playback queries', () => {
  it('finds the scene and the cue at a time', () => {
    expect(sceneIndexAt(timeline, 0)).toBe(0);
    expect(sceneIndexAt(timeline, 7.5)).toBe(1);
    expect(sceneIndexAt(timeline, 999)).toBe(2);
    expect(cueAt(timeline, 2)).toMatchObject({ key: '0', voice: 'Ann' });
    expect(cueAt(timeline, 4.2)).toBeNull();
    expect(cueAt(timeline, 4.2, 0.25)?.text).toBe('Hello');
    expect(cueAt(timeline, 8.7)?.key).toBe('flash');
  });

  it('counts only a cue with a recording as voiced', () => {
    expect(voicedAt(timeline, 2)).toBe(true);
    expect(voicedAt(timeline, 5)).toBe(false);
    expect(voicedAt(timeline, 8.7)).toBe(false);
  });

  it('wraps a looping clip and silences a clip outside its window', () => {
    const bgm = timeline.tracks[0];
    if (bgm === undefined) throw new Error('no track');
    expect(clipTimeAt(bgm, 12.5)).toBeCloseTo(2.5);
    expect(clipTimeAt({ start: 8, end: 10, length: 2 }, 9)).toBe(1);
    expect(clipTimeAt({ start: 8, end: 10, length: 2 }, 10)).toBeNull();
    expect(clipTimeAt({ start: 8, end: 10, length: 2 }, 7)).toBeNull();
  });

  it('fades a clip in and out over its fade', () => {
    const clip = { start: 10, end: 20, fade: 2 };
    expect([9, 10, 11, 15, 19, 20].map((time) => fadeAt(clip, time))).toEqual([0, 0, 0.5, 1, 0.5, 0]);
    expect(fadeAt({ start: 10, end: 20 }, 10)).toBe(1);
  });

  it('lists each audio file once', () => {
    expect(audioSources(data)).toEqual(['a.m4a', 'bgm.m4a', 'chime.m4a']);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [2.9, '0:02'],
    [84.4, '1:24'],
    [3725, '1:02:05'],
    [-1, '0:00'],
  ])('%d → %s', (time, text) => {
    expect(formatTime(time)).toBe(text);
  });
});

describe('targets', () => {
  it('places scenes edge to edge without pacing', () => {
    const plain = layoutTimeline(
      parseVideoData({
        scenes: [
          { id: 'a', title: 'A', duration: 2 },
          { id: 'b', title: 'B', duration: 5 },
        ],
      }),
      () => null,
    );
    expect(plain.scenes.map(({ start, end }) => [start, end])).toEqual([
      [0, 2],
      [2, 7],
    ]);
  });

  it('names a scene, and a moment by its scene and the milliseconds into it', () => {
    expect(sceneTarget('promo', 'intro')).toBe('element:promo/scene/intro');
    expect(momentTarget('promo', timeline, 8.7456)).toBe('element:promo/scene/logo/at/1246');
  });

  it('reads the time back from a moment target of the same video only', () => {
    const timeOf = (target: string, scenes = false): [string, number] | null => {
      const moment = momentOf('promo', timeline, target, { scenes });
      return moment === null ? null : [moment.scene.id, moment.time];
    };
    expect(timeOf('element:promo/scene/logo/at/1246')).toEqual(['logo', 8.746]);
    expect(timeOf('element:promo/scene/logo/at/99000')).toEqual(['logo', 11.5]);
    expect(timeOf('element:other/scene/logo/at/1246')).toBeNull();
    expect(timeOf('element:promo/scene/gone/at/1')).toBeNull();
    expect(timeOf('element:promo/scene/intro')).toBeNull();
    expect(timeOf('element:promo/scene/logo', true)).toEqual(['logo', 7.5]);
  });
});

describe('notes', () => {
  const titles = { noteTitle: (scene: string) => `Note: ${scene}` };
  const action = (id: string, target: string, payload: Record<string, unknown>, type = 'ADD_NOTE') => ({
    id,
    type,
    target: { type: 'element', id: target },
    payload,
    createdAt: '2026-11-28T00:00:00.000Z',
  });
  const withNote = parseVideoData({
    scenes: [{ id: 'a', title: 'A', duration: 3, notes: [{ id: 'n1', at: 1, body: 'kept' }] }],
  });

  it('reads the notes of each scene and refuses a note id used twice', () => {
    expect(withNote.scenes[0]?.notes).toEqual([{ id: 'n1', at: 1, body: 'kept' }]);
    expect(() =>
      parseVideoData({
        scenes: [
          { id: 'a', title: 'A', duration: 1, notes: [{ id: 'n', body: 'x' }] },
          { id: 'b', title: 'B', duration: 1, notes: [{ id: 'n', body: 'y' }] },
        ],
      }),
    ).toThrow('duplicate note id: n');
  });

  it('adds a note to the scene its target names and reports the others as stale', () => {
    const replayed = replayNotes(titles, withNote, [
      action('1', 'promo/scene/a', { id: 'n2', at: 2, body: 'new' }),
      action('2', 'promo/scene/a', { id: 'n1', body: 'again' }),
      action('3', 'promo/scene/gone', { id: 'n3', body: 'lost' }),
      action('4', 'promo/scene/a', { id: 'n4' }),
      action('5', 'promo/scene/a', {}, 'DELETE_NOTE'),
    ]);
    expect(replayed.data.scenes[0]?.notes.map((note) => note.id)).toEqual(['n1', 'n2']);
    expect(replayed.results).toEqual([
      { id: '1', title: 'Note: A', summary: 'new', tone: 'create' },
      { id: '2', title: 'Note: A', stale: 'constraint-violated' },
      { id: '3', title: 'Note: gone', stale: 'target-missing' },
      { id: '4', title: 'Note: A', stale: 'constraint-violated' },
      { id: '5', title: 'DELETE_NOTE', stale: 'unsupported-action-type' },
    ]);
  });
});
