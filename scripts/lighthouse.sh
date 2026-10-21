#!/usr/bin/env bash
# Mobile Lighthouse on a production-like build: form key set (local stand-in), reCAPTCHA on,
# Apps Script blocked (never contacted), gzip like GitHub Pages. Results: design/lighthouse/.
#   scripts/lighthouse.sh [page ...]      default: "" kurallar/ teslim/
set -euo pipefail
cd "$(dirname "$0")/.."
if [ $# -eq 0 ]; then PAGES=("" "kurallar/" "teslim/"); else PAGES=("$@"); fi
RUNS=${RUNS:-3}
# Pinned Lighthouse (D-181, RELEASE-CHECK R-02): LIGHTHOUSE_BIN may point at a local install of exactly this version
# (e.g. when the npx cache is broken); otherwise npx fetches it.
LH_VERSION=13.5.0
if [ -n "${LIGHTHOUSE_BIN:-}" ]; then
  v=$("$LIGHTHOUSE_BIN" --version); [ "$v" = "$LH_VERSION" ] || { echo "LIGHTHOUSE_BIN is Lighthouse $v, expected $LH_VERSION" >&2; exit 1; }
  LH=("$LIGHTHOUSE_BIN")
else
  LH=(npx -y "lighthouse@$LH_VERSION")
fi
SRV=""
cp settings.yml /tmp/staj-settings.bak
trap 'cp /tmp/staj-settings.bak settings.yml; kill $SRV 2>/dev/null || true' EXIT
sed -i '' 's/  form_key: ""/  form_key: "lh-local-test"/' settings.yml
STAJ_OUT=dist-lh STAJ_BUILD_DATE=2026-10-09 npx astro build >/dev/null
cp /tmp/staj-settings.bak settings.yml
node scripts/serve.mjs --dir dist-lh --port 4400 >/dev/null 2>&1 & SRV=$!
sleep 1
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/* | head -1)
mkdir -p design/lighthouse
for pg in "${PAGES[@]}"; do
  name=${pg%/}; name=${name:-home}; name=${name//\//-}
  for i in $(seq 1 "$RUNS"); do
    CHROME_PATH="$CH" "${LH[@]}" "http://localhost:4400/staj/$pg" --quiet --chrome-flags="--headless=new" \
      --form-factor=mobile --blocked-url-patterns="*script.google.com*" --output=json --output-path="design/lighthouse/$name.run$i.json" >/dev/null 2>&1
  done
  # Median run by performance score (as Lighthouse CI does) is kept as $name.json.
  python3 - "$name" "$RUNS" <<'PY'
import json, sys, shutil, statistics
name, runs = sys.argv[1], int(sys.argv[2])
rs = [(json.load(open(f"design/lighthouse/{name}.run{i}.json")), i) for i in range(1, runs + 1)]
rs.sort(key=lambda r: r[0]["categories"]["performance"]["score"])
d, i = rs[len(rs) // 2]
shutil.copy(f"design/lighthouse/{name}.run{i}.json", f"design/lighthouse/{name}.json")
for _, j in rs: __import__("os").remove(f"design/lighthouse/{name}.run{j}.json")
c, a = d["categories"], d["audits"]
perf = [round(r[0]["categories"]["performance"]["score"] * 100) for r in rs]
print(name.ljust(12), "perf(median)=%d runs=%s" % (round(c["performance"]["score"] * 100), perf),
      " ".join(f"{k[:4]}={round(v['score']*100)}" for k, v in c.items() if k not in ("performance", "agentic-browsing")),
      "LCP", a["largest-contentful-paint"]["displayValue"], "CLS", a["cumulative-layout-shift"]["displayValue"])
PY
done
python3 scripts/lighthouse_summary.py
rm -rf dist-lh
