// Before/after screenshots for the UPDATE-02 polish pass (design/polish/<set>/<phase>/).
//   SHOTS_SET=b01-board SHOTS_PHASE=before npm run shots
// Clock frozen at 2026-10-09 16:00 TSİ like the visual suite; JPEG, viewport or full page.
import { mkdirSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import { flow, open } from "../e2e/helpers";

const AT = Date.parse("2026-10-09T16:00:00+03:00");
const OLD_SAMPLE = /20[0-2]\d40\d{4}|ay[sş]e|y[iı]lmaz/i;
type Shot = { name: string; rel: string; w: number; scheme?: "light" | "dark"; full?: boolean; motion?: "reduce" | "no-preference";
  act?: (p: Page) => Promise<void>; wait?: number };
const home = (extra: Partial<Shot> = {}): Shot[] => [
  { name: "home-1440-light", rel: "", w: 1440, ...extra }, { name: "home-1440-dark", rel: "", w: 1440, scheme: "dark", ...extra },
  { name: "home-390-light", rel: "", w: 390, ...extra }, { name: "home-390-dark", rel: "", w: 390, scheme: "dark", ...extra },
];
const kurallar = (extra: Partial<Shot> = {}): Shot[] => [
  { name: "kurallar-1440-light", rel: "kurallar/", w: 1440, ...extra }, { name: "kurallar-390-dark", rel: "kurallar/", w: 390, scheme: "dark", ...extra },
];
const teslim = (extra: Partial<Shot> = {}): Shot[] => [
  { name: "teslim-hazirlik-390-light", rel: "teslim/", w: 390, ...extra }, { name: "teslim-hazirlik-1440-dark", rel: "teslim/", w: 1440, scheme: "dark", ...extra },
];
const SETS: Record<string, Shot[]> = {
  "a2-department": [{ name: "kurallar-1440-light", rel: "kurallar/", w: 1440, full: true }, { name: "kurallar-390-light", rel: "kurallar/", w: 390, full: true }],
  "a3-hazirlik": [...teslim({ full: true }), { name: "teslim-hazirlik-en-390", rel: "en/teslim/", w: 390, full: true }],
  "b01-board": [...home(), { name: "home-390-midflip", rel: "", w: 390, motion: "no-preference", wait: 260 }],
  "b02-contours": [...home(), { name: "footer-1440", rel: "", w: 1440, full: true }],
  "b03-bands": [...home({ full: true }), ...kurallar({ full: true })],
  "b04-grain": [{ name: "home-1440-light-zoom", rel: "", w: 1440 }, { name: "kurallar-1440-light", rel: "kurallar/", w: 1440 }, { name: "home-1440-dark", rel: "", w: 1440, scheme: "dark" }],
  "b05-icons": [...home({ full: true }).slice(0, 3), { name: "teslim-belgeler-390", rel: "teslim/?preview=belgeler", w: 390, full: true }, { name: "teslim-kontrol-1440", rel: "teslim/?preview=kontrol", w: 1440, full: true }],
  "b06-tactile": [
    { name: "btn-hover-1440", rel: "", w: 1440, act: async (p) => { await p.hover(".hero__cta"); } },
    { name: "cal-popover-390", rel: "", w: 390, act: async (p) => { await p.locator(".cal").scrollIntoViewIfNeeded(); await p.locator(".cal__seg--block").last().click(); } },
    { name: "board-row-detail-1440", rel: "", w: 1440, act: async (p) => { await p.waitForFunction(() => !document.querySelector("astro-island[ssr]")); await p.locator(".board__more").first().focus(); await p.keyboard.press("Enter"); } },
    { name: "board-row-detail-390", rel: "", w: 390, act: async (p) => { await p.waitForFunction(() => !document.querySelector("astro-island[ssr]")); await p.locator(".board__more").first().tap().catch(async () => p.locator(".board__more").first().click()); } },
  ],
  "b07-entrance": [{ name: "home-1440-t120", rel: "", w: 1440, motion: "no-preference", wait: 120 }, { name: "home-1440-settled", rel: "", w: 1440, motion: "no-preference", wait: 1200 }, { name: "kurallar-1440-t120", rel: "kurallar/", w: 1440, motion: "no-preference", wait: 120 }],
  "b08-footer": [{ name: "footer-1440-light", rel: "", w: 1440, full: true }, { name: "footer-390-dark", rel: "", w: 390, scheme: "dark", full: true }],
  "b09-stamp": [{ name: "receipt-390-light", rel: "teslim/?preview=done", w: 390, full: true }, { name: "receipt-1440-dark", rel: "teslim/?preview=done", w: 1440, scheme: "dark", full: true }],
  "b10-dock": [{ name: "home-390-scrolled", rel: "", w: 390, act: async (p) => { await p.mouse.wheel(0, 1400); await p.waitForTimeout(400); } }, { name: "home-390-top", rel: "", w: 390 }, { name: "home-390-bottom", rel: "", w: 390, act: async (p) => { await p.mouse.wheel(0, 1400); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400); } }],
  "b11-kurallar": [...kurallar({ full: true }), { name: "kurallar-390-light", rel: "kurallar/", w: 390, full: true }],
  "b12-dark": [{ name: "home-1440-dark", rel: "", w: 1440, scheme: "dark" }, { name: "home-390-dark", rel: "", w: 390, scheme: "dark" }, { name: "kurallar-1440-dark", rel: "kurallar/", w: 1440, scheme: "dark" }],
  "b14-og": [],
  "p2a": ["surec", "rapor", "sss", "formlar", "sonuclar", "iletisim"].flatMap((pg) => [
    { name: `${pg}-1440-tr`, rel: `${pg}/`, w: 1440, full: true }, { name: `${pg}-390-en-dark`, rel: `en/${pg}/`, w: 390, scheme: "dark" as const, full: true }]),
  "p2b": (() => {
    const hydrate = async (p: Page) => { for (const t of await p.locator("section.tool").all()) { await t.scrollIntoViewIfNeeded(); await t.locator("astro-island[ssr]").waitFor({ state: "detached" }).catch(() => undefined); } };
    const fill = async (p: Page) => {
      await hydrate(p);
      const calc = p.locator("section.tool").first();
      await calc.getByRole("spinbutton").nth(0).click(); await p.keyboard.type("13072026", { delay: 10 });
      await calc.getByRole("spinbutton").nth(3).click(); await p.keyboard.type("14082026", { delay: 10 });
      const ek1 = p.locator("section.tool").nth(1);
      await ek1.getByRole("spinbutton").first().click(); await p.keyboard.type("13072026", { delay: 10 });
      const wz = p.locator("section.tool").last();
      const groups = await wz.getByRole("radiogroup").all();
      for (const g of groups) await g.locator("label.rg__opt").nth(1).click();
      await groups[1].locator("label.rg__opt").first().click();
      await p.evaluate(() => window.scrollTo(0, 0));
    };
    return [
      { name: "araclar-1440-tr-filled", rel: "araclar/", w: 1440, full: true, act: fill },
      { name: "araclar-390-en-dark-filled", rel: "en/araclar/", w: 390, scheme: "dark" as const, full: true, act: fill },
      { name: "araclar-390-tr-empty", rel: "araclar/", w: 390, full: true, act: hydrate },
      { name: "calculator-popover-390", rel: "araclar/", w: 390, act: async (p) => { await hydrate(p); const c = p.locator("section.tool").first(); await c.scrollIntoViewIfNeeded(); await c.locator(".dt__btn").click(); } },
      { name: "wizard-fail-1440", rel: "araclar/", w: 1440, act: async (p) => { await hydrate(p); const wz = p.locator("section.tool").last(); for (const g of await wz.getByRole("radiogroup").all()) await g.locator("label.rg__opt").nth(1).click(); await wz.locator("[data-verdict]").scrollIntoViewIfNeeded(); } },
      { name: "home-390-ics", rel: "", w: 390 },
      { name: "kurallar-1-1-tool-1440", rel: "kurallar/#k-1-1", w: 1440 },
      { name: "surec-ek1-link-1440", rel: "surec/", w: 1440, act: async (p) => { await p.getByText("EK-1 Gönderim Zamanlayıcı").first().scrollIntoViewIfNeeded(); } },
      { name: "teslim-recovery-390", rel: "teslim/", w: 390, full: true, act: async (p) => { await flow.ready(p); await flow.start(p); await flow.identity(p); await p.waitForTimeout(700); await p.reload(); await flow.ready(p); await p.locator("[data-recovery]").waitFor(); } },
      { name: "teslim-kimlik-notice-1440", rel: "teslim/?preview=kimlik", w: 1440, full: true },
    ] as Shot[];
  })(),
  // REVIEW-01 Note 1 (layout uses the width): every page at 1000 / 1280 / 1440 / 1920, plus tablet and phone
  // frames for the pages whose rail collapses. Above the fold at most widths; 1440 full page.
  // REVIEW-02 (D-123 onward): one set per note.
  "m1": [{ name: "kurallar-1440", rel: "kurallar/", w: 1440, act: async (p: Page) => { await p.locator(".gz__lede").scrollIntoViewIfNeeded(); } }, { name: "kurallar-390", rel: "kurallar/", w: 390, act: async (p: Page) => { await p.locator(".gz__lede").scrollIntoViewIfNeeded(); } }],
  "m2": [{ name: "kurallar-k-1-2-1440", rel: "kurallar/#k-1-2", w: 1440 }, { name: "kurallar-k-1-2-390", rel: "kurallar/#k-1-2", w: 390 }],
  "m3": [
    ...([["empty", ""], ["sigorta", "sigorta"], ["gec-teslim", "geç teslim"], ["typo", "cumartsi"], ["none", "zzqx"]] as const).flatMap(([n, q]) => [1440, 390].map((w) => ({
      name: `search-${n}-${w}`, rel: "surec/", w, wait: 1500,
      act: async (p: Page) => { await p.keyboard.press("Control+k"); await p.getByRole("dialog").waitFor(); if (q) await p.keyboard.type(q, { delay: 20 }); await p.waitForTimeout(1500); },
    }))),
  ],
  "m4": [
    { name: "home-1440", rel: "", w: 1440 }, { name: "surec-sirasinda-1440", rel: "surec/#sirasinda", w: 1440 },
    { name: "teslim-1440", rel: "teslim/", w: 1440, full: true }, { name: "iletisim-1440", rel: "iletisim/", w: 1440 },
    { name: "rapor-sablon-1440", rel: "rapor/#rapor-sablonu", w: 1440 },
    ...["kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "surec/"].map((rel) => ({ name: `${rel.replace("/", "")}-band-1440`, rel, w: 1440 })),
  ],
  // REVIEW-03 (D-132 onward): example and test data (Note 1), receipt head (Note 2).
  "r3n1": [
    { name: "kimlik-1440-tr", rel: "teslim/?preview=kimlik", w: 1440 }, { name: "kimlik-360-en", rel: "en/teslim/?preview=kimlik", w: 360, full: true },
    { name: "kontrol-1440-tr", rel: "teslim/?preview=kontrol", w: 1440, full: true }, { name: "makbuz-360-tr", rel: "teslim/?preview=done", w: 360, full: true },
  ],
  "r3n2": [
    ...(["tr", "en"] as const).flatMap((l) => [360, 1440].flatMap((w) => (["light", "dark"] as const).flatMap((scheme) => [
      { name: `makbuz-${l}-${w}-${scheme}`, rel: `${l === "en" ? "en/" : ""}teslim/?preview=done`, w, scheme, full: true },
      { name: `makbuz-late-${l}-${w}-${scheme}`, rel: `${l === "en" ? "en/" : ""}teslim/?preview=done&late=1`, w, scheme, full: true },
    ]))),
    { name: "makbuz-print-tr", rel: "teslim/?preview=done", w: 1440, full: true, act: async (p: Page) => { await p.emulateMedia({ media: "print" }); } },
    { name: "makbuz-late-print-tr", rel: "teslim/?preview=done&late=1", w: 1440, full: true, act: async (p: Page) => { await p.emulateMedia({ media: "print" }); } },
  ] as Shot[],
  // REVIEW-04 (D-137 onward): server messages in the site's words (Note 1), the printed receipt (Note 2).
  "r4n1": [
    { name: "red-1440-tr", rel: "teslim/?preview=red", w: 1440, act: async (p: Page) => { await p.locator("#suf-msg").scrollIntoViewIfNeeded(); } },
    { name: "red-1440-en", rel: "en/teslim/?preview=red", w: 1440, act: async (p: Page) => { await p.locator("#suf-msg").scrollIntoViewIfNeeded(); } },
    { name: "red-360-tr", rel: "teslim/?preview=red", w: 360, act: async (p: Page) => { await p.locator("#suf-msg").scrollIntoViewIfNeeded(); } },
  ],
  "r4n2": (["tr", "en"] as const).flatMap((l) => [0, 1].map((late) => ({ name: `print-${late ? "late" : "ontime"}-${l}`, rel: `${l === "en" ? "en/" : ""}teslim/?preview=done${late ? "&late=1" : ""}`, w: 1440, full: true,
    act: async (p: Page) => { await p.emulateMedia({ media: "print" }); } }))) as Shot[],
  // REVIEW-01 answers (D-118 onward): narrow desktop without the rail, Home on phones.
  "a1": [
    ...[1000, 1024, 1100, 1180].flatMap((w) => [
      { name: `surec-${w}`, rel: "surec/", w }, { name: `kurallar-${w}`, rel: "kurallar/", w }, { name: `sss-en-${w}`, rel: "en/sss/", w },
      { name: `teslim-${w}`, rel: "teslim/", w },
    ]),
    { name: "rapor-1100-full", rel: "rapor/", w: 1100, full: true },
    { name: "home-390-first-screen", rel: "", w: 390 }, { name: "home-390-full", rel: "", w: 390, full: true },
    { name: "home-360-first-screen", rel: "en/", w: 360 }, { name: "home-1440", rel: "", w: 1440 },
  ],
  // REVIEW-01 Notes 2–7: one before/after set per note (SHOTS_PHASE=before on the Note 1 commit, after at the end).
  "n2": [
    { name: "header-1440-tr", rel: "", w: 1440 }, { name: "header-1440-en", rel: "en/", w: 1440 }, { name: "header-1181-en", rel: "en/kurallar/", w: 1181 },
    { name: "home-hero-1440", rel: "", w: 1440 }, { name: "kurallar-1-1-1440", rel: "kurallar/#k-1-1", w: 1440 },
    { name: "surec-1-1440", rel: "surec/#1-dogru-staj-secin-sure-tur-donem", w: 1440 }, { name: "surec-rail-1440", rel: "surec/", w: 1440 },
    { name: "araclar-1440", rel: "araclar/", w: 1440 },
  ],
  "n3": [
    { name: "teslim-hazirlik-1440", rel: "teslim/", w: 1440, full: true }, { name: "teslim-hazirlik-390", rel: "teslim/", w: 390, full: true },
    { name: "home-board-1440", rel: "", w: 1440, act: async (p) => { await p.locator(".board").first().scrollIntoViewIfNeeded(); } },
    { name: "home-calendar-1440", rel: "", w: 1440, act: async (p) => { await p.locator(".cal").first().scrollIntoViewIfNeeded(); } },
    { name: "home-390", rel: "", w: 390, full: true },
    { name: "kurallar-department-1440", rel: "kurallar/#k-1-2", w: 1440 },
  ],
  "n4": [
    { name: "kurallar-1440", rel: "kurallar/", w: 1440, full: true }, { name: "kurallar-390", rel: "kurallar/", w: 390, full: true },
    { name: "rapor-1440", rel: "rapor/", w: 1440, full: true }, { name: "sss-1440", rel: "sss/", w: 1440, full: true },
    { name: "surec-1440", rel: "surec/", w: 1440, full: true },
  ],
  "n5": [1280, 1440, 1920, 768].flatMap((w) => [
    { name: `surec-cards-${w}`, rel: "surec/#sirasinda", w },
    { name: `home-phases-${w}`, rel: "", w, act: async (p: Page) => { await p.locator(".phases").first().scrollIntoViewIfNeeded(); } },
    { name: `kurallar-figs-${w}`, rel: "kurallar/", w, act: async (p: Page) => { await p.locator(".figs").first().scrollIntoViewIfNeeded(); } },
    { name: `kurallar-topics-${w}`, rel: "kurallar/#konu-rehberi", w },
    { name: `iletisim-${w}`, rel: "iletisim/", w },
  ]),
  "n6": ["", "surec/", "kurallar/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "teslim/"].flatMap((rel) => {
    const n = rel.replace("/", "") || "home";
    return [{ name: `${n}-1440-dark`, rel: "en/" + rel, w: 1440, scheme: "dark" as const, full: true }, { name: `${n}-390`, rel, w: 390, full: true }];
  }),
  "n7": [
    ...[1440, 1920, 768, 390].map((w) => ({ name: `footer-${w}`, rel: "", w, act: async (p: Page) => { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); } })),
    { name: "footer-390-surec-dock", rel: "surec/", w: 390, act: async (p: Page) => { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); } },
    { name: "footer-1440-dark", rel: "en/", w: 1440, scheme: "dark" as const, act: async (p: Page) => { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); } },
  ],
  "r01": [
    ...["", "surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "araclar/", "teslim/"].flatMap((rel) => {
      const n = (rel.replace("/", "") || "home");
      return [
        { name: `${n}-1000`, rel, w: 1000 }, { name: `${n}-1280`, rel, w: 1280 },
        { name: `${n}-1440-full`, rel, w: 1440, full: true }, { name: `${n}-1920`, rel, w: 1920 },
      ];
    }),
    { name: "surec-en-1440", rel: "en/surec/", w: 1440 }, { name: "kurallar-en-1920-dark", rel: "en/kurallar/", w: 1920, scheme: "dark" as const },
    { name: "surec-768", rel: "surec/", w: 768, full: true }, { name: "surec-390", rel: "surec/", w: 390, full: true },
    { name: "kurallar-390", rel: "kurallar/", w: 390 }, { name: "sss-1024", rel: "sss/", w: 1024 },
    { name: "teslim-kimlik-1440", rel: "teslim/?preview=kimlik", w: 1440 },
  ] as Shot[],
  "u04": [{ name: "home-1440-en", rel: "en/", w: 1440 }, { name: "home-1024-en", rel: "en/", w: 1024 }, { name: "home-390-en", rel: "en/", w: 390 },
    { name: "iletisim-1440-tr", rel: "iletisim/", w: 1440, full: true }, { name: "iletisim-390-en-dark", rel: "en/iletisim/", w: 390, scheme: "dark", full: true }],
  "u03-copy": [{ name: "home-1440-tr", rel: "", w: 1440 }, { name: "home-1440-en", rel: "en/", w: 1440 }, { name: "home-390-en", rel: "en/", w: 390, full: true },
    { name: "teslim-390-tr", rel: "teslim/", w: 390, full: true }, { name: "teslim-1440-en-kimlik", rel: "en/teslim/?preview=kimlik", w: 1440, full: true },
    { name: "kurallar-1440-en", rel: "en/kurallar/", w: 1440 }, { name: "receipt-390-tr", rel: "teslim/?preview=done", w: 390, full: true }],
  // REVIEW-06 (layout review, D-164 onward): every page at 1280 / 1440 (full) / 1920 / 375 (full), TR light; Kurallar and
  // SSS also dark. Then one set per note, framed on what the note is about.
  "r6": [
    ...["", "surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "teslim/"].flatMap((rel) => {
      const n = rel.replace("/", "") || "home";
      return [{ name: `${n}-1280`, rel, w: 1280 }, { name: `${n}-1440-full`, rel, w: 1440, full: true }, { name: `${n}-1920`, rel, w: 1920 }, { name: `${n}-375-full`, rel, w: 375, full: true }];
    }),
    ...["kurallar/", "sss/"].flatMap((rel) => [1280, 1440, 1920, 375].map((w) => ({ name: `${rel.replace("/", "")}-${w}-dark`, rel, w, scheme: "dark" as const, full: w === 1440 || w === 375 }))),
  ] as Shot[],
  "r6n1": ["surec/", "kurallar/", "rapor/", "sss/"].flatMap((rel) => [1280, 1440, 1920].map((w) => ({ name: `${rel.replace("/", "")}-body-${w}`, rel, w,
    act: async (p: Page) => { await p.locator("main h2").nth(1).scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, 160)); } }))) as Shot[],
  "r6n2": ["surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/"].flatMap((rel) => [1280, 1440, 1920, 375].map((w) => ({ name: `${rel.replace("/", "")}-band-${w}`, rel, w }))) as Shot[],
  "r6n3": [
    ...[1280, 1440, 1920, 375].map((w) => ({ name: `home-phases-${w}`, rel: "", w, act: async (p: Page) => { await p.locator(".phases").first().scrollIntoViewIfNeeded(); } })),
    { name: "home-hero-1440x900", rel: "", w: 1440 },
    { name: "surec-rail-1440", rel: "surec/", w: 1440, act: async (p: Page) => { await p.evaluate(() => scrollTo(0, 420)); } },
    ...[1440, 1000, 375].map((w) => ({ name: `kurallar-genel-${w}`, rel: "kurallar/#genel-bilgiler", w })),
    ...[1280, 1440, 1920, 375].flatMap((w) => [
      { name: `sonuclar-${w}`, rel: "sonuclar/", w, full: w === 375 }, { name: `iletisim-${w}`, rel: "iletisim/", w, full: w === 375 },
      { name: `teslim-hazirlik-${w}`, rel: "teslim/", w, full: true },
    ]),
    ...["", "surec/", "kurallar/", "rapor/", "sss/", "formlar/", "sonuclar/", "iletisim/", "teslim/"].map((rel) => ({ name: `phone-top-${rel.replace("/", "") || "home"}-375`, rel, w: 375 })),
  ] as Shot[],
  "r6n4": [
    ...(["tr", "en"] as const).flatMap((l) => [1440, 375].map((w) => ({ name: `makbuz-${l}-${w}`, rel: `${l === "en" ? "en/" : ""}teslim/?preview=done`, w, full: true }))),
    { name: "teslim-laterule-1440", rel: "teslim/", w: 1440, act: async (p: Page) => { await p.locator(".suf-deadline").scrollIntoViewIfNeeded(); } },
    { name: "sss-gec-teslim-1440", rel: "sss/#gec-teslim", w: 1440 }, { name: "sss-ust-sinir-1440", rel: "sss/#ust-sinir", w: 1440 },
    { name: "home-process-1440", rel: "", w: 1440, act: async (p: Page) => { await p.locator(".phases").first().scrollIntoViewIfNeeded(); } },
  ] as Shot[],
  // REVIEW-07 (D-170 onward): Gazete pages and Teslim at 1280 / 1440 / 1920, TR and EN, light and dark; and the full
  // review set (every page, TR/EN, 1280 / 1440 / 1920 / 375, light/dark) used for the self-review.
  "r7": (["surec/", "kurallar/", "rapor/", "sss/", "teslim/"].flatMap((rel) => [1280, 1440, 1920].flatMap((w) => (["", "en/"] as const).flatMap((l) =>
    (["light", "dark"] as const).map((scheme) => ({ name: `${rel.replace("/", "")}-${l ? "en" : "tr"}-${w}-${scheme}`, rel: l + rel, w, scheme,
      act: async (p: Page) => { await p.locator("main h2").nth(1).scrollIntoViewIfNeeded().catch(() => undefined); await p.evaluate(() => scrollBy(0, 120)); } }))))) as Shot[]).concat([
    // Receipt step across the container (D-171); self-review fixes on Home (D-172); one frame per Gazete page without the rail.
    { name: "teslim-makbuz-tr-1440-light", rel: "teslim/?preview=done", w: 1440 },
    { name: "teslim-makbuz-en-1920-dark", rel: "en/teslim/?preview=done", w: 1920, scheme: "dark" },
    { name: "home-en-1100-board", rel: "en/", w: 1100 },
    { name: "home-tr-375-links", rel: "", w: 375, act: async (p: Page) => { await p.locator(".hero__actions").scrollIntoViewIfNeeded(); } },
    { name: "home-en-375-links", rel: "en/", w: 375, act: async (p: Page) => { await p.locator(".hero__actions").scrollIntoViewIfNeeded(); } },
    ...["surec/", "kurallar/", "rapor/", "sss/", "teslim/"].map((rel) => ({ name: `${rel.replace("/", "")}-tr-1100-light`, rel, w: 1100 })),
  ] as Shot[]),
  // D-175: 961–1180 px, the full-width Gazete column with the text size that grows with it (TR/EN, light; SSS and Kurallar dark).
  "r7-range": [...["surec/", "kurallar/", "rapor/", "sss/"].flatMap((rel) => [961, 1100, 1180].flatMap((w) => (["", "en/"] as const).map((l) =>
    ({ name: `${rel.replace("/", "")}-${l ? "en" : "tr"}-${w}`, rel: l + rel, w, act: async (p: Page) => { await p.evaluate(() => document.querySelectorAll("main :is(.ds__title--2, .sec__title)")[1]?.scrollIntoView()); } })))),
    { name: "sss-tr-1100-dark", rel: "sss/", w: 1100, scheme: "dark" }, { name: "kurallar-en-1100-dark", rel: "en/kurallar/", w: 1100, scheme: "dark" },
    ...["surec/", "kurallar/", "rapor/", "sss/"].map((rel) => ({ name: `${rel.replace("/", "")}-tr-1100-full`, rel, w: 1100, full: true }))] as Shot[],
  // D-176: the rail from 1024 px; one continuous body size ≤ 22 px (Gazete pages at 1000 / 1023 / 1024 / 1100 / 1180 / 1280).
  "r7-rail": [...["surec/", "kurallar/", "rapor/", "sss/"].flatMap((rel) => [1000, 1023, 1024, 1100, 1180, 1280].flatMap((w) => (["", "en/"] as const).map((l) =>
    ({ name: `${rel.replace("/", "")}-${l ? "en" : "tr"}-${w}`, rel: l + rel, w, act: async (p: Page) => { await p.evaluate(() => document.querySelectorAll("main :is(.ds__title--2, .sec__title)")[1]?.scrollIntoView()); } })))),
    { name: "surec-tr-1024-dark", rel: "surec/", w: 1024, scheme: "dark" }, { name: "sss-en-1024-dark", rel: "en/sss/", w: 1024, scheme: "dark" },
    ...["surec/", "kurallar/", "rapor/", "sss/"].map((rel) => ({ name: `${rel.replace("/", "")}-tr-1024-full`, rel, w: 1024, full: true }))] as Shot[],
  // FINAL-CHECK F-01 … F-18 (D-177 – D-179): one or more frames per finding.
  "fc": (() => {
    const at = (sel: string) => async (p: Page) => { await p.evaluate((s) => { document.querySelectorAll("main details").forEach((d) => { (d as HTMLDetailsElement).open = true; }); document.querySelector(s)?.scrollIntoView({ block: "start" }); scrollBy(0, -80); }, sel); };
    return [
      { name: "f01-header-tr-375", rel: "kurallar/", w: 375 }, { name: "f01-header-en-375", rel: "en/kurallar/", w: 375 }, { name: "f01-home-en-360", rel: "en/", w: 360 },
      { name: "f02-surec-tr-1023-callouts", rel: "surec/", w: 1023, act: at(".callout") }, { name: "f02-surec-tr-1440-callouts", rel: "surec/", w: 1440, act: at(".callout") },
      { name: "f02-rapor-en-1440-glance", rel: "en/rapor/", w: 1440 }, { name: "f02-teslim-tr-1100", rel: "teslim/", w: 1100 }, { name: "f02-teslim-tr-1440", rel: "teslim/", w: 1440 },
      { name: "f02-teslim-kimlik-tr-1000", rel: "teslim/?preview=kimlik", w: 1000 }, { name: "f02-home-tr-900-phases", rel: "", w: 900, act: at(".phases") },
      { name: "f03-makbuz-tr-1440", rel: "teslim/?preview=done", w: 1440, full: true }, { name: "f03-makbuz-en-375", rel: "en/teslim/?preview=done", w: 375, full: true },
      { name: "f05-kurallar-tr-1440-sec3", rel: "kurallar/", w: 1440, act: at("#rapor-ve-teslim-kurallar") },
      { name: "f06-home-tr-1280x800", rel: "", w: 1280 }, { name: "f06-home-en-1440", rel: "en/", w: 1440 },
      { name: "f07-header-tr-1100", rel: "kurallar/", w: 1100 }, { name: "f07-header-en-1024", rel: "en/kurallar/", w: 1024 },
      { name: "f08-teslim-tr-375-prep", rel: "teslim/", w: 375, full: true }, { name: "f08-teslim-en-1440-prep", rel: "en/teslim/", w: 1440, full: true },
      { name: "f09-home-en-1280-board", rel: "en/", w: 1280 }, { name: "f10-home-tr-1280-phases", rel: "", w: 1280, act: at(".phases") },
      { name: "f11-formlar-tr-1440", rel: "formlar/", w: 1440, full: true }, { name: "f11-header-en-1181", rel: "en/surec/", w: 1181 }, { name: "f11-header-en-1440", rel: "en/surec/", w: 1440 },
      { name: "f11-header-tr-1280", rel: "surec/", w: 1280 },
      { name: "f13-rapor-tr-1440-optional", rel: "rapor/", w: 1440, act: at("#duruma-gore-eklenen-bolumler, .ds--2:last-of-type") },
      { name: "f14-surec-tr-1440-intro", rel: "surec/", w: 1440 }, { name: "f14-surec-tr-1440-during", rel: "surec/", w: 1440, act: at(".cards") },
      { name: "f16-kurallar-tr-375-figs", rel: "kurallar/", w: 375, act: at(".figs") }, { name: "f17-strip-en-360", rel: "en/surec/", w: 360 },
      { name: "f18-sss-tr-1440-teslim", rel: "sss/", w: 1440, act: at("#teslim-zamani") },
      { name: "f18-surec-en-1440-teslim", rel: "en/surec/", w: 1440, act: at("[id^='2-documents']") },
    ] as Shot[];
  })(),
  "r7-all": ["", "surec/", "kurallar/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "teslim/"].flatMap((rel) => [1280, 1440, 1920, 375].flatMap((w) =>
    (["", "en/"] as const).flatMap((l) => (["light", "dark"] as const).map((scheme) => ({ name: `${(rel.replace("/", "") || "home")}-${l ? "en" : "tr"}-${w}-${scheme}`, rel: l + rel, w, scheme, full: true }))))) as Shot[],
};
const set = process.env.SHOTS_SET || "";
const phase = process.env.SHOTS_PHASE || "after";
for (const s of SETS[set] ?? []) {
  test(`${set} ${phase} ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.w > 800 ? 900 : 844 });
    await page.emulateMedia({ colorScheme: s.scheme ?? "light", reducedMotion: s.motion ?? "reduce" });
    await open(page, s.rel, { at: AT });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(s.wait ?? 700);
    if (s.act) { await s.act(page); await page.waitForTimeout(300); }
    const dir = `design/polish/${set}/${phase}`;
    mkdirSync(dir, { recursive: true });
    // REVIEW-03 Note 1: old real-looking sample data (numbers, names, addresses) is masked in any frame that still shows it.
    await page.evaluate((src) => { const re = new RegExp(src, "i"); document.querySelectorAll("input").forEach((el) => { if (re.test(el.value)) el.setAttribute("data-old-sample", ""); }); }, OLD_SAMPLE.source);
    const old = page.locator(":not(:has(*))").filter({ hasText: OLD_SAMPLE }).or(page.locator("[data-old-sample]"));
    await page.screenshot({ path: `${dir}/${s.name}.jpg`, type: "jpeg", quality: 55, fullPage: !!s.full, animations: s.wait && s.wait < 1000 ? "allow" : "disabled", mask: [old], maskColor: "#888" });
  });
}
