// Contact sheet for review: design/screenshots/index.html with JPEG thumbnails of
// the visual baselines (reduced-motion set + Teslim screens). Uses macOS `sips`.
// design/screenshots/phase1/ (the committed Phase 1 grid, same file names) is kept and
// becomes the "before" side of the page's before/after toggle (UPDATE-02 C).
//   npm run test:visual -- -u && npm run grid
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync, rmSync } from "node:fs";

const SRC = `tests/visual/__screenshots__/${process.env.VISUAL_PLATFORM || "local"}`, OUT = "design/screenshots";
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".jpg") || f === "index.html") rmSync(`${OUT}/${f}`);
const files = readdirSync(SRC).filter((f) => f.endsWith(".png") && !f.includes("no-preference")).sort();
for (const f of files) {
  const w = /-1440/.test(f) ? 440 : /-768/.test(f) ? 300 : 260;
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "45", "--resampleWidth", String(w), `${SRC}/${f}`, "--out", `${OUT}/${f.replace(".png", ".jpg")}`], { stdio: "ignore" });
}
const groups = {};
for (const f of files) { const key = f.replace(/-(360|768|1440).*$/, ""); (groups[key] ||= []).push(f.replace(".png", ".jpg")); }
const before = (f) => existsSync(`${OUT}/phase1/${f}`);
const width = (f) => (/-1440/.test(f) ? 440 : /-768/.test(f) ? 300 : 260);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redesign screenshots</title>
<style>body{font:14px system-ui;margin:24px;background:#eee}h2{margin:32px 0 8px;font-size:16px}
.row{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}figure{margin:0}figcaption{font:12px ui-monospace;margin:4px 0}
img{display:block;border:1px solid #999;background:#fff}
.bar{position:sticky;top:0;z-index:1;display:flex;gap:8px;align-items:center;padding:10px 0;background:#eee;border-bottom:1px solid #bbb}
.bar button{font:inherit;padding:8px 14px;border:2px solid #0e1726;background:#fff;cursor:pointer}
.bar button[aria-pressed=true]{background:#0e1726;color:#fff}</style>
<h1>Screenshot grid — Phase 1 vs. after the UPDATE-02 polish</h1>
<p>Clock frozen at 2026-10-09 16:00 TSİ. Reduced motion on (still frames). Click an image for full size. Keys: <kbd>B</kbd> before, <kbd>A</kbd> after.</p>
<div class="bar" role="group" aria-label="Which set">
<button type="button" data-set="before" aria-pressed="false">Before (Phase 1)</button>
<button type="button" data-set="after" aria-pressed="true">After (polish)</button>
<span id="state">Showing: after</span></div>
${Object.entries(groups).map(([k, list]) => `<h2>${k}</h2><div class="row">${list.map((f) => `<figure><figcaption>${f.replace(".jpg", "")}${before(f) ? "" : " (new)"}</figcaption><a href="${f}" data-after="${f}"${before(f) ? ` data-before="phase1/${f}"` : ""}><img src="${f}" data-after="${f}"${before(f) ? ` data-before="phase1/${f}"` : ""} loading="lazy" width="${width(f)}"></a></figure>`).join("")}</div>`).join("\n")}
<script>
function show(set){
  document.querySelectorAll("[data-after]").forEach(function(el){
    var v = set === "before" && el.dataset.before ? el.dataset.before : el.dataset.after;
    if (el.tagName === "IMG") el.src = v; else el.href = v;
  });
  document.querySelectorAll(".bar button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set === set)); });
  document.getElementById("state").textContent = "Showing: " + set;
}
document.querySelectorAll(".bar button").forEach(function(b){ b.addEventListener("click", function(){ show(b.dataset.set); }); });
document.addEventListener("keydown", function(e){ if (e.key === "b" || e.key === "B") show("before"); if (e.key === "a" || e.key === "A") show("after"); });
</script>`;
writeFileSync(`${OUT}/index.html`, html);
console.log(`${files.length} thumbnails → ${OUT}/index.html`);
