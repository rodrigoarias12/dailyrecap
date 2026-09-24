// Sums token usage per agent from OpenClaw's own session stores, the same data the Agent
// Index reporter reads. Usage lives inside transcript event payloads (JSON), so this scans
// them for the usual field names. Run inside the container:
//   node /home/node/.openclaw/workspace/dev/usage.mjs
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';

const root = process.env.OPENCLAW_STATE_DIR || '/home/node/.openclaw';
const KEYS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'totalTokens'];

function harvest(value, acc) {
  if (Array.isArray(value)) { for (const v of value) harvest(v, acc); return; }
  if (!value || typeof value !== 'object') return;
  const keys = Object.keys(value);
  if (keys.some((k) => KEYS.includes(k))) {
    for (const k of keys) if (KEYS.includes(k) && typeof value[k] === 'number') acc[k] = (acc[k] || 0) + value[k];
    acc.__hits = (acc.__hits || 0) + 1;
  }
  for (const k of keys) harvest(value[k], acc);
}

let grand = {};
for (const agent of readdirSync(`${root}/agents`)) {
  const file = `${root}/agents/${agent}/agent/openclaw-agent.sqlite`;
  if (!existsSync(file)) continue;
  const db = new DatabaseSync(file, { readOnly: true });
  const acc = {};
  for (const t of ['transcript_events', 'trajectory_runtime_events', 'session_transcript_active_events']) {
    let cols;
    try { cols = db.prepare(`pragma table_info(${t})`).all().map((c) => c.name); } catch { continue; }
    const textCols = cols.filter((c) => /payload|json|data|event|body|content/i.test(c));
    if (!textCols.length) continue;
    for (const row of db.prepare(`select ${textCols.join(',')} from ${t}`).all()) {
      for (const c of textCols) {
        const v = row[c];
        if (typeof v !== 'string' || !v.includes('okens')) continue;
        try { harvest(JSON.parse(v), acc); } catch { /* not JSON */ }
      }
    }
  }
  const line = Object.entries(acc).filter(([k]) => k !== '__hits').map(([k, v]) => `${k}=${v}`).join(' · ');
  console.log(`${agent}: ${acc.__hits || 0} usage records · ${line || 'no usage fields found'}`);
  for (const [k, v] of Object.entries(acc)) grand[k] = (grand[k] || 0) + v;
}
const inp = (grand.input_tokens || 0) + (grand.inputTokens || 0), out = (grand.output_tokens || 0) + (grand.outputTokens || 0);
const cache = (grand.cache_read_input_tokens || 0) + (grand.cache_creation_input_tokens || 0) + (grand.cacheReadTokens || 0) + (grand.cacheWriteTokens || 0);
console.log(`\nTOTAL input=${inp} output=${out} cache=${cache} → ${inp + out + cache} tokens`);
