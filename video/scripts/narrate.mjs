/**
 * Voice-over. Reads the script, generates one clip per scene that has a `voice` line,
 * normalizes each to the same loudness, measures it, and writes the `narration` block back
 * into the script so the renderer places it and ducks the music.
 *
 * Two engines. With ELEVENLABS_API_KEY set, ElevenLabs. Otherwise edge-tts, Microsoft's
 * neural voices, free and without a key (pip install edge-tts, or the repo-local
 * video/.venv). The voice comes from `script.voiceId` or NARRATION_VOICE; the defaults are
 * es-AR-TomasNeural for Spanish and en-US-AndrewNeural for English.
 *
 * If a line does not fit in its scene, the scene is extended to fit it and the change is
 * logged: a cut that swallows the last word looks broken, a scene half a second longer does not.
 *
 * A clip is reused if its text did not change (the voice is not deterministic, and a new
 * take would need approving again). Delete the mp3 to force a new take.
 *
 *   ELEVENLABS_API_KEY=… [ELEVENLABS_VOICE_ID=…] node scripts/narrate.mjs <script.json>
 *
 * Optional: DEEPGRAM_API_KEY makes it transcribe each clip and fail if a written word was
 * not heard. Needs ffmpeg and ffprobe on PATH.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT = process.argv[2];
if (!SCRIPT) { console.error('usage: narrate.mjs <script.json>'); process.exit(1); }
const KEY = process.env.ELEVENLABS_API_KEY;
const DG = process.env.DEEPGRAM_API_KEY;
const LUFS = -16;
// The short-form cut talks from the first frame and leaves no air at the end of a beat.
const SHORT = JSON.parse(readFileSync(SCRIPT, 'utf8')).style === 'tiktok';
const LEAD = SHORT ? 0.1 : 0.4, TAIL = SHORT ? 0.15 : 0.5;
const ROOT = join(dirname(new URL(import.meta.url).pathname), '..');
const PUBLIC = join(ROOT, 'public');

const script = JSON.parse(readFileSync(SCRIPT, 'utf8'));
const LANG = script.lang || process.env.NARRATION_LANG || 'en';
// The edge engine runs scripts/tts.py with a python that has edge-tts: the repo-local venv, the container's venv, or the system one.
const PY = [join(ROOT, '.venv/bin/python'), '/opt/edge-tts/bin/python', 'python3'].find((p) => { try { execFileSync(p, ['-c', 'import edge_tts'], { stdio: 'ignore' }); return true; } catch { return false; } });
const EDGE = PY;
const ENGINE = KEY ? 'elevenlabs' : EDGE ? 'edge' : null;
if (!ENGINE) { console.error('No voice engine: set ELEVENLABS_API_KEY, or install edge-tts (pip install edge-tts). Narration is optional.'); process.exit(1); }
const VOICE = script.voiceId || process.env.NARRATION_VOICE || (ENGINE === 'elevenlabs' ? 'JBFqnCBsd6RMkjVDRZzb' : LANG.startsWith('es') ? 'es-AR-TomasNeural' : 'en-US-AndrewNeural');
console.log(`voice: ${ENGINE} · ${VOICE}`);
const slug = basename(SCRIPT, '.json').replace(/[^a-z0-9-]/gi, '-');
const dir = `audio/narration/${slug}`;
mkdirSync(join(PUBLIC, dir), { recursive: true });
const previous = Object.fromEntries((script.narration ?? []).map((n) => [n.file, n]));

const seconds = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));
const measure = (f) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1)).input_i);
};
const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

let failures = 0;
const narration = [];
const lines = script.scenes.map((s, i) => ({ i, s })).filter(({ s }) => s.voice);
for (let k = 0; k < lines.length; k++) {
  const { i, s } = lines[k];
  const start = script.scenes.slice(0, i).reduce((a, x) => a + x.seconds, 0);
  const file = `${dir}/${i + 1}.mp3`, abs = join(PUBLIC, file), raw = `${tmpdir()}/dailyrecap-narr-${process.pid}-${i}.mp3`;
  const reused = existsSync(abs) && previous[file]?.text === s.voice;
  if (!reused) {
    if (ENGINE === 'elevenlabs') {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_192`, {
        method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: s.voice, model_id: 'eleven_multilingual_v2', seed: 7, previous_text: lines[k - 1]?.s.voice, next_text: lines[k + 1]?.s.voice }),
      });
      if (!r.ok) { console.error(`  ✘ scene ${i + 1}: ${r.status} ${(await r.text()).slice(0, 200)}`); failures++; continue; }
      writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
    } else {
      execFileSync(PY, [join(ROOT, 'scripts/tts.py'), VOICE, raw, `${raw}.json`], { input: s.voice, stdio: ['pipe', 'ignore', 'inherit'], env: { ...process.env, TTS_RATE: script.style === 'tiktok' ? '+12%' : '+4%' } });
      writeFileSync(`${abs}.words.json`, readFileSync(`${raw}.json`));
    }
    // Fixed loudness with a plain gain: one-pass loudnorm pumps on clips of a few seconds.
    const g = (LUFS - measure(raw)).toFixed(2);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `highpass=f=70,volume=${g}dB,alimiter=limit=0.89:level=false`, '-b:a', '192k', abs]);
  }
  const dur = seconds(abs);
  const needed = LEAD + dur + TAIL;
  if (needed > s.seconds) {
    console.log(`  · scene ${i + 1} extended ${s.seconds}s → ${needed.toFixed(1)}s to fit the voice`);
    s.seconds = Math.round(needed * 10) / 10;
  }
  let missing = [];
  if (DG && !reused) {
    const tr = await (await fetch(`https://api.deepgram.com/v1/listen?model=nova-2&language=${LANG}&punctuate=true`, {
      method: 'POST', headers: { Authorization: `Token ${DG}`, 'Content-Type': 'audio/mpeg' }, body: readFileSync(abs) })).json();
    const heard = normalize(tr.results.channels[0].alternatives[0].transcript), written = normalize(s.voice);
    missing = written.filter((w) => !heard.includes(w));
    if (missing.length) failures++;
  }
  console.log(`  ${missing.length ? '✘' : '✔'} scene ${i + 1}${reused ? ' (reused)' : ''} · at ${start.toFixed(1)} · ${dur.toFixed(2)}s${missing.length ? '  ← not heard: ' + missing.join(', ') : ''}`);
  let words;
  try { words = JSON.parse(readFileSync(`${abs}.words.json`, 'utf8')); } catch { words = undefined; }
  narration.push({ file, at: Number((start + LEAD).toFixed(2)), seconds: Number(dur.toFixed(2)), text: s.voice, ...(words?.length ? { words } : {}) });
}
// Recompute `at` after scenes were extended: a later scene moved if an earlier one grew.
let acc = 0;
const startOf = script.scenes.map((s) => { const a = acc; acc += s.seconds; return a; });
for (const n of narration) { const i = Number(basename(n.file, '.mp3')) - 1; n.at = Number((startOf[i] + LEAD).toFixed(2)); }
script.narration = narration;
writeFileSync(SCRIPT, JSON.stringify(script, null, 2) + '\n');
console.log(failures ? `\n${failures} line(s) to fix.` : `\nnarration: ${narration.length} lines written to ${SCRIPT}`);
process.exit(failures ? 1 : 0);
