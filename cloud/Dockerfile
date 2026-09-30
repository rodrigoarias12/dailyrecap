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
# On 7ce757a1 until Plow gives agent machines more memory: on 771198a9 the base takes ~440 MB more
# at idle (Plow, 30/9), and the video render runs out of memory and hangs the agent, even at
# concurrency 1 (tested on Willow 30/9). 771198a9 counts usage better; move once Plow says so.
FROM public.ecr.aws/e1h7x4a2/plow-cloud-agents:base-7ce757a1745de286dd180c5c5182aca31eba8a75@sha256:6e5e1a11a8c6e2ef6ecaa5e7b429e778a9a3befaf416a09922aaaa4a5b21d647

# Which agent this reports as on the Agent Index. Without it nothing is reported.
ENV AGENT_ID=dailyrecap
ENV AGENT_NAME="DailyRecap"
ENV AGENT_BLURB="Your startup's first chief of staff. Every weekday evening it asks your team and your other agents what happened, checks what it can against your systems, and sends you the day as a 30-second vertical video: the TikTok of your company. One text to install; it asks one thing, your website."

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg git ca-certificates fonts-liberation python3-venv chromium \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/edge-tts && /opt/edge-tts/bin/pip install -q edge-tts
ENV PATH=/opt/edge-tts/bin:$PATH

# Boot regenerates openclaw.json on every start: wrap the base's renderConfig with ours (the
# model). Fail the build if the base renames the function, so an update cannot drop it silently.
COPY cloud/dailyrecap-config.js /tmp/dailyrecap-config.js
RUN grep -q '^export function renderConfig(' /opt/plow/boot/config.js \
    && sed -i 's/^export function renderConfig(/function renderConfigBase(/' /opt/plow/boot/config.js \
    && cat /tmp/dailyrecap-config.js >> /opt/plow/boot/config.js \
    && rm /tmp/dailyrecap-config.js
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
