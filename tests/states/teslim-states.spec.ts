// REVIEW-03 Note 3 (D-136): builds design/reviews/teslim-states.html from the running review servers (4321–4323),
// one row per state in STATES, 1440 px and 360 px, TR/EN × light/dark. Regenerate whenever Teslim changes:
//   npm run review   (builds and restarts the review servers), then  npm run states
// Each review build is photographed at its CLOCK moment; nothing is sent anywhere (fake portal).
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CLOCK, GROUPS, NO_PREOPEN, PORT, STATES } from "./states";

const OUT = "design/reviews/teslim-states";
const LAN = process.env.LAN_IP || "192.168.1.4";
const VARIANTS = [["tr", "light"], ["tr", "dark"], ["en", "light"], ["en", "dark"]] as const;
const WIDTHS = [1440, 360] as const;
const path = (lang: string, rel: string) => `/staj/${lang === "en" ? "en/" : ""}${rel}`;

test("Teslim durumları sayfası", async ({ browser }) => {
  test.setTimeout(20 * 60_000);
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  for (const s of STATES) for (const [lang, scheme] of VARIANTS) for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 780 }, colorScheme: scheme, reducedMotion: "reduce", timezoneId: "Europe/Istanbul" });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());   // nothing leaves the machine
    await page.clock.install({ time: new Date(CLOCK[s.build]) });
    await page.goto(`http://localhost:${PORT[s.build]}${path(lang, s.rel)}`);
    await expect(page.locator(s.ready).first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (s.print) await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(400);
    // Down to the end of <main> (the footer adds nothing here); Home shows its first screen, where the board is.
    const bottom = s.rel === "" ? (w > 800 ? 900 : 780) : await page.evaluate(() => Math.ceil(document.querySelector("main")!.getBoundingClientRect().bottom + scrollY));
    await page.screenshot({ path: `${OUT}/${s.id}-${lang}-${scheme}-${w}.jpg`, type: "jpeg", quality: 50, fullPage: true, clip: { x: 0, y: 0, width: w, height: bottom }, animations: "disabled" });
    await ctx.close();
  }
  // Desktop frames are halved for the page (macOS sips), so the folder stays small.
  for (const f of readdirSync(OUT).filter((f) => f.endsWith("-1440.jpg"))) execFileSync("sips", ["--resampleWidth", "720", "-s", "formatOptions", "55", `${OUT}/${f}`], { stdio: "ignore" });
  writeFileSync("design/reviews/teslim-states.html", html());
});

// REVIEW-04 Note 2 (D-139): the receipt cards link the sample PDFs (npm run receipts).
const RECEIPT_PDF: Record<string, string> = { done: "zamaninda", print: "zamaninda", "late-done": "gec", "print-late": "gec" };
const pdfs = (id: string) => RECEIPT_PDF[id] ? `<p class="pdf">Örnek PDF: <a href="makbuz/makbuz-${RECEIPT_PDF[id]}-tr.pdf">TR</a> · <a href="makbuz/makbuz-${RECEIPT_PDF[id]}-en.pdf">EN</a> (A4, tarayıcının yazdırma çıktısı)</p>` : "";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function html() {
  const card = (s: (typeof STATES)[number]) => {
    const urls = (lang: string) => `<a href="http://localhost:${PORT[s.build]}${path(lang, s.rel)}">localhost:${PORT[s.build]}${path(lang, s.rel)}</a> · <a href="http://${LAN}:${PORT[s.build]}${path(lang, s.rel)}">${LAN}:${PORT[s.build]}${path(lang, s.rel)}</a>`;
    return `<article class="st" id="${s.id}">
  <header><h3>${esc(s.title)}</h3><p>${esc(s.caption)}${s.print ? " Ekran görüntüsü yazdırma ortamında alındı; sayfayı açıp Yazdır'a basınız." : ""}</p>
  <p class="url" data-lang="tr">${urls("tr")}</p><p class="url" data-lang="en">${urls("en")}</p>${pdfs(s.id)}</header>
  <div class="shots">${WIDTHS.map((w) => `<figure class="w${w}"><figcaption>${w} px</figcaption><a class="frame" href="teslim-states/${s.id}-tr-light-${w}.jpg" data-id="${s.id}" data-w="${w}"><img loading="lazy" src="teslim-states/${s.id}-tr-light-${w}.jpg" data-id="${s.id}" data-w="${w}" alt="${esc(s.title)}, ${w} px"></a></figure>`).join("")}</div>
</article>`;
  };
  const body = GROUPS.map((g) => {
    const rows = STATES.filter((s) => s.group === g.id);
    return `<section id="${g.id}"><h2>${esc(g.title)}</h2>${rows.length ? rows.map(card).join("\n") : `<p class="none">${esc(NO_PREOPEN)}</p>`}</section>`;
  }).join("\n");
  const clocks = `ana derleme ${CLOCK.main.slice(0, 16).replace("T", " ")}, geç teslim ${CLOCK.late.slice(0, 16).replace("T", " ")}, kapalı ${CLOCK.closed.slice(0, 16).replace("T", " ")} (TSİ)`;
  return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teslim Durumları</title>
<style>
:root{--bg:#f4f2ec;--fg:#14181f;--muted:#5b6170;--rule:#cfcab9;--card:#fff;--link:#1d4f91}
@media (prefers-color-scheme:dark){:root{--bg:#0f141c;--fg:#e9e6dc;--muted:#a3a9b6;--rule:#2c3442;--card:#161d28;--link:#8db7ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
.top{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--rule);padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.top h1{font-size:18px;margin:0 auto 0 0}.top button{font:inherit;padding:6px 12px;border:1px solid var(--fg);background:transparent;color:var(--fg);cursor:pointer}
.top button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
main{max-width:1200px;margin:0 auto;padding:16px}nav{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 16px}a{color:var(--link)}
.intro{color:var(--muted);max-width:70ch}h2{margin:32px 0 12px;font-size:22px;border-top:2px solid var(--fg);padding-top:12px}
.st{background:var(--card);border:1px solid var(--rule);padding:14px;margin:0 0 16px}.st h3{margin:0 0 4px;font-size:17px}.st p{margin:0 0 6px}
.pdf{font-weight:600}.url{font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere;color:var(--muted)}body[data-lang=en] .url[data-lang=tr],body:not([data-lang=en]) .url[data-lang=en]{display:none}
.shots{display:grid;grid-template-columns:minmax(0,720px) 180px;gap:16px;align-items:start}figure{margin:0}figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}
.frame{display:block;max-height:640px;overflow:auto;border:1px solid var(--rule)}.frame img{display:block;width:100%;height:auto}
.none{background:var(--card);border:1px dashed var(--rule);padding:14px;max-width:70ch}
@media (max-width:700px){.shots{grid-template-columns:1fr 1fr}.frame{max-height:420px}}
</style>
<div class="top"><h1>Teslim Durumları</h1>
<span>Dil</span><button type="button" data-set="lang" data-v="tr" aria-pressed="true">TR</button><button type="button" data-set="lang" data-v="en" aria-pressed="false">EN</button>
<span>Tema</span><button type="button" data-set="scheme" data-v="light" aria-pressed="true">Açık</button><button type="button" data-set="scheme" data-v="dark" aria-pressed="false">Koyu</button></div>
<main>
<p class="intro">Teslim'in tüm adımları ve durumları, REVIEW-03 Not 1–2 uygulanmış hâliyle (örnek veriler, yeni makbuz başlığı). Görüntüler inceleme sunucularından (4321 ana, 4322 geç teslim, 4323 kapalı) sabit saatle alındı: ${esc(clocks)}. Bağlantıyı açtığınızda gerçek saat kullanılır; sayaç ve gün sayıları buna göre değişir. Görüntüye tıklayınca tam boy açılır. Yeniden üretmek için: <code>npm run states</code> (sunucular çalışırken).</p>
<nav>${GROUPS.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join("")}</nav>
${body}
</main>
<script>
var st={lang:"tr",scheme:"light"};
function apply(){document.body.dataset.lang=st.lang;document.querySelectorAll("img[data-id]").forEach(function(i){var f="teslim-states/"+i.dataset.id+"-"+st.lang+"-"+st.scheme+"-"+i.dataset.w+".jpg";i.src=f;i.parentNode.href=f;});
document.querySelectorAll(".top button").forEach(function(b){b.setAttribute("aria-pressed",String(st[b.dataset.set]===b.dataset.v));});}
document.querySelectorAll(".top button").forEach(function(b){b.addEventListener("click",function(){st[b.dataset.set]=b.dataset.v;apply();});});
</script>
</html>
`;
}
