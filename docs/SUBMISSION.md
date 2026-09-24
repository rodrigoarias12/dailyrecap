# Submission notes — OpenClaw 2.0 hackathon «Build your startup's first hire»

Deadline: 2026-09-28 23:59 PT. Listing: aiworthusing.com/agent-index (slug `dailyrecap`).

## One line

**DailyRecap: your startup's first chief of staff. The TikTok of your company.**

## Pitch (60 seconds)

Every startup has a job nobody hires for on day one: someone who asks everyone what
happened, checks it, and tells the founder in a minute. DailyRecap is that hire. Every
evening it asks your team in the shared session and your other agents through
`sessions_send`, verifies what it can, marks what it can't, and hands you a one-minute
video of the day. It never invents a number, never publishes anything, and never sends an
external cut without a human's word. On day one it also makes your launch video from your
repo; whenever you want, the building-in-public clip. Rendered on your machine, no video
API, no keys, a free neural voice.

## Form answers

**What experience do you have building agents?**

CTO of PayDece, building YoRobot: a platform where AI agents do real jobs for companies
under governance. Sandboxed agents with no keys, an MCP bridge that holds the credentials,
an independent verifier that re-runs the work, and human approval for anything
irreversible. In production with paying customers: sales advisor over a HubSpot, customer
support over payment orders, WhatsApp support for a distributor, voice triage for
healthcare. Over a year shipping agents to real users.

**Why should we accept you in the Hackathon?**

Our entry is a job every startup needs on day one and nobody hires for: the chief of
staff. DailyRecap asks your team and your other agents what happened, verifies what it
can, marks what it can't, and hands the founder a one-minute video of the day. It works
because OpenClaw 2.0 makes agents colleagues and sessions shared. Built on our production
experience with governed agents, an engine that already renders, and a narrow end-to-end
flow instead of a platform. The demo video will be a real day of our company, made by the
agent itself.

## What the judges look for (from the leaderboard analyses of earlier rounds)

One sentence, one end-to-end flow, real results on screen. Not a platform of seven
capabilities. Our sentence is above; the flow is ask → verify → cut → deliver; the results
are the videos in `shipped/`.

## Demo video checklist (≥ 60 s)

1. The founder pastes the repo URL; the launch video comes back (10 s).
2. 18:00: the cron fires. DailyRecap asks Ana and Sam; Ana's source is opened, Sam's row
   says "reported, not verified" (20 s).
3. The recap plays: voice, counter, quote, tomorrow (25 s).
4. The public clip waits for "approved" in the shared session; a teammate suggests a change
   in Suggest mode; the owner approves; it renders (15 s).
5. Closing card: made with DailyRecap (5 s).
