# DailyRecap on the official OpenClaw image, for a throwaway local Gateway in Docker.
#
# Same base Plow builds on (node 24, bookworm-slim), plus what a render needs: ffmpeg,
# Chromium and the video package's node_modules installed for THIS platform. The repo is
# bind-mounted as the agent's workspace at runtime; node_modules is an anonymous volume
# seeded from this image so the host's macOS binaries never shadow the Linux ones.
FROM ghcr.io/openclaw/openclaw:2026.9.6

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg git chromium fonts-liberation ca-certificates python3-venv \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/edge-tts && /opt/edge-tts/bin/pip install -q edge-tts

# Remotion renders with the system Chromium instead of downloading its own; the free
# voice engine (Microsoft neural voices through edge-tts) lives in its own venv.
ENV DAILYRECAP_CHROME=/usr/bin/chromium
ENV PATH=/opt/edge-tts/bin:$PATH

WORKDIR /home/node/.openclaw/workspace/video
COPY --chown=node:node video/package.json video/package-lock.json ./
RUN npm ci --no-audit --no-fund && chown -R node:node /home/node/.openclaw
WORKDIR /app
USER node
