// RELEASE-CHECK fixes (D-181): R-04 the header button never wraps, R-05 footer link targets ≥ 24 px without overlap,
// R-07 small files in KB (never "0,0 MB"), R-08 the late window names its own end instead of "the deadline".
// R-01 (Home board notes) is in final-check.spec.ts' line-length test.
import { expect, test } from "@playwright/test";
import { DAY, DEADLINE, GRACE_DAYS, HOUR, flow, open, pdf } from "./helpers";

test("R-04: header button on one line, header one row, nothing overflows (601–1180 px, TR/EN)", async ({ page }) => {
  for (const rel of ["", "en/", "sss/", "en/kurallar/"]) for (const w of [601, 700, 761, 768, 800, 819, 820, 1024, 1180]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, rel);
    const r = await page.evaluate(() => {
      const i = document.querySelector(".hdr__in")!, c = document.querySelector(".hdr__cta")!;
      return { cta: c.getBoundingClientRect().height, row: i.getBoundingClientRect().height, over: i.scrollWidth > i.clientWidth + 1 };
    });
    expect(r.cta, `${rel} ${w}px: button height`).toBeLessThanOrEqual(45);
    expect(r.row, `${rel} ${w}px: header height`).toBeLessThanOrEqual(76);
    expect(r.over, `${rel} ${w}px: overflow`).toBe(false);
  }
});

test("R-05: footer links are ≥ 24 px tall and their targets do not overlap (375 px, TR/EN)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const rel of ["", "en/", "kurallar/", "en/teslim/"]) {
    await open(page, rel);
    const boxes = await page.locator(".ftr__row a").evaluateAll((as) => as.map((a) => { const b = a.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, h: b.height }; }));
    expect(boxes.length).toBe(2);
    for (const b of boxes) expect(b.h, `${rel}: target height`).toBeGreaterThanOrEqual(24);
    const [a, b] = boxes;
    const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(overlap, `${rel}: targets overlap`).toBe(false);
  }
});

test("R-07: a small file shows its size in KB, not 0,0 MB (Belgeler and Kontrol)", async ({ page }) => {
  await open(page, "teslim/");
  await flow.ready(page);
  await flow.toReview(page, { files: { sicil: pdf("sicil.pdf", 50) } });
  await expect(page.locator(".suf-review")).toContainText("50 KB");
  await expect(page.locator("main")).not.toContainText("0,0 MB");
  await flow.back(page);
  await expect(page.locator('[data-slot="sicil"]')).toContainText("50 KB");
  await open(page, "en/teslim/");
  await flow.ready(page);
  await flow.toReview(page, { files: { sicil: pdf("sicil.pdf", 50) } });
  await expect(page.locator(".suf-review")).toContainText("50 KB");
  await expect(page.locator("main")).not.toContainText("0.0 MB");
});

test("R-08: only during the late window, the help and the connection error say 'before the late window closes'", async ({ page }) => {
  const item = () => page.locator("#help + ul li").last();
  // Open period: the regular wording is the visible one.
  await open(page, "teslim/", { at: DEADLINE - 2 * DAY });
  await expect(item().locator('[data-when="regular"]')).toBeVisible();
  await expect(item().locator('[data-when="regular"]')).toContainText("son teslim tarihinden önce");
  await expect(item().locator('[data-when="late"]')).toBeHidden();
  // Late window: the late wording with the closing time, TR and EN.
  for (const [rel, late, regular, closes] of [["teslim/", "geç teslim süresi sona ermeden önce", "son teslim tarihinden önce", "22 Ekim 2026"],
    ["en/teslim/", "before the late-submission window closes", "before the deadline", "22 October 2026"]] as const) {
    await open(page, rel, { at: DEADLINE + 6 * HOUR });
    await expect(item().locator('[data-when="late"]')).toBeVisible();
    await expect(item().locator('[data-when="late"]')).toContainText(late);
    await expect(item().locator('[data-when="late"]')).toContainText(GRACE_DAYS === 10 ? closes : "");
    await expect(item().locator('[data-when="regular"]')).toBeHidden();
    expect(await item().innerText()).not.toContain(regular);
  }
  // The connection error follows the phase too (the preview uses the same message).
  await open(page, "teslim/?preview=fail", { at: DEADLINE + 6 * HOUR });
  await expect(page.locator("#suf-msg")).toContainText("geç teslim süresi sona ermeden önce");
  await expect(page.locator("#suf-msg")).not.toContainText("son teslim tarihinden önce");
  await open(page, "en/teslim/?preview=fail", { at: DEADLINE + 6 * HOUR });
  await expect(page.locator("#suf-msg")).toContainText("before the late-submission window closes");
  await open(page, "teslim/?preview=fail", { at: DEADLINE - 2 * DAY });
  await expect(page.locator("#suf-msg")).toContainText("son teslim tarihinden önce");
});

// D-182 (maintainer): the registration form is gone from the whole site, and Home's board has no "results" row.
test("no registration-form link or text anywhere; no results row on the Home board", async ({ page }) => {
  for (const rel of ["", "surec/", "kurallar/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "teslim/"]) for (const l of ["", "en/"]) {
    await open(page, l + rel);
    await expect(page.locator('a[href*="forms.gle"]'), `/${l}${rel}`).toHaveCount(0);
    await expect(page.locator("main"), `/${l}${rel}`).not.toContainText(/Kayıt Formu|kayıt formu|Registration Form|registration form|veri tabanına kayıt/);
  }
  for (const l of ["", "en/"]) {
    await open(page, l);
    await expect(page.locator(".board__table").first()).not.toContainText(/sonuçları|results/);
    await expect(page.locator(".board__table").first()).not.toContainText(/Duyurulacaktır|To be announced/);
  }
});

test("the retired #kayit / #registration anchors land on the SSS section about finding an internship", async ({ page }) => {
  for (const [rel, id, sec] of [["sss/", "kayit", "uygunluk-zamanlama"], ["en/sss/", "registration", "uygunluk-zamanlama"]] as const) {
    await open(page, `${rel}#${id}`);
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    const inSection = await page.locator(`[id="${id}"]`).evaluate((el, sec) => el.closest("section")?.getAttribute("aria-labelledby") === sec, sec);
    expect(inSection).toBe(true);
    await expect(page.locator(`[id="${sec}"]`)).toBeInViewport();
  }
});

// D-184 (maintainer): the deadline and the late window are one note under the board; the calendar shows the late window.
test("Home: one board note for the deadline and the late window; the calendar shows the late window (TR/EN)", async ({ page }) => {
  for (const [rel, note, closes, row, legend] of [["", "Yaz Stajı Teslimi", "22 Ekim 2026, saat 10.00 (TSİ) tarihine kadar geç teslim kabul edilir", "Geç teslim süresi", "Geç teslim"],
    ["en/", "Summer Internship Deadline", "until 22 October 2026", "Late-submission window", "Late submission"]] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, rel);
    const notes = page.locator(".hero__board .board__notes");
    await expect(notes.locator("dt")).toHaveCount(2);                       // the deadline (with the late window) + end of classes
    await expect(notes.locator("dt").first()).toHaveText(note);
    await expect(notes.locator("dd").first()).toContainText(closes);
    await expect(notes.locator("dd").first()).toContainText(rel ? "zip file" : "zip dosyası");
    await expect(page.locator(".board__table").first()).toContainText(rel ? "End of late submission" : "Geç teslim süresinin sonu");   // the row stays
    await expect(page.locator(".cal__late")).toHaveCount(1);
    await expect(page.locator(".cal__late-chip")).toContainText(rel ? "22 Oct" : "22.10");
    await expect(page.locator(".cal__legend")).toContainText(legend);
    await expect(page.locator(".cal__row--late")).toContainText(row);
    await expect(page.locator(".cal__row--late .cal__date")).toContainText(/12.*22.*2026/);
  }
});
