# DailyRecap on Plow (1-click deploy from the Agent Index).
#
# Builds on Plow's base image for OpenClaw, which owns boot, the Plow phone line and the
# Agent Index usage reporter. We add: the agent's instructions and skill, the video package,
# and the system pieces a local render needs (ffmpeg and the libraries Remotion's headless
# Chrome links against).
#
# Pin the base by digest from https://gallery.ecr.aws/e1h7x4a2/plow-cloud-agents before
# building: a tag is a name someone can move.
#
# UNVERIFIED (2026-09-23): Plow publishes no CPU/RAM/disk limits for hosted agents. A Remotion
# render needs headless Chrome and ~2 GB RAM. If renders fail in the cloud, the fallback is
# documented in README: the agent runs on Plow and renders on the owner's Mac through Latch.
FROM public.ecr.aws/e1h7x4a2/plow-cloud-agents:base-7ce757a1745de286dd180c5c5182aca31eba8a75@sha256:6e5e1a11a8c6e2ef6ecaa5e7b429e778a9a3befaf416a09922aaaa4a5b21d647

# Which agent this reports as on the Agent Index. Without it nothing is reported.
ENV AGENT_ID=dailyrecap
ENV AGENT_NAME="DailyRecap"
ENV AGENT_BLURB="Your startup's first chief of staff. Every evening it asks your team and your other agents what happened, verifies it, and hands you a one-minute video of the day: the TikTok of your company. Day one: your launch video from your repo."

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg git ca-certificates fonts-liberation python3-venv chromium \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/edge-tts && /opt/edge-tts/bin/pip install -q edge-tts
ENV PATH=/opt/edge-tts/bin:$PATH

COPY AGENTS.md /opt/plow/prompt/AGENTS.md
COPY skills/ /opt/plow/skills/
COPY sources/ /opt/dailyrecap/sources/
COPY HEARTBEAT.md /opt/plow/prompt/HEARTBEAT.md
ENV DAILYRECAP_VIDEO_DIR=/opt/dailyrecap/video
ENV DAILYRECAP_SOURCES_DIR=/opt/dailyrecap/sources
# Renders and screenshots use the system Chromium, like the dev image.
ENV DAILYRECAP_CHROME=/usr/bin/chromium
COPY video/ /opt/dailyrecap/video/
RUN cd /opt/dailyrecap/video && npm ci --omit=dev --ignore-scripts \
 && chown -R node:node /opt/dailyrecap
USER node
