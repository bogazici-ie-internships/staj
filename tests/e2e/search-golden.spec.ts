// REVIEW-02 Note 3: search quality. Every golden query's expected anchors must be in its top 3 results, using the
// built index (dist/search/<lang>.json) and the same engine the palette runs. Fails with every miss listed.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createIndex, search } from "../../src/lib/search/engine";

const golden = JSON.parse(readFileSync("tests/baseline/search-golden.json", "utf8")).queries as { lang: "tr" | "en"; q: string; top3: string[]; notTop3?: string[] }[];

test(`arama kalitesi: ${golden.length} altın sorgu, beklenenler ilk 3'te`, () => {
  expect(golden.length).toBeGreaterThanOrEqual(30);
  const idx = { tr: createIndex(JSON.parse(readFileSync("dist/search/tr.json", "utf8")).docs), en: createIndex(JSON.parse(readFileSync("dist/search/en.json", "utf8")).docs) };
  const misses: string[] = [];
  for (const g of golden) {
    const top = search(idx[g.lang], g.q, 3).map((h) => h.doc.u.replace(/^\/staj\//, ""));
    for (const want of g.top3) if (!top.includes(want)) misses.push(`${g.lang} «${g.q}»: ${want} not in [${top.join(", ")}]`);
    // REVIEW-05 B-13: some queries must not surface a different rule (exchange-term email route ≠ internship abroad).
    for (const no of g.notTop3 ?? []) if (top.includes(no)) misses.push(`${g.lang} «${g.q}»: ${no} must not be in [${top.join(", ")}]`);
  }
  expect(misses).toEqual([]);
});
