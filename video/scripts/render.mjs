/**
 * Renders a script to mp4. In order: validates the script and refuses anything off-schema
 * (a model wrote it; the render is not the place to find out), narrates the `voice` lines
 * when an engine is available, synthesizes the music bed if missing, picks the frame from
 * `script.format`, and calls Remotion with the script as props.
 *
 *   node scripts/render.mjs <script.json> <out.mp4>
 *   node scripts/render.mjs <script.json> --check      # validate only
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const SCRIPT = process.argv[2], OUT = process.argv[3];
if (!SCRIPT || !OUT) { console.error('usage: render.mjs <script.json> <out.mp4 | --check>'); process.exit(1); }
const ROOT = join(dirname(new URL(import.meta.url).pathname), '..');
const script = JSON.parse(readFileSync(SCRIPT, 'utf8'));

// ── Validation ──────────────────────────────────────────────────────────────────────────
const SCENES = {
  title: ['text'], cover: ['image', 'text'], screen: ['image', 'focus', 'label', 'text'], chips: ['label', 'items'],
  numbers: ['label', 'items'], events: ['label', 'items'], metric: ['label', 'value', 'source'], quote: ['text', 'who'],
  agenda: ['label', 'items'], closing: ['cta'],
};
const errors = [];
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
if (!script.brand || typeof script.brand !== 'object') errors.push('brand: missing. Needs { name, url, accent, ink, bg }.');
else {
  for (const k of ['name', 'accent', 'ink', 'bg']) if (!isStr(script.brand[k])) errors.push(`brand.${k}: missing`);
  if (typeof script.brand.url !== 'string') errors.push('brand.url: must be a string (may be empty)');
}
for (const k of Object.keys(script)) if (!['brand', 'format', 'lang', 'voiceId', 'scenes', 'narration', 'music', 'credit'].includes(k)) errors.push(`${k}: unknown top-level field`);
if (!Array.isArray(script.scenes) || script.scenes.length === 0) errors.push('scenes: must be a non-empty array');
else script.scenes.forEach((s, i) => {
  const at = `scenes[${i}]`;
  if (!SCENES[s.type]) { errors.push(`${at}.type: "${s.type}" is not one of ${Object.keys(SCENES).join(', ')}`); return; }
  if (typeof s.seconds !== 'number' || !(s.seconds > 0)) errors.push(`${at}.seconds: must be a number > 0`);
  for (const k of SCENES[s.type]) if (s[k] === undefined || s[k] === null || s[k] === '') errors.push(`${at}.${k}: required for type "${s.type}"`);
  if (s.items !== undefined && !Array.isArray(s.items)) errors.push(`${at}.items: must be an array`);
  if (Array.isArray(s.items) && s.items.length === 0) errors.push(`${at}.items: empty; drop the scene instead`);
  if (s.voice !== undefined && !isStr(s.voice)) errors.push(`${at}.voice: must be a non-empty string when present`);
  if ((s.type === 'screen' || s.type === 'cover') && isStr(s.image) && !existsSync(join(ROOT, 'public', s.image))) errors.push(`${at}.image: public/${s.image} does not exist`);
  if (s.type === 'screen' && s.focus) for (const k of ['x', 'y', 'w', 'h']) if (typeof s.focus[k] !== 'number') errors.push(`${at}.focus.${k}: must be a number in 0..1`);
});
const seconds = Array.isArray(script.scenes) ? script.scenes.reduce((a, s) => a + (Number(s.seconds) || 0), 0) : 0;
if (seconds > 75) errors.push(`total length ${seconds.toFixed(1)}s: over 60 s (75 with voice slack). Cut a scene.`);
if (errors.length) {
  console.error(`script ${SCRIPT} is not valid:\n  - ${errors.join('\n  - ')}\nSchema: video/src/script.ts · shape to copy: video/example/recap.json`);
  process.exit(2);
}
if (OUT === '--check') { console.log(`ok: ${script.scenes.length} scenes · ${seconds.toFixed(1)}s · ${script.format ?? 'landscape'}`); process.exit(0); }

// ── Voice ───────────────────────────────────────────────────────────────────────────────
const voiced = script.scenes.filter((s) => s.voice).length;
if (voiced && (script.narration?.length ?? 0) !== voiced) {
  const r = spawnSync('node', [join(ROOT, 'scripts/narrate.mjs'), SCRIPT], { stdio: 'inherit' });
  if (r.status !== 0) console.warn('voice: narration skipped (see above); rendering without it');
}
const current = JSON.parse(readFileSync(SCRIPT, 'utf8'));
const total = current.scenes.reduce((a, s) => a + s.seconds, 0);

// ── Music ───────────────────────────────────────────────────────────────────────────────
if (current.music !== false) {
  if (!current.music) {
    current.music = `audio/music-${basename(SCRIPT, '.json').replace(/[^a-z0-9-]/gi, '-')}.mp3`;
    writeFileSync(SCRIPT, JSON.stringify(current, null, 2) + '\n');
  }
  const abs = join(ROOT, 'public', current.music);
  if (!existsSync(abs)) execFileSync('node', [join(ROOT, 'scripts/music.mjs'), String(Math.ceil(total)), abs], { stdio: 'inherit' });
}

// ── Render ──────────────────────────────────────────────────────────────────────────────
const composition = current.format === 'portrait' ? 'Portrait' : 'Landscape';
mkdirSync(dirname(OUT), { recursive: true });
console.log(`render: ${composition} · ${current.scenes.length} scenes · ${total.toFixed(1)}s · ${current.narration?.length ?? 0} voice lines → ${OUT}`);
// In a container (dev/Dockerfile) Remotion uses the system Chromium instead of downloading one.
const chrome = process.env.DAILYRECAP_CHROME ? [`--browser-executable=${process.env.DAILYRECAP_CHROME}`] : [];
execFileSync('npx', ['remotion', 'render', 'src/index.ts', composition, OUT, `--props=${SCRIPT}`, '--codec=h264', '--crf=23', '--log=error', ...chrome], { cwd: ROOT, stdio: 'inherit' });

// Chat channels choke on big files well before their documented limits (a 7.6 MB recap
// failed on Telegram, 4.9 MB went through). Over 6 MB, re-encode to a bitrate that fits.
const MAX = 6 * 1024 * 1024;
if (statSync(OUT).size > MAX) {
  const kbps = Math.max(600, Math.floor((MAX * 8) / 1024 / total * 0.85) - 128);
  const tmp = `${OUT}.fit.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', OUT, '-c:v', 'libx264', '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`, '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', tmp]);
  renameSync(tmp, OUT);
  console.log(`fit: re-encoded at ${kbps} kbps → ${(statSync(OUT).size / 1024 / 1024).toFixed(1)} MB`);
}
console.log(`done: ${OUT} · ${(statSync(OUT).size / 1024 / 1024).toFixed(1)} MB`);
