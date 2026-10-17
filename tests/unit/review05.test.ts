// REVIEW-05 B-11: the connection-error message no longer contradicts the help box (refreshing is safe: D-103 keeps
// the details and files on this device for 24 hours).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { ui } from "../../src/i18n/ui";

describe("REVIEW-05", () => {
  it("B-11: errNetwork says a refresh keeps the draft, like the Teslim help box", () => {
    expect(ui.tr.flow.errNetwork).not.toMatch(/yenilemeyiniz/);
    expect(ui.en.flow.errNetwork).not.toMatch(/do not refresh/i);
    expect(ui.tr.flow.errNetwork).toContain("Sayfa yenilense bile bilgileriniz ve dosyalarınız bu cihazda 24 saat saklanır");
    expect(ui.en.flow.errNetwork).toContain("Even if the page is refreshed, your details and files are kept on this device for 24 hours");
    const help = YAML.parse(readFileSync("src/content/pages/teslim.yaml", "utf8")).help.items as { tr: string; en: string }[];
    expect(help.some((h) => h.tr.includes("Sayfa yenilense bile bilgileriniz ve dosyalarınız bu cihazda 24 saat saklanır"))).toBe(true);
  });

  it("B-06: rule sections carry no Handbook page reference any more (the per-section 'Kaynak' line is gone)", () => {
    for (const f of ["1-genel", "2-staj", "3-rapor-teslim", "4-konu-rehberi"]) {
      const s = YAML.parse(readFileSync(`src/content/rules/${f}.yaml`, "utf8"));
      expect(s.source, f).toBeUndefined();
    }
    const page = YAML.parse(readFileSync("src/content/pages/kurallar.yaml", "utf8"));
    expect(page.source).toBeUndefined();
    expect(page.sources).toBeUndefined();
  });

  it("B-13: the exchange (Erasmus) and abroad synonyms are separate groups", () => {
    const groups = YAML.parse(readFileSync("src/content/search-keywords.yaml", "utf8")).groups as string[][];
    for (const g of groups) expect(g.includes("Erasmus") && g.includes("yurt dışı"), g.join(", ")).toBe(false);
  });
});
