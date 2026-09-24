#!/usr/bin/env bash
# One-time setup of the throwaway Gateway: writes dev/.env (gateway token + model key),
# builds the image, runs OpenClaw's non-interactive onboarding into the state volume, and
# registers the workspace as the agent "dailyrecap".
#
#   ANTHROPIC_API_KEY=… dev/setup.sh
# or, for inference through Amazon Bedrock (the house default):
#   AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… AWS_REGION=us-east-1 dev/setup.sh
#
# DOCKER can be overridden when the CLI is not on the host, e.g. Colima without a socket:
#   DOCKER="colima ssh -- sudo docker" dev/setup.sh
set -euo pipefail
cd "$(dirname "$0")"
DOCKER="${DOCKER:-docker}"

if [ ! -f .env ]; then
  if [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
    { echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"; echo "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:?}"; echo "AWS_REGION=${AWS_REGION:-us-east-1}"; } > .env
  else
    : "${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY or AWS_ACCESS_KEY_ID (or write dev/.env by hand)}"
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" > .env
  fi
  {
    echo "OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 24)"
    echo "OPENCLAW_TZ=${OPENCLAW_TZ:-America/Argentina/Buenos_Aires}"
  } >> .env
  chmod 600 .env
  echo "wrote dev/.env"
fi

$DOCKER compose build
# The cli service shares the gateway's network, so before the gateway exists onboarding
# runs through the gateway service with the node entrypoint, as the official docs do.
$DOCKER compose run -T --rm --no-deps --entrypoint node gateway dist/index.js onboard --non-interactive --accept-risk \
  --mode local --auth-choice apiKey --secret-input-mode ref \
  --gateway-auth token --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN --gateway-bind lan \
  --agent-name dailyrecap --workspace /home/node/.openclaw/workspace --skip-bootstrap \
  --skip-channels --skip-daemon --skip-ui --skip-hooks --skip-search --skip-skills --skip-health
# Bedrock: the provider block and the default model come from dev/bedrock.json5.
if grep -q '^AWS_ACCESS_KEY_ID=' .env; then
  $DOCKER compose run -T --rm --no-deps --entrypoint node gateway dist/index.js config patch --file /home/node/.openclaw/workspace/dev/bedrock.json5
fi
$DOCKER compose up -d gateway
echo
echo "Control UI: http://127.0.0.1:18789/  (token in dev/.env)"
echo "Logs:       $DOCKER compose logs -f gateway"
echo "Remove all: $DOCKER compose down -v --rmi local"
