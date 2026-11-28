/**
 * Records the audio of the promo video on the landing page.
 *
 *   node lp/promo/generate.ts
 *
 * The video's script is the JSON of `<dpk-video id="promo">` in lp/promo-video.html: edit a cue there, then run
 * this. Each cue with a `voice` is read aloud by a VOICEVOX engine (VOICEVOX_URL, default http://localhost:50021)
 * with the style voices.json gives that voice, and the cue's `audio` in the page is set to the new file. A file is
 * named after a hash of its speech and style, so an unchanged cue is not recorded again; files no cue uses
 * any more are removed. The player measures each file in the browser, so the page needs no timing.
 *
 * The background music and the scene chime are synthesized here, so the video carries no third-party music.
 * The voices are not MIT: see audio/NOTICE.md.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v from 'valibot';

const Voice = v.object({ speaker: v.number(), speedScale: v.number(), intonationScale: v.number() });
type Voice = v.InferOutput<typeof Voice>;
const Voices = v.object({ voices: v.record(v.string(), Voice), readings: v.record(v.string(), v.string()) });
const Cue = v.looseObject({
  voice: v.exactOptional(v.string()),
  text: v.exactOptional(v.string()),
  audio: v.exactOptional(v.string()),
});
const Video = v.looseObject({
  scenes: v.array(v.looseObject({ id: v.string(), cues: v.exactOptional(v.array(Cue)) })),
});

const ROOT = dirname(fileURLToPath(import.meta.url));
const PAGE = join(ROOT, '..', 'promo-video.html');
const AUDIO = join(ROOT, 'audio');
const VOICEVOX_URL = process.env['VOICEVOX_URL'] ?? 'http://localhost:50021';
const RATE = 32000;

const voices = v.parse(Voices, JSON.parse(readFileSync(join(ROOT, 'voices.json'), 'utf8')));
mkdirSync(AUDIO, { recursive: true });

const SOURCE = /(<dpk-video\b[^>]*\bid="promo"[^>]*>\s*<script type="application\/json">)([\s\S]*?)(\n(\s*)<\/script>)/;
const page = readFileSync(PAGE, 'utf8');
const found = SOURCE.exec(page);
if (found === null) throw new Error('lp/promo-video.html has no <dpk-video id="promo"> with a JSON script');
const video = v.parse(Video, JSON.parse(found[2] ?? ''));

/** The engine reads a space as a pause, so the speech drops spaces next to Japanese and spells out `readings`. */
const speech = (text: string): string =>
  Object.entries(voices.readings)
    .reduce((spoken, [word, reading]) => spoken.replaceAll(word, reading), text)
    .replaceAll(/(?<=\P{ASCII})\s+|\s+(?=\P{ASCII})/gu, '');

const synthesize = async (text: string, voice: Voice): Promise<Uint8Array> => {
  const speaker = String(voice.speaker);
  const query = await fetch(`${VOICEVOX_URL}/audio_query?${new URLSearchParams({ text, speaker })}`, {
    method: 'POST',
  });
  if (!query.ok) throw new Error(`audio_query ${query.status}: ${await query.text()}`);
  const voiced = v.parse(v.looseObject({}), await query.json());
  const body = {
    ...voiced,
    speedScale: voice.speedScale,
    intonationScale: voice.intonationScale,
    prePhonemeLength: 0.05,
    postPhonemeLength: 0.1,
  };
  const wav = await fetch(`${VOICEVOX_URL}/synthesis?${new URLSearchParams({ speaker })}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!wav.ok) throw new Error(`synthesis ${wav.status}: ${await wav.text()}`);
  return new Uint8Array(await wav.arrayBuffer());
};

/** Writes the WAV as a mono AAC file, small enough for a page. */
const writeM4a = (wav: Uint8Array, file: string, bitrate: string): void => {
  const tmp = join(AUDIO, `.${file}.wav`);
  writeFileSync(tmp, wav);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    tmp,
    '-ac',
    '1',
    '-c:a',
    'aac',
    '-b:a',
    bitrate,
    join(AUDIO, file),
  ]);
  rmSync(tmp);
};

const encodeWav = (samples: Float32Array): Uint8Array => {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const ascii = (at: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) out.setUint8(at + index, text.charCodeAt(index));
  };
  ascii(0, 'RIFF');
  out.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, RATE, true);
  out.setUint32(28, RATE * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  ascii(36, 'data');
  out.setUint32(40, samples.length * 2, true);
  for (const [index, value] of samples.entries())
    out.setInt16(44 + index * 2, Math.max(-1, Math.min(1, value)) * 0x7fff, true);
  return new Uint8Array(out.buffer);
};

const normalize = (samples: Float32Array, peak: number): Float32Array => {
  const max = samples.reduce((loudest, value) => Math.max(loudest, Math.abs(value)), 0);
  return samples.map((value) => (value / max) * peak);
};

const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/**
 * A calm I–vi–IV–V loop in C at 96 bpm: pad, plucked arpeggio, soft bass and a quiet shaker. It is exactly
 * four two-bar chords long, and every tone is tuned to a whole number of cycles in it, so it loops without a seam.
 */
const synthesizeBgm = (): Float32Array => {
  const beat = 60 / 96;
  const bar = beat * 4;
  const chords = [
    [48, 52, 55, 59],
    [45, 48, 52, 55],
    [41, 45, 48, 52],
    [43, 47, 50, 52],
  ];
  const seconds = bar * 2 * chords.length;
  const out = new Float32Array(Math.round(seconds * RATE));
  const tone = (frequency: number): number => (2 * Math.PI * Math.round(frequency * seconds)) / seconds;
  let noise = 12345;
  for (let n = 0; n < out.length; n += 1) {
    const t = n / RATE;
    const chord = chords[Math.floor(t / (bar * 2)) % chords.length] ?? [];
    const inChord = (t % (bar * 2)) / (bar * 2);
    const swell = Math.min(1, inChord * 6) * Math.min(1, (1 - inChord) * 10);
    let pad = 0;
    for (const note of chord) {
      const f = midi(note + 12);
      pad += Math.sin(tone(f) * t) + 0.5 * Math.sin(tone(f * 1.003) * t);
    }
    pad *= 0.05 * (0.55 + 0.45 * swell);
    const step = Math.floor(t / (beat / 2));
    const sinceStep = t - step * (beat / 2);
    const arp = tone(midi((chord[[0, 1, 2, 3, 2, 1, 2, 3][step % 8] ?? 0] ?? 48) + 24));
    const pluck = (Math.sin(arp * t) + 0.25 * Math.sin(arp * 2 * t)) * Math.exp(-sinceStep * 7) * 0.1;
    const bass = Math.sin(tone(midi((chord[0] ?? 48) - 12)) * t) * Math.exp(-(t % beat) * 3) * 0.22;
    noise = (noise * 1103515245 + 12345) & 0x7fffffff;
    const shaker = ((noise / 0x7fffffff) * 2 - 1) * Math.exp(-((t + beat / 2) % beat) * 40) * 0.03;
    out[n] = pad + pluck + bass + shaker;
  }
  return normalize(out, 0.7);
};

const synthesizeChime = (): Float32Array => {
  const out = new Float32Array(Math.ceil(1.4 * RATE));
  for (let n = 0; n < out.length; n += 1) {
    const t = n / RATE;
    const a = Math.sin(2 * Math.PI * midi(88) * t) * Math.exp(-t * 4);
    const b = t > 0.09 ? Math.sin(2 * Math.PI * midi(95) * (t - 0.09)) * Math.exp(-(t - 0.09) * 3.5) : 0;
    out[n] = (a + 0.8 * b) * Math.min(1, t * 400);
  }
  return normalize(out, 0.5);
};

const used = new Set(['bgm.m4a', 'chime.m4a', 'NOTICE.md']);
for (const scene of video.scenes) {
  for (const [index, cue] of (scene.cues ?? []).entries()) {
    if (cue.voice === undefined || cue.text === undefined) continue;
    const voice = voices.voices[cue.voice];
    if (voice === undefined) throw new Error(`scene ${scene.id}: voices.json has no voice "${cue.voice}"`);
    const spoken = speech(cue.text);
    const hash = createHash('sha256')
      .update(JSON.stringify([spoken, voice]))
      .digest('hex')
      .slice(0, 8);
    const file = `${scene.id}-${index}-${hash}.m4a`;
    used.add(file);
    if (!existsSync(join(AUDIO, file))) {
      process.stdout.write(`record ${file}\n`);
      writeM4a(await synthesize(spoken, voice), file, '64k');
    }
    cue.audio = `promo/audio/${file}`;
  }
}
for (const file of readdirSync(AUDIO)) if (!used.has(file)) rmSync(join(AUDIO, file));
if (!existsSync(join(AUDIO, 'bgm.m4a'))) writeM4a(encodeWav(synthesizeBgm()), 'bgm.m4a', '96k');
if (!existsSync(join(AUDIO, 'chime.m4a'))) writeM4a(encodeWav(synthesizeChime()), 'chime.m4a', '64k');

const indent = found[4] ?? '';
const json = JSON.stringify(video, null, 2).replaceAll('\n', `\n${indent}  `);
writeFileSync(PAGE, page.replace(SOURCE, `$1\n${indent}  ${json.replaceAll('$', '$$$$')}$3`));
process.stdout.write(`lp/promo-video.html: ${video.scenes.length} scenes\n`);
