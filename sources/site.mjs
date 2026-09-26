#!/usr/bin/env node
// The first video's research. From a company's website, what is public and countable, each fact
// with its source, numbers already counted, and a series ready to chart. Run once when the owner
// sends their site, and again any day with nothing else connected. No keys, no dependencies.
//
//   node sources/site.mjs --url https://example.com [--days 30]
//
// Reads: the home page (name, headline, description, colors, logo, links), the site's RSS or
// sitemap (posts and pages changed in the window), a public GitHub org or repo linked from the
// page (commits per week for eight weeks, stars, releases in the window), and Google News' RSS
// (mentions in the window). Anything it cannot reach is `available: false`, never a guess.

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.url) { console.error('usage: node sources/site.mjs --url <website> [--days 30]'); process.exit(2); }
const days = Number(args.days ?? 30);
const now = new Date();
const since = new Date(now.getTime() - days * 86400e3);
const origin = new URL(/^https?:/.test(args.url) ? args.url : `https://${args.url}`).origin;
const UA = { 'User-Agent': 'Mozilla/5.0 (DailyRecap; +https://github.com/rodrigoarias12/dailyrecap)' };

async function get(url, accept = '*/*') {
  try {
    const r = await fetch(url, { headers: { ...UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return { ok: r.ok, status: r.status, url: r.url, type: r.headers.get('content-type') ?? '', text: r.ok ? await r.text() : '' };
  } catch (e) { return { ok: false, status: 0, url, type: '', text: '', error: String(e.message ?? e) }; }
}
const meta = (html, re) => { const m = html.match(re); return m ? decode(m[1].trim()) : null; };
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const abs = (u) => { try { return new URL(u, origin).href; } catch { return null; } };
const inWindow = (d) => { const t = Date.parse(d); return Number.isFinite(t) && t >= since.getTime() && t <= now.getTime() + 86400e3; };

// ── The home page ─────────────────────────────────────────────────────────────────────────
const home = await get(origin, 'text/html');
const h = home.text;
const company = {
  name: meta(h, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ?? meta(h, /<title[^>]*>([^<|–—-]+)/i),
  headline: meta(h, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').trim() || null,
  description: meta(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ?? meta(h, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i),
  theme_color: meta(h, /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i),
  logo: abs(meta(h, /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)/i) ?? meta(h, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ?? '/favicon.ico'),
  lang: meta(h, /<html[^>]+lang=["']([^"']+)/i),
  source: origin,
};
company.available = home.ok;

// ── Posts and pages changed in the window ─────────────────────────────────────────────────
async function publishing() {
  const feedHref = meta(h, /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)/i);
  for (const u of [feedHref && abs(feedHref), `${origin}/feed`, `${origin}/rss.xml`, `${origin}/blog/rss.xml`, `${origin}/feed.xml`].filter(Boolean)) {
    const r = await get(u, 'application/rss+xml, application/atom+xml, text/xml');
    if (!r.ok || !/<(rss|feed)[\s>]/i.test(r.text)) continue;
    const items = [...r.text.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]).map(x => ({
      title: meta(x, /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i),
      date: meta(x, /<(?:pubDate|published|updated)[^>]*>([^<]+)</i),
      link: meta(x, /<link[^>]*>([^<]+)<\/link>/i) ?? meta(x, /<link[^>]+href=["']([^"']+)/i),
    }));
    const recent = items.filter(i => i.date && inWindow(i.date));
    return { available: true, kind: 'feed', source: r.url, posts_in_window: recent.length, total_in_feed: items.length, recent: recent.slice(0, 5), truncated: recent.length > 5 };
  }
  const sm = await get(`${origin}/sitemap.xml`, 'text/xml');
  if (sm.ok && /<urlset|<sitemapindex/i.test(sm.text)) {
    const mods = [...sm.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map(m => m[1]);
    const urls = (sm.text.match(/<loc>/gi) ?? []).length;
    return { available: true, kind: 'sitemap', source: sm.url, pages: urls, pages_changed_in_window: mods.filter(inWindow).length, note: mods.length ? 'changed = lastmod inside the window' : 'the sitemap has no dates' };
  }
  return { available: false, note: 'no feed and no sitemap found' };
}

// ── A public GitHub org or repo linked from the site ─────────────────────────────────────
async function github() {
  const links = [...h.matchAll(/https?:\/\/github\.com\/([A-Za-z0-9-]+)(?:\/([A-Za-z0-9_.-]+))?/g)].map(m => ({ owner: m[1], repo: m[2] }))
    .filter(l => !['sponsors', 'features', 'about', 'login', 'orgs', 'topics', 'marketplace'].includes(l.owner.toLowerCase()));
  if (!links.length) return { available: false, note: 'no GitHub link on the home page' };
  const gh = async (p) => { const r = await get(`https://api.github.com${p}`, 'application/vnd.github+json'); return r.ok ? JSON.parse(r.text) : null; };
  const owner = links[0].owner;
  let repo = links.find(l => l.repo)?.repo?.replace(/\.git$/, '');
  if (!repo) {
    const repos = await gh(`/users/${owner}/repos?per_page=100&sort=pushed`);
    if (!Array.isArray(repos) || !repos.length) return { available: false, note: `github.com/${owner} has no public repos readable` };
    repo = repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count)[0]?.name;
  }
  const info = await gh(`/repos/${owner}/${repo}`);
  if (!info) return { available: false, note: `github.com/${owner}/${repo} is not readable` };
  // Commits per week, last eight weeks: GitHub's own weekly totals (exact, not capped). The
  // endpoint answers 202 while it computes; ask again a few times before giving up.
  let activity = null;
  for (let i = 0; i < 5 && !Array.isArray(activity); i++) {
    const r = await get(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, 'application/vnd.github+json');
    if (r.status === 200) { try { activity = JSON.parse(r.text); } catch {} }
    if (!Array.isArray(activity)) await new Promise(res => setTimeout(res, 3000));
  }
  let series = [];
  if (Array.isArray(activity) && activity.length) {
    const last8 = activity.slice(-8);
    series = last8.map((w, i) => ({ x: i === last8.length - 1 ? 'this week' : new Date(w.week * 1000).toISOString().slice(5, 10), y: w.total }));
  } else {
    // Plan B: the commit list itself, page by page (up to 500), bucketed into weeks.
    const start = new Date(now.getTime() - 8 * 7 * 86400e3);
    let list = [];
    for (let page = 1; page <= 5; page++) {
      const batch = await gh(`/repos/${owner}/${repo}/commits?per_page=100&page=${page}&since=${start.toISOString()}`);
      if (!Array.isArray(batch) || !batch.length) break;
      list = list.concat(batch);
      if (batch.length < 100) break;
    }
    if (list.length && list.length < 500) {
      series = Array.from({ length: 8 }, (_, i) => {
        const a = start.getTime() + i * 7 * 86400e3, b = a + 7 * 86400e3;
        return { x: i === 7 ? 'this week' : new Date(a).toISOString().slice(5, 10), y: list.filter(c => { const t = Date.parse(c.commit?.author?.date); return t >= a && t < b; }).length };
      });
    }
  }
  const releases = (await gh(`/repos/${owner}/${repo}/releases?per_page=20`) ?? []).filter(r => r.published_at && inWindow(r.published_at));
  return {
    available: true, source: `github.com/${owner}/${repo}`, repo: `${owner}/${repo}`, stars: info.stargazers_count,
    commits_last_8_weeks: series.length ? series.reduce((a, p) => a + p.y, 0) : null, weekly_totals: series.length ? 'exact' : 'not available (GitHub still computing, or over 500 commits in 8 weeks)',
    commits_per_week: series, releases_in_window: releases.length, releases: releases.slice(0, 3).map(r => ({ name: r.name || r.tag_name, date: r.published_at.slice(0, 10) })),
  };
}

// ── Mentions in the news ──────────────────────────────────────────────────────────────────
async function news(name) {
  if (!name) return { available: false, note: 'no company name to search for' };
  const r = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${name}"`)}&hl=en-US&gl=US&ceid=US:en`, 'application/rss+xml');
  if (!r.ok) return { available: false, note: `Google News answered ${r.status}` };
  const items = [...r.text.matchAll(/<item>[\s\S]*?<\/item>/gi)].map(m => m[0]).map(x => ({ title: meta(x, /<title>([\s\S]*?)<\/title>/i), date: meta(x, /<pubDate>([^<]+)</i), source: meta(x, /<source[^>]*>([^<]+)</i) }));
  // Only headlines that name the company: a search for a common name returns other companies.
  const key = new RegExp(`(^|[^a-z0-9])${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  const recent = items.filter(i => i.date && inWindow(i.date) && key.test((i.title ?? '').toLowerCase()));
  return { available: true, source: 'Google News', query: `"${name}"`, mentions_in_window: recent.length, recent: recent.slice(0, 3), truncated: recent.length > 3, note: 'counted only headlines that name the company; still read them before using the count' };
}

const [pub, git] = await Promise.all([publishing(), github()]);
const press = await news(company.name);

// The hook: the most telling number that is actually there, in this order.
const hooks = [];
if (git.available && git.commits_last_8_weeks > 0) hooks.push({ label: 'Commits in the last 8 weeks', value: String(git.commits_last_8_weeks), source: git.source, chart: { kind: 'bars', series: git.commits_per_week } });
if (git.available && git.releases_in_window > 0) hooks.push({ label: `Releases in the last ${days} days`, value: String(git.releases_in_window), source: git.source });
if (pub.available && (pub.posts_in_window ?? pub.pages_changed_in_window) > 0) hooks.push({ label: pub.kind === 'feed' ? `Posts in the last ${days} days` : `Pages updated in the last ${days} days`, value: String(pub.posts_in_window ?? pub.pages_changed_in_window), source: pub.source });
if (press.available && press.mentions_in_window > 0) hooks.push({ label: `News mentions in the last ${days} days`, value: String(press.mentions_in_window), source: 'Google News', check: 'confirm the titles are about this company' });
if (git.available && git.stars > 0) hooks.push({ label: 'GitHub stars', value: git.stars.toLocaleString('en-US'), source: git.source });

console.log(JSON.stringify({
  as_of: now.toISOString(), window_days: days, company, publishing: pub, github: git, news: press,
  hooks, note: hooks.length ? 'hooks are in order of preference; every one is a counted, sourced public number' : 'nothing countable is public: open the video with the company\'s own headline instead of a number',
}, null, 2));
