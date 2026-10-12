#!/usr/bin/env bash
# Visual baselines rendered inside the official Playwright image, so a Mac and
# CI (Linux) produce identical pixels (UPDATE-02 A4). Baselines are NOT
# committed: CI keeps them as artifacts; only design/screenshots JPEGs go in git.
#   scripts/visual-docker.sh            compare against tests/visual/__screenshots__/linux
#   scripts/visual-docker.sh --update   re-record
set -euo pipefail
IMAGE="mcr.microsoft.com/playwright:v1.64.0-noble"   # keep in step with @playwright/test in package.json
cd "$(dirname "$0")/.."
docker run --rm --ipc=host -v "$PWD":/work -v staj-node-modules:/work/node_modules -w /work \
  -e VISUAL_PLATFORM=linux -e CI=1 "$IMAGE" bash -lc \
  "npm ci --no-audit --no-fund && STAJ_BUILD_DATE=2026-10-09 npx astro build && npx playwright test -c playwright.visual.config.ts ${1:+--update-snapshots}"
