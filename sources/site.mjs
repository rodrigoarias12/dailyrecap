#!/usr/bin/env node
// The first video's research. From a company's website, what is public and countable, each fact
// with its source, numbers already counted, and a series ready to chart. Run once when the owner
// sends their site, and again any day with nothing else connected. No keys, no dependencies.
//
//   node sources/site.mjs --url https://example.com [--days 30]
//
// Reads: the home page (name, headline, description, sections, colors, logo, links), the site's
// RSS or sitemap (posts and pages changed in the window), a public GitHub repo linked from the
// page and owned by the company (commits per week for eight weeks, releases in the window), and
// Google News' RSS (headlines that name the company). Anything it cannot reach or cannot tie to
// the company is `available: false` or `ownership: "unconfirmed"`, never a guess.

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1] ?? true] : []).filter(Boolean));
if (!args.url) { console.error('usage: node sources/site.mjs --url <website> [--days 30]'); process.exit(2); }
const days = Number(args.days ?? 30);
const now = new Date();
const since = new Date(now.getTime() - days * 86400e3);
const start = new URL(/^https?:/.test(args.url) ? args.url : `https://${args.url}`);
// The page the owner sent (a language path like /en included); feeds and the sitemap live at the origin.
const origin = start.origin;
const host = new URL(origin).hostname.replace(/^www\./, '');
const domainRoot = host.split('.').slice(-2, -1)[0] ?? host;
const UA = { 'User-Agent': 'Mozilla/5.0 (DailyRecap; +https://github.com/rodrigoarias12/dailyrecap)' };

async function get(url, accept = '*/*') {
  try {
    const r = await fetch(url, { headers: { ...UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return { ok: r.ok, status: r.status, url: r.url, type: r.headers.get('content-type') ?? '', remaining: r.headers.get('x-ratelimit-remaining'), text: r.ok || r.status === 202 ? await r.text() : '' };
  } catch (e) { return { ok: false, status: 0, url, type: '', text: '', error: String(e.message ?? e) }; }
}
const meta = (html, re) => { const m = html.match(re); return m ? decode(m[1].trim()) : null; };
const decode = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const abs = (u) => { try { return new URL(u, origin).href; } catch { return null; } };
const inWindow = (d) => { const t = Date.parse(d); return Number.isFinite(t) && t >= since.getTime() && t <= now.getTime() + 86400e3; };
const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ── The home page ─────────────────────────────────────────────────────────────────────────
const home = await get(start.href, 'text/html');
const h = home.text;
const titleName = meta(h, /<title[^>]*>([^<]+)/i)?.split(/\s[|–—:·]\s|\s-\s/)[0]?.trim();
const siteName = meta(h, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ?? meta(h, /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)/i);
const generic = /^(home|welcome|index|inicio|untitled|app|website)$/i;
const name = [siteName, titleName].find(n => n && n.length > 1 && !generic.test(n)) ?? (domainRoot.charAt(0).toUpperCase() + domainRoot.slice(1));
const icons = [meta(h, /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i), meta(h, /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+\.(?:png|svg))/i)].filter(Boolean);
const company = {
  available: home.ok,
  ...(home.ok ? {} : { note: `the site answered ${home.status || 'nothing'} (${home.error ?? 'blocked or down'}); ask the owner for another page or what the company does` }),
  name,
  name_is_from: siteName ? 'og:site_name' : titleName && !generic.test(titleName) ? '<title>' : 'the domain',
  headline: meta(h, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || null,
  description: meta(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ?? meta(h, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i),
  sections: [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => decode(m[1])).filter(t => t && t.length <= 60).slice(0, 4),
  theme_color: meta(h, /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i),
  // A square icon reads on a closing card; a wide og:image does not. The og:image is the last resort.
  logo: abs(icons[0] ?? '/apple-touch-icon.png'),
  logo_fallback: abs(meta(h, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ?? '/favicon.ico'),
  lang: meta(h, /<html[^>]+lang=["']([^"']+)/i),
  screenshot: `chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=8000 --screenshot=<ws>/work/assets/screens/<date>/home.png ${start.href}`,
  source: origin,
};

// ── Posts and pages changed in the window ─────────────────────────────────────────────────
async function publishing() {
  const feedHref = meta(h, /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)/i);
  for (const u of [feedHref && abs(feedHref), `${origin}/feed`, `${origin}/rss.xml`, `${origin}/blog/rss.xml`, `${origin}/feed.xml`].filter(Boolean)) {
    const r = await get(u, 'application/rss+xml, application/atom+xml, text/xml');
    if (!r.ok || !/<(rss|feed)[\s>]/i.test(r.text)) continue;
    const items = [...r.text.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]).map(x => ({
      title: meta(x, /<title[^>]*>([\s\S]*?)<\/title>/i),
      date: meta(x, /<(?:pubDate|published|updated)[^>]*>([^<]+)</i),
      link: meta(x, /<link[^>]*>([^<]+)<\/link>/i) ?? meta(x, /<link[^>]+href=["']([^"']+)/i),
    }));
    const recent = items.filter(i => i.date && inWindow(i.date));
    return { available: true, kind: 'feed', source: r.url, posts_in_window: recent.length, recent: recent.slice(0, 5), truncated: recent.length > 5 };
  }
  // A sitemap, following one level of sitemap index. Dates written at build time (every page the
  // same day) say nothing about what changed, so they never become a number.
  const sm = await get(`${origin}/sitemap.xml`, 'text/xml');
  if (!sm.ok || !/<urlset|<sitemapindex/i.test(sm.text)) return { available: false, note: 'no feed and no sitemap found' };
  let text = sm.text;
  if (/<sitemapindex/i.test(text)) {
    const kids = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1]).slice(0, 3);
    text = (await Promise.all(kids.map(k => get(k, 'text/xml')))).map(r => r.text).join('\n');
  }
  const mods = [...text.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map(m => m[1].slice(0, 10));
  const pages = (text.match(/<url>/gi) ?? []).length;
  const top = mods.length ? Math.max(...Object.values(mods.reduce((c, d) => ({ ...c, [d]: (c[d] ?? 0) + 1 }), {}))) : 0;
  const generated = mods.length > 3 && top / mods.length > 0.8;
  return { available: true, kind: 'sitemap', source: sm.url, pages, pages_changed_in_window: generated ? null : mods.filter(inWindow).length,
    note: !mods.length ? 'the sitemap has no dates' : generated ? 'the dates look generated at build time (most pages share one day): not a count of changes' : 'changed = lastmod inside the window' };
}

// ── A public GitHub repo linked from the site, owned by the company ────────────────────────
async function github() {
  const pairs = [...h.matchAll(/https?:\/\/github\.com\/([A-Za-z0-9-]+)(?:\/([A-Za-z0-9_.-]+))?/g)]
    .map(m => ({ owner: m[1], repo: m[2]?.replace(/\.git$/, '') }))
    .filter(l => !['sponsors', 'features', 'about', 'login', 'orgs', 'topics', 'marketplace', 'site', 'pricing'].includes(l.owner.toLowerCase()));
  if (!pairs.length) return { available: false, note: 'no GitHub link on the home page' };
  // The company's own: an owner that matches the domain or the name. A template's repo or an
  // agency's footer is someone else's work, and a video must not call it "ours".
  const ours = (o) => { const n = norm(o); return n && (n.includes(norm(domainRoot)) || norm(domainRoot).includes(n) || n.includes(norm(name)) || norm(name).includes(n)); };
  const pick = pairs.find(p => ours(p.owner) && p.repo) ?? pairs.find(p => ours(p.owner)) ?? pairs[0];
  const ownership = ours(pick.owner) ? 'confirmed (owner matches the domain or the name)' : 'unconfirmed';
  let limited = false;
  const gh = async (p) => { const r = await get(`https://api.github.com${p}`, 'application/vnd.github+json'); if ((r.status === 403 || r.status === 429) && r.remaining === '0') limited = true; return r.ok ? JSON.parse(r.text) : null; };
  let repo = pick.repo, info = repo ? await gh(`/repos/${pick.owner}/${repo}`) : null;
  if (!limited && (!repo || info?.archived)) {
    const repos = await gh(`/users/${pick.owner}/repos?per_page=100&sort=pushed`);
    const live = Array.isArray(repos) ? repos.filter(r => !r.fork && !r.archived) : [];
    if (live.length) { const best = live.sort((a, b) => b.stargazers_count - a.stargazers_count)[0]; repo = best.name; info = best; }
  }
  const src = `github.com/${pick.owner}${repo ? '/' + repo : ''}`;
  if (limited || !info) {
    // No quota left (the API allows 60 calls an hour per address): the public Atom feeds need none.
    if (!repo) return { available: false, source: src, ownership, note: limited ? 'GitHub API rate limit reached; try again in an hour' : `${src} has no readable public repo` };
    const [c, r] = await Promise.all([get(`https://github.com/${pick.owner}/${repo}/commits.atom`, 'application/atom+xml'), get(`https://github.com/${pick.owner}/${repo}/releases.atom`, 'application/atom+xml')]);
    const entries = (t) => [...t.matchAll(/<entry>[\s\S]*?<\/entry>/gi)].map(m => ({ title: meta(m[0], /<title[^>]*>([\s\S]*?)<\/title>/i), date: meta(m[0], /<updated>([^<]+)</i) }));
    const commits = entries(c.text).filter(e => inWindow(e.date)), releases = entries(r.text).filter(e => inWindow(e.date));
    return { available: c.ok, source: src, repo: `${pick.owner}/${repo}`, ownership, via: 'Atom feeds (API limit reached)', recent_commits: commits.slice(0, 5), commits_in_window_at_least: commits.length, releases_in_window: releases.length, releases: releases.slice(0, 3), note: 'the Atom feed holds the last 20 commits only: a floor, not a total' };
  }
  // Commits per week for the last eight weeks: GitHub's own weekly totals. The endpoint answers
  // 202 while it computes; two more tries, then the commit list itself (up to 500).
  let activity = null;
  for (let i = 0; i < 3 && !Array.isArray(activity); i++) {
    const r = await get(`https://api.github.com/repos/${pick.owner}/${repo}/stats/commit_activity`, 'application/vnd.github+json');
    if (r.status === 200) { try { activity = JSON.parse(r.text); } catch {} }
    if (!Array.isArray(activity)) await new Promise(res => setTimeout(res, 2000));
  }
  let series = [];
  if (Array.isArray(activity) && activity.length) {
    const last8 = activity.slice(-8);
    series = last8.map((w, i) => ({ x: i === last8.length - 1 ? 'this week (so far)' : new Date(w.week * 1000).toISOString().slice(5, 10), y: w.total }));
  } else {
    const start = new Date(now.getTime() - 8 * 7 * 86400e3);
    let list = [];
    for (let page = 1; page <= 5; page++) {
      const batch = await gh(`/repos/${pick.owner}/${repo}/commits?per_page=100&page=${page}&since=${start.toISOString()}`);
      if (!Array.isArray(batch) || !batch.length) break;
      list = list.concat(batch);
      if (batch.length < 100) break;
    }
    if (list.length && list.length < 500) series = Array.from({ length: 8 }, (_, i) => {
      const a = start.getTime() + i * 7 * 86400e3, b = a + 7 * 86400e3;
      return { x: i === 7 ? 'this week (so far)' : new Date(a).toISOString().slice(5, 10), y: list.filter(c => { const t = Date.parse(c.commit?.author?.date); return t >= a && t < b; }).length };
    });
  }
  const releases = (await gh(`/repos/${pick.owner}/${repo}/releases?per_page=20`) ?? []).filter(r => r.published_at && inWindow(r.published_at));
  return {
    available: true, source: src, repo: `${pick.owner}/${repo}`, ownership, stars: info.stargazers_count,
    commits_last_8_weeks: series.length ? series.reduce((a, p) => a + p.y, 0) : null, commits_per_week: series,
    note: series.length ? 'the last bar is the current week, still running: not a decline' : 'weekly totals not available (GitHub still computing, or over 500 commits in 8 weeks)',
    releases_in_window: releases.length, releases: releases.slice(0, 3).map(r => ({ name: r.name || r.tag_name, date: r.published_at.slice(0, 10), link: r.html_url })),
  };
}

// ── Headlines that name the company ───────────────────────────────────────────────────────
async function news() {
  // A short or common name matches other companies: the count is never a hook, and each row is
  // "reported" until someone opens the article.
  if (name.length < 4 || company.name_is_from === 'the domain') return { available: false, note: `"${name}" is too generic to search news for` };
  const r = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${name}"`)}&hl=en-US&gl=US&ceid=US:en`, 'application/rss+xml');
  if (!r.ok) return { available: false, note: `Google News answered ${r.status}` };
  const key = new RegExp(`(^|[^a-z0-9])${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  const items = [...r.text.matchAll(/<item>[\s\S]*?<\/item>/gi)].map(m => m[0]).map(x => ({ title: meta(x, /<title>([\s\S]*?)<\/title>/i), date: meta(x, /<pubDate>([^<]+)</i), outlet: meta(x, /<source[^>]*>([^<]+)</i), link: meta(x, /<link>([^<]+)<\/link>/i) }));
  const recent = items.filter(i => i.date && inWindow(i.date) && key.test((i.title ?? '').toLowerCase()));
  return { available: true, source: 'Google News', query: `"${name}"`, mentions_in_window: recent.length, recent: recent.slice(0, 3), truncated: recent.length > 3, note: 'headlines that name the company; unverified until the article is opened, and the count is not a hook' };
}

const [pub, git, press] = await Promise.all([publishing(), github(), news()]);

// The hook: the most telling number that is actually there and actually theirs, in this order.
const hooks = [];
const theirs = git.available && git.ownership?.startsWith('confirmed');
const repoName = git.repo?.split('/')[1];
if (theirs && git.commits_last_8_weeks > 0) hooks.push({ label: `Commits to ${repoName}, last 8 weeks`, value: String(git.commits_last_8_weeks), source: git.source, chart: { kind: 'bars', series: git.commits_per_week } });
if (theirs && git.releases_in_window > 0) hooks.push({ label: `${repoName} releases, last ${days} days`, value: String(git.releases_in_window), source: git.source });
if (pub.available && pub.kind === 'feed' && pub.posts_in_window > 0) hooks.push({ label: `Posts, last ${days} days`, value: String(pub.posts_in_window), source: pub.source });
if (pub.available && pub.kind === 'sitemap' && pub.pages_changed_in_window > 0) hooks.push({ label: `Pages updated, last ${days} days`, value: String(pub.pages_changed_in_window), source: pub.source });
if (theirs && git.stars > 0) hooks.push({ label: `${repoName} stars on GitHub`, value: git.stars.toLocaleString('en-US'), source: git.source });

console.log(JSON.stringify({
  as_of: now.toISOString(), window_days: days, company, publishing: pub, github: git, news: press,
  hooks, note: hooks.length ? 'hooks are in order of preference; each is a counted, sourced public number that belongs to the company' : 'nothing countable and theirs is public: open with a screenshot of their home page and their own headline',
}, null, 2));
