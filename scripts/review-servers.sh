#!/usr/bin/env bash
# Builds the five review builds and (re)starts their servers on 4321–4325, reachable from the LAN (UPDATE-07, D-150).
#   npm run review          build all five, then restart the servers
#   npm run review -- serve restart the servers only (builds unchanged)
# Every review build is a fake-portal build in its own folder (dist-review-*); test, smoke, Lighthouse and
# production builds use other folders (dist/, dist-smoke/, dist-lh/, dist-receipts/), so they can never replace
# what a review server shows. serve.mjs --review refuses (and stops serving) anything that is not a fake-portal build.
set -euo pipefail
cd "$(dirname "$0")/.."
NAMES=(main gec-teslim kapali duyuru duyuru-kapatilamaz)
if [ "${1:-}" != "serve" ]; then
  STAJ_PORTAL=fake STAJ_OUT=dist-review-main npx astro build >/dev/null && echo "built dist-review-main"
  for n in "${NAMES[@]:1}"; do
    STAJ_PORTAL=fake STAJ_SETTINGS="scripts/review-settings/$n.yml" STAJ_OUT="dist-review-$n" npx astro build >/dev/null && echo "built dist-review-$n"
  done
fi
mkdir -p .review-logs
for i in "${!NAMES[@]}"; do
  port=$((4321 + i))
  pids=$(lsof -ti "tcp:$port" -sTCP:LISTEN || true); [ -n "$pids" ] && kill $pids && sleep 0.3
  nohup node scripts/serve.mjs --review --host --port "$port" --dir "dist-review-${NAMES[$i]}" > ".review-logs/$port.log" 2>&1 &
done
sleep 1.5
ip=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo localhost)
for i in "${!NAMES[@]}"; do
  port=$((4321 + i)); code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/staj/" || true)
  echo "$port ${NAMES[$i]}: $code  http://$ip:$port/staj/"; [ "$code" = 200 ] || { cat ".review-logs/$port.log"; exit 1; }
done
