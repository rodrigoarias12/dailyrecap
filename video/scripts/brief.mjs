#!/usr/bin/env node
/**
 * The written brief: the same recap as the video, as a one-to-two page PDF someone can forward
 * to a partner or an investor. It reads the video's script (so it says nothing the video does
 * not) and, optionally, the day's raw material, and prints every number and row with its
 * source and its mark: ✓ verified or reported. Built by code, not by the model; Chromium prints
 * the HTML, the same browser the video uses.
 *
 *   node scripts/brief.mjs <recap.json> <out.pdf> [--gathered gathered.md] [--date "Tuesday, Sep 30"]
 *   node scripts/brief.mjs <recap.json> --card <out.png> [--date …]
 *
 * --card draws the brief's front as a 1600×1000 picture for the video: the agent's reading of the
 * day and where the rest is. The video shows the brief itself, not a slide about it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const [SCRIPT, OUT0, ...rest0] = process.argv.slice(2);
const CARD = OUT0 === '--card' ? rest0[0] : undefined;
const OUT = CARD ? undefined : OUT0;
const rest = CARD ? rest0.slice(1) : rest0;
if (!SCRIPT || (!OUT && !CARD)) { console.error('usage: brief.mjs <recap.json> <out.pdf> [--gathered file] [--date text]'); process.exit(2); }
const opt = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const script = JSON.parse(readFileSync(SCRIPT, 'utf8'));
const gathered = opt('gathered') && existsSync(opt('gathered')) ? readFileSync(opt('gathered'), 'utf8') : '';
const b = script.brand;
const es = String(script.lang ?? 'en').startsWith('es');
const L = es
  ? { read: 'Mi lectura del día', more: 'El resumen completo, con cada fuente, está en el PDF.', title: 'Resumen del día', analysis: 'Análisis del agente (su lectura, no un dato)', basedOn: 'se apoya en', verified: '✓ verificado', reported: 'reportado', source: 'Fuente', tomorrow: 'Mañana', raw: 'Material del día, con sus fuentes', made: 'Hecho por DailyRecap a partir de los datos: cada fila dice de dónde sale.' }
  : { read: 'My read of the day', more: 'The full brief, with every source, is in the PDF.', title: 'Daily brief', analysis: "The agent's analysis (its reading, not a fact)", basedOn: 'based on', verified: '✓ verified', reported: 'reported', source: 'Source', tomorrow: 'Tomorrow', raw: "The day's material, with its sources", made: 'Made by DailyRecap from the data: every row says where it comes from.' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mark = (v) => (v === true ? `<span class="mk ok">${L.verified}</span>` : v === false ? `<span class="mk rep">${L.reported}</span>` : '');
const link = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

const blocks = [];
for (const s of script.scenes) {
  if (s.type === 'metric') blocks.push(`<section class="num"><p class="lb">${esc(s.label)}</p><p class="big">${esc(s.value)}</p><p class="meta">${s.delta ? `<b>${esc(s.delta)}</b> · ` : ''}${L.source}: ${link(s.source)} ${mark(s.verified)}</p></section>`);
  else if (s.type === 'chart') {
    const last = s.series?.[s.series.length - 1];
    const rows = (s.series ?? []).map((p) => `<td>${esc(p.x)}<br><b>${esc(p.y)}${s.unit === '%' ? '%' : ''}</b></td>`).join('');
    blocks.push(`<section class="num"><p class="lb">${esc(s.label)}</p><p class="big">${esc(s.value ?? (last ? `${last.y}${s.unit === '%' ? '%' : ''}` : ''))}</p><table class="ser"><tr>${rows}</tr></table><p class="meta">${s.delta ? `<b>${esc(s.delta)}</b> · ` : ''}${L.source}: ${link(s.source)} ${mark(s.verified)}</p></section>`);
  } else if (s.type === 'numbers') blocks.push(`<section><p class="lb">${esc(s.label)}</p>${s.items.map((it) => `<div class="row"><b>${esc(it.value)}</b> ${esc(it.claim)}${it.source ? ` <span class="src">· ${link(it.source)}</span>` : ''}</div>`).join('')}</section>`);
  else if (s.type === 'events') blocks.push(`<section><p class="lb">${esc(s.label)}</p>${s.items.map((it) => `<div class="row"><span class="tag">${esc(it.tag)}</span> ${esc(it.text)} <span class="src">${it.who ? `· ${esc(it.who)}` : ''}</span> ${mark(it.verified)}</div>`).join('')}</section>`);
  else if (s.type === 'agenda') blocks.push(`<section><p class="lb">${esc(s.label || L.tomorrow)}</p>${s.items.map((it) => `<div class="row"><span class="tag">${esc(it.when)}</span> ${esc(it.text)}</div>`).join('')}</section>`);
  else if (s.type === 'quote') blocks.push(`<section><blockquote>“${esc(s.text)}”<br><span class="src">— ${esc(s.who)}</span></blockquote></section>`);
  else if (s.type === 'chips') blocks.push(`<section><p class="lb">${esc(s.label)}</p><div class="row">${s.items.map(esc).join(' · ')}</div></section>`);
  else if (s.type === 'title' || s.type === 'cover') blocks.push(`<section><p class="lb">${esc(s.label ?? '')}</p><p class="head">${esc(s.text)}</p></section>`);
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:R;src:url('file://${join(dirname(new URL(import.meta.url).pathname), '../public/fonts/RethinkSans-Regular.ttf')}')}
@font-face{font-family:R;font-weight:600;src:url('file://${join(dirname(new URL(import.meta.url).pathname), '../public/fonts/RethinkSans-SemiBold.ttf')}')}
@page{size:A4;margin:18mm 16mm}
body{font-family:R,system-ui,sans-serif;color:${b.ink};font-size:11pt;line-height:1.45;margin:0}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${b.accent};padding-bottom:10px;margin-bottom:18px}
h1{font-size:20pt;margin:0;font-weight:600}.date{opacity:.65}
section{margin:0 0 14px;page-break-inside:avoid}
.lb{text-transform:uppercase;letter-spacing:.12em;font-size:8.5pt;font-weight:600;opacity:.7;margin:0 0 4px}
.big{font-size:26pt;font-weight:600;margin:0}.head{font-size:14pt;font-weight:600;margin:0}
.meta,.src{opacity:.75;font-size:9.5pt}.row{padding:5px 0;border-bottom:1px solid #0001}
.tag{display:inline-block;min-width:64px;font-weight:600;font-size:9pt;opacity:.75}
.mk{font-size:8.5pt;font-weight:600;border-radius:99px;padding:1px 8px;white-space:nowrap}
.ok{background:${b.accent};color:${b.ink}}.an{background:#0000000a;border-radius:8px;padding:10px 12px}.rep{border:1px solid #0004}
table.ser{border-collapse:collapse;margin:6px 0}table.ser td{font-size:8.5pt;padding:2px 10px 2px 0;opacity:.85}
blockquote{margin:0;font-size:12pt;border-left:3px solid ${b.accent};padding-left:12px}
pre{white-space:pre-wrap;font-family:inherit;font-size:8.5pt;opacity:.8;border-top:1px solid #0002;padding-top:8px}
a{color:inherit}footer{margin-top:18px;font-size:8.5pt;opacity:.6}
</style></head><body>
<header><div><h1>${esc(b.name)} · ${L.title}</h1><div class="date">${esc(opt('date') ?? new Date().toISOString().slice(0, 10))}</div></div><div class="date">${esc(b.url ?? '')}</div></header>
${blocks.join('\n')}
${Array.isArray(script.analysis) && script.analysis.length ? `<section class="an"><p class="lb">${L.analysis}</p>${script.analysis.map((a) => `<div class="row">${esc(a.text)}${a.basedOn ? ` <span class="src">· ${L.basedOn}: ${link(a.basedOn)}</span>` : ''}</div>`).join('')}</section>` : ''}
${gathered ? `<section><p class="lb">${L.raw}</p><pre>${link(gathered.slice(0, 12000))}</pre></section>` : ''}
<footer>${L.made}</footer>
</body></html>`;

// The card: the brief's front, big enough to read on a phone inside the video.
const lines = (Array.isArray(script.analysis) ? script.analysis : []).slice(0, 3);
const card = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:R;src:url('file://${join(dirname(new URL(import.meta.url).pathname), '../public/fonts/RethinkSans-Regular.ttf')}')}
@font-face{font-family:R;font-weight:600;src:url('file://${join(dirname(new URL(import.meta.url).pathname), '../public/fonts/RethinkSans-SemiBold.ttf')}')}
html,body{margin:0;width:1600px;height:1000px;background:#fff;font-family:R,system-ui,sans-serif;color:${b.ink}}
.w{padding:70px 90px;height:100%;box-sizing:border-box;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:6px solid ${b.accent};padding-bottom:22px}
.top b{font-size:44px;font-weight:600}.top span{font-size:30px;opacity:.6}
.lb{margin:36px 0 10px;text-transform:uppercase;letter-spacing:.14em;font-size:24px;font-weight:600;opacity:.65}
.l{font-size:44px;line-height:1.25;margin:14px 0;font-weight:600}.l small{display:block;font-size:24px;font-weight:400;opacity:.6;margin-top:4px}
.ft{margin-top:auto;display:flex;align-items:center;gap:18px;font-size:30px}
.pdf{background:${b.accent};color:${b.ink};font-weight:600;border-radius:12px;padding:10px 20px;font-size:28px}
</style></head><body><div class="w">
<div class="top"><b>${esc(b.name)} · ${L.title}</b><span>${esc(opt('date') ?? new Date().toISOString().slice(0, 10))}</span></div>
<p class="lb">${L.read}</p>
${lines.map((a) => `<p class="l">${esc(a.text)}${a.basedOn ? `<small>${L.basedOn}: ${esc(a.basedOn)}</small>` : ''}</p>`).join('')}
<div class="ft"><span class="pdf">PDF</span><span>${L.more}</span></div>
</div></body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'brief-'));
const page = join(dir, 'brief.html');
writeFileSync(page, CARD ? card : html);
const chrome = process.env.DAILYRECAP_CHROME
  ?? ['/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('brief: no Chromium found (set DAILYRECAP_CHROME)'); process.exit(1); }
const target = CARD
  ? ['--hide-scrollbars', '--window-size=1600,1000', `--screenshot=${CARD}`]
  : ['--no-pdf-header-footer', `--print-to-pdf=${OUT}`];
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', ...target, `file://${page}`], { stdio: 'ignore', timeout: 120000 });
rmSync(dir, { recursive: true, force: true });
console.log(`brief: ${CARD ?? OUT}`);
