<p align="center"><img src="docs/logo-512.png" width="120" alt="DailyRecap"></p>

# DailyRecap

**Your startup's first chief of staff. The TikTok of your company.** Every evening it asks
your team and your other agents what they did, verifies what it can, and hands you a
video of the day, under a minute, cut like a TikTok. On day one it also makes your launch video from your repo,
and whenever you want, the "building in public" clip you never get around to posting.
From the data, never from imagination. Rendered on your machine: no video API, no keys,
no stock footage.

Built for the [OpenClaw 2.0 hackathon](https://luma.com/zhkhsnpa) (multiplayer mode). MIT.

## Three jobs, one engine

| | What goes in | What comes out | Who approves |
|---|---|---|---|
| **Launch video** (once) | a repo or landing URL, optional screenshots | 30–60 s, 16:9 | the team, in the shared session |
| **Daily recap** (every weekday) | what the people and agents on its roster answer when asked, checked against the sources; the website and public repos; your numbers once connected | 30–45 s, vertical, cut like a TikTok | nobody: it ships at the hour you set |
| **Public clip** (when you want) | the recap, filtered to what can be told outside | 20–30 s, 9:16 | the owner, before anyone posts |

What it never does: invent a number, name a customer who is not public, publish anything,
send an external cut without a human's word.

## Multiplayer, and why it matters here

One shared OpenClaw session per company. The founder owns it; teammates join with *Suggest*
or *Draft* rights. During the day people drop what they did and what a customer said; at
recap time that is the best source there is. Suggestions on a script are change requests,
the owner's "approved" is what renders an external cut, and `assign_owner` hands that role
to someone else.

And the other agents are colleagues. At recap time DailyRecap asks every agent on the
Gateway (`sessions_send`) what it did since yesterday, with sources, and puts the answer in
the video with the agent's name on the row. An agent's report is a claim: if it points at
something DailyRecap can open, it opens it first; if not, the row says "reported, not
verified". The first hire that asks the other hires what they did today.

## Install

**One text, nothing to install:** send `Set this up for me: aiworthusing.com/agent-index/dailyrecap`
by iMessage to +1 (628) 246-3032. Your agent texts you back from its own number and asks for one
thing, your website, and makes your first video from it (about 15 minutes). Then it shows you
what you can connect next (your numbers, your team and agents, your repos); text `settings`
to change anything. The full guide, including
your own Gateway with Telegram, Slack or WhatsApp delivery, is [docs/INSTALL.md](docs/INSTALL.md).

### Local OpenClaw Gateway (2026.9 or later)

```bash
git clone https://github.com/rodrigoarias12/dailyrecap ~/dailyrecap
cd ~/dailyrecap/video && npm install
```

Merge `openclaw.example.json5` into `~/.openclaw/openclaw.json` (the agent's workspace is
this folder), restart the Gateway, open a shared session and paste a repo URL. The first
message sets the recap hour and which repos count. The Gateway host needs `node`, `ffmpeg`,
`ffprobe` and `git` on its PATH. The first render downloads a headless Chrome once.

To try it without installing anything, [`dev/`](dev/README.md) runs the whole Gateway in
Docker and removes itself with one command. For the hosted, 1-click version (Plow phone
line), see [`cloud/`](cloud/README.md).

## The TikTok of your company

<a href="docs/tiktok/ceo-report-2026-09-25.mp4"><img src="docs/tiktok/ceo-report.gif" width="270" align="right" alt="The CEO's report of September 25, cut like a TikTok"></a>

*The CEO's report of September 25: DailyRecap asked the CTO's and the product owner's
assistants what happened and cut it in 30 seconds. [Watch it with sound](docs/tiktok/ceo-report-2026-09-25.mp4).
The product numbers come from a demo KPI sheet.*

The recap is cut like a TikTok, not like a slide deck: vertical, 30–45 s, the day's most
surprising number on the first frame, a cut every two to four seconds, word-by-word captions,
and everything kept inside the zone the app's interface leaves clear. `"style": "tiktok"` in
any script turns it on; [`video/example/tiktok.json`](video/example/tiktok.json) is a full one.
The rules come from TikTok's own creative guidance (hook in the first 3 s, faster scene
changes, text on screen) and are encoded in the engine, so every company's recap follows them.

## Who it asks

Every evening DailyRecap asks the same question to everyone on its roster: people and agents
alike. In the first conversation you give it, for each one, a name, a role and an address. The
address is the only thing that decides how the question travels:

| Address | On Plow (one text to install) | On your own OpenClaw |
|---|---|---|
| **A phone number** | Yes: it texts the number over iMessage. A teammate or another agent on its own Plow line, it cannot tell and does not need to: whatever comes back in that thread is the answer. | Yes, if the Gateway has an SMS, iMessage or WhatsApp channel |
| **An agent id on the same Gateway** | No: a Plow line holds one agent | Yes, with `sessions_send` |
| **An Agent2Agent URL and a token** (another OpenClaw) | Yes | Yes |
| **A YoRobot agent's channel and a token** (not yet run against a live channel) | Yes | Yes |

So the two paths are simple. **On Plow, give it phone numbers**: your CTO, your CFO, your
scheduling assistant's line. **On your own OpenClaw, give it agent ids** for the agents beside
it, and URLs for the ones elsewhere. Answers by text arrive later than the others, so on those
days the recap waits up to 20 minutes for them; whoever does not answer is a row that says so,
and whatever anyone answers is marked verified only when DailyRecap could open its source (a
YoRobot agent's answer also carries YoRobot's own mark: approved by its verifier, or waiting for
review).

## Connect your numbers

The recap is only as good as what it can read. Out of the box it reads the shared session,
the other agents on the Gateway and any repo you name. To have it say what happened in the
systems the company runs, hand it a source in the first conversation (or later, any time):

| Source | What you give it | What it reads every evening |
|---|---|---|
| **Odoo** (any version; ERP with the same API) | URL, database, a read-only login or an Odoo 19+ API key | vendor bills received, customer invoices issued, sales orders confirmed, new companies: counts, totals per currency, how many are paid, with the source beside each number |
| **A report by URL** | a Google Sheet published to the web as CSV, a CSV/JSON export, a dashboard endpoint with a read-only token in the URL | the rows, the count, the sums of the numeric columns |
| **Mail and calendar** | what the Gateway already has: on a Plow line, the owner's connectors; locally, the Google skill | today's and tomorrow's meetings, the threads that moved |
| **People and other agents** | a roster: name, role, and a phone number, an agent id, or an Agent2Agent or YoRobot address (see "Who it asks") | what each one did since yesterday, in their own words, with its source |

The scripts are in [`sources/`](sources/): each returns the numbers already counted and
labelled, so the agent copies them instead of calculating, and every list carries a
`truncated` flag so a sample is never mistaken for the whole. Credentials stay in
`work/sources/` inside the agent's own container; they never reach a video, a message or
a memory file. Try one by hand:

```bash
node sources/odoo.mjs --config work/sources/odoo.json --since 2026-09-20T00:00:00Z
node sources/url.mjs --url "https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" --name "Sales sheet"
node sources/a2a.mjs --config work/sources/agents.json --today "2026-09-24 18:00 America/Argentina/Buenos_Aires"
```

## Render without the agent

The video package stands on its own. A `script.json` in, an mp4 out:

```bash
cd video
npm run render -- example/launch.json out/launch.mp4    # 16:9 launch video
npm run render -- example/tiktok.json out/tiktok.mp4    # the daily recap, TikTok cut
npm run render -- example/recap.json  out/recap.mp4     # the old 16:9 board format
npm run render -- example/clip.json   out/clip.mp4      # 9:16 public clip
npm run studio                                          # live preview in Remotion Studio
```

The script schema is [`video/src/script.ts`](video/src/script.ts). Eleven scene types:
`title`, `screen` (screenshot + focus), `chips`, `numbers`, `events`, `metric`, `quote`,
`agenda`, `closing`. `format: "portrait"` switches to 9:16 with the same pieces. Colors
come from `brand`; the accent is always a background with ink text on it, never text.

## Layout

```
AGENTS.md  SOUL.md  IDENTITY.md  USER.md  HEARTBEAT.md   the OpenClaw workspace
skills/launch-video/SKILL.md                            the launch video, step by step
skills/daily-recap/SKILL.md                             the recap and the public clip, onboarding and settings
video/                                                  Remotion package: script in, mp4 out
  src/script.ts                                         the contract between agent and renderer
  src/pieces.tsx                                        the scenes, 16:9 and 9:16; charts in charts.tsx
  scripts/render.mjs · music.mjs · narrate.mjs
cloud/                                                  Plow image for the Agent Index 1-click deploy
docs/PLAN.md                                            the hackathon plan and the distribution list
work/  shipped/  memory/                                the agent's working files (work/ is not committed)
```

## Licenses

Code: MIT. Rethink Sans: SIL OFL 1.1 (see `video/public/fonts`). Sound effects: Mixkit free
license (see `video/public/sfx/ATTRIBUTION.md`). Remotion is a dependency with its own
license: free for individuals and companies of up to three people, a company license above
that. Check https://remotion.dev/license before rendering for a larger company.
