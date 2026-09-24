// Prints the recent transcript events of an agent that mention a needle (default: the message tool).
import { DatabaseSync } from 'node:sqlite';
const agent = process.argv[2] || 'dailyrecap', needle = process.argv[3] || 'recap.mp4';
const db = new DatabaseSync(`${process.env.OPENCLAW_STATE_DIR || '/home/node/.openclaw'}/agents/${agent}/agent/openclaw-agent.sqlite`, { readOnly: true });
const cols = db.prepare('pragma table_info(transcript_events)').all().map((c) => c.name);
const rows = db.prepare('select * from transcript_events order by rowid desc limit 80').all();
for (const r of rows.reverse()) {
  const s = JSON.stringify(r);
  if (!s.includes(needle)) continue;
  const i = s.indexOf(needle);
  console.log('…' + s.slice(Math.max(0, i - 400), i + 500).replace(/\\n/g, ' ') + '…\n');
}
console.log('columns:', cols.join(', '));
