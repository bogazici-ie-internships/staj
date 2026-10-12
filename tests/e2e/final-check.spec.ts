// FINAL-CHECK (the pre-release content check, F-01 … F-18) with the maintainer's decisions: F-04 the duration
// sentence is removed; F-11 "Formlar ve Belgeler" / "Forms and Documents" everywhere (D-177 – D-179). One test per
// finding or group, on the built site.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { SITE, open } from "./helpers";

const html = (rel: string) => readFileSync(join(SITE, rel, "index.html"), "utf8");
const text = (rel: string) => html(rel)
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

// Mean characters per full line (the last line of each block left out) of the visible text in `scope`.
const meanLine = (page: Page, scope: string, within: string | null) => page.evaluate(([scope, within]) => {
  document.querySelectorAll("main details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
  const per: number[] = [];
  for (const p of document.querySelectorAll<HTMLElement>(scope)) {
    if (!p.checkVisibility() || p.querySelector("p, li") || (within && !p.closest(within))) continue;
    if (p.closest(".tbl, .rail, .doc__toc, .qa__help, .cards, .topics")) continue;
    const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), tops = new Map<number, number>();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) for (let i = 0; i < n.textContent!.length; i++) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getClientRects()[0]; if (b && b.width > 0) { const k = Math.round(b.top / 4); tops.set(k, (tops.get(k) || 0) + 1); }
    }
    per.push(...[...tops.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]).slice(0, -1));
  }
  return per.length ? per.reduce((a, b) => a + b, 0) / per.length : 0;
}, [scope, within] as const);
/** The longest line (characters) among the visible elements matching `scope` (RELEASE-CHECK R-01). */
const maxLine = (page: Page, scope: string) => page.evaluate((scope) => {
  let max = 0;
  for (const p of document.querySelectorAll<HTMLElement>(scope)) {
    if (!p.checkVisibility()) continue;
    const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), tops = new Map<number, number>();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) for (let i = 0; i < n.textContent!.length; i++) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getClientRects()[0]; if (b && b.width > 0) { const k = Math.round(b.top / 4); tops.set(k, (tops.get(k) || 0) + 1); }
    }
    for (const v of tops.values()) max = Math.max(max, v);
  }
  return max;
}, scope);

test("F-01: EN phone header is as short as TR; the tools stay on the logo's row", async ({ page }) => {
  for (const w of [320, 360, 375]) {
    await page.setViewportSize({ width: w, height: 800 });
    const h: number[] = [];
    for (const rel of ["kurallar/", "en/kurallar/"]) {
      await open(page, rel);
      const m = await page.evaluate(() => {
        const b = document.querySelector(".hdr__brand")!.getBoundingClientRect(), t = document.querySelector(".hdr__tools")!.getBoundingClientRect();
        return { hdr: document.querySelector(".hdr")!.getBoundingClientRect().height, row: Math.abs((b.top + b.bottom) / 2 - (t.top + t.bottom) / 2) };
      });
      expect(m.row, `${rel} ${w}px: tools beside the logo`).toBeLessThan(6);
      h.push(Math.round(m.hdr));
    }
    expect(h[1], `${w}px: EN header height = TR`).toBe(h[0]);
  }
});

test("F-02: mean line length ≤ ~100 characters on Gazete pages (text, callouts, lead) and Teslim at every width", async ({ page }) => {
  // 1000–1023 px: the full-width Gazete column meets the 22 px body cap (D-176); a few pages reach 101–103 there,
  // running text and lead alike (Linux renders the lead about 2 characters longer per line than macOS).
  for (const w of [768, 900, 961, 1000, 1023, 1024, 1180, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of ["surec/", "kurallar/", "rapor/", "sss/", "en/surec/", "en/rapor/", "en/sss/"]) {
      await open(page, rel);
      await page.evaluate(() => document.fonts.ready);
      const run = await meanLine(page, "main p, main li", ".with-rail > :not(.rail, script, style)");
      const box = await meanLine(page, "main .callout p, main .callout li", null);
      const lead = await meanLine(page, ".ph__lead", null);
      expect(run, `${rel} ${w}px running text`).toBeLessThanOrEqual(w >= 1000 && w <= 1023 ? 104 : 100);
      expect(box, `${rel} ${w}px callouts`).toBeLessThanOrEqual(100);
      expect(lead, `${rel} ${w}px lead`).toBeLessThanOrEqual(w >= 1000 && w <= 1023 ? 104 : 100);
    }
    // RELEASE-CHECK R-01 (D-181): the Home board's detail box, longest line.
    for (const rel of ["", "en/"]) {
      await open(page, rel);
      await page.evaluate(() => document.fonts.ready);
      expect(await maxLine(page, "main .board__notes dd"), `home ${rel} ${w}px board notes`).toBeLessThanOrEqual(100);
    }
    for (const rel of ["teslim/", "en/teslim/", "teslim/?preview=kimlik", "teslim/?preview=belgeler-dosyalar"]) {
      await open(page, rel);
      await page.waitForTimeout(300);
      expect(await meanLine(page, "main p, main li, main dd", ".teslim > :not(.teslim__side)"), `${rel} ${w}px`).toBeLessThanOrEqual(100);
    }
  }
});

test("F-03, F-04: receipt sentence names the page and says to save the receipt first; no duration claim on Teslim", async ({ page }) => {
  for (const [rel, s] of [["teslim/?preview=done", "önce bu makbuzu kaydediniz; ardından Belge Teslimi sayfasını yeniden açarak"],
    ["en/teslim/?preview=done", "first save this receipt; then reopen the Document Submission page"]] as const) {
    await open(page, rel);
    await expect(page.locator(".suf-next")).toContainText(s);
  }
  for (const rel of ["teslim/", "en/teslim/"]) {
    expect(text(rel)).not.toMatch(/beş dakika|five minutes/);
    expect(text(rel)).toContain(rel.startsWith("en") ? "Before you begin, prepare all your documents in PDF format." : "Başlamadan önce tüm belgelerinizi PDF biçiminde hazırlayınız.");
  }
});

test("F-05, F-13, F-14, F-18: Kurallar without the late-day pull quote; Rapor in days; Süreç says each thing once; 3 weeks wording", async () => {
  expect(html("kurallar/")).not.toMatch(/class="pull"[^>]*>Her geç gün/);
  expect(text("kurallar/").toLowerCase().split("her geç gün için toplam staj süresinden 1 iş günü düşülür").length - 1, "once, in the callout").toBe(1);
  expect(text("rapor/")).toContain("Gerekmediğinde bu bölümlerin eklenmemesi gün kesintisine yol açmaz.");
  expect(text("rapor/")).not.toContain("puan");
  expect(text("en/rapor/")).toContain("does not lead to a deduction of days.");
  const surec = text("surec/");
  expect(surec.split("ulaşmadan stajınızın sigortası kapanmaz").length - 1, "insurance sentence once").toBe(1);
  expect(surec.split("özel bir biçim aranmaz").length + surec.split("Özel bir biçim aranmaz").length - 2, "format sentence once").toBe(1);
  expect(surec).not.toContain("Staj ilanlarını ve duyurularını almak için önce kayıt olunuz");
  // D-182 (maintainer): the registration form is no longer used; the call to register is gone with it.
  expect(surec).not.toContain("staj veri tabanına kayıt olunuz");
  expect(html("surec/")).toContain('href="#1-hesap-islerine-teslim-edilecekler"');
  for (const rel of ["surec/", "sss/"]) {
    expect(text(rel)).not.toContain("3 hafta sonra");
    expect(text(rel)).toContain("başlamasından itibaren en geç 3 hafta (21 gün) içinde");
  }
  expect(text("en/sss/")).toContain("within 3 weeks (21 days) of the start of classes in the following semester");
});

test("F-06, F-07: Home hero text follows its label; the header tools sit next to the button at 1024–1180 px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, "");
  const m = await page.evaluate(() => ({ idx: document.querySelector(".hero__text .index")!.getBoundingClientRect().bottom, h1: document.querySelector(".hero__title")!.getBoundingClientRect().top, actions: document.querySelector(".hero__actions")!.getBoundingClientRect().bottom }));
  expect(m.h1 - m.idx, "title right under the label (was ~250 px)").toBeLessThanOrEqual(60);
  expect(m.actions, "links on the first screen at 1280 × 800").toBeLessThanOrEqual(800);
  for (const w of [1024, 1100, 1180]) {
    await page.setViewportSize({ width: w, height: 800 });
    await open(page, "kurallar/");
    const g = await page.evaluate(() => document.querySelector(".hdr__cta")!.getBoundingClientRect().left - document.querySelector(".hdr__tools")!.getBoundingClientRect().right);
    expect(g, `${w}px: tools → button`).toBeLessThanOrEqual(20);
  }
});

test("F-08: Teslim preparation notes share one size", async ({ page }) => {
  for (const w of [375, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, "teslim/");
    const sizes = await page.evaluate(() => [".suf-exceptions li", ".suf-deadline__rule", ".suf-multiple", ".suf-callout__ek1", ".teslim__help li"]
      .map((s) => getComputedStyle(document.querySelector(s)!).fontSize));
    expect(new Set(sizes).size, `${w}px: ${sizes}`).toBe(1);
  }
});

test("F-09, F-15: board status and late-close detail", async ({ page }) => {
  expect(text("")).toContain("Ertesi gün staj yapılabilir");
  expect(text("en/")).toContain("Internships possible from the next day");
  expect(text("")).toContain("belgelerinizi zip dosyası olarak, durumunuzu açıklayan bir e-posta ile staj asistanlarına iletebilirsiniz.");
  expect(text("en/")).toContain("you may send your documents as a zip file to the internship assistants");
  for (const w of [1024, 1100, 1280, 1440]) for (const rel of ["", "en/"]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, rel);
    const out = await page.evaluate(() => document.querySelector(".hero__board .board__table")!.getBoundingClientRect().right - document.querySelector(".hero__board .board")!.getBoundingClientRect().right);
    expect(out, `/${rel} ${w}px: table inside the board`).toBeLessThanOrEqual(0);
  }
});

test("F-10: EK-1 never breaks at its hyphen in running text", async ({ page }) => {
  expect(html("")).toContain('<span class="nw">EK-1</span>');
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "");
  const broken = await page.evaluate(() => [...document.querySelectorAll(".nw")].filter((e) => e.getClientRects().length > 1).length);
  expect(broken).toBe(0);
});

test("F-11, F-12: one name for Formlar ve Belgeler; the template-less documents box", async ({ page }) => {
  for (const [rel, name] of [["formlar/", "Formlar ve Belgeler"], ["en/formlar/", "Forms and Documents"]] as const) {
    await open(page, rel);
    await expect(page.locator("h1")).toHaveText(name);
    await expect(page).toHaveTitle(new RegExp(`^${name} ·`));
  }
  for (const rel of ["", "surec/", "kurallar/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "teslim/"]) {
    for (const l of ["", "en/"]) expect(text(l + rel), `/${l}${rel}`).not.toMatch(/Formlar & Belgeler|Forms & Documents|Formlar sayfası|Forms page/);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "");
  // D-180 (maintainer): the desktop menu uses the short label; the page and every other place keep the full name.
  await expect(page.locator('.hdr__nav a[href$="/formlar/"]')).toHaveText("Belgeler");
  await expect(page.locator(".sheet__nav")).toContainText("Formlar ve Belgeler");
  await open(page, "en/");
  await expect(page.locator('.hdr__nav a[href$="/formlar/"]')).toHaveText("Documents");
  expect(text("formlar/")).toContain("Şablonu Olmayan Belgeler");
  expect(text("en/formlar/")).toContain("Documents Without a Template");
});

test("F-16, F-17: Kurallar figure numbers are ≥ 24 × 24 px; the phone strip says what the date is, on one line", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page, "kurallar/");
  for (const b of await page.locator(".fig__no").evaluateAll((as) => as.map((a) => a.getBoundingClientRect()).map((r) => [r.width, r.height]))) {
    expect(b[0]).toBeGreaterThanOrEqual(24); expect(b[1]).toBeGreaterThanOrEqual(24);
  }
  for (const [w, rel, lbl] of [[375, "", "Son:"], [360, "", "Son:"], [375, "en/", "Due:"], [360, "en/", "Due:"]] as const) {
    await page.setViewportSize({ width: w, height: 812 });
    await open(page, rel);
    await expect(page.locator(".strip__lbl-s")).toBeVisible();
    await expect(page.locator(".strip__lbl-s")).toHaveText(lbl);
    expect((await page.locator(".strip__in").boundingBox())!.height, `/${rel} ${w}px one line`).toBeLessThanOrEqual(48);
  }
});
