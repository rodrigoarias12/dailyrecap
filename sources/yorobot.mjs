#!/usr/bin/env node
// Ask an agent that runs on YoRobot (yorobot.ai) the daily question through its web-chat
// channel, wait for the answer, and print ONE JSON document the recap can use as a row.
// YoRobot verifies its agents' work independently; the answer arrives with a mark:
// "aprobado" (verified) or "espera_revision" (waiting for a human). The row says which.
//
//   node sources/yorobot.mjs --config work/sources/yorobot.json [--only grow] [--today "…"] [--timeout 300]
//
// config: [{ "name": "grow", "agent": "Grow (growth)", "url": "https://<portal>/api/charla/<publicId>", "token": "<channel token>" }]
// The channel token is the only credential; it belongs to that agent's web channel and can
// be revoked from the YoRobot portal without touching anything else.
//
// Status: written against YoRobot's web-chat channel API (POST to create, GET ?ticket= to poll);
// not yet run against a live channel.

import { readFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.config) { console.error('usage: node sources/yorobot.mjs --config <file> [--only name] [--question text] [--today text] [--timeout seconds]'); process.exit(2); }
const peers = JSON.parse(await readFile(args.config, 'utf8')).filter(p => !args.only || p.name === args.only);
const today = args.today ?? new Date().toISOString();
const timeout = Number(args.timeout ?? 300) * 1000;
const question = args.question ?? `Daily recap. Today is ${today}. What did you do since yesterday at this hour that the team should know? Facts only, with a source each (a link, an id, a file, a number and where it comes from). Six lines at most. Say "nothing" if nothing. If you do not know, say "I do not know".`;

const MARK = { aprobado: 'verified by YoRobot', espera_revision: 'waiting for a human review at YoRobot' };
const results = await Promise.all(peers.map(ask));
console.log(JSON.stringify({ asked_at: today, question, peers: results, note: 'An answer marked "verified by YoRobot" passed that platform\'s own verifier; one "waiting for a human review" did not yet, treat it as a claim.' }, null, 2));

async function ask(p) {
  const base = { name: p.name, agent: p.agent ?? p.name, url: p.url, system: 'YoRobot' };
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` };
  const started = Date.now();
  try {
    const r = await fetch(p.url, { method: 'POST', headers: h, body: JSON.stringify({ mensaje: question, visitante: 'DailyRecap' }) });
    const raw = await r.text(); let d = {}; try { d = JSON.parse(raw); } catch { /* not JSON */ }
    if (!r.ok || !d.ticketId) return { ...base, answered: false, verified: false, state: `HTTP ${r.status}`, error: d.error ?? raw.slice(0, 200), row: `${base.agent}: did not answer (${d.error ?? 'HTTP ' + r.status})` };
    while (Date.now() - started < timeout) {
      await new Promise(res => setTimeout(res, 5000));
      const g = await fetch(`${p.url}?ticket=${encodeURIComponent(d.ticketId)}`, { headers: h });
      const s = await g.json().catch(() => ({}));
      if (s.estado === 'listo') {
        const verified = s.marca === 'aprobado';
        const text = String(s.respuesta ?? '').trim();
        return { ...base, answered: true, verified, mark: MARK[s.marca] ?? s.marca, ticket: d.ticketId, text, row: `${base.agent}: ${text.split('\n')[0].slice(0, 140)} (${MARK[s.marca] ?? s.marca})` };
      }
      if (s.estado === 'no_existe') return { ...base, answered: false, verified: false, state: 'ticket vanished', ticket: d.ticketId, row: `${base.agent}: did not answer (ticket vanished)` };
    }
    return { ...base, answered: false, verified: false, state: 'timeout', ticket: d.ticketId, row: `${base.agent}: did not answer in time (ticket ${d.ticketId} still working)` };
  } catch (e) {
    return { ...base, answered: false, verified: false, state: 'unreachable', error: String(e.message ?? e), row: `${base.agent}: unreachable today` };
  }
}
