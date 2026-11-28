import { afterEach, describe, expect, it, vi } from 'vitest';

import { VideoMixer } from './mixer';
import { layoutTimeline, parseVideoData } from './model';

class FakeAudio {
  static readonly created: FakeAudio[] = [];
  src = '';
  preload = '';
  loop = false;
  muted = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  seeking = false;
  readonly readyState = 4;
  readonly duration = 2;
  constructor() {
    FakeAudio.created.push(this);
  }
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  load(): void {}
  removeAttribute(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  FakeAudio.created.length = 0;
});

const setUp = async (): Promise<{ mixer: VideoMixer; voice: FakeAudio; chime: FakeAudio }> => {
  vi.stubGlobal('Audio', FakeAudio);
  const data = parseVideoData({
    scenes: [{ id: 's', title: 'S', duration: 10, cues: [{ audio: 'voice.m4a', at: 4 }] }],
    tracks: [{ audio: 'chime.m4a', volume: 0.35, offset: 1 }],
  });
  const mixer = new VideoMixer();
  const lengths = await mixer.measure(['voice.m4a', 'chime.m4a'], (src) => src);
  mixer.load(layoutTimeline(data, (src) => lengths.get(src) ?? null));
  const [voice, chime] = FakeAudio.created;
  if (voice === undefined || chime === undefined) throw new Error('no audio');
  return { mixer, voice, chime };
};

describe('VideoMixer', () => {
  it('starts a clip that comes in during playback at its own volume', async () => {
    const { mixer, chime } = await setUp();
    mixer.sync(0, true, true);
    mixer.sync(1.02, true, false);
    expect(chime.paused).toBe(false);
    expect(chime.volume).toBeCloseTo(0.35);
  });

  it('keeps a muted video silent from the first frame of a clip', async () => {
    const { mixer, voice } = await setUp();
    mixer.setVolume(1, true);
    mixer.sync(0, true, true);
    mixer.sync(4.02, true, false);
    expect(voice.paused).toBe(false);
    expect(voice.muted).toBe(true);
  });

  it('lets a clip that just started catch up before moving it again', async () => {
    const { mixer, chime } = await setUp();
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    mixer.sync(1, true, true);
    expect(chime.currentTime).toBe(0);
    now.mockReturnValue(1400);
    mixer.sync(1.4, true, false);
    expect(chime.currentTime).toBe(0);
    now.mockReturnValue(1700);
    mixer.sync(1.7, true, false);
    expect(chime.currentTime).toBeCloseTo(0.7);
  });
});
