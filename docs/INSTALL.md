# Install DailyRecap

## In one minute: what you are installing

An agent on Plow **is a phone number**. You text it from your iPhone, in Messages; there is
nothing to install and nothing to sign up for. Plow runs one private container per person,
with DailyRecap inside, and reports usage to the hackathon index.

Two numbers are involved:

- **+1 (628) 246-3032** is Plow's reception number: it takes install texts.
- **Your agent's own number** is what texts you back. That thread is DailyRecap. Text it from
  the same iPhone you installed from: an iPhone can send iMessages as your number or as your
  Apple ID email, and Plow only knows the one that sent the install text.

Two ways to install. The first needs nothing but a phone.

## 1. Hosted, one text (Plow)

Send this by iMessage to **+1 (628) 246-3032**:

> Set this up for me: aiworthusing.com/agent-index/dailyrecap

Plow starts a private container with DailyRecap in it and texts you back **from a new
number**: that number is your agent, and that thread is where everything happens. Nothing
to install, no keys to paste, no model to choose (inference is Plow's). Then:

1. Answer its first questions: what the company is, what hour the recap should go out,
   which repos count, where the numbers live (Odoo, a report URL), and which other agents
   work with you. One message each; you can change any of it later by just saying so.
2. Ask for `daily-recap: run` to get today's video right away.
3. From then on, the video arrives **in that same iMessage thread**, every weekday at the
   hour you set. No other channel to connect.

**If the agent never answers:** a Plow account *is* a phone number. The agent only answers the
phone that completed `plow-agents login` (or, for a one-text install, the phone that sent the
install text). A blue, delivered iMessage from any other phone is dropped silently, with no chat
created. Text from that phone, or log in again from the phone you will use: the same command
prints a new activation text, and the account that phone creates is the one the agent belongs to.

Plow (plow.co) is the hosting: a phone line, a container per person, usage reporting for the
hackathon index. The hosting is theirs; the agent, its skills and its video engine are this
repository, packaged as the image `ghcr.io/rodrigoarias12/dailyrecap`.

## 2. Your own OpenClaw Gateway (2026.9 or later)

For a company that already runs OpenClaw, or wants the recap on Telegram, Slack, WhatsApp
or Discord, with its own model.

```bash
git clone https://github.com/rodrigoarias12/dailyrecap ~/dailyrecap
cd ~/dailyrecap/video && npm install          # the video engine; first render fetches a headless Chrome
```

The Gateway host needs `node`, `ffmpeg`, `ffprobe` and `git` on its PATH. Merge
`openclaw.example.json5` into `~/.openclaw/openclaw.json` (the agent's workspace is the
cloned folder) and restart the Gateway.

### Where the video arrives

The recap is delivered on a channel the Gateway has. Telegram is the quickest to set up:

1. In Telegram, talk to **@BotFather**, send `/newbot`, give it a name, and copy the token.
2. Add the channel to the Gateway (the token goes in the command, never in a file you commit):

   ```bash
   openclaw channels add --channel telegram --token <token>
   ```

3. Send any message to your new bot. The Gateway logs a pairing code; approve it:

   ```bash
   openclaw pairing approve telegram <code>
   ```

4. Tell DailyRecap where the video goes, in its first conversation: "telegram, my chat" (or
   a group's id). It saves the channel and target and creates the daily job delivered there.
   `openclaw channels add` with no arguments opens the guided setup for Slack, WhatsApp,
   Discord and the rest; the delivery answer is the same.

### Your other agents

List them in `tools.agentToAgent.allow` (see `openclaw.example.json5`) so DailyRecap can ask
them every evening with `sessions_send`. An agent on **another** OpenClaw is asked over the
Agent2Agent protocol: enable `channels.a2a` on that Gateway with a peer token for
DailyRecap, and give DailyRecap the endpoint and the token in its first conversation.

## Try it without installing anything

[`dev/`](../dev/README.md) runs the whole Gateway in Docker with two fixture colleagues and
removes itself with one command.
