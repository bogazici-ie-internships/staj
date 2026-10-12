// URL / SEO parity with the MkDocs site, read from the recorded inventory
// (tests/baseline/url-inventory.json): every old URL resolves, keeps its
// <title>, meta description, canonical, hreflang pair, OG image, and every
// content anchor that people link to. Documents under /belgeler/ keep their URLs.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import YAML from "yaml";
import { SITE, open } from "./helpers";

const INV = JSON.parse(readFileSync("tests/baseline/url-inventory.json", "utf8"));
const LIVE = "https://bogazici-ie-internships.github.io/staj/";
// Ids that were form plumbing, not link targets (submit.js internals) or MkDocs h1 slugs on reworked pages.
const NOT_ANCHORS = /^(suf|staj)-|^sufForm$|^(teslim|submission|zorunlu-staj-klavuzu|compulsory-internship-guide)$/;

// UPDATE-03 rewrote these meta descriptions to the official voice (design/reviews/copy-review.md).
// They must equal chrome.yaml; every other page still matches the MkDocs site word for word.
const CHROME = YAML.parse(readFileSync("src/content/pages/chrome.yaml", "utf8"));
const DESCRIPTION_CHANGED = new Set(["", "surec/", "kurallar/", "formlar/", "iletisim/", "teslim/"].flatMap((r) => [r, "en/" + r]))
  .difference(new Set(["" /* TR home kept */, "formlar/" /* back to the MkDocs words by UPDATE-05 (EK-1) */]));
const shipped = (rel: string) => {
  const key = rel.replace(/^en\//, "").replace(/\/$/, "") || "home";
  return CHROME.pages.find((p: any) => p.key === key).description[rel.startsWith("en/") ? "en" : "tr"];
};

// RESULTS-01: the Sonuçlar description named the old external results link, which is gone; it was changed in
// tests/baseline/url-inventory.json too (on purpose), so Sonuçlar is compared like an unchanged page.

// UPDATE-04 §6: these <title>s now follow the new page headings (URLs unchanged); all others match MkDocs.
const TITLE_CHANGED: Record<string, string> = {
  "en/": "Compulsory Internship Guide · Boğaziçi University Industrial Engineering",
  "teslim/": "Belge Teslimi · Zorunlu Staj Kılavuzu",
  "en/teslim/": "Document Submission · Compulsory Internship Guide",
};
test("UPDATE-04 §6: changed titles really differ from the MkDocs ones", () => {
  for (const [rel, title] of Object.entries(TITLE_CHANGED)) expect(title).not.toBe(INV.pages[rel].title);
});

for (const [rel, old] of Object.entries<any>(INV.pages)) {
  test(`/${rel}: başlık, açıklama, canonical, hreflang, OG`, async ({ page }) => {
    await open(page, rel);
    await expect(page).toHaveTitle(TITLE_CHANGED[rel] ?? old.title);
    const description = await page.getAttribute('meta[name="description"]', "content");
    if (DESCRIPTION_CHANGED.has(rel)) {
      expect(description).toBe(shipped(rel));
      expect(description, "listed as changed, so it must differ from the MkDocs text").not.toBe(old.meta.description);
      expect(description!.length).toBeLessThanOrEqual(200);
    } else expect(description).toBe(old.meta.description);
    expect(await page.getAttribute('link[rel="canonical"]', "href")).toBe(old.canonical);
    expect(await page.getAttribute("html", "lang")).toBe(old.lang);
    const trRel = rel.replace(/^en\//, "");
    expect(await page.getAttribute('link[rel="alternate"][hreflang="tr"]', "href")).toBe(LIVE + trRel);
    expect(await page.getAttribute('link[rel="alternate"][hreflang="en"]', "href")).toBe(LIVE + "en/" + trRel);
    // TR keeps the old OG image URL; EN deliberately gets its own card next to it (UPDATE-02 B14, D-53).
    const og = rel.startsWith("en/") ? old.meta["og:image"].replace(/og-image\.png$/, "og-image-en.png") : old.meta["og:image"];
    expect(og).toMatch(/\/assets\/og-image(-en)?\.png$/);
    expect(await page.getAttribute('meta[property="og:image"]', "content")).toBe(og);
    expect(await page.getAttribute('meta[name="twitter:image"]', "content")).toBe(og);
    expect(await page.getAttribute('meta[property="og:locale"]', "content")).toBe(old.meta["og:locale"]);
  });

  const anchors = (old.ids as string[]).filter((id) => !NOT_ANCHORS.test(id));
  if (anchors.length) {
    test(`/${rel}: eski bağlantı çapaları duruyor (${anchors.join(", ")})`, async ({ page }) => {
      await open(page, rel);
      for (const id of anchors) await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
    });
  }
}

test("sitemap.xml aynı adreste ve 18 sayfanın hepsini listeler", async () => {
  const xml = readFileSync(join(SITE, "sitemap.xml"), "utf8");
  for (const url of INV.sitemap) expect(xml).toContain(`<loc>${url}</loc>`);
});

test("belgeler ve görseller aynı URL'de", async () => {
  for (const f of [...INV.documents, ...INV.public_assets]) expect(existsSync(join(SITE, f)), f).toBe(true);
});
