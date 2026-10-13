// Port of tests/legacy/pages.spec.js: every page opens without script errors
// and without sideways scroll on a phone; 404 is bilingual; the home page links
// the deadline (with time) to Teslim; measured contrast stays ≥ 4.5:1.
import { expect, test } from "@playwright/test";
import { DEADLINE, open } from "./helpers";

const PAGES = ["", "surec/", "kurallar/", "rapor/", "formlar/", "teslim/", "sss/", "sonuclar/", "iletisim/"];
const ALL = PAGES.concat(PAGES.map((p) => "en/" + p));

for (const rel of ALL) {
  for (const width of [320, 375]) {
    test(`sayfa açılıyor, JS hatası yok, ${width}px'de taşma yok: /${rel}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 812 });
      await open(page, rel);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "yatay taşma (px)").toBeLessThanOrEqual(0);
      expect(errors, "yakalanmamış JS hataları").toEqual([]);
    });
  }
}

test("olmayan sayfa iki dilli 404 gösterir", async ({ page }) => {
  await open(page, "boyle-bir-sayfa-yok/");
  await expect(page.locator("[lang=tr] h1")).toHaveText("Sayfa Bulunamadı");
  await expect(page.locator("section[lang=en]")).toContainText("Page Not Found");
  const off = await page.evaluate(() => {
    const r = document.querySelector("[lang=tr] h1")!.getBoundingClientRect();
    return Math.abs((r.left + r.right) / 2 - document.documentElement.clientWidth / 2);
  });
  expect(off, "404 başlığının sayfa ortasından sapması (px)").toBeLessThanOrEqual(2);
});

test("ana sayfa: son teslim saatiyle ve teslim sayfasına bağlı", async ({ page }) => {
  await open(page, "");
  const strip = page.locator(".strip__date");
  await expect(strip).toContainText(/\d{2}\.\d{2}\.\d{4} · \d{2}:\d{2} TSİ/);
  await expect(strip).toHaveAttribute("href", /teslim\/$/);
  const board = page.locator(".hero__board .board__table");   // desktop instance (phones: .board-below, D-121)
  await expect(board).toContainText(/\d{2}\.\d{2} \d{2}:\d{2}/);
  await expect(page.locator(".hero__cta")).toHaveAttribute("href", /teslim\/$/);
  await expect(page.locator(".hero .btn--primary")).toHaveCount(1);
  // D-182 (maintainer): the registration form is no longer used — no link to it anywhere on Home.
  await expect(page.locator('a[href*="forms.gle"]')).toHaveCount(0);
});

test("ana sayfa: pano ve şerit canlı; açık/geç/kapalı durumları", async ({ page }) => {
  await open(page, "", { at: DEADLINE - 2 * 86400e3 - 3 * 3600e3 });
  await expect(page.locator(".strip__chip")).toHaveText("2 gün 3 sa kaldı");
  await expect(page.locator(".hero__board .board tr.is-live")).toContainText("Açık");
  await page.clock.setSystemTime(new Date(DEADLINE + 3600e3));
  await page.reload();
  await expect(page.locator("[data-deadline-strip]")).toHaveAttribute("data-phase", "late");
  await expect(page.locator(".hero__board .board tr.is-live")).toContainText("Geç teslim süresinin sonu");
});

test("EN: tarihler ay adıyla (12 Oct), sayısal gün.ay değil", async ({ page }) => {
  await open(page, "en/");
  await expect(page.locator(".strip__date")).toContainText(/\d{1,2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2} GMT\+3/);
  await expect(page.locator(".hero__board .board__table")).toContainText(/\d{1,2} Oct \d{2}:\d{2}/);
});

test("takvim şeridinde Bugün işareti doğru günde", async ({ page }) => {
  await open(page, "", { at: Date.parse("2026-07-02T12:00:00+03:00") });
  const x = await page.locator("[data-today]").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--x"));
  // 2 July 2026 is day 183 of 365 → centre of that day ≈ 50.0 %.
  expect(parseFloat(x)).toBeCloseTo(((182 + 0.5) / 365) * 100, 1);
});

// --- Contrast (same measurement as the legacy suite) --------------------------
function contrastOf(sel: string) {
  function rgb(c: string) {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  type C = { r: number; g: number; b: number; a: number };
  const mix = (t: C, b: C): C => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = (c: C) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length && e.textContent!.trim()) as HTMLElement | undefined;
  if (!el) return null;
  const layers: C[] = [];
  for (let e: HTMLElement | null = el; e; e = e.parentElement) {
    const c = rgb(getComputedStyle(e).backgroundColor);
    if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
  }
  let bg = rgb(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  if (bg.a < 1) bg = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) bg = mix(layers[i], bg);
  let alpha = 1;
  for (let e: HTMLElement | null = el; e; e = e.parentElement) alpha *= Number(getComputedStyle(e).opacity);
  const fg = rgb(getComputedStyle(el).color)!;
  const f = mix({ ...fg, a: fg.a * alpha }, bg);
  const a = lum(f), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const CHECKS: [string, string, string][] = [
  ["", ".hero__lede p", "açılış alt başlığı"],
  ["", ".strip__date", "şeritteki son teslim"],
  ["", ".strip__chip", "şeritteki geri sayım"],
  ["", ".cal__mark-chip", "şeritteki teslim etiketi"],
  ["", ".cal__date", "takvim tarihleri"],
  ["", ".index", "bölüm dizini"],
  ["", ".board__unit-label", "pano birimleri"],
  ["", ".cal__row--teslim .cal__date", "listede son teslim (signal-text)"],
  ["", ".band--phases .phase__items li", "lacivert bant metni"],
  ["", ".band--phases .phase__n", "lacivert bant evre etiketi"],
  ["", ".ftr__ek1", "footer EK-1 notu (eski iletişim bandının metni, Not 7)"],
  ["", ".ftr__row", "footer alt satırı"],
  ["", ".hero__board .board__notes dd", "pano ayrıntıları (Not 3)"],
  ["kurallar/", ".figs-band .fig__cap", "büyük sayı bandı açıklaması"],
  ["kurallar/", ".rule__body a", "içerik bağlantısı"],
  ["kurallar/", ".rule__no", "kural numarası"],
  ["kurallar/", ".sec__title .num", "bölüm numarası"],
  ["rapor/", ".ds__title .num", "Rapor başlık numarası"],
  ["sss/", ".qa__q .num", "SSS soru numarası"],
  ["kurallar/", ".callout__title", "geç teslim kutusu başlığı"],
  ["teslim/", ".suf-deadline__date", "son teslim tarihi"],
  ["teslim/", "#suf-countdown", "geri sayım"],
  ["teslim/", ".suf-limit", "belge sınırı"],
  ["boyle-bir-sayfa-yok/", ".nf__code", "404 kodu (dekoratif değil, okunur)"],
];

for (const scheme of ["light", "dark"] as const) {
  test(`kontrast ≥ 4.5:1 (${scheme})`, async ({ page }) => {
    // Final colours, not mid-entrance: measure with reduced motion.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    const low: string[] = [];
    for (const [rel, sel, label] of CHECKS) {
      await open(page, rel, { at: DEADLINE - 3 * 24 * 3600e3 });
      await page.waitForTimeout(150);
      const ratio = await page.evaluate(contrastOf, sel);
      if (ratio === null) { low.push(`${label}: öğe bulunamadı (${sel})`); continue; }
      if (ratio < 4.5) low.push(`${label}: ${ratio.toFixed(2)}:1 (${rel || "/"} ${sel})`);
    }
    expect(low, "AA altında kalanlar").toEqual([]);
  });
}

test("REVIEW-02 Not 1–2: Kurallar'da büyük ilk harf ve 'Bölüm uygulaması' etiketi yok; kurallar aynen duruyor", async ({ page }) => {
  for (const rel of ["kurallar/", "en/kurallar/"]) {
    await open(page, rel);
    await expect(page.locator(".src-tag, #dept-key")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Bölüm uygulaması|Department practice/);
    for (const id of ["k-1-2", "k-1-3", "k-2-7", "k-3-6"]) await expect(page.locator(`#${id} .rule__body`)).not.toBeEmpty();   // the rules stay
    const cap = await page.locator(".gz__lede").evaluate((el) => { const s = getComputedStyle(el, "::first-letter"); return { float: s.float, size: s.fontSize, base: getComputedStyle(el).fontSize }; });
    expect(cap.float).toBe("none");
    expect(cap.size).toBe(cap.base);
  }
  await open(page, "kurallar/");
  await expect(page.locator("#k-1-2 .rule__body")).toContainText("Çift Anadal");
});

test("REVIEW-01 Not 3: takvim ve pano ayrıntıları tıklamadan görünür; sitede açılır kutu (popover) kalmadı", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "");
  await expect(page.locator(".cal__list")).toContainText("21.09–11.12.2026");   // the term the segment used to show
  await expect(page.locator(".cal__seg").first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".board-below .board__notes")).toContainText("12 Ekim 2026, saat 10.00 (TSİ)");   // phones: below the hero (D-121)
  await expect(page.locator(".board-below .board__notes")).toBeVisible();
  for (const rel of ["", "en/", "kurallar/", "surec/", "teslim/", "sss/"]) {
    await open(page, rel);
    await expect(page.locator("[popover]:not([data-sw-dialog-top-layer-host]), [popovertarget]")).toHaveCount(0); // the phone menu library keeps its own top-layer host
  }
});

test("B10: telefonda eylem çubuğu hero kaybolunca çıkar, odağı örtmez; masaüstünde yok", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "");
  const dock = page.locator("#dock");
  await expect(dock).toBeHidden();
  expect(await dock.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  // Past the hero (its height depends on the board, which now shows its details directly, REVIEW-01 Note 3).
  const heroBottom = await page.locator(".hero").evaluate((el) => el.getBoundingClientRect().bottom + scrollY);
  await page.mouse.wheel(0, heroBottom + 100);
  await expect(dock).toBeVisible();
  await expect(dock.locator("a")).toHaveAttribute("href", /\/teslim\/$/);
  await expect(page.locator("#dock-left")).toHaveText(/kaldı|Geç teslim|Kapandı/);
  // A link that is right under the dock gets focus: the page scrolls it clear (WCAG 2.4.11).
  const under = await page.evaluate(async () => {
    const dock = document.getElementById("dock")!;
    const find = () => {
      const top = dock.getBoundingClientRect().top;
      return [...document.querySelectorAll<HTMLElement>("main a, main button")].find((x) => {
        const r = x.getBoundingClientRect(); return r.height > 0 && r.bottom > top + 4 && r.top < innerHeight && !x.closest("#dock");
      });
    };
    let el = find();
    for (let y = scrollY; !el && y < document.body.scrollHeight; y += 40) {
      scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dock.classList.contains("is-on")) el = find();
    }
    if (!el) return null;
    el.focus({ preventScroll: true });
    return { bottom: el.getBoundingClientRect().bottom, top: document.getElementById("dock")!.getBoundingClientRect().top };
  });
  expect(under, "a focusable element under the dock").not.toBeNull();
  expect(under!.bottom).toBeLessThanOrEqual(under!.top);
  // Tab through the page: no focused element may sit under the dock.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const hidden = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null; const d = document.getElementById("dock")!;
      if (!a || d.contains(a) || !d.classList.contains("is-on")) return false;
      return a.getBoundingClientRect().top >= d.getBoundingClientRect().top;
    });
    expect(hidden).toBe(false);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dock).toBeHidden();
});


test("UPDATE-04 §5: hero başlığı ≥1024 px'te iki satır (TR ve EN)", async ({ page }) => {
  for (const w of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of ["", "en/"]) {
      await open(page, rel);
      await page.evaluate(() => document.fonts.ready);
      const lines = await page.locator(".hero__title").evaluate((h) => {
        const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 0.86;
        return Math.round(h.getBoundingClientRect().height / lh);
      });
      expect(lines, `${rel || "tr"} at ${w}px`).toBe(2);
    }
  }
});

test("UPDATE-04 §1: footer'da isim yok; 'Site Hakkında' bağlantısı İletişim'deki bloğa gider (TR ve EN)", async ({ page }) => {
  for (const [rel, anchor, title, role] of [["", "site-hakkinda", "Site Hakkında", "staj asistanı"], ["en/", "about-this-site", "About This Site", "internship assistant"]] as const) {
    await open(page, rel);
    const footer = page.locator("footer.ftr");
    await expect(footer).not.toContainText("Berat Kubilay Güngez");
    await expect(footer).not.toContainText(/Hazırlayan|Prepared by/);
    const link = footer.locator(`a[href$="#${anchor}"]`);
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${rel}iletisim/#${anchor}$`));
    const block = page.locator(`#${anchor}`);
    await expect(block.locator("h2")).toHaveText(title);
    await expect(block).toContainText("Berat Kubilay Güngez");
    await expect(block).toContainText(role);
  }
});

// D-180 (replaces D-178): the menu says "Belgeler" / "Documents", and the institution line is back under the name on desktop;
// the menu stays on one row and a long service name may wrap beside the logo (at most two lines), without a taller header.
test("üst menü: masaüstünde tek satır, marka taşmaz (TR/EN, 1181–1600 px)", async ({ page }) => {
  for (const rel of ["", "en/", "kurallar/", "en/teslim/"]) for (const w of [1181, 1219, 1220, 1240, 1259, 1260, 1281, 1300, 1321, 1366, 1401, 1440, 1600]) {
    await page.setViewportSize({ width: w, height: 900 });
    await open(page, rel);
    const r = await page.evaluate(() => ({
      rows: new Set([...document.querySelector(".hdr__nav ul")!.children].map((l) => Math.round(l.getBoundingClientRect().top))).size,
      brand: document.querySelector(".hdr__service")!.getBoundingClientRect().height,
      row: document.querySelector(".hdr__in")!.getBoundingClientRect().height,
      over: document.querySelector(".hdr__in")!.scrollWidth > document.querySelector(".hdr__in")!.clientWidth + 1,
      inst: (() => { const e = document.querySelector(".hdr__inst")!; const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && e.getBoundingClientRect().width > 0; })(),
    }));
    // Shown wherever it fits on one line (D-180): TR from 1220 px, EN from 1260 px.
    expect(r.inst, `${rel} ${w}px: institution line`).toBe(w >= (rel.startsWith("en/") ? 1260 : 1220));
    expect(r.rows, `${rel} ${w}px: nav rows`).toBe(1);
    expect(r.brand, `${rel} ${w}px: brand name on at most two lines`).toBeLessThan(50);
    expect(r.row, `${rel} ${w}px: header height unchanged`).toBeLessThanOrEqual(76);
    expect(r.over, `${rel} ${w}px: nothing overflows the header`).toBe(false);
    if (!rel.startsWith("en/") || w >= 1320) expect(r.brand, `${rel} ${w}px: brand name on one line`).toBeLessThan(30);
  }
});

test("REVIEW-01 Not 7: footer kompakt (masaüstü ≤ 220 px, telefonda ekranın ≤ 1/3'ü); dev yazı yok; iletişim tek yerde", async ({ page }) => {
  for (const [rel, w, h, max] of [["", 1440, 900, 220], ["en/", 1920, 1080, 220], ["", 768, 1024, 260], ["", 390, 844, 844 / 3], ["en/teslim/", 360, 780, 780 / 3]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await open(page, rel);
    const f = page.locator("footer.ftr");
    const box = (await f.boundingBox())!;
    expect(box.height, `${rel || "/"} @${w}`).toBeLessThanOrEqual(max);
    await expect(f.locator("a[href^='mailto:']")).toHaveCount(1);
    await expect(f).toContainText(/EK-1/);
  }
  await open(page, "");
  await expect(page.locator(".ftr__mark, .sec--contact")).toHaveCount(0);   // giant wordmark and Home contact band gone
});

test("Ana sayfa telefonda: ilk ekranda geri sayım, son tarih ve Belgeleri gönder; pano satırları hemen altta (D-121); masaüstü aynı", async ({ page }) => {
  for (const [rel, w, h] of [["", 390, 844], ["en/", 360, 780]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await open(page, rel);
    // The guarantee covers the page below a settings.yml › duyuru band (D-185): a TA's notice may wrap on a phone.
    const band = (await page.locator(".duyuru").boundingBox())?.height ?? 0;
    for (const sel of [".hero__board .board__digits", ".hero__board .board__when", ".hero__cta"]) {
      const b = (await page.locator(sel).boundingBox())!;
      expect(b.y + b.height - band, `${sel} on the first screen below the band (${w}x${h})`).toBeLessThanOrEqual(h);
    }
    await expect(page.locator(".hero__board .board__when")).toContainText(rel ? "Deadline" : "Son teslim");
    await expect(page.locator(".hero__board .board__rows")).toBeHidden();
    await expect(page.locator(".board-below .board__table")).toBeVisible();
    await expect(page.locator(".board-below .board__notes")).toContainText(rel ? "12 October 2026" : "12 Ekim 2026");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "");
  await expect(page.locator(".hero__board .board__rows")).toBeVisible();
  await expect(page.locator(".board-below")).toBeHidden();
  await expect(page.locator(".hero__board .board__when")).toBeHidden();
});

test("REVIEW-02 Not 4: başlık yapısı ve tutarlılık", async ({ page }) => {
  const SMALL = new Set(["ve", "ile", "veya", "için", "of", "and", "or", "the", "for", "to", "in", "a", "an", "with", "by", "on", "·", "&"]);
  const tc = (s: string) => s.split(/\s+/).filter(Boolean).every((w, i) => (i > 0 && SMALL.has(w)) || /^[^\p{L}]*[\p{Lu}\d]/u.test(w));
  const panels: Record<string, number> = {};
  for (const rel of ["", "surec/", "kurallar/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "teslim/"]) for (const lang of ["", "en/"]) {
    await open(page, lang + rel);
    const r = await page.evaluate(() => {
      const hs = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")];
      return {
        first: hs[0]?.tagName, h1: document.querySelector("h1")!.textContent!.replace(/\s+/g, " ").trim(),
        dupH1: hs.filter((h) => h.tagName !== "H1" && h.textContent!.trim() === document.querySelector("h1")!.textContent!.trim()).length,
        titles: hs.filter((h) => h.tagName !== "H1" && !h.classList.contains("qa__h")).map((h) => h.textContent!.replace(/\s+/g, " ").trim().replace(/^\d+(\.\d+)*\.?\s*/, "")).filter(Boolean),
        panel: document.querySelectorAll(".ph__panel").length,
      };
    });
    expect(r.first, `${lang}${rel}: the first heading is the page h1 (the brand is not a heading)`).toBe("H1");
    expect(r.dupH1, `${lang}${rel}: no heading repeats the h1`).toBe(0);
    const bad = r.titles.filter((t) => !tc(t) || /[—–]/.test(t));
    expect(bad, `${lang}${rel}: section/box headings in Title Case, no em-dash`).toEqual([]);
    // Numbers are read apart from the text ("1. Uygun …", never "1Uygun …").
    await expect(page.getByRole("heading", { name: /^\d+(\.\d+)*[^\d\s.]/ })).toHaveCount(0);
    panels[lang + rel] = r.panel;
  }
  expect(Object.entries(panels).filter(([, n]) => n > 0).map(([k]) => k).sort()).toEqual(["en/surec/", "surec/"]);   // term summary: Süreç only (Home and Teslim have their own)
  await open(page, "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Zorunlu Staj Kılavuzu");
  await open(page, "surec/");
  await expect(page.locator("#sirasinda").locator("xpath=..").locator(".card__num")).toHaveText(["1", "2", "3", "4"]);
  await open(page, "rapor/");
  // The Turkish descriptors under the English template headings were removed by the maintainer (D-163, undoes D-131).
  await expect(page.locator(".ds__desc")).toHaveCount(0);
  for (const d of ["Yönetici özeti", "Çalışma çizelgesi", "Şirket veya kurum tanıtımı", "Ekler ve destekleyici materyal", "Kaynakça"]) await expect(page.locator("main")).not.toContainText(d);
  await expect(page.getByRole("heading", { name: "2. Executive Summary" })).toBeVisible();
  await open(page, "en/rapor/");
  await expect(page.locator(".ds__desc")).toHaveCount(0);
});
