// UPDATE-06 Phase 2b: the optional settings.yml › duyuru band (schema + expiry).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeAnnouncement, loadSettings } from "../../src/lib/settings";

// The samples below replace whatever band settings.yml ships (TAs add one on GitHub, README › "a site-wide announcement").
const base = readFileSync("settings.yml", "utf8").replace(/^duyuru:\n(?:[ \t]+.*\n?)*/m, "");
const withBand = (bitis: string, extra = "", mesaj = "Sonuçlar güncellendi.") => {
  const dir = mkdtempSync(join(tmpdir(), "duyuru-"));
  const p = join(dir, "settings.yml");
  writeFileSync(p, base + `\nduyuru:\n  mesaj: "${mesaj}"\n  mesaj_en: "Results updated."\n  bitis: "${bitis}"\n${extra}`);
  return loadSettings(p);
};

describe("duyuru", () => {
  it("the shipped settings.yml loads, and a band there ends at its end time", () => {
    const s = loadSettings();
    if (!s.duyuru) return expect(activeAnnouncement(s)).toBeNull();
    const until = Date.parse(`${s.duyuru.bitis.replace(" ", "T")}:00+03:00`);
    expect(activeAnnouncement(s, until - 1)?.untilMs).toBe(until);
    expect(activeAnnouncement(s, until)).toBeNull();
  });
  it("shows until its end time (Türkiye time), then disappears", () => {
    const s = withBand("2026-10-20 23:59");
    const until = Date.parse("2026-10-20T23:59:00+03:00");
    expect(activeAnnouncement(s, until - 1)).toMatchObject({ tr: "Sonuçlar güncellendi.", en: "Results updated.", untilMs: until, dismissible: true });
    expect(activeAnnouncement(s, until)).toBeNull();
  });
  it("rejects a malformed end time", () => expect(() => withBand("20.10.2026")).toThrow(/duyuru\.bitis/));
  it("has a stable id from its texts and end time, so closing one notice never hides a new one (D-102)", () => {
    const t = Date.parse("2026-10-01T00:00:00+03:00");
    const a = activeAnnouncement(withBand("2026-10-20 23:59"), t)!, b = activeAnnouncement(withBand("2026-10-20 23:59"), t)!;
    expect(a.id).toMatch(/^[0-9a-f]{12}$/);
    expect(b.id).toBe(a.id);
    expect(activeAnnouncement(withBand("2026-10-21 23:59"), t)!.id).not.toBe(a.id);
    expect(activeAnnouncement(withBand("2026-10-20 23:59", "", "Başka bir duyuru."), t)!.id).not.toBe(a.id);
  });
  it("kapatilamaz: true makes it non-dismissible; unknown keys are rejected", () => {
    const t = Date.parse("2026-10-01T00:00:00+03:00");
    expect(activeAnnouncement(withBand("2026-10-20 23:59", "  kapatilamaz: true\n"), t)!.dismissible).toBe(false);
    expect(() => withBand("2026-10-20 23:59", "  kapatilmaz: true\n")).toThrow(/duyuru/);
  });
});
