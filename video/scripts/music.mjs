/**
 * Synthesizes the music bed in code: no sample library, no model, no license to clear,
 * and the same file every time. A bed for a launch video has one job, to sit under the
 * voice and give the cuts a pulse, so it is a kick, claps, hats and a bass on a four-chord
 * loop, with a density curve: sparse at the start, full in the middle, thinner at the end.
 *
 *   node scripts/music.mjs <seconds> <out.mp3>
 *
 * Needs ffmpeg on PATH (for the mp3 encode and loudness normalization).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';

const SECONDS = Number(process.argv[2]);
const OUT = process.argv[3];
if (!SECONDS || !OUT) { console.error('usage: music.mjs <seconds> <out.mp3>'); process.exit(1); }

const BPM = 122, SR = 44100;
const beat = 60 / BPM, bar = beat * 4, semi = bar / 16;
const BARS = Math.ceil(SECONDS / bar) + 1;
const total = Math.ceil(bar * BARS * SR) + 2 * SR;
const buf = new Float32Array(total);

const KICK = [0, 4, 8, 12, 14];
const CLAP = [4, 12];
const HAT = [2, 6, 10, 14, 15];
/** A flat major-ish loop: root notes for four bars. */
const ROOTS = [51.91, 87.31, 69.30, 77.78];

/** Density per bar: 1 = pulse only, 2 = plus bass, 3 = full. */
function density(b) {
  const p = b / BARS;
  if (b < 1) return 1;
  if (p < 0.2) return 2;
  if (p > 0.85) return 2;
  return 3;
}

function kick(t, gain = 0.95) {
  const i0 = Math.round(t * SR); let phase = 0;
  for (let i = 0; i < 0.5 * SR && i0 + i < total; i++) {
    const p = i / (0.5 * SR);
    phase += (2 * Math.PI * (44 + 86 * Math.exp(-p * 7))) / SR;
    buf[i0 + i] += Math.sin(phase) * Math.exp(-p * 3.6) * (1 - Math.exp(-p * 200)) * gain;
  }
}
function clap(t, gain = 0.45) {
  for (const [dd, g] of [[0, 1], [0.011, 0.8], [0.021, 0.6], [0.034, 0.45]]) {
    const i0 = Math.round((t + dd) * SR), dur = dd === 0.034 ? 0.13 : 0.03;
    for (let i = 0; i < dur * SR && i0 + i < total; i++) {
      const p = i / (dur * SR);
      buf[i0 + i] += (Math.random() * 2 - 1) * Math.exp(-p * (dd === 0.034 ? 11 : 34)) * gain * g;
    }
  }
}
function hat(t, gain = 0.13) {
  const i0 = Math.round(t * SR), dur = 0.032; let prev = 0;
  for (let i = 0; i < dur * SR && i0 + i < total; i++) {
    const n = Math.random() * 2 - 1, hi = n - prev; prev = n;
    buf[i0 + i] += hi * Math.exp(-(i / (dur * SR)) * 28) * gain;
  }
}
function bass(t, f, { dur = 0.4, gain = 0.4 } = {}) {
  const i0 = Math.round(t * SR);
  for (let i = 0; i < dur * SR && i0 + i < total; i++) {
    const p = i / (dur * SR), tt = i / SR;
    buf[i0 + i] += Math.tanh(Math.sin(2 * Math.PI * f * tt) * 1.7) * 0.7 * Math.min(1, tt / 0.004) * Math.exp(-p * 2.6) * gain;
  }
}

for (let b = 0; b < BARS; b++) {
  const t0 = b * bar, n = density(b), root = ROOTS[b % 4];
  const at = (k) => t0 + k * semi;
  for (const k of KICK) kick(at(k), k % 4 === 0 ? 0.95 : 0.55);
  for (const k of CLAP) clap(at(k));
  if (n >= 2) for (const k of HAT) hat(at(k), k === 15 ? 0.09 : 0.13);
  if (n >= 2) { bass(t0, root, { dur: 0.46 }); bass(at(7), root, { dur: 0.3, gain: 0.34 }); }
  if (n >= 3) { bass(at(11), root * 1.5, { dur: 0.26, gain: 0.28 }); bass(at(14), root * 2, { dur: 0.2, gain: 0.2 }); }
}

let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = 0.92 / peak;
const wav = Buffer.alloc(44 + total * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + total * 2, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(total * 2, 40);
for (let i = 0; i < total; i++) wav.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * g * 32767))), 44 + i * 2);
const tmp = `${tmpdir()}/dailyrecap-music-${process.pid}.wav`;
writeFileSync(tmp, wav);
mkdirSync(dirname(OUT), { recursive: true });
// Gentle compression and loudness normalization: peak-normalized audio sits 17 dB too low.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-t', String(SECONDS + 1),
  '-af', 'acompressor=threshold=-20dB:ratio=1.8:attack=5:release=120:makeup=3,aecho=0.92:0.2:21:0.08,loudnorm=I=-16:TP=-1.5:LRA=20,alimiter=limit=0.97', '-b:a', '192k', OUT]);
unlinkSync(tmp);
console.log(`music: ${OUT} · ${SECONDS}s · ${BPM} bpm`);
