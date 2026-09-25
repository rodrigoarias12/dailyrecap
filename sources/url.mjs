#!/usr/bin/env node
// A report the owner shares by URL as a recap source: a Google Sheet "published to the web"
// as CSV, a CSV or JSON export from any tool, a dashboard's JSON endpoint with a read-only
// token in the URL. Prints ONE JSON document: the rows already parsed, the count already
// counted, and a `truncated` flag beside the sample, so the agent never mistakes a sample
// for the whole. No dependencies.
//
//   node sources/url.mjs --url "https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" [--limit 40] [--name "Sales sheet"]

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.url) { console.error('usage: node sources/url.mjs --url <url> [--limit N] [--name label]'); process.exit(2); }
const limit = Number(args.limit ?? 40);
const now = new Date();

const r = await fetch(args.url, { headers: { Accept: 'application/json, text/csv, text/plain;q=0.9, */*;q=0.5' }, redirect: 'follow' });
const type = (r.headers.get('content-type') ?? '').toLowerCase();
const text = await r.text();
const base = { name: args.name ?? args.url, url: args.url, as_of: now.toISOString(), http_status: r.status, content_type: type };
if (!r.ok) { console.log(JSON.stringify({ ...base, available: false, note: `the URL answered HTTP ${r.status}; nothing from it goes in the video`, body_start: text.slice(0, 300) }, null, 2)); process.exit(0); }

let out;
if (type.includes('json') || /^\s*[\[{]/.test(text)) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : Array.isArray(data.data) ? data.data : null;
  out = rows
    ? { ...base, available: true, kind: 'json rows', count: rows.length, rows: rows.slice(0, limit), truncated: rows.length > limit, note: rows.length > limit ? `showing ${limit} of ${rows.length}; count the field you need from \`count\`, not from the sample` : 'complete' }
    : { ...base, available: true, kind: 'json object', keys: Object.keys(data), data, truncated: false, note: 'complete' };
} else {
  const rows = parseCsv(text);
  const header = rows.shift() ?? [];
  const objects = rows.map(cells => Object.fromEntries(header.map((h, i) => [h || `col${i + 1}`, cells[i] ?? ''])));
  // Columns that read as numbers but are labels (a year, an id, a code) are not summed.
  const label = /^(year|id|code|zip|phone|.*_id|.*code)$/i;
  const numeric = header.filter((h, i) => rows.length && !label.test(h.trim()) && rows.every(c => c[i] === undefined || c[i] === '' || !Number.isNaN(Number(String(c[i]).replace(/[,$]/g, '')))));
  const sums = Object.fromEntries(numeric.map(h => [h, round(objects.reduce((s, o) => s + (Number(String(o[h]).replace(/[,$]/g, '')) || 0), 0))]));
  out = { ...base, available: true, kind: 'csv', columns: header, count: objects.length, sums_over_all_rows: sums, rows: objects.slice(0, limit), truncated: objects.length > limit, note: objects.length > limit ? `showing ${limit} of ${objects.length}; \`count\` and \`sums_over_all_rows\` cover all rows` : 'complete' };
}
console.log(JSON.stringify(out, null, 2));

function parseCsv(s) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x !== ''));
}
function round(n) { return Math.round(n * 100) / 100; }
