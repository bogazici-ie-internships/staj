import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveSite, formKey, loadSettings } from "../../src/lib/settings";

const real = readFileSync("settings.yml", "utf8");
function variant(edit: (s: string) => string) {
  const dir = mkdtempSync(join(tmpdir(), "staj-"));
  const p = join(dir, "settings.yml");
  writeFileSync(p, edit(real));
  return p;
}

describe("settings.yml", () => {
  it("the real file loads and derives", () => {
    const s = loadSettings();
    const site = deriveSite(s);
    expect(site.lock?.time).toBe("10:00");
    expect(site.closesMs! - site.deadlineMs!).toBe(s.donem.gec_teslim_gun * 86_400_000);
  });
  it("an _en date naming another day fails the build", () => {
    const p = variant((t) => t.replaceAll('baslangic_en: "June 24, 2026"', 'baslangic_en: "June 25, 2026"'));
    expect(() => loadSettings(p)).toThrow(/aynı gün değil/);
  });
  it("a calendar deadline that drifts from teslim_kilit fails the build", () => {
    const p = variant((t) => t.replaceAll('tarih: "12 Ekim 2026"', 'tarih: "13 Ekim 2026"').replaceAll('tarih_en: "October 12, 2026"', 'tarih_en: "October 13, 2026"'));
    expect(() => deriveSite(loadSettings(p))).toThrow(/uyuşmuyor/);
  });
  it("teslim_kilit: \"\" (no lock) and an unannounced term still build", () => {
    const p = variant((t) => t
      .replace('teslim_kilit: "2026-10-12 10:00"', 'teslim_kilit: ""')
      // (global: the file's header comments quote the same example dates)
      .replace(/baslangic: "21 Eylül 2026",\s*bitis: "11 Aralık 2026",/g, 'tarih: "Güncellenecektir",')
      .replace(/baslangic_en: "September 21, 2026",\s*bitis_en: "December 11, 2026",/g, 'tarih_en: "To be announced",'));
    const site = deriveSite(loadSettings(p));
    expect(site.lock).toBeNull();
    expect(site.serit.tr.liste.at(-1)).toMatchObject({ ad: "Güz Dönemi", aralik: "Güncellenecektir" });
  });
  it("CI refuses a missing form key; a local build only proceeds", () => {
    const s = loadSettings();
    const ci = process.env.CI;
    try {
      process.env.CI = "true";
      expect(() => formKey({ ...s, baglantilar: { ...s.baglantilar, form_key: "" } })).toThrow(/form anahtari/);
      delete process.env.CI;
      expect(formKey({ ...s, baglantilar: { ...s.baglantilar, form_key: "" } })).toBe("");
    } finally { if (ci === undefined) delete process.env.CI; else process.env.CI = ci; }
  });
});
