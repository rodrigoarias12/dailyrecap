# dev/ — a throwaway Gateway in Docker

Runs OpenClaw 2.0 with DailyRecap as its agent, in a container, with nothing installed on
the host. The image is the official one plus ffmpeg, Chromium and the video package's
Linux `node_modules`; the repository is mounted as the agent's workspace, so edits to
`AGENTS.md` or a skill are live on the next turn.

```bash
AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… dev/setup.sh   # once: .env, build, onboarding, Bedrock, up
ANTHROPIC_API_KEY=… dev/setup.sh                            # same, with an Anthropic key instead
docker compose -f dev/compose.yml run --rm cli agent --agent dailyrecap -m "Who are you?"   # one turn, no UI
docker compose -f dev/compose.yml logs -f gateway
docker compose -f dev/compose.yml run --rm cli dashboard --json   # Control UI pairing URL
docker compose -f dev/compose.yml run --rm cli config get agents  # any openclaw command
```

Without a Docker socket on the host (Colima with the socket down), prefix the commands:
`DOCKER="colima ssh -- sudo docker" dev/setup.sh`, and run compose from inside the VM
(`colima ssh -- sh -c 'cd /path/to/dailyrecap/dev && sudo docker compose …'`).

## Verified 2026-09-23 on an arm64 Mac

- Gateway healthy on `http://127.0.0.1:18789` (`/healthz`, `/readyz`), Control UI paired.
- Agent `dailyrecap` registered on the mounted workspace, inference through Amazon Bedrock
  (`dev/bedrock.json5`, Claude Sonnet 4.5; the Sonnet 5 id is a one-line change there).
  One CLI turn answered with its identity and three jobs read from `AGENTS.md`.
- `node scripts/render.mjs example/clip.json` inside the container: 18 s of 1080×1920 in
  34 s wall time, with the system Chromium (`DAILYRECAP_CHROME`). This is the same base
  image and package set as `cloud/`, so the Plow render risk is mostly retired (Plow is
  amd64; the resource limits there are still unknown).

## Remove everything

```bash
docker compose -f dev/compose.yml down -v --rmi local
```

That deletes the containers, the state and secrets volumes, the node_modules volume and
the image. `dev/.env` (gateway token and model key) is git-ignored; delete it by hand.
