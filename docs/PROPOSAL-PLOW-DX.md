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
11. **Updates that reach the agents already running.** `image promote` changes what new
    installs get; every instance already running keeps its old image, and nothing tells the
    builder or the installer. We hit it on Sept 26: a fix for an agent that texted its owner
    every half hour reached new installs only, while the five people already using it kept
    getting the texts, and we had no way to reach them. Proposed:
    - `plow-agents image promote --roll`: redeploy every running instance of the listing onto
      the new pin, keeping each one's state volume (`/var/lib/plow`) and chats, one at a time,
      stopping on the first that fails its health check.
    - Or per install, opt-in: an "auto-update" setting next to `verbose_output`, and a reply
      the installer can send ("update yourself") that moves that one instance to the current
      pin.
    - `plow-agents image show` listing how many running instances are on each digest, so the
      builder knows who is behind.
    - One line to the installer when their agent is updated, with the changelog the builder
      passes to `promote --note`.
    Vercel promotes with instant rollback, Fly rolls a deploy machine by machine with health
    checks; either shape works. Without it, a builder's only fix for a live bug is asking
    every user to reinstall.

## After the hackathon: six things we would fix first

What we hit between Sept 26 and Oct 1, from the builder's side and the installer's.

12. **Relaunch, and tell people.** A fix reaches nobody already installed (item 11). We had a
    bug that texted owners every half hour; the fix was live in minutes and the people already
    using the agent kept getting the texts. We need a way to move running installs to the new
    image, and one line to each installer saying it happened.
13. **Updates are invisible.** Neither the installer nor the listing ever hears that an agent
    improved. We shipped a written brief, deep verification and a better model on Sept 30, and
    the only people who know are us. A short changelog per promotion (`promote --note`), shown on
    the listing and sent once to installers who opt in, would turn every release into a reason to
    come back.
14. **The listing does not say what Plow is.** A developer landing on an Agent Index page sees
    "Text this agent" and a number, but nothing explains that the agent runs on Plow, in a private
    container per person, reached by iMessage, with inference included. A short block on every
    listing ("Runs on Plow: what it is, what you need (an iPhone or a Mac with iMessage), what
    happens to your data, how to run it yourself") would answer the first three questions every
    developer asks us. It happened to us: we came from the OpenClaw Discord, where the hackathon
    was announced, and read it as "launch OpenClaw agents". Only on the video call with the Plow
    team did we understand that Plow is the product that wraps an OpenClaw agent in a container
    and launches it from a phone, by text. The Index promoting Plow makes sense; it just needs to
    say what Plow is, for the developers it is meant to win.
15. **Updating loses everything.** Today the only way to move an install to a new image is
    revoke and deploy, which retires the chats and the state volume: the owner's setup, memory,
    connected sources and history are gone, and the owner has to start again. A redeploy that
    keeps `/var/lib/plow` and the chats (`plow-agents redeploy <line>`) is what makes updating safe.
16. **A base bump can break an image without a word.** Base `771198a9` uses ~440 MB more at idle
    on the same 2 GB machine (you confirmed it on Sept 30); our video render, which fit before, ran
    out of memory and the agent hung for hours with no error to the owner or to us. Ideas: state
    each base's idle memory in its release notes; let an image declare what it needs
    (`plow.memory: 3GB`) or pick a larger machine; have the admission check measure peak memory of
    a real run; and surface out-of-memory kills to the builder.
    OpenClaw already has part of this: `cron.failureAlert` routes failed scheduled jobs to a
    destination, and `tools.exec.notifyOnExit` wakes the agent when a background process ends
    (dead-man alerts for a stuck agent are still an open request upstream, openclaw#161049). On
    Plow the cron tool is off, so `failureAlert` never applies, and nothing reaches the builder.
    More broadly, **a place where the builder hears about their agents' problems**: a health
    feed per listing (out-of-memory kills, crashes, turns stuck for more than N minutes, failed
    deliveries), across every install, without showing anyone's conversations, and one text to the
    builder when something breaks. Or, at least, a **demo mode**: an install the builder marks as
    a test, whose every error and stuck turn is always reported to the builder. On Sept 29 our
    test agent hung for seven hours and we found out because the owner asked "and the video?".
17. **iMessage is a wall for Latin America.** Most people there use WhatsApp, even on iPhones;
    most of the people we invited could not install. Maybe it is not your market today, but we
    would be glad to help, for the fun of it or as a collaboration. OpenClaw already ships a
    production WhatsApp channel (WhatsApp Web, QR login, https://docs.openclaw.ai/channels/whatsapp);
    the gap is that the Plow image does not include it and the Control UI where an owner would
    link it is off. We
    already work with the WhatsApp Business API at YoRobot.

## From our session logs: smaller things, each one seen

Compiled by Claude, the coding agent we built with, from the session transcripts of Sept 24 to
Oct 1; dates are when we saw them. Items we could not tell apart from our own bugs are left out.

18. **No way to replace an agent on a line.** `deploy` answers 409 until you revoke, and if the
    new deploy then fails (a bad reference, a rate-limited pull), the line is left with no agent.
    A `deploy --replace` that retires the old agent only once the new one is `running` (24/9–28/9).
19. **`teardown` can hang for hours, silently.** An agent sat in `teardown` from 13:35 to 18:42
    UTC on Sept 29, polled every 20 s, until a second revoke; the same number had an agent on our
    other account. A timeout that ends in `failed` with a reason.
20. **The base image is rate-limited on public.ecr.aws.** Seven builds failed with
    `toomanyrequests: Data limit exceeded`, most of them right after you asked everyone to rebuild
    on 771198a9. A mirror on ghcr.io or Docker Hub would avoid it.
21. **The usage fix shipped together with a memory regression.** 771198a9 counts usage correctly
    but leaves less memory; we had to choose between counted usage and a working agent, and every
    install on the older base under-counts for good. Shipping reporting fixes as their own patch
    on the current base would avoid that choice.
22. **A message to a non-iMessage contact stays `sent` forever.** It never becomes `delivered`
    or `failed` and the agent is not told; our scheduling agent believed it had sent a message
    nobody received (27/9). An `undeliverable` status after N minutes, reported to the agent.
23. **An SMS install succeeds but cannot talk.** Reception accepts SMS, the agent's line is
    iMessage-only, and the Index counts the install as succeeded (27/9, and 7 of 8 "succeeded" with
    no reason for the eighth). Say it in the reply when the install arrives by SMS, count an install
    once the first exchange happens, and tell the builder why one failed.
24. **The attachment size limit is not documented.** A 1.4 MB video went through, a larger one
    came back as "Delivery failed" in the owner's thread only; the agent's tool was not told.
25. **Agent-to-agent threads include the owner and a contact card.** `plow_start_thread` makes
    a group with the owner in it, and a `.vcf` card arrives first; the other agent answered the card
    and its welcome landed in the group three times (30/9). A thread mode for agent-to-agent, or at
    least marking the sender as an agent.
26. **Ownership is tied to one account, and the CLI keeps one token.** Logging in with the second
    handle overwrote the token and `promote` answered "you do not own dailyrecap"; there is no
    transfer. Latch, the Mac connection, is also per account, and its error ("Device is not
    connected") does not say which. Named CLI profiles and `listing transfer`.
27. **The builder's own installs count as users.** With two handles the builder appears twice in
    the agent's top users, once as "Anonymous builder". A "builder test install" flag that does not
    count, and a public note when usage numbers are corrected, would keep the board readable.
28. **Small things in the first hour.** `plow-agents` needs Python 3.11+ (`tomllib`) and says
    nothing on macOS's 3.9; the listing is edited with two tools, and `agent_index_client.py
    --register` tells a hosted agent to "run it every 5 minutes"; the listing page keeps only the
    largest group of stories open, so a story with another tag is hidden.

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

**What this changes in the CLI, two QR codes**: `plow-agents login` prints the `sms:` link and
renders the `SMSTO` QR for the reception number next to the text it prints today. And
`plow-agents deploy`, the moment the agent reaches `running` (or `plow-agents agents` when it
already is), prints a second link and QR: `SMSTO:<line number>:who are you`. Scan, send, and
the agent answers who it is. The person never looks the line up in `lines` and never types a
number. We verified the QR half on an iPhone: the Camera app opens Messages with the text in
place. No API change for steps 1 and 2; step 3 needs one endpoint (`/v1/auth/link`) and one
reply template.

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
