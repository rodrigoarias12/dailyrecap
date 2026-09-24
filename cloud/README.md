# DailyRecap on Plow

The Agent Index's "1-click deploy" is Plow hosting: a user texts Plow
"Set this up for me: aiworthusing.com/agent-index/dailyrecap" and Plow boots this image on a
phone line of their own. That is where installs and token usage come from, so this image has
to work before the listing is worth anything.

## Build and test locally

```bash
git clone https://github.com/plow-pbc/plow-agents && export PATH=$PWD/plow-agents/bin:$PATH
plow-agents login              # SMS activation
plow-agents lines              # pick a free line
plow-agents mint LINE_UID      # writes ./plow-credentials with PLOW_AGENT_TOKEN
docker compose -f cloud/compose.yml up --build -d
docker compose -f cloud/compose.yml logs -f agent
```

Text the line. The first message starts the conversation.

## Publish

```bash
plow-agents image build ghcr.io/<you>/dailyrecap:v1
plow-agents image push  ghcr.io/<you>/dailyrecap:v1
plow-agents profile --show     # your uid
```

Then post uid + slug (`dailyrecap`) + image reference in the Plow Discord (#agent-index)
so an admin blesses the listing. Updates: `image push …:v2 --promote dailyrecap`.

## If the render does not fit in Plow's container

Keep the agent on Plow and render on the owner's Mac: Plow's Mac app (Latch) bridges the
owner's machine to the hosted agent as MCP tools. The skill's render step then runs
through that bridge. This is the documented path; the in-container render is the one we
have not verified.
