// Release smoke test (UPDATE-07, D-147). Checks a running site — the live URL after a deploy, or a local preview:
//   npm run smoke -- https://bogazici-ie-internships.github.io/staj/
//   npm run smoke -- http://localhost:4400/staj/ --at 2026-10-23T10:00:00+03:00
// Options: --at <ISO time>  the browser's clock (default: now); the expected Teslim phase follows from it and
//                           settings.yml (open / late / closed), or force it with --expect open|late|closed.
// Checks, in both languages:
//   - every URL of the MkDocs site (tests/baseline/url-inventory.json) answers 200 and keeps its link anchors;
//   - the documents and public assets answer 200; sitemap.xml lists every old page; robots.txt points to it;
//   - each page has its OG image, and the image answers 200;
//   - the search index loads and a search returns results;
//   - Sonuçlar: the results PDF answers 200 as application/pdf at its ?v= URL (or the page says none is out yet);
//   - Teslim shows the expected phase (closed after the late window);
//   - no console errors (requests to Google — portal, reCAPTCHA — are blocked here and not counted).
// Nothing is submitted: the Apps Script portal is never contacted.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import YAML from "yaml";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const atArg = opt("--at"), expectArg = opt("--expect");
const base = (args[0] || "").replace(/\/?$/, "/");
if (!/^https?:\/\/.+\/staj\/$/.test(base)) { console.error("usage: npm run smoke -- <https://…/staj/> [--at ISO] [--expect open|late|closed]"); process.exit(2); }
const at = atArg ? Date.parse(atArg) : Date.now();
if (Number.isNaN(at)) { console.error(`--at: not a date: ${atArg}`); process.exit(2); }

const INV = JSON.parse(readFileSync("tests/baseline/url-inventory.json", "utf8"));
// Same exclusions as tests/e2e/parity.spec.ts: form plumbing and MkDocs h1 slugs of reworked pages.
const NOT_ANCHORS = /^(suf|staj)-|^sufForm$|^(teslim|submission|zorunlu-staj-klavuzu|compulsory-internship-guide)$/;

// Expected phase from settings.yml (same rule as src/lib/phase.ts): deadline + gec_teslim_gun days.
const donem = YAML.parse(readFileSync("settings.yml", "utf8")).donem;
const [d, t] = String(donem.teslim_kilit || "").split(" ");
const deadline = d ? Date.parse(`${d}T${t || "00:00"}:00+03:00`) : NaN;
const closes = deadline + Number(donem.gec_teslim_gun || 0) * 86_400_000;
const phase = expectArg || (Number.isNaN(deadline) ? "open" : at > closes ? "closed" : at > deadline ? "late" : "open");

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ timezoneId: "Europe/Istanbul", locale: "tr-TR" });
await ctx.route(/^https:\/\/([^/]+\.)?(google\.com|gstatic\.com|googleusercontent\.com)\//, (r) => r.abort());
const blocked = /google\.com|gstatic\.com|googleusercontent\.com/;
const page = await ctx.newPage();
await page.clock.install({ time: new Date(at) });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error" && !blocked.test(m.text()) && !blocked.test(m.location()?.url || "")) consoleErrors.push(`${page.url()}: ${m.text()}`); });
page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
// The embedded results PDF (RESULTS-01) is handed to the PDF viewer, which headless Chromium cancels; the file itself
// is checked below (200, application/pdf).
const embeddedPdf = /\/staj\/internships\/[^/?]+\.pdf(\?|$)/;
page.on("requestfailed", (r) => { if (!blocked.test(r.url()) && !embeddedPdf.test(r.url())) consoleErrors.push(`${page.url()}: request failed ${r.url()}`); });

// Pages, anchors, OG.
for (const [rel, old] of Object.entries(INV.pages)) {
  const res = await page.goto(base + rel, { waitUntil: "load" });
  ok(res?.status() === 200, `/${rel}: HTTP ${res?.status()}`);
  for (const id of old.ids.filter((x) => !NOT_ANCHORS.test(x))) ok(await page.locator(`[id="${id}"]`).count() === 1, `/${rel}: anchor #${id} missing`);
  const og = await page.getAttribute('meta[property="og:image"]', "content");
  ok(!!og, `/${rel}: no og:image`);
  if (og) { const r = await ctx.request.get(base + og.replace(/^https?:\/\/[^/]+\/staj\//, "")); ok(r.status() === 200, `/${rel}: og:image ${og} HTTP ${r.status()}`); }
}
// Documents and assets at the same URLs.
for (const f of [...INV.documents, ...INV.public_assets]) { const r = await ctx.request.get(base + f); ok(r.status() === 200, `${f}: HTTP ${r.status()}`); }
// Sitemap and robots.
const sm = await ctx.request.get(base + "sitemap.xml");
ok(sm.status() === 200, `sitemap.xml: HTTP ${sm.status()}`);
const xml = await sm.text();
for (const url of INV.sitemap) ok(xml.includes(`<loc>${url}</loc>`), `sitemap.xml: missing ${url}`);
const rb = await ctx.request.get(base + "robots.txt");
ok(rb.status() === 200 && /Sitemap: \S+\/staj\/sitemap\.xml/.test(await rb.text()), `robots.txt: HTTP ${rb.status()} or no Sitemap line`);
// Search: both indexes load; a query returns results in the palette.
for (const lang of ["tr", "en"]) {
  const r = await ctx.request.get(base + `search/${lang}.json`);
  let n = 0; try { n = (await r.json()).docs.length; } catch { /* */ }
  ok(r.status() === 200 && n > 50, `search/${lang}.json: HTTP ${r.status()}, ${n} documents`);
  await page.goto(base + (lang === "en" ? "en/" : ""));
  await page.click("[data-search-open]");
  await page.locator(".srch__input").fill("EK-1");
  ok(await page.locator(".srch__item").first().waitFor({ timeout: 8000 }).then(() => true, () => false), `search (${lang}): no results for "EK-1"`);
}
// Sonuçlar (RESULTS-01): the results file answers 200 as a PDF at its versioned URL, or the page says none is out yet.
for (const lang of ["tr", "en"]) {
  await page.goto(base + (lang === "en" ? "en/" : "") + "sonuclar/");
  const state = await page.locator("[data-results]").getAttribute("data-results");
  ok(state === "file" || state === "empty", `sonuclar (${lang}): no results card`);
  if (state === "file") {
    const href = await page.locator("[data-results-open]").getAttribute("href");
    ok(/^\/staj\/internships\/All_Internships\.pdf\?v=\d+$/.test(href || ""), `sonuclar (${lang}): unexpected results link ${href}`);
    const r = await ctx.request.get(base + (href || "").replace(/^\/staj\//, ""));
    ok(r.status() === 200 && /^application\/pdf/.test(r.headers()["content-type"] || ""), `sonuclar (${lang}): ${href} HTTP ${r.status()} ${r.headers()["content-type"]}`);
  } else ok(await page.locator(".results__empty").isVisible(), `sonuclar (${lang}): empty state not shown`);
}
// Teslim phase.
for (const lang of ["tr", "en"]) {
  await page.goto(base + (lang === "en" ? "en/" : "") + "teslim/");
  const sel = phase === "closed" ? "#suf-closed" : ".suf-prep";
  ok(await page.locator(sel).waitFor({ timeout: 8000 }).then(() => true, () => false), `teslim (${lang}): expected the ${phase} screen (${sel})`);
  const strip = await page.locator("[data-deadline-strip]").getAttribute("data-phase");
  ok(strip === phase, `teslim (${lang}): deadline strip says "${strip}", expected "${phase}"`);
}
ok(consoleErrors.length === 0, `console errors:\n    ${consoleErrors.slice(0, 20).join("\n    ")}`);
await browser.close();

console.log(`smoke ${base} at ${new Date(at).toISOString()} (Teslim expected: ${phase}): ${checks - fails.length}/${checks} checks passed`);
for (const f of fails) console.log(`  ✘ ${f}`);
process.exit(fails.length ? 1 : 0);
