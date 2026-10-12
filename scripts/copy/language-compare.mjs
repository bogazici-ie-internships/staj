// LANGUAGE-01 (D-183): design/reviews/language-compare.html — every copy string, three columns:
//   Canlı   the live MkDocs site (4553fcd), found through each block's `src` (docs pages) or the inverted
//           scripts/migrate/phase1-map.yaml (Home, Kurallar, Teslim, rules, glossary, chrome)
//   Şimdiki the copy before the language pass (BASE, a commit)
//   Yeni    the copy in the working tree — what ships
// Reasons per changed key and the itiraz list: design/reviews/language-reasons.yaml.
//   node scripts/copy/language-compare.mjs [BASE]
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import YAML from "yaml";
import { collect } from "./collect.mjs";
import { redactSample } from "../lib/redact-sample.mjs";
import { MKDOCS_REF, parse, readMain, units } from "../migrate/mkdocs.mjs";

const BASE = process.argv[2] || "7a37005";   // last commit before LANGUAGE-01
const OUT = "design/reviews/language-compare.html";
const REASONS = YAML.parse(readFileSync("design/reviews/language-reasons.yaml", "utf8")) ?? {};

// --- live units by "file:line" (TR and EN, paired by position like the coverage tool) ---------------------
const PAGES = ["index", "kurallar", "teslim", "surec/index", "rapor", "formlar", "sss", "sonuclar", "iletisim"];
const live = new Map();
for (const f of PAGES) {
  const tr = units(parse(readMain(`docs/${f}.md`, MKDOCS_REF), `${f}.md`));
  const en = units(parse(readMain(`docs/${f}.en.md`, MKDOCS_REF), `${f}.en.md`));
  tr.forEach((u, i) => { const v = { tr: u.text, en: en[i]?.text ?? "" }; live.set(`${f}.md:${u.line}`, v); if (en[i]) live.set(`${f}.en.md:${en[i].line}`, v); });
}
// --- key → live refs ----------------------------------------------------------------------------------------
const itemName = (v, i) => (v && typeof v === "object" && (v.no ?? v.id ?? v.key ?? v.n)) ?? i;
const refsOf = new Map();
function walk(node, path, file, src) {
  if (node && typeof node === "object" && !Array.isArray(node) && typeof node.src === "string") src = node.src;
  const isPair = node && typeof node === "object" && !Array.isArray(node) && typeof node.tr === "string" && typeof node.en === "string";
  if (isPair) { if (src) refsOf.set(`${file} › ${path.join(".")}`, src.split(" · ").filter((r) => !r.includes(".en.md"))); }
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, String(itemName(v, i))], file, src));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) if (k !== "anchor" && k !== "src" && !isPair) walk(v, [...path, k], file, src);
}
const yamlFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? yamlFiles(join(dir, d.name)) : d.name.endsWith(".yaml") ? [join(dir, d.name)] : []));
for (const f of yamlFiles("src/content")) walk(YAML.parse(readFileSync(f, "utf8")), [], relative("src/content", f), null);
for (const [ref, v] of Object.entries(YAML.parse(readFileSync("scripts/migrate/phase1-map.yaml", "utf8")) ?? {})) {
  if (/^(omitted|code):/.test(String(v))) continue;
  for (const key of String(v).split(" — ")[0].split(", ").map((s) => s.trim())) (refsOf.get(key) ?? refsOf.set(key, []).get(key)).push(ref);
}
const liveFor = (key) => {
  const refs = [...refsOf.entries()].filter(([k]) => key === k || key.startsWith(k + ".")).flatMap(([, r]) => r);
  const hits = [...new Set(refs)].map((r) => live.get(r)).filter(Boolean);
  return hits.length ? { tr: hits.map((h) => h.tr).join(" ¶ "), en: hits.map((h) => h.en).join(" ¶ ") } : null;
};

// --- before / after -------------------------------------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "language-compare-"));
let before;
try {
  execSync(`git archive ${BASE} src | tar -x -C "${tmp}"`);
  symlinkSync(resolve("node_modules"), join(tmp, "node_modules"));
  before = await collect(tmp);
} finally { rmSync(tmp, { recursive: true, force: true }); }
const after = await collect();

const PAGE_OF = (key) => {
  const f = key.split(" › ")[0];
  const m = { "pages/home.yaml": "Ana Sayfa", "docs/surec.yaml": "Süreç", "pages/kurallar.yaml": "Kurallar", "docs/rapor.yaml": "Rapor", "docs/formlar.yaml": "Formlar ve Belgeler",
    "docs/sss.yaml": "SSS", "docs/sonuclar.yaml": "Sonuçlar", "docs/iletisim.yaml": "İletişim", "pages/teslim.yaml": "Teslim", "server": "Teslim (sunucu)", "ui.ts": "Teslim akışı ve arayüz",
    "pages/chrome.yaml": "Başlık, menü, altbilgi, arama, meta", "pages/layout.yaml": "Yan paneller", "glossary.yaml": "Sözlük", "search-keywords.yaml": "Arama eş anlamlıları" };
  if (f.startsWith("rules/")) return "Kurallar";
  return m[f] ?? f;
};
const rows = [];
const counts = {};
for (const key of new Set([...before.keys(), ...after.keys()])) {
  const b = before.get(key), a = after.get(key);
  if (key.startsWith("search-keywords")) continue;
  const page = PAGE_OF(key);
  const l = liveFor(key);
  const changed = { tr: (b?.tr ?? null) !== (a?.tr ?? null), en: (b?.en ?? null) !== (a?.en ?? null) };
  counts[page] ??= { blocks: 0, changed: 0 }; counts[page].blocks++; if (changed.tr || changed.en) counts[page].changed++;
  rows.push({ key, page, live: l, before: b ? { tr: b.tr, en: b.en } : null, after: a ? { tr: a.tr, en: a.en } : null, changed, reason: REASONS.reasons?.[key] ?? "" });
}
const ORDER = ["Ana Sayfa", "Süreç", "Kurallar", "Rapor", "Formlar ve Belgeler", "SSS", "Sonuçlar", "İletişim", "Teslim", "Teslim akışı ve arayüz", "Teslim (sunucu)", "Başlık, menü, altbilgi, arama, meta", "Yan paneller", "Sözlük"];
rows.sort((x, y) => (ORDER.indexOf(x.page) - ORDER.indexOf(y.page)) || 0);
const itiraz = REASONS.itiraz ?? [];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const data = JSON.stringify({ rows, counts, itiraz, base: BASE }).replace(/</g, "\\u003c");
writeFileSync(OUT, redactSample(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dil Karşılaştırması</title>
<style>
:root{--bg:#f4f2ec;--fg:#14181f;--muted:#5b6170;--rule:#cfcab9;--card:#fff;--chg:#fff6d6;--del:#fde4e1}
@media (prefers-color-scheme:dark){:root{--bg:#0f141c;--fg:#e9e6dc;--muted:#a3a9b6;--rule:#2c3442;--card:#161d28;--chg:#3a3216;--del:#3d1f1c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif}
.top{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--rule);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.top h1{font-size:17px;margin:0 auto 0 0}button{font:inherit;padding:5px 11px;border:1px solid var(--fg);background:transparent;color:var(--fg);cursor:pointer}button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
main{max-width:1400px;margin:0 auto;padding:16px}h2{font-size:19px;margin:28px 0 8px;border-top:2px solid var(--fg);padding-top:10px}
table{width:100%;border-collapse:collapse;background:var(--card);table-layout:fixed}th,td{border:1px solid var(--rule);padding:6px 8px;vertical-align:top;text-align:left;overflow-wrap:anywhere}
th{font-size:12px;color:var(--muted);font-weight:600}td.k{font:11px/1.4 ui-monospace,monospace;color:var(--muted);width:15%}td.r{width:7%;font-size:12px}
tr.chg td.new{background:var(--chg)}tr.gone td.new{background:var(--del)}.sum{color:var(--muted)}ul.itiraz li{margin:4px 0}
body.only tr.same{display:none}
</style>
<div class="top"><h1>Dil Karşılaştırması · LANGUAGE-01</h1>
<span>Dil</span><button data-l="tr" aria-pressed="true">TR</button><button data-l="en" aria-pressed="false">EN</button>
<button id="only" aria-pressed="true">Yalnızca değişenler</button></div>
<main>
<p class="sum">Canlı = yayındaki MkDocs sitesi (<code>${MKDOCS_REF}</code>); Şimdiki = dil geçişinden önce (<code>${esc(BASE)}</code>); Yeni = yayına çıkacak metin. Sayfadaki her şey verilerden üretilir: <code>node scripts/copy/language-compare.mjs</code>. Canlı sütunu boşsa o metin canlı sitede yoktur (yeni içerik).</p>
<div id="counts"></div><h2>İtiraz listesi (uygulanmadı: bilgi, kural veya terim değişikliği gerekir)</h2><ul class="itiraz" id="itiraz"></ul><div id="pages"></div>
</main>
<script>
var D=${data};var lang="tr";
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function render(){var byPage={};D.rows.forEach(function(r){(byPage[r.page]=byPage[r.page]||[]).push(r)});
 var h="";Object.keys(byPage).forEach(function(p){var rs=byPage[p];var c=D.counts[p];h+="<h2>"+esc(p)+" <span class=sum>("+c.changed+" / "+c.blocks+" blok değişti)</span></h2><table><thead><tr><th style=width:15%>Anahtar</th><th>Canlı</th><th>Şimdiki</th><th>Yeni</th><th style=width:7%>Neden</th></tr></thead><tbody>";
 rs.forEach(function(r){var ch=r.changed[lang];var gone=!r.after;h+="<tr class='"+(gone?"gone chg":ch?"chg":"same")+"'><td class=k>"+esc(r.key)+"</td><td>"+esc(r.live?r.live[lang]:"")+"</td><td>"+esc(r.before?r.before[lang]:"")+"</td><td class=new>"+(gone?"<i>kaldırıldı</i>":esc(r.after?r.after[lang]:""))+"</td><td class=r>"+esc(r.reason)+"</td></tr>"});
 h+="</tbody></table>"});document.getElementById("pages").innerHTML=h;
 document.getElementById("itiraz").innerHTML=D.itiraz.map(function(i){return"<li><code>"+esc(i.key)+"</code> — "+esc(i.note)+"</li>"}).join("")||"<li>Yok</li>";}
document.querySelectorAll("[data-l]").forEach(function(b){b.onclick=function(){lang=b.dataset.l;document.querySelectorAll("[data-l]").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});render()}});
var only=document.getElementById("only");document.body.classList.add("only");only.onclick=function(){var on=!document.body.classList.contains("only");document.body.classList.toggle("only",on);only.setAttribute("aria-pressed",String(on))};
render();
</script></html>
`));
const total = Object.values(counts).reduce((a, c) => a + c.changed, 0);
console.log(`language-compare: ${rows.length} keys, ${total} changed → ${OUT}`);
for (const p of ORDER) if (counts[p]) console.log(`  ${p}: ${counts[p].changed} / ${counts[p].blocks}`);
