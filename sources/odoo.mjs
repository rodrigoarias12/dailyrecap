#!/usr/bin/env node
// Odoo as a recap source. Reads what happened in the ERP since a moment and prints ONE JSON
// document the agent can put in the video without interpreting anything: counts already
// counted, totals already summed per currency, states as the words a user sees in Odoo plus
// a boolean beside each ambiguous one, the source next to every number, and an explicit
// `truncated` flag on every list. No dependencies: Node 18+ fetch only.
//
//   node sources/odoo.mjs --config work/sources/odoo.json [--since 2026-09-23T18:00:00-03:00] [--limit 8]
//
// config (the owner's private container; never commit it):
//   { "url": "https://mycompany.odoo.com", "db": "mycompany",
//     "login": "recap@mycompany.com", "password": "…" }            ← session login (any version)
//   { "url": "…", "db": "…", "apiKey": "…" }                         ← Odoo 19+ JSON API, bearer key
//   optional: "timezone": "America/Argentina/Buenos_Aires", "recapHour": 18

import { readFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.config) { console.error('usage: node sources/odoo.mjs --config <file> [--since ISO] [--limit N]'); process.exit(2); }
const cfg = JSON.parse(await readFile(args.config, 'utf8'));
const tz = cfg.timezone ?? process.env.OPENCLAW_TZ ?? process.env.TZ ?? 'UTC';
const limit = Number(args.limit ?? 8);
const now = new Date();
const since = args.since ? new Date(args.since) : defaultSince();
const url = cfg.url.replace(/\/$/, '');

/** Yesterday at the recap hour, in the owner's timezone. */
function defaultSince() {
  const hour = Number(cfg.recapHour ?? 18);
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const offsetMs = now.getTime() - local.getTime();
  local.setDate(local.getDate() - 1); local.setHours(hour, 0, 0, 0);
  return new Date(local.getTime() + offsetMs);
}
const odooDate = (d) => d.toISOString().slice(0, 19).replace('T', ' '); // Odoo stores UTC naive

// ---- transport ---------------------------------------------------------------------------
let cookie = '';
async function rpc(path, params, headers = {}) {
  const r = await fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params }) });
  const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
  const d = await r.json();
  if (d.error) throw new Error(d.error.data?.message ?? d.error.message);
  return d.result;
}
let call;
if (cfg.apiKey) {
  // Odoo 19+: /json/2/<model>/<method>, bearer API key.
  call = async (model, method, args, kwargs = {}) => {
    const r = await fetch(`${url}/json/2/${model}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}`, ...(cfg.db ? { 'X-Odoo-Database': cfg.db } : {}) }, body: JSON.stringify({ ...kwargs, ...positional(method, args) }) });
    if (!r.ok) throw new Error(`${model}.${method}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
} else {
  const s = await rpc('/web/session/authenticate', { db: cfg.db, login: cfg.login, password: cfg.password });
  if (!s?.uid) throw new Error('Odoo login failed');
  call = (model, method, args, kwargs = {}) => rpc('/web/dataset/call_kw', { model, method, args, kwargs });
}
function positional(method, args) {
  if (method === 'search_count' || method === 'search_read') return { domain: args[0] };
  if (method === 'read_group') return { domain: args[0], fields: args[1], groupby: args[2] };
  return { args };
}

// ---- what a user sees in Odoo, from one shared table -----------------------------------------
const STATE = { draft: 'Draft', posted: 'Posted', cancel: 'Cancelled' };
const PAYMENT = { not_paid: 'Not paid', in_payment: 'In payment', paid: 'Paid', partial: 'Partially paid', reversed: 'Reversed', invoicing_legacy: 'Invoicing app legacy' };
const SALE = { draft: 'Quotation', sent: 'Quotation sent', sale: 'Sales order', cancel: 'Cancelled' };

const sinceStr = odooDate(since);
const src = (model, domain) => ({ system: 'Odoo', url, model, domain, since: since.toISOString() });

async function moves(moveType, label) {
  const domain = [['move_type', '=', moveType], ['create_date', '>=', sinceStr]];
  const fields = ['name', 'partner_id', 'amount_total', 'amount_residual', 'currency_id', 'invoice_date', 'invoice_date_due', 'state', 'payment_state', 'create_date'];
  const total = await call('account.move', 'search_count', [domain]);
  const rows = await call('account.move', 'search_read', [domain], { fields, limit, order: 'create_date desc' });
  const all = total > rows.length ? await call('account.move', 'search_read', [domain], { fields: ['amount_total', 'amount_residual', 'currency_id', 'partner_id', 'payment_state', 'state'], limit: 5000 }) : rows;
  const byCurrency = {};
  const partners = new Set();
  let unpaid = 0, paid = 0, drafts = 0;
  for (const m of all) {
    const c = m.currency_id?.[1] ?? '?';
    byCurrency[c] = byCurrency[c] ?? { total: 0, outstanding: 0 };
    byCurrency[c].total += m.amount_total; byCurrency[c].outstanding += m.amount_residual ?? 0;
    if (m.partner_id) partners.add(m.partner_id[1]);
    if (m.state === 'draft') drafts += 1;
    else if (m.payment_state === 'paid') paid += 1; else unpaid += 1;
  }
  for (const c of Object.values(byCurrency)) { c.total = round(c.total); c.outstanding = round(c.outstanding); }
  return {
    label, count: total, distinct_partners: partners.size, paid, unpaid, drafts,
    totals_by_currency: byCurrency,
    rows: rows.map(m => ({
      number: m.name || '(no number yet)', partner: m.partner_id?.[1] ?? '', amount: m.amount_total, currency: m.currency_id?.[1] ?? '',
      status: STATE[m.state] ?? m.state, payment: PAYMENT[m.payment_state] ?? m.payment_state,
      is_paid: m.payment_state === 'paid', is_posted: m.state === 'posted', due: m.invoice_date_due || null, created: m.create_date,
    })),
    truncated: total > rows.length, note: total > rows.length ? `showing ${rows.length} of ${total}; the counts and totals above cover all ${total}` : 'complete',
    source: src('account.move', domain),
  };
}

async function sales() {
  const domain = [['state', 'in', ['sale']], ['date_order', '>=', sinceStr]];
  const total = await call('sale.order', 'search_count', [domain]).catch(() => null);
  if (total === null) return { label: 'Sales orders confirmed', available: false, note: 'Sales app not installed or not readable with this user', source: src('sale.order', domain) };
  const rows = await call('sale.order', 'search_read', [domain], { fields: ['name', 'partner_id', 'amount_total', 'currency_id', 'date_order', 'state'], limit, order: 'date_order desc' });
  const all = total > rows.length ? await call('sale.order', 'search_read', [domain], { fields: ['amount_total', 'currency_id', 'partner_id'], limit: 5000 }) : rows;
  const byCurrency = {}; const customers = new Set();
  for (const o of all) { const c = o.currency_id?.[1] ?? '?'; byCurrency[c] = round((byCurrency[c] ?? 0) + o.amount_total); if (o.partner_id) customers.add(o.partner_id[1]); }
  return {
    label: 'Sales orders confirmed', count: total, distinct_customers: customers.size, totals_by_currency: byCurrency,
    rows: rows.map(o => ({ number: o.name, customer: o.partner_id?.[1] ?? '', amount: o.amount_total, currency: o.currency_id?.[1] ?? '', status: SALE[o.state] ?? o.state, is_confirmed: o.state === 'sale', date: o.date_order })),
    truncated: total > rows.length, note: total > rows.length ? `showing ${rows.length} of ${total}` : 'complete', source: src('sale.order', domain),
  };
}

async function newPartners() {
  const domain = [['create_date', '>=', sinceStr], ['is_company', '=', true]];
  const count = await call('res.partner', 'search_count', [domain]);
  const rows = await call('res.partner', 'search_read', [domain], { fields: ['name', 'supplier_rank', 'customer_rank', 'country_id'], limit, order: 'create_date desc' });
  return { label: 'New companies in contacts', count, rows: rows.map(p => ({ name: p.name, is_vendor: p.supplier_rank > 0, is_customer: p.customer_rank > 0, country: p.country_id?.[1] ?? '' })), truncated: count > rows.length, source: src('res.partner', domain) };
}

const round = (n) => Math.round(n * 100) / 100;

const out = {
  system: 'Odoo', url, database: cfg.db ?? null,
  as_of: now.toISOString(), timezone: tz, window: { since: since.toISOString(), until: now.toISOString() },
  note: 'Every count and total below already covers the whole window. Lists are samples when `truncated` is true. Money is in the currency shown, never converted.',
  vendor_bills: await moves('in_invoice', 'Vendor bills received'),
  customer_invoices: await moves('out_invoice', 'Customer invoices issued'),
  sales_orders: await sales(),
  new_companies: await newPartners(),
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
