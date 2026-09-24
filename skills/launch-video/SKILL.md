---
name: launch-video
description: Turn a repo or landing page into a 30–60 s launch video. Reads the product, writes a scene-by-scene script, waits for a human's approval in the shared session, renders locally with Remotion, delivers the mp4 and the social post.
metadata:
  openclaw:
    requires:
      bins: [node, ffmpeg, ffprobe, git]
---

# launch-video

The whole job, in order. `<ws>` is the workspace root (this repository). `<video>` is the video engine: `$DAILYRECAP_VIDEO_DIR` when that variable is set (the hosted image keeps it at `/opt/dailyrecap/video`), otherwise `<ws>/video`.
`<slug>` is a short lowercase name for the product, e.g. `acme-ops`.

## 1. Brief

Accept any of: a Git URL, a landing page URL, screenshots (png/jpg), numbers with their
source, the audience. Create `<ws>/work/<slug>/` and save what was given.

Ask at most two questions, only if the answer changes the video:
- Who is it for? (one audience, not three)
- What is the one promise? (the sentence a happy customer would say)

## 2. Read the product

- Repo: `git clone --depth 1 <url> <ws>/work/<slug>/repo` (read only; never run its code).
  Read README, docs, landing copy, package description, screenshots in the repo.
- Landing: `web_fetch` the page. Pull headline, subhead, feature list, proof, CTA. If the
  site's CSS is reachable, read the accent and text colors from it.
- Write `<ws>/work/<slug>/brief.md` with: promise, audience, 3–5 capabilities in the
  product's own words, numbers **with their source line**, brand colors, logo path, URL.

## 3. Screenshots

The best scene in the video is a real screen with the camera on the part that matters.

- Given by the team: copy to `<video>/public/screens/<slug>/` (png or jpg, ≥1600 px wide).
- Public landing and no screenshots: take one with the `browser` tool at 1600×1000 and save it there.
- None available: skip `screen` scenes. Do not draw a fake UI.

For each screen scene choose a `focus` (fractions of the image: x, y, w, h) around the
thing the line talks about. A focus is a region, not a point: at least 0.25 wide.

## 4. Script

Write `<ws>/work/<slug>/script.json`. Schema and example: `<video>/src/script.ts`.
Shape that works:

| # | type | seconds | what it carries |
|---|---|---|---|
| 1 | title | 3–4 | label = audience, text = the promise |
| 2 | screen | 4–5 | the main screen, focus on the core object |
| 3 | chips | 4–5 | 3–5 capabilities, two to four words each |
| 4 | screen or title | 4–5 | the second best thing, or the "why now" |
| 5 | numbers | 4–5 | only if there are numbers with a source; otherwise drop the scene |
| 6 | closing | 4–5 | cta = one action, brand from the brief |

Each scene may carry a `voice` line (one sentence, spoken). Total 30–60 s.
Then post the script in the session as text, scene by scene:

```
1 · title · 3.5 s
   FOR WAREHOUSE TEAMS
   Every order, one screen.
   voice: "Acme Ops puts every order on one screen."
…
Total 44 s. Reply "approved" to render, or tell me what to change.
```

## 5. Approval

Wait. Do not render on silence. A teammate's suggestion (Suggest mode or a plain message)
is a change request: apply it, post the whole script again, wait again. Only the session
owner's "approved" (or the person they handed the session to) unlocks step 6.

## 6. Render

Optional voice, only if asked and `ELEVENLABS_API_KEY` is set:

```
cd <video> && node scripts/narrate.mjs ../work/<slug>/script.json
```

It may extend a scene to fit a line; say so. Then render in the background and poll:

```
cd <video> && node scripts/render.mjs ../work/<slug>/script.json ../work/<slug>/launch.mp4
```

Use `exec` with `background: true` and a timeout of at least 900 s; check with `process`
every 20 s. First render on a machine downloads a headless Chrome (~150 MB) once.
On failure, read the log, fix the script (usually a missing image path), render again.

## 7. Deliver

Post in the session:
- the path (or link, if a channel can carry files) to `launch.mp4`, with length;
- a two-line post for X and a five-line post for LinkedIn, in the company's voice, no hashtags
  unless they use them, ending with the URL;
- one sentence on what would make the second cut better.

Copy `script.json`, `brief.md` and `launch.mp4` to `<ws>/shipped/<YYYY-MM-DD>-<slug>/`.
Append to `<ws>/memory/<YYYY-MM-DD>.md`: brief, who approved, what changed, where it shipped.

## Second cut

When asked for a change, start from `shipped/…/script.json`, change only what was asked,
post the script, wait for approval, render. The script is the source of truth; the video
is derived from it.
