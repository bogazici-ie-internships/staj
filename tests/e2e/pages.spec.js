// Every page: opens, no script errors, no sideways scroll on a phone, and the
// colours we fixed keep WCAG AA contrast in both themes.
const { test, expect } = require("@playwright/test");
const { open, DEADLINE } = require("./helpers");

const PAGES = ["", "surec/", "kurallar/", "rapor/", "formlar/", "teslim/", "sss/", "sonuclar/", "iletisim/"];
const ALL = PAGES.concat(PAGES.map((p) => "en/" + p));

for (const rel of ALL) {
  test(`sayfa açılıyor, JS hatası yok, mobilde taşma yok: /${rel}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page, rel);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "yatay taşma (px)").toBeLessThanOrEqual(0);
    expect(errors, "yakalanmamış JS hataları").toEqual([]);
  });
}

test("olmayan sayfa iki dilli 404 gösterir", async ({ page }) => {
  await open(page, "boyle-bir-sayfa-yok/");
  await expect(page.locator("[lang=tr] h1")).toHaveText("Sayfa bulunamadı");
  await expect(page.locator("[lang=en]")).toContainText("Page not found");
  // Centred on the page, not on the narrow prose column.
  const off = await page.evaluate(() => {
    const r = document.querySelector(".staj-404__title").getBoundingClientRect();
    return Math.abs((r.left + r.right) / 2 - document.documentElement.clientWidth / 2);
  });
  expect(off, "404 başlığının sayfa ortasından sapması (px)").toBeLessThanOrEqual(2);
});

test("ana sayfa: son teslim saatiyle ve teslim sayfasına bağlı", async ({ page }) => {
  await open(page, "");
  const meta = page.locator(".staj-lede__meta");
  await expect(meta).toContainText(/\d{1,2} \S+ \d{4}, \d{2}:\d{2}/);
  await expect(meta.locator("a")).toHaveAttribute("href", /teslim\/$/);
  // The registration button was moved out of the opening on purpose.
  await expect(page.locator(".staj-lede .md-button")).toHaveCount(0);
});

// --- Contrast ---------------------------------------------------------------
function contrastOf(sel) {
  function rgb(c) {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function mix(t, b) { return { r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 }; }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length && e.textContent.trim());
  if (!el) return null;
  const layers = [];
  for (let e = el; e; e = e.parentElement) {
    const c = rgb(getComputedStyle(e).backgroundColor);
    if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
  }
  let bg = rgb(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  if (bg.a < 1) bg = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) bg = mix(layers[i], bg);
  let alpha = 1;
  for (let e = el; e; e = e.parentElement) alpha *= Number(getComputedStyle(e).opacity);
  const fg = rgb(getComputedStyle(el).color);
  const f = mix({ ...fg, a: fg.a * alpha }, bg);
  const a = lum(f), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const CHECKS = [
  ["", ".staj-lede__sub", "açılış alt başlığı"],
  ["", ".staj-lede__meta-link", "Belgeleri yükle bağlantısı"],
  ["", ".staj-yearbar__marklabel", "şeritteki teslim etiketi"],
  ["", ".staj-takvim__date", "takvim tarihleri"],
  ["", ".staj-kicker", "bölüm etiketi"],
  ["surec/", ".md-typeset p a", "içerik bağlantısı"],
  ["surec/", ".admonition.danger a, .admonition.warning a", "uyarı kutusundaki bağlantı"],
  ["teslim/", ".suf-field label", "form etiketi"],
  ["teslim/", "#suf-countdown", "geri sayım"],
  ["teslim/?preview=done", ".suf-done__id-label", "referans no etiketi"],
  ["boyle-bir-sayfa-yok/", ".md-button--primary", "birincil düğme"],
];

for (const scheme of ["light", "dark"]) {
  test(`kontrast ≥ 4.5:1 (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const low = [];
    for (const [rel, sel, label] of CHECKS) {
      await open(page, rel, { at: DEADLINE - 3 * 24 * 3600e3 });
      if (rel.startsWith("teslim/")) await page.waitForTimeout(300);
      const ratio = await page.evaluate(contrastOf, sel);
      if (ratio === null) { low.push(`${label}: öğe bulunamadı (${sel})`); continue; }
      if (ratio < 4.5) low.push(`${label}: ${ratio.toFixed(2)}:1 (${rel || "/"} ${sel})`);
    }
    expect(low, "AA altında kalanlar").toEqual([]);
  });
}
