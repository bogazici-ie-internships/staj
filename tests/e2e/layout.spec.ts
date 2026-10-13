import { readFileSync } from "node:fs";
// Layout balance on desktop, two checks.
// 1. REVIEW-07 (D-170, replacing REVIEW-06's centred measure): the Gazete pages (Süreç, Kurallar, Rapor, SSS) at
//    1280 / 1440 / 1920 use the header's container. The main column takes what the rail leaves, and the text fills it:
//    (a) the median right edge of the paragraphs and list items (and of the framed callouts, tables, file lists, SSS
//        rows) is within 24 px of the main column's right edge;
//    (a′) ink: the longest line in the column ends within 24 px of that edge, and the median longest line of the
//        wrapping paragraphs within 72 px (ragged right: about one long word). SSS answers are opened first;
//    (b) the main column's left edge is the header container's left edge (the logo) ±2 px;
//    (c) the rail's right edge is the header container's right edge ±2 px;
//    (d) the rail sits beside the column: the gap between them is 32–96 px.
//    On a915f54 (REVIEW-06: a 672 px column centred with the rail) (b) and (c) fail by 80–100 px at every width.
//    The rail joins at 1024 px (D-176). At 1000 px (no rail) the column is the whole container: (b) as above, (c) the
//    column's right edge is the container's right edge ±2 px, and (a)/(a′) measure the text against it.
// 2. REVIEW-01 Note 1 (D-104): every other page is scrolled through
//    in half-viewport steps; the visible leaf content is measured against the header's container content box, and
//    one side may not be more than 20 % of the container emptier than the other.
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

const GAZETE = ["surec/", "kurallar/", "rapor/", "sss/"];
for (const w of [1000, 1024, 1100, 1280, 1440, 1920]) for (const rel of GAZETE) {
  const rail = w >= 1024;
  test(`denge ${w}px: /${rel} metin sütunu doldurur, kenarlar başlık çubuğuyla hizalı${rail ? ", sağ sütun hemen yanında" : ""} (REVIEW-07)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, rel);
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      document.querySelectorAll("main details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
      const wrap = document.querySelector("header .wrap")!;
      const ws = getComputedStyle(wrap), wr = wrap.getBoundingClientRect();
      const cL = wr.left + parseFloat(ws.paddingLeft), cR = wr.right - parseFloat(ws.paddingRight);
      const rail = document.querySelector<HTMLElement>(".with-rail > .rail")!;
      const col = document.querySelector<HTMLElement>(".with-rail > :not(.rail, script, style)")!;
      const c = col.getBoundingClientRect(), r = rail.getBoundingClientRect();
      const shown = (el: Element) => el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true } as any) && !el.closest("[aria-hidden=true], .visually-hidden");
      const skip = (el: Element) => !shown(el) || !!el.closest(".tbl, .qa__q, .qa__help, .doc__toc, .cards, .topics, .figs");   // controls and grids, not running text
      const edges: number[] = [], longest: number[] = [];
      for (const el of col.querySelectorAll<HTMLElement>("p, li")) {
        if (skip(el) || el.closest(".callout")) continue;
        edges.push(el.getBoundingClientRect().right);
        const rg = document.createRange(); rg.selectNodeContents(el);
        const lines = [...rg.getClientRects()].filter((b) => b.width > 1);
        if (new Set(lines.map((b) => Math.round(b.top))).size >= 2) longest.push(Math.max(...lines.map((b) => b.right)));
      }
      for (const el of col.querySelectorAll<HTMLElement>(".callout, .tbl, .qa, .files")) if (shown(el)) edges.push(el.getBoundingClientRect().right);
      const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      return { n: edges.length, median: Math.round(med(edges)), inkMax: Math.round(Math.max(...longest)), inkMed: Math.round(med(longest)),
        colL: Math.round(c.left), colR: Math.round(c.right), railR: Math.round(r.right), gap: Math.round(r.left - c.right), cL: Math.round(cL), cR: Math.round(cR) };
    });
    expect(m.n, "measured text blocks").toBeGreaterThan(3);
    expect(m.colR - m.median, `(a) median text-block edge ${m.median}px vs column edge ${m.colR}px`).toBeLessThanOrEqual(24);
    expect(m.colR - m.inkMax, `(a′) longest line ends at ${m.inkMax}px, column edge ${m.colR}px`).toBeLessThanOrEqual(24);
    expect(m.colR - m.inkMed, `(a′) median longest line ends at ${m.inkMed}px, column edge ${m.colR}px`).toBeLessThanOrEqual(72);
    expect(Math.abs(m.colL - m.cL), `(b) column left ${m.colL}px vs header container left ${m.cL}px`).toBeLessThanOrEqual(2);
    if (!rail) { expect(Math.abs(m.colR - m.cR), `(c) column right ${m.colR}px vs header container right ${m.cR}px (no rail)`).toBeLessThanOrEqual(2); return; }
    expect(Math.abs(m.railR - m.cR), `(c) rail right ${m.railR}px vs header container right ${m.cR}px`).toBeLessThanOrEqual(2);
    expect(m.gap, "(d) column → rail gap").toBeLessThanOrEqual(96);
    expect(m.gap, "(d) the rail sits beside the column").toBeGreaterThanOrEqual(32);
  });
}

const PAGES = ["", "surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "teslim/"];
const WIDTHS = [1024, 1100, 1280, 1440, 1920];   // 1024 and 1100: below the rail breakpoint

async function slices(page: Page) {
  return page.evaluate(async () => {
    const wrap = document.querySelector("header .wrap")!;
    const cs = getComputedStyle(wrap), r = wrap.getBoundingClientRect();
    const cL = r.left + parseFloat(cs.paddingLeft), cR = r.right - parseFloat(cs.paddingRight), cw = cR - cL;
    const main = document.querySelector("main")!;
    // Rendered visibility (not the [hidden] attribute: the rail's panel keeps hidden="until-found" while CSS shows it).
    const hidden = (el: Element | null) => !el || !!el.closest("[aria-hidden=true], .visually-hidden")
      || !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true } as any)
      || getComputedStyle(el).position === "fixed";
    // What a reader sees as content: the extent of text (not of the block holding it), replaced elements and
    // controls, and fully framed boxes (callouts, cards, tables). Rules and full-width wrappers do not count.
    const boxes = (): DOMRect[] => {
      const out: DOMRect[] = [];
      const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent!.trim() || hidden(n.parentElement)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const b of rg.getClientRects()) if (b.width > 1 && b.height > 1) out.push(b);
      }
      for (const el of main.querySelectorAll("img, svg, input, button, select, textarea, video, canvas, table, *")) {
        if (hidden(el)) continue;
        const tag = el.tagName.toLowerCase();
        const s = getComputedStyle(el);
        const framed = ["Top", "Right", "Bottom", "Left"].every((k) => parseFloat((s as any)[`border${k}Width`]) >= 1 && (s as any)[`border${k}Style`] !== "none");
        if (!(framed || /^(img|svg|input|button|select|textarea|video|canvas)$/.test(tag))) continue;
        if (el instanceof SVGElement && el.ownerSVGElement) continue;
        const b = el.getBoundingClientRect();
        if (b.width > 2 && b.height > 2) out.push(b);
      }
      return out;
    };
    const out: { y: number; gapL: number; gapR: number; cw: number }[] = [];
    const top = main.getBoundingClientRect().top + scrollY, bottom = top + main.offsetHeight;
    for (let y = Math.max(0, top - 120); y < bottom - innerHeight / 2; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      let L = Infinity, R = -Infinity;
      for (const b of boxes()) {
        if (b.bottom < 0 || b.top > innerHeight) continue;
        L = Math.min(L, Math.max(b.left, cL)); R = Math.max(R, Math.min(b.right, cR));
      }
      if (L < R) out.push({ y: Math.round(y), gapL: Math.round(L - cL), gapR: Math.round(cR - R), cw: Math.round(cw) });
    }
    return out;
  });
}

for (const w of WIDTHS) for (const rel of PAGES) {
  if (GAZETE.includes(rel)) continue;   // measured by the edge checks above at every width (REVIEW-07, D-170)
  test(`yerleşim ${w}px: /${rel} kabın genişliğini kullanır (bir yan %20'den fazla boş kalmaz)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, rel);
    await expect(page.locator("main")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const s = await slices(page);
    expect(s.length).toBeGreaterThan(0);
    const bad = s.filter((x) => Math.abs(x.gapR - x.gapL) > 0.2 * x.cw).map((x) => `y=${x.y}: left ${x.gapL}px, right ${x.gapR}px of ${x.cw}px`);
    expect(bad, "slices with one side emptier than 20% of the container").toEqual([]);
  });
}

test("sağ sütun: kaydırınca okunan bölüm işaretlenir; SSS'deki arama düğmesi paleti açar ve odak ona döner", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "surec/");
  const toc = page.locator(".rail__toc");
  await expect(toc.locator("a[aria-current]")).toHaveAttribute("href", "#oncesi");
  await page.evaluate(() => document.getElementById("sonrasi")!.scrollIntoView({ block: "start" }));
  await expect(toc.locator("a[aria-current]")).toHaveAttribute("href", "#sonrasi");
  await expect(page.locator(".rail")).toBeInViewport(); // sticky

  // Kurallar, Rapor and SSS keep only contents + help in the rail (REVIEW-02 Note 4); Kurallar adds its terms.
  for (const [rel, boxes] of [["sss/", 2], ["rapor/", 2], ["kurallar/", 3]] as const) {
    await open(page, rel);
    await expect(page.locator(".rail .rail__panel > .rail__box")).toHaveCount(boxes);
  }
});

// REVIEW-01 Note 5: no grid may end with a single orphan item (4 → 2 + 2 or 4, 3 → 3 or 1, never 3 + 1 / 2 + 1).
// Every visible element laid out as a multi-column grid is checked: its items are grouped into rows by their top
// edge; a last row with exactly one item, below a row with more, is an orphan. Only auto-placed grids are item grids.
const GRID_PAGES = ["", "en/", "surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "teslim/", "en/iletisim/"];
for (const w of [768, 1280, 1440, 1920]) test(`ızgaralar ${w}px: son satırda tek kalan öğe yok`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  const bad: string[] = [];
  for (const rel of GRID_PAGES) {
    await open(page, rel);
    await page.evaluate(() => document.fonts.ready);
    const found = await page.evaluate(() => {
      const out: string[] = [];
      for (const g of document.querySelectorAll<HTMLElement>("body *")) {
        const s = getComputedStyle(g);
        if (!/grid/.test(s.display) || g.offsetParent === null && s.position !== "fixed") continue;
        const cols = s.gridTemplateColumns.split(" ").filter(Boolean).length;
        if (cols < 2) continue;
        const items = [...g.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).position !== "absolute"; });
        if (items.length < 3) continue;
        // Card / item grids are auto-placed; layouts with explicitly placed or spanning items (a title spanning rows,
        // a sticky side panel) are page structure, not item rows.
        if (items.some((c) => { const cs = getComputedStyle(c); return [cs.gridColumnStart, cs.gridColumnEnd, cs.gridRowStart, cs.gridRowEnd].some((v) => v !== "auto"); })) continue;
        const rows = new Map<number, number>();
        for (const c of items) { const top = Math.round(c.getBoundingClientRect().top); rows.set(top, (rows.get(top) ?? 0) + 1); }
        const counts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
        if (counts.length > 1 && counts[counts.length - 1] === 1 && Math.max(...counts) > 1) out.push(`${g.tagName.toLowerCase()}.${[...g.classList].join(".")} rows=${counts.join("+")}`);
      }
      return out;
    });
    for (const f of found) bad.push(`/${rel} ${f}`);
  }
  expect(bad, "grids whose last row is a single orphan").toEqual([]);
});

test("arama: Kurallar'daki terimler dizinde, her biri kendi çapasıyla (D-120, REVIEW-02)", async ({ page }) => {
  const docs = JSON.parse(readFileSync("dist/search/tr.json", "utf8")).docs as { u: string }[];
  const terms = docs.filter((d) => /\/kurallar\/#terim-/.test(d.u));
  expect(terms.length).toBeGreaterThanOrEqual(2);
  await open(page, "kurallar/");
  for (const d of terms) await expect(page.locator(`#${d.u.split("#")[1]}`)).toHaveCount(1);
});
