# Proposal to Plow: make the first hour boring

*From the DailyRecap team (OpenClaw 2.0 hackathon), September 25, 2026. Everything below
happened to us this week; times are UTC and come from our logs and the Plow API.*

Plow's idea is the strongest one in this hackathon: an agent is a phone number, nothing to
install, you just text it. The gap is between that idea and the first hour of using it. We
lost two days on the connection and two more on the image, and none of it was because the
platform did not work. It was because it did not say anything. This proposal is a list of
places where Plow could say something, ordered by how much time each would have saved us.

## What happened to us, in order

| When | What we saw | What was actually going on | Time lost |
|---|---|---|---|
| Sept 23 | `plow-agents login` printed "Text Plow Activate: XXXXX to +1 628…". The activation text from Argentina took several tries; it was not obvious the message had to be sent verbatim, colon included. | Activation is an exact-match text from the phone that becomes the account. | ~1 h |
| Sept 24, 04:13 | Deployed on line ln_p1 (Willow). Status `running`, credential `connected`, `last_seen_at` updating. Texted "who are you". Blue, delivered. No reply. Ever. | The account's member handle was our **phone number** (the activation went out as SMS). Our iMessages went out from the **Apple ID email**. For Plow, an unknown sender: dropped before a chat is created. `GET /v1/chats` stayed `[]` for two days. | 2 days |
| Sept 24 | Tried the email line (willow@plow.co): nothing. Tried the local self-hosted agent on a second line: nothing. Read the plugin source to find the sender gate (`plugin/index.ts`: only `sender.type === "member"` is processed). | Same cause. The plugin is right to gate; the silence is the bug. | (same) |
| Sept 25, 13:31 | Ran `plow-agents login` again from the same iPhone. It created a **second account** (new uid), because this time the activation went out as an iMessage from the email handle. Deployed there. First text answered in 20 s. | One person, two handles, two accounts. | (resolved) |
| Sept 24 | Built the image on the Plow base. Chromium and ffmpeg are not in the base; found out by reading the OpenClaw Dockerfile. The image contract lives in a private repo (`plow-pbc/plow`, 404). | No published spec of what the image must and may contain. | ~3 h |
| Sept 24 | Tested the image locally under emulation: `tini` and Chrome fail under qemu; the reporter (`agentsview`) crashes; no way to know which failures were emulation and which were real. | No local parity story. | ~2 h |
| Sept 24 | Plow's boot writes `openclaw.json` with `tools.profile: "messaging"`: no `cron`, no `web_fetch`. Only `AGENTS.md` is copied to the workspace; our `HEARTBEAT.md` never reached the agent. Our daily job silently could not be scheduled. | Config is boot-owned and undocumented for image authors. The admission test noted "scheduled recaps not tested". | 1 day (found by reading `config.ts` inside the container) |
| Sept 25, 13:48 | First hosted run: "daily-recap: run". Fourteen minutes of silence, then the video. During those minutes nothing in the chat, no console, `verbose_output` off by default. | The run was fine. We could not tell. | (anxiety) |

## What we propose

### A. Connection: never drop a human silently

1. **Reply to unknown senders, once.** One line: "This number is <agent>'s line for <owner>. If that is you, text from the phone you activated with, or run `plow-agents login` again from this one." Cost: one message. Saves: the two days above, for every iPhone user whose iMessage identity is an email.
2. **Merge a member's handles.** A person has a phone number and an Apple ID email; iMessage picks either. Treat both as the same member: on activation, ask for the other handle, or match on the next text that carries the same device signature. Failing that, say it in the activation reply: "Your account is this handle: <email or number>. Text your agent from it."
3. **Make the activation text a tap.** Print an `sms:+16282463032?body=Plow%20Activate%3A%20XXXXX` link (the Agent Index already does this for installs), so the exact text is never typed. And accept the code alone.
4. **A `plow-agents doctor`.** Checks in one command: account handle(s), lines held, agent status, `last_seen_at` age, whether a chat exists on each line, whether the last inbound was from a member. Every one of those is a field the API already returns; we pieced them together by hand.

### B. Developer experience: let the builder see

5. **`plow-agents logs <line> --follow`.** The container has a log; the builder cannot read it without a browser login to `exe.xyz`. Tail it from the CLI, the way Fly, Railway and Vercel do.
6. **Publish the image contract as a test.** A short spec: base image pinning, what boot overwrites (`openclaw.json`, `AGENTS.md`, `SOUL.md`), which tool profile the agent gets, which binaries are present, which env vars are injected, what must keep running for free hosting (the reporter). Ship it as a script an image author can run locally: `plow-agents image check <ref>` that boots the image the way Plow does and prints pass/fail per line. The admission bot already does this; give it to us before admission.
7. **Local parity, stated.** Say which parts of the image cannot run under emulation (tini, Chrome) and provide an amd64 runner path (a `--remote-test` that boots the image on a scratch line for ten minutes and returns the log).
8. **Config extension point.** Let an image declare additions to the boot-owned config (`/opt/plow/config.overlay.json5`, merged after boot's): `tools.alsoAllow: ["cron"]`, extra workspace files to copy. Today the only way is to patch boot's compiled JS, which the admission check would rightly reject.
9. **Progress in the chat, by default, for the first run.** Turn `verbose_output` on for the first N minutes after deploy, or emit one line when a run starts ("working on it, ~10 min") and one when a tool call exceeds a minute. Silence is indistinguishable from death.
10. **Docs in one place.** The pieces exist (three READMEs, the publish page, `howto.plow.co`, Discord) but the sender gate, the two-handle trap, the tool profile and the boot overwrite are in none of them. A single "Hosting an agent on Plow" page with those four facts would have saved us four days.

## Onboarding v2: the same proof, one tap

Why the user texts first: Apple does not let a business open an iMessage thread with a
stranger. Messages for Business says "customers must start conversations", and an
unofficial Mac relay that texts strangers gets throttled or flagged. Plow's own docs say it
plainly: the activation text "proves you hold the phone, which is why it can't be
automated." So the text stays. Everything around it can go.

**What the user sees**

1. **plow.co/start** (or the CLI) calls `/v1/auth/activate` and shows two things: a green
   button and a QR. The button is `sms:+16282463032?&body=Plow%20Activate%3A%20ABCDE`.
   The QR encodes `SMSTO:+16282463032:Plow Activate: ABCDE`: the iPhone camera opens
   Messages with the recipient and the text already in place. The user only taps Send.
   Nothing is typed, so the colon, the spaces and the code are always right.
2. The page polls `/v1/auth/activate/redeem`. When the inbound arrives from handle H1 with
   the code, the account is bound to H1 and the page flips to "You're in". Two numbers are
   involved and the user should never have to know it: the reception number (+1 628…) is
   where activation and installs go; the agent lives on its own line (+1 650…), and today
   that line sends no greeting, so the user has to find its number in `plow-agents lines`
   and text it first. So the activation reply on the reception number carries the bridge:
   "Your account is +54…. Your agent is on +1 650 346 6610: tap to say hi", with a
   `sms:+16503466610?&body=hi` link. One tap lands the user in the right thread, from the
   same identity that just activated.
3. **The second handle.** When an unknown handle H2 texts an agent's line (which is where
   this happens: the activation thread and the agent thread are different numbers, and
   Messages may pick a different identity for each), Plow answers once: "Already have Plow?
   Tap plow.co/link/<token>". The link, opened in
   the browser that did step 1 (or after a magic-link login), shows "Link
   you@icloud.com to this account? Yes." H2 is proven by the reply living only in H2's
   thread; the account by the web session. The account page offers the same as "Link
   another number or email", which reuses step 1.
4. The activation reply says the one thing we did not know: "On a Mac or an iPhone,
   Messages may send from your Apple ID email. Reply from there once and I will link it."
5. Later, for the verified badge and one identity per Apple Account: register on Messages
   for Business through an MSP (Poke did, approved in June 2026). Its Opaque ID is one per
   Apple Account regardless of handle, which removes this whole class of problem, and its
   URLs (`bcrw.apple.com/urn:biz:…?body=…`) work as buttons, QR and NFC.

Android and SMS: the same button and QR work (`?&body=` is the cross-platform form), and a
phone number is a single handle, so step 3 rarely fires.

**What this changes in the CLI**: `plow-agents login` prints the `sms:` link and renders the
`SMSTO` QR in the terminal next to the text it prints today. No API change for step 1 and
2; step 3 needs one endpoint (`/v1/auth/link`) and one reply template.

Sources: Plow Chat API docs (howto.plow.co/plow-chat-api), Apple Messages for Business FAQ
and security guide, Apple Tech Talk 206 on QR formats, Apple's `sms:` scheme reference,
Signal and WhatsApp device linking, Telegram `t.me/<bot>?start=` deep links.

## Your own issue tracker already says most of this

We are not the first. Reading plow-pbc's open issues after the fact, every row of our table
has a sibling:

- The activation text: [plow-agents #39](https://github.com/plow-pbc/plow-agents/issues/39) proposes the `sms:` deep link because "macOS users currently need to copy both values into Messages manually."
- The silent first message: [hermes-plugin-plow #214](https://github.com/plow-pbc/hermes-plugin-plow/issues/214): "A fresh cloud agent silently dropped the owner's first message… The result reads as 'my new agent is dead'." Also [#166](https://github.com/plow-pbc/hermes-plugin-plow/issues/166) (a bare 👋 and then waits).
- The image contract: [plow-agents #30](https://github.com/plow-pbc/plow-agents/issues/30): the README's one contract link "points into the private `plow-pbc/plow` — 404 for every outsider… the one thing a builder cannot infer from the CLI."
- No logs for the builder: in [#214](https://github.com/plow-pbc/hermes-plugin-plow/issues/214) a Plow engineer writes "I couldn't read the VM's journal… `plow-ops agent ssh` is currently denied." If you cannot, we certainly cannot.
- Silence vs. progress: `verbose_output` is off by default and [#145](https://github.com/plow-pbc/hermes-plugin-plow/issues/145) shows what leaks when it is off.
- Boot fragility with no signal: [plow-hermes-agent #102](https://github.com/plow-pbc/plow-hermes-agent/issues/102) ("gave up… parking… stays down until someone notices"), [#114](https://github.com/plow-pbc/plow-hermes-agent/issues/114), and [plow-agents #38](https://github.com/plow-pbc/plow-agents/issues/38) (login mints a new full-access key every run and never revokes the last).
- Two agents in one thread: [#71](https://github.com/plow-pbc/hermes-plugin-plow/issues/71) ("A prompt instruction is not a turn-taking mechanism") and [#189](https://github.com/plow-pbc/hermes-plugin-plow/issues/189). Not in our table, but it is the next wall a multi-agent entry hits.

## How the products people already trust do it

Each proposal above has a shipped example to copy, not a design exercise:

| Proposal | Who does it | What it looks like |
|---|---|---|
| 1, 2 · unknown sender gets a reply | OpenClaw, Hermes | An unknown DM sender gets an 8-character pairing code and one line; the owner runs `openclaw pairing approve <channel> <code>`. Rate-limited, expires in an hour. [docs](https://docs.openclaw.ai/channels/pairing) |
| 3 · activation as a tap | Twilio Verify, the Agent Index itself | The code is checked by an API, not by exact text; the Index's "Text this agent" is already an `sms:` link with the body filled in. [Twilio](https://www.twilio.com/docs/verify/sms) |
| 4 · `doctor` | OpenClaw | `openclaw doctor` "checks health and provides actionable repair steps." [docs](https://docs.openclaw.ai/gateway/doctor) |
| 5 · `logs --follow` | Fly, Modal, Railway, Vercel | `fly logs`, `modal app logs -f`, `railway logs`, `vercel logs --follow`: streaming by default, from the CLI, seconds after deploy. [Fly](https://docs.fly.io/flyctl/logs/) · [Modal](https://modal.com/docs/reference/cli/app) · [Vercel](https://vercel.com/docs/cli/logs) |
| 5 · per-message status | Twilio | Every message has a status (delivered, undelivered, failed) and an error code in a log the developer can read. [docs](https://www.twilio.com/docs/usage/monitor-alert) |
| 6 · a published contract | Cloud Run | The container runtime contract is one page: port, bind address, startup limit, probes. [docs](https://docs.cloud.google.com/run/docs/container-contract) |
| 7 · local parity | Stripe CLI, Firebase | `stripe listen` replays real events locally in a sandbox; Firebase emulators "respond… just like production." [Stripe](https://docs.stripe.com/cli/listen) · [Firebase](https://firebase.google.com/docs/emulator-suite) |
| 8 · declarative config | Slack | An app manifest makes the whole configuration a file you can diff and reproduce. [docs](https://docs.slack.dev/apis/events-api/using-socket-mode/) |
| 9 · progress, not silence | Replicate | Request logs and health per deployment, plus instant rollback. [docs](https://replicate.com/docs/topics/deployments) |
| all · dry run | your own `agent-index-client` | It already has `--dry-run` and a `status` command with exit codes. The deploy path deserves the same. |

## What we can offer

We will write proposal 6 as a script against our own image and hand it over, and we will
test 1, 3 and 4 the day they ship. DailyRecap is at
https://aiworthusing.com/agent-index/dailyrecap; the repo with every log we quoted is
https://github.com/rodrigoarias12/dailyrecap.
