// Review page for the UPDATE-02 polish round: design/polish/index.html shows every item's
// before/after captures (taken by `SHOTS_SET=… SHOTS_PHASE=before|after npm run shots`).
// Static, works from file://: inline script, relative paths. `node scripts/polish-index.mjs`
import { existsSync, readdirSync, writeFileSync } from "node:fs";

const DIR = "design/polish";
const TITLES = {
  "a2-department": "A2 · 'Bölüm uygulaması' tags (D-35)",
  "a3-hazirlik": "A3 · Hazırlık fit check, collapsed list on phones (D-36)",
  "b01-board": "B1 · Split-flap departure board (D-39)",
  "b02-contours": "B2 · Boğaz contour lines (D-41)",
  "b03-bands": "B3 · Colour rhythm bands (D-42)",
  "b04-grain": "B4 · Paper grain (D-43)",
  "b05-icons": "B5 · Icon system (D-44)",
  "b06-tactile": "B6 · Tactile interactions, date popovers (D-45)",
  "b07-entrance": "B7 · Orchestrated entrance (D-46)",
  "b08-footer": "B8 · Big wordmark footer (D-47)",
  "b09-stamp": "B9 · 'ALINDI' receipt stamp (D-48)",
  "b10-dock": "B10 · Phone action dock (D-49, D-54)",
  "b11-kurallar": "B11 · Kurallar polish (D-50)",
  "b12-dark": "B12 · Dark hero ground (D-51)",
  "b14-og": "B14 · Open Graph cards (D-53)",
  "u03-copy": "UPDATE-03 · Official voice (D-55–D-59)",
  "u04": "UPDATE-04 · Site credit, EN hero, titles (D-64–D-68)",
  "p2a": "Phase 2a · Süreç, Rapor, SSS, Formlar, Sonuçlar, İletişim (D-80–D-86)",
  "p2b": "Phase 2b · Araçlar, Teslim kurtarma, takvim, bağlantılar (D-90–D-97)",
  "r01": "REVIEW-01 Note 1 · content uses the container width: header band, Gazete rail, Kronometre grids, Teslim side panel (D-104–D-110)",
  "n2": "REVIEW-01 Note 2 · Araçlar removed; header with eight items (D-111, D-112)",
  "n3": "REVIEW-01 Note 3 · notes instead of questions; details shown, not behind popovers (D-113)",
  "n4": "REVIEW-01 Note 4 · one numbering style, no § (D-114)",
  "n5": "REVIEW-01 Note 5 · grids without orphans (D-115)",
  "n6": "REVIEW-01 Note 6 · refinement pass, every page TR/EN, dark desktop and light phone (D-117)",
  "n7": "REVIEW-01 Note 7 · compact footer; Home contact band merged into it (D-116)",
  "m1": "REVIEW-02 Note 1 · drop cap removed (D-123)",
  "m2": "REVIEW-02 Note 2 · 'Bölüm uygulaması' label and key removed; rules unchanged (D-124)",
  "m3": "REVIEW-02 Note 3 · search rebuilt: MiniSearch index of typed content, grouped results, suggestions, no-results help (D-125–D-127)",
  "m4": "REVIEW-02 Note 4 · heading structure, numbering, Title Case, fewer side panels, Rapor descriptors (D-128–D-131)",
  "r3n1": "REVIEW-03 Note 1 · example number shown as 20xx402xxx; invented sample data (old values masked in 'before') (D-132, D-133)",
  "r3n2": "REVIEW-03 Note 2 · receipt: confirmation head instead of the ALINDI stamp; TR/EN, on time and late, light/dark, print (D-134)",
  "r4n1": "REVIEW-04 Note 1 · server refusals in the site's own TR/EN words; duplicate guard with a 3-second retry countdown (D-137, D-138)",
  "r4n2": "REVIEW-04 Note 2 · printed receipt: white paper, no download hint, plain links, contact line (D-139, D-140)",
  "a1": "REVIEW-01 answers · centred column without the rail (1000–1180 px), Home on phones (D-118 – D-121)",
  "r6": "REVIEW-06 · every page at 1280 / 1440 (full) / 1920 / 375 (full), TR light; Kurallar and SSS dark (D-164 onward)",
  "r6n1": "REVIEW-06 Note 1 · Gazete pages: reading column = text measure, column + rail centred, no dead strip",
  "r6n2": "REVIEW-06 Note 2 · page header band without an empty right column; Kurallar lead",
  "r6n3": "REVIEW-06 Note 3 · Home cards and hero, Süreç rail, Kurallar, Sonuçlar, İletişim, Teslim Hazırlık, phone chrome",
  "r6n4": "REVIEW-06 Note 4 · second-audit items N-01 – N-07 (receipt, late-day time, SSS, Home)",
  "r7": "REVIEW-07 · Gazete pages and Teslim: text fills the column, edges line up with the header (1280 / 1440 / 1920, TR/EN, light/dark) (D-170 onward)",
  "r7-all": "REVIEW-07 self-review · every page, TR/EN, 1280 / 1440 / 1920 / 375, light/dark, full page",
  "r7-range": "D-175 (replaced by D-176) · 961–1180 px: full-width Gazete column, text size grew with it to 27.6 px",
  "r7-rail": "D-176 · the rail from 1024 px; one continuous body size ≤ 22 px (1000 / 1023 / 1024 / 1100 / 1180 / 1280; before = D-175)",
  "fc": "FINAL-CHECK F-01 … F-18 · every finding, before (590dd92) / after (D-177 – D-179)",
};
const img = (f) => /\.(jpe?g|png)$/i.test(f);
const sets = readdirSync(DIR).filter((d) => existsSync(`${DIR}/${d}/after`)).sort();
const section = (set) => {
  const after = readdirSync(`${DIR}/${set}/after`).filter(img).sort();
  const before = new Set(existsSync(`${DIR}/${set}/before`) ? readdirSync(`${DIR}/${set}/before`).filter(img) : []);
  const rows = after.map((f) => {
    const b = before.has(f) ? `<figure class="b"><figcaption>before</figcaption><a href="${set}/before/${f}"><img src="${set}/before/${f}" loading="lazy" alt=""></a></figure>`
      : `<figure class="b none"><figcaption>before</figcaption><p>(new screen)</p></figure>`;
    const a = `<figure class="a"><figcaption>after</figcaption><a href="${set}/after/${f}"><img src="${set}/after/${f}" loading="lazy" alt=""></a></figure>`;
    return `<div class="pair"><h3>${f.replace(/\.(jpe?g|png)$/i, "")}</h3><div class="cols">${b}${a}</div></div>`;
  });
  // Files that only exist before (renamed captures) are listed too, so nothing is hidden.
  for (const f of [...before].filter((f) => !after.includes(f)).sort())
    rows.push(`<div class="pair"><h3>${f} (before only)</h3><div class="cols"><figure class="b"><a href="${set}/before/${f}"><img src="${set}/before/${f}" loading="lazy" alt=""></a></figure></div></div>`);
  return `<section id="${set}"><h2>${TITLES[set] || set}</h2>${rows.join("")}</section>`;
};
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Polish before/after</title>
<style>body{font:14px system-ui;margin:24px;background:#eee;color:#111}h2{margin:40px 0 8px;font-size:18px}h3{font:12px ui-monospace;margin:14px 0 4px}
nav{columns:3 16rem;font-size:13px}nav a{display:block;padding:2px 0}
.bar{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 0;background:#eee;border-bottom:1px solid #bbb}
.bar button{font:inherit;padding:8px 14px;border:2px solid #0e1726;background:#fff;cursor:pointer}.bar button[aria-pressed=true]{background:#0e1726;color:#fff}
.cols{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}figure{margin:0;flex:0 1 auto}figcaption{font:12px ui-monospace;margin:0 0 4px}
img{display:block;max-width:min(46vw,720px);max-height:900px;width:auto;border:1px solid #999;background:#fff}
.none p{font:12px ui-monospace;color:#555;margin:0;padding:24px;border:1px dashed #999}
body[data-view=before] .a, body[data-view=after] .b{display:none}
body[data-view=before] img, body[data-view=after] img{max-width:min(92vw,1440px)}</style>
<body data-view="both">
<h1>UPDATE-02 polish — before / after</h1>
<p>One folder per item, captured from the same build settings (clock frozen at 2026-10-09 16:00 TSİ). B13 (photos) was skipped: no photos folder (D-52). The full-site grid with its own Phase 1 toggle is <a href="../screenshots/index.html">design/screenshots/index.html</a>. Keys: <kbd>B</kbd> before, <kbd>A</kbd> after, <kbd>S</kbd> side by side.</p>
<div class="bar" role="group" aria-label="View">
<button type="button" data-view="both" aria-pressed="true">Side by side</button>
<button type="button" data-view="before" aria-pressed="false">Before only</button>
<button type="button" data-view="after" aria-pressed="false">After only</button></div>
<nav aria-label="Items">${sets.map((s) => `<a href="#${s}">${TITLES[s] || s}</a>`).join("")}</nav>
${sets.map(section).join("\n")}
<script>
function view(v){ document.body.dataset.view = v; document.querySelectorAll(".bar button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.view === v)); }); }
document.querySelectorAll(".bar button").forEach(function(b){ b.addEventListener("click", function(){ view(b.dataset.view); }); });
document.addEventListener("keydown", function(e){ var k = e.key.toLowerCase(); if (k === "b") view("before"); if (k === "a") view("after"); if (k === "s") view("both"); });
</script>
</body>`;
writeFileSync(`${DIR}/index.html`, html);
console.log(`${sets.length} items → ${DIR}/index.html`);
