// Every internal link with a fragment in the built site points at an id that exists on the target
// page (UPDATE-06 Phase 2a: page:surec#oncesi, page:sss#uygunluk-zamanlama, the Home phase links,
// Kurallar's links, the Formlar groups, SSS question anchors, the footer's "Site Hakkında").
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import { SITE } from "./helpers";

const files: string[] = [];
(function walk(d: string) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === "index.html") files.push(p); } })(SITE);
const ids = new Map<string, Set<string>>();
const pathOf = (file: string) => "/staj/" + relative(SITE, file).replace(/index\.html$/, "");
for (const f of files) ids.set(pathOf(f), new Set([...readFileSync(f, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));

test("her iç #çapa bağlantısı hedef sayfada var olan bir id'ye gider", () => {
  const broken: string[] = [];
  let checked = 0;
  for (const f of files) {
    const from = pathOf(f);
    for (const m of readFileSync(f, "utf8").matchAll(/\shref="([^"]*#[^"]+)"/g)) {
      const href = m[1].replace(/&amp;/g, "&");
      if (/^(https?:|mailto:)/.test(href) || href.includes("/belgeler/")) continue; // PDF #page= is a viewer parameter, not an id
      const [path, hash] = href.split("#");
      const target = path === "" ? from : path;
      const set = ids.get(target);
      if (!set) { broken.push(`${from} → ${href} (no page ${target})`); continue; }
      checked++;
      if (!set.has(decodeURIComponent(hash))) broken.push(`${from} → ${href}`);
    }
  }
  expect(checked).toBeGreaterThan(50);
  expect(broken).toEqual([]);
});

test("hiçbir sayfada aynı id iki kez kullanılmaz (çapalar benzersiz)", () => {
  const dupes: string[] = [];
  for (const f of files) {
    const all = [...readFileSync(f, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const seen = new Set<string>();
    for (const id of all) { if (seen.has(id)) dupes.push(`${pathOf(f)} #${id}`); seen.add(id); }
  }
  expect(dupes).toEqual([]);
});
