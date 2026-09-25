#!/usr/bin/env node
// Ask an agent that lives on ANOTHER OpenClaw (or any Agent2Agent 1.0 endpoint) the daily
// question, wait for its answer, and print ONE JSON document the recap can use as a row:
// who answered, what they said, and `verified: false` until someone opens the source they
// point at. A peer that does not answer is still a row, and it says so. No dependencies.
//
//   node sources/a2a.mjs --config work/sources/agents.json [--only sales] [--question "…"] [--today "2026-09-24 18:00 ART"]
//
// config: [{ "name": "sales", "url": "https://sales.example.com/a2a/v1", "token": "…", "agent": "Sam (sales)" }]
// The OpenClaw on the other side needs `channels.a2a.enabled` and a peer whose `token` is
// this one; its Agent Card is at <origin>/.well-known/agent-card.json.

import { readFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.config) { console.error('usage: node sources/a2a.mjs --config <file> [--only name] [--question text] [--today text] [--timeout seconds]'); process.exit(2); }
const peers = JSON.parse(await readFile(args.config, 'utf8')).filter(p => !args.only || p.name === args.only);
const today = args.today ?? new Date().toISOString();
const timeout = Number(args.timeout ?? 120) * 1000;
const question = args.question ?? `Daily recap. Today is ${today}. What did you do since yesterday at this hour that the team should know? Facts only, with a source each (a link, an id, a file, a number and where it comes from). Six lines at most. Say "nothing" if nothing. If you do not know, say "I do not know".`;

const results = await Promise.all(peers.map(ask));
console.log(JSON.stringify({ asked_at: today, question, peers: results, note: 'What a peer reports is a claim. `verified` stays false until the source it names was opened.' }, null, 2));

async function ask(p) {
  const base = { name: p.name, agent: p.agent ?? p.name, url: p.url, verified: false };
  const id = `recap-${Date.now()}`;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout + 5000);
  try {
    const r = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` }, body: JSON.stringify({ jsonrpc: '2.0', id, method: 'SendMessage', params: { message: { messageId: `${id}-q`, role: 'ROLE_USER', parts: [{ text: question }] } } }) });
    const raw = await r.text();
    let d = {}; try { d = JSON.parse(raw); } catch { /* not JSON: the raw text is the error */ }
    if (!r.ok || d.error) return { ...base, answered: false, state: `HTTP ${r.status}`, error: d.error?.message ?? raw.slice(0, 200), row: `${base.agent}: did not answer (${d.error?.message ?? 'HTTP ' + r.status})` };
    const task = d.result?.task ?? d.result;
    const state = task?.status?.state ?? 'unknown';
    const text = (task?.artifacts ?? []).flatMap(a => a.parts ?? []).map(x => x.text ?? (x.data ? JSON.stringify(x.data) : '')).join('\n').trim();
    if (state !== 'TASK_STATE_COMPLETED' || !text) return { ...base, answered: false, state, task_id: task?.id ?? null, row: `${base.agent}: did not answer in time (${state})` };
    return { ...base, answered: true, state, task_id: task.id, context_id: task.contextId, text, row: `${base.agent}: ${text.split('\n')[0].slice(0, 140)} (reported, not verified)` };
  } catch (e) {
    return { ...base, answered: false, state: e.name === 'AbortError' ? 'timeout' : 'unreachable', error: String(e.message ?? e), row: `${base.agent}: unreachable today` };
  } finally { clearTimeout(t); }
}
