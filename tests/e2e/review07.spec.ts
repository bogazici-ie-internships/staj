// REVIEW-07: the Gazete pages and Teslim use the header's container; text fills the column (D-170 onward).
// The edge checks (column at the logo's edge, rail at the header's right edge, text to the column edge) are in
// layout.spec.ts. This file checks the measure, the type size, the header band and Teslim. It replaces REVIEW-06's
// "Note 1" test (a 672 px centred column), which REVIEW-07 reverses.
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

const GAZETE = ["surec/", "kurallar/", "rapor/", "sss/"];
const container = (page: Page) => page.evaluate(() => {
  const w = document.querySelector("header .wrap")!, s = getComputedStyle(w), r = w.getBoundingClientRect();
  return { L: r.left + parseFloat(s.paddingLeft), R: r.right - parseFloat(s.paddingRight) };
});
// Characters per full line of the running text in the column (last line of each paragraph left out).
const perLine = (page: Page) => page.evaluate(() => {
  document.querySelectorAll("main details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
  const col = document.querySelector<HTMLElement>(".with-rail > :not(.rail, script, style)")!;
  const per: number[] = [];
  for (const p of col.querySelectorAll<HTMLElement>("p, li")) {
    if (p.closest(".tbl, .callout, .cards, .topics, .qa__help, .doc__toc, .figs") || !p.checkVisibility()) continue;
    const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), tops = new Map<number, number>();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) for (let i = 0; i < n.textContent!.length; i++) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
      const b = r.getClientRects()[0]; if (b) { const k = Math.round(b.top / 4); tops.set(k, (tops.get(k) || 0) + 1); }
    }
    const lines = [...tops.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    per.push(...lines.slice(0, -1));
  }
  per.sort((a, b) => a - b);
  return per[Math.floor(per.length / 2)];
});

test("Gazete column = container − rail − gap; about 90–100 characters per line at the widest container", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const rel of GAZETE.flatMap((r) => [r, `en/${r}`])) {
    await open(page, rel);
    await page.evaluate(() => document.fonts.ready);
    const c = await container(page);
    const col = await page.locator(".with-rail > :not(.rail, script, style)").first().boundingBox();
    expect(Math.round(col!.width), `${rel} column width`).toBe(Math.round(c.R - c.L - 320 - 64));
    const med = await perLine(page);
    expect(med, `${rel} median characters per line`).toBeGreaterThanOrEqual(85);
    expect(med, `${rel} median characters per line`).toBeLessThanOrEqual(102);
  }
});

test("Gazete body text: steps up with the width, never below the REVIEW-06 size; phones unchanged", async ({ page }) => {
  const old = (w: number) => Math.max(17, Math.min(19, 16 + 0.002 * w));   // clamp(17px, 1rem + 0.2vw, 19px)
  const seen: Record<number, number> = {};
  for (const w of [375, 600, 800, 1100, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of ["surec/", "kurallar/"]) {
      await open(page, rel);
      const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".doc__body, .gz__body")!).fontSize));
      expect(fs, `${rel} at ${w}px`).toBeGreaterThanOrEqual(old(w) - 0.01);
      seen[w] = fs;
    }
  }
  expect(seen[375]).toBe(17);
  expect(seen[1280]).toBeGreaterThan(20);
  expect(seen[1920]).toBe(21);
});

test("Header band: title at the logo's edge, the lead uses the column's width, Süreç's panel over the rail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const rel of GAZETE) {
    await open(page, rel);
    const c = await container(page);
    const m = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return { h1: box("h1").left, lead: box(".ph__lead").right, col: box(".with-rail > :not(.rail, script, style)").right, rail: box(".with-rail > .rail") };
    });
    expect(Math.abs(m.h1 - c.L), `${rel} title`).toBeLessThanOrEqual(2);
    expect(Math.abs(m.lead - m.col), `${rel} lead box = column width`).toBeLessThanOrEqual(2);
    if (rel === "surec/") {
      const p = await page.locator(".ph__panel").boundingBox();
      expect(Math.abs(p!.x - m.rail.left), "panel over the rail (left)").toBeLessThanOrEqual(2);
      expect(Math.abs(p!.x + p!.width - c.R), "panel at the header's right edge").toBeLessThanOrEqual(2);
    }
  }
});

test("Teslim: the form column fills the space up to the side panel (from 961 px, D-178); full container without the panel", async ({ page }) => {
  for (const w of [961, 1100, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, "teslim/");
    const c = await container(page);
    const m = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return { head: box(".teslim__head"), form: box(".suf"), side: box(".teslim__side"), lead: box(".teslim__lead") };
    });
    expect(Math.abs(m.form.left - c.L), `${w}: form at the logo's edge`).toBeLessThanOrEqual(2);
    expect(Math.abs(m.side.right - c.R), `${w}: side panel at the header's right edge`).toBeLessThanOrEqual(2);
    expect(m.side.left - m.form.right, `${w}: form → panel gap`).toBeLessThanOrEqual(96);
    expect(Math.abs(m.head.right - m.form.right), `${w}: header block = form column`).toBeLessThanOrEqual(2);
    expect(m.lead.right - m.lead.left, `${w}: lead not capped at 52ch`).toBeGreaterThan(Math.min(600, m.form.right - m.form.left - 2));
  }
  await page.setViewportSize({ width: 960, height: 900 });
  await open(page, "teslim/");
  const c = await container(page);
  const form = await page.locator(".suf").boundingBox();
  expect(Math.abs(form!.x - c.L)).toBeLessThanOrEqual(2);
  expect(Math.abs(form!.x + form!.width - c.R)).toBeLessThanOrEqual(2);
});

test("Self-review fixes: Home hero lead and links stay inside the phone screen; the board table stays inside the board", async ({ page }) => {
  for (const [w, rel] of [[375, ""], [375, "en/"], [320, "en/"]] as const) {
    await page.setViewportSize({ width: w, height: 844 });
    await open(page, rel);
    const right = await page.evaluate(() => Math.max(...[...document.querySelectorAll(".hero__lede, .hero__lede *")].map((e) => e.getBoundingClientRect().right)));
    expect(right, `/${rel} at ${w}px`).toBeLessThanOrEqual(w - 15);
  }
  for (const w of [1024, 1100]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, "en/");
    const m = await page.evaluate(() => ({ t: document.querySelector(".hero__board .board__table")!.getBoundingClientRect().right, b: document.querySelector(".hero__board .board")!.getBoundingClientRect().right }));
    expect(m.t, `en/ at ${w}px`).toBeLessThanOrEqual(m.b);
  }
});

test("D-176: one continuous body size, never above 22 px; the rail from 1024 px; lines average about 100 characters at most", async ({ page }) => {
  const d170 = (w: number) => Math.max(Math.max(17, Math.min(19, 16 + 0.002 * w)), Math.max(17, Math.min(21, 14.4 + 0.0046 * w)));
  await page.setViewportSize({ width: 1440, height: 700 });
  await open(page, "surec/");
  const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".doc__body")!).fontSize));
  let prev = 0;
  for (let w = 320; w <= 1920; w += 4) {
    await page.setViewportSize({ width: w, height: 700 });
    const fs = await size();
    expect(fs, `${w}px`).toBeLessThanOrEqual(22.001);
    expect(fs, `${w}px: never below the D-170 size`).toBeGreaterThanOrEqual(d170(w) - 0.01);
    if (prev) expect(Math.abs(fs - prev), `${w}px: no jump`).toBeLessThanOrEqual(0.2);
    prev = fs;
  }
  for (const [a, b] of [[960, 961], [1023, 1024], [1180, 1181]]) {   // the old and new breakpoints, 1 px apart
    await page.setViewportSize({ width: a, height: 700 }); const fa = await size();
    await page.setViewportSize({ width: b, height: 700 }); const fb = await size();
    expect(Math.abs(fa - fb), `${a} → ${b}px`).toBeLessThanOrEqual(0.05);
  }
  for (const [w, fs] of [[375, 17], [1440, 21], [1920, 21]] as const) { await page.setViewportSize({ width: w, height: 700 }); expect(await size(), `${w}px unchanged`).toBeCloseTo(fs, 2); }
  for (const [w, open_] of [[1023, false], [1024, true]] as const) {
    await page.setViewportSize({ width: w, height: 700 });
    expect(await page.locator(".rail__toggle").isVisible(), `${w}px: rail ${open_ ? "open" : "collapsed"}`).toBe(!open_);
  }
  // Running text: mean characters per full line. At 1000–1023 px the full-width column meets the 22 px cap, so a few
  // pages reach 101–104 there; everywhere else it stays ≤ 100.
  for (const w of [768, 961, 1000, 1023, 1024, 1180, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of GAZETE.flatMap((r) => [r, `en/${r}`])) {
      await open(page, rel);
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        document.querySelectorAll("main details").forEach((d) => { (d as HTMLDetailsElement).open = true; });
        const col = document.querySelector<HTMLElement>(".with-rail > :not(.rail, script, style)")!;
        const per: number[] = [];
        for (const p of col.querySelectorAll<HTMLElement>("p, li")) {
          if (!p.checkVisibility() || p.querySelector("p, li") || p.closest(".tbl, .callout, .cards, .topics, .qa__help, .doc__toc")) continue;
          const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), tops = new Map<number, number>();
          for (let n = tw.nextNode(); n; n = tw.nextNode()) for (let i = 0; i < n.textContent!.length; i++) {
            const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
            const b = r.getClientRects()[0]; if (b) { const k = Math.round(b.top / 4); tops.set(k, (tops.get(k) || 0) + 1); }
          }
          per.push(...[...tops.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]).slice(0, -1));
        }
        const body = parseFloat(getComputedStyle(document.querySelector(".doc__body, .gz__body")!).fontSize);
        const h3 = document.querySelector(".ds__title--3, .topic__title");
        return { mean: per.reduce((a, b) => a + b, 0) / per.length, body, h3: h3 ? parseFloat(getComputedStyle(h3).fontSize) : 0 };
      });
      expect(m.mean, `${rel} ${w}px mean characters per line`).toBeLessThanOrEqual(w >= 1000 && w <= 1023 ? 105 : 100);
      if (m.h3) expect(m.h3, `${rel} ${w}px h3 clearly above the text`).toBeGreaterThanOrEqual(m.body * 1.19);
    }
  }
});
