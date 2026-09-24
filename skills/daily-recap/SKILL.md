---
name: daily-recap
description: Every day, a 45–60 s internal video of what happened at the company (commits, PRs, meetings, numbers, what the team said) and, on request, a 20–30 s vertical "building in public" clip for outside. Runs from a cron; the recap ships on its own, the clip waits for the owner's approval.
metadata:
  openclaw:
    requires:
      bins: [node, ffmpeg, ffprobe, git]
---

# daily-recap

`<ws>` is the workspace root (this repository). `<video>` is the video engine: `$DAILYRECAP_VIDEO_DIR` when that variable is set (the hosted image keeps it at `/opt/dailyrecap/video`), otherwise `<ws>/video`. `<date>` is today as `YYYY-MM-DD`.
Work in `<ws>/work/recap/<date>/`.

## 0. First time: set the clock

Ask the owner once, in the session:
- At what hour should the recap go out? (default 18:00 local)
- **Where does it go?** A channel the Gateway already has (a Slack channel, a WhatsApp or
  Telegram group, a Discord channel; on a Plow line, the owner's iMessage) or, failing
  that, the shared session. The mp4 is sent as a file with the `message` tool; the session
  gets the summary and the path. Ask for the exact channel and target id; save both.
- Which repos count, if any? (paths or Git URLs; you keep shallow clones under `<ws>/work/repos/`)
- Is the public clip wanted every day, or only when asked?
- Which numbers may be told outside, if any?
- **Which other agents work here?** Their ids on this Gateway (a sales agent, a support
  agent, a CFO agent, a marketing agent). They are colleagues: you will ask them every day.

Save the answers to `MEMORY.md`. Then create the cron with the `cron` tool: one job at
that hour, every weekday, whose message is `daily-recap: run`, **delivered to the team's
channel and target** (that is what makes the reply's `MEDIA:` line arrive as a file).
Say what you set.

## 1. Gather (all of it, every day)

Read everything, then decide. Reading is cheap; a thin recap is expensive.

Everything a company does through OpenClaw is reachable from inside it, but not by reading
other agents' sessions or memory: OpenClaw keeps those apart on purpose. You get it by
asking. So the two primary sources need nothing connected:

- **The other agents.** Send each agent on the roster the same question with `sessions_send`:

  > Daily recap. What did you do since yesterday at 18:00 that the team should know?
  > Facts only, with a source each (a link, an id, a file, a number and where it comes
  > from). Six lines at most. Say "nothing" if nothing.

  Wait for all of them (a minute is enough; an agent that does not answer is a row that
  says so). What an agent reports is a claim, like a commit message: if it points at
  something you can open (a PR, a ticket, a report), open it before it goes in the video.
  Their rows carry `who` = the agent's name, so the team knows who said it.
- **The shared session:** everything teammates wrote since the last recap. This is where
  the quotes and the customer moments come from.
- **Yesterday's recap** in `shipped/`, so you do not repeat and so a delta has a baseline.

Then the optional sources, only when the Gateway already has them (a later chapter, not a
requirement):

- **Repos:** for each connected repo, `git fetch` and `git log --since="yesterday 18:00"
  --stat` plus the merged PRs and open PRs that moved. Read the diffs of the merged ones:
  the commit message says what, the diff says whether it matters.
- **Calendar:** today's meetings and tomorrow's, if there is a calendar tool or skill.
- **Numbers:** dashboards or reports the owner connected (a URL, a file, an MCP tool). A
  number goes in only with its source.

Write `<ws>/work/recap/<date>/gathered.md`: the raw material with sources, before any
judgement.

## 2. Pick what matters

A recap is not a list. Five to seven scenes:

| # | type | carries |
|---|---|---|
| 1 | title | label = company · date; text = the one sentence for the day |
| 2 | events | what shipped: up to six rows, tag = PR number or repo, `who` from the commit author |
| 3 | metric | the number that moved most, with delta and source; drop if nothing moved |
| 4 | quote | the best thing a teammate said in the session, verbatim, with their name |
| 5 | events or screen | a customer moment, an incident and its fix, or a screenshot of what shipped |
| 6 | agenda | tomorrow: meetings, releases, deadlines |

Write `<ws>/work/recap/<date>/recap.json` by **copying the shape of
`<video>/example/recap.json`** (the `brand` block included, `credit: false`, format
landscape, `lang` set to the team's language). The schema is `<video>/src/script.ts`.
Then check it, and fix until it passes, before anything else:

```
cd <video> && node scripts/render.mjs ../work/recap/<date>/recap.json --check
```

The renderer refuses an off-schema script. A missing `brand` would otherwise be silently
replaced by the example's, and the video would carry another company's name. The `brand`
values come from `MEMORY.md` or `USER.md`; a URL you were not given is an empty string,
not a guess.

**Every source gets its row.** An agent that reported without a source is still a row: its
text ends with "reported, not verified". Leaving it out is your judgement replacing the
team's; the row is what lets them ask.

**Give it a voice.** Every scene gets a `voice` line: one spoken sentence, in the team's
language, that says what the scene shows without reading it aloud word for word. The
render narrates it with a free neural voice (no key needed); the music ducks under it.
A recap with a voice is watched; a silent one is skimmed.

**Give it a picture.** The scenes that carry a real image are the ones people remember.
When something shipped has a URL (a landing, a dashboard, a PR page, a public repo), take
a 1600×1000 screenshot and save it under `<video>/public/screens/recap/<date>/`. With
the `browser` tool when the Gateway has one; otherwise headless Chromium works anywhere
the render works:

```
cd <video>/public/screens/recap/<date> && chromium --headless=new --no-sandbox --disable-gpu \
  --hide-scrollbars --window-size=1600,1000 --virtual-time-budget=8000 --screenshot=<name>.png <url>
```

Use it in a `cover` scene (full-bleed image under the day's sentence) or a `screen` scene
(the camera moving to what changed). One real screenshot beats three text scenes. Never
fake one. Screens of internal tools stay in the internal recap; the public clip only
carries pages that are already public.

## 3. Render and deliver the recap (no approval)

```
cd <video> && node scripts/render.mjs ../work/recap/<date>/recap.json ../work/recap/<date>/recap.mp4
```

Background `exec`, poll with `process`. Then deliver where the team asked (MEMORY.md,
"Delivery"). Two ways, and only these two count as sending:

- **The run is delivered to the channel** (the daily cron is created with delivery to the
  team's channel and target; a turn started from that chat replies there). Then your reply
  IS the delivery: put `MEDIA:<absolute path to recap.mp4>` on its own line, then the
  one-sentence summary as the caption, then "reply with a correction and I re-cut".
- **Any other target** (a second group, someone who asked): the `message` tool with the
  channel, the target id and the file path, and you read its result.

A send you did not see confirmed (the tool's result, or the delivered reply) is not a
send. Never write "sent" about something you only intended. Post the same summary and the
path in the shared session. If the channel refuses the file (size, type), send the summary
with the path and say the file is in `shipped/`. A correction is a new render, not an
argument. Copy `gathered.md`, `recap.json` and `recap.mp4` to
`<ws>/shipped/<date>-recap/`.

## 4. The public clip (approval required)

If the owner wants one today: write `<ws>/work/recap/<date>/clip.json` with
`format: "portrait"`, 20–30 s, four scenes: a title ("Day N building X" if they count days,
otherwise the sentence), an `events` scene with what shipped in plain words, one `metric`
if the number is on the allowed list, and a `closing` with their URL.

Filter first, then write: nothing from the session that was said about a customer, no
names, no numbers outside the allowed list. Post the script as text and wait for the
owner's "approved". Render with the same command, deliver the mp4 with a two-line caption
for X or TikTok and a five-line one for LinkedIn. Copy to `<ws>/shipped/<date>-clip/`.

## 5. Write it down

Append to `<ws>/memory/<date>.md`: sources read, what was picked and why, what the team
corrected, whether the clip shipped. Update `MEMORY.md` when the owner changes a
preference (the hour, a number that may now be told, a repo added).

## When there is nothing

A day with no commits, no meetings and an empty session is a recap of one title scene
that says so, and a question in the session: "quiet day, or am I missing a source?"
Never fill a quiet day with generic lines.
