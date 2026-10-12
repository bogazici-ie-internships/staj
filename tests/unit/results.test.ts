// RESULTS-01: the results PDF on Sonuçlar — term labels, which file is shown, "last updated" from the commit time.
import { execFileSync } from "node:child_process";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { campaignOrder, parseCampaign, pickResults, readResults, resultsHref, termLabel, updatedText, type ResultsFile } from "../../src/lib/results";
import { loadSettings } from "../../src/lib/settings";

const f = (campaign: string, iso = "2026-10-12T16:30:00+03:00", bytes = 70 * 1024): ResultsFile =>
  ({ campaign, file: `New_Internships_${campaign}.pdf`, bytes, updatedMs: Date.parse(iso) });

describe("results", () => {
  it("term labels match settings.yml › donem.etiket / etiket_en for the current campaign", () => {
    const { donem } = loadSettings();
    expect(termLabel(donem.campaign_id, "tr")).toBe(donem.etiket);
    expect(termLabel(donem.campaign_id, "en")).toBe(donem.etiket_en);
    expect(termLabel("2025-fall", "tr")).toBe("2025 Güz");
    expect(termLabel("2026-spring", "en")).toBe("Spring 2026");
    expect(parseCampaign("2026-winter")).toBeNull();
  });

  it("orders terms spring < summer < fall within a year", () => {
    expect(["2026-fall", "2025-fall", "2026-spring", "2026-summer"].sort((a, b) => campaignOrder(a) - campaignOrder(b)))
      .toEqual(["2025-fall", "2026-spring", "2026-summer", "2026-fall"]);
  });

  it("shows the current campaign's file, else the newest; earlier terms newest first", () => {
    const all = [f("2025-fall"), f("2026-summer"), f("2026-spring")];
    const a = pickResults(all, "2026-summer");
    expect(a.current?.campaign).toBe("2026-summer");
    expect(a.earlier.map((x) => x.campaign)).toEqual(["2026-spring", "2025-fall"]);
    const b = pickResults([f("2025-fall"), f("2026-spring")], "2026-summer");
    expect(b.current?.campaign).toBe("2026-spring");
    expect(b.earlier.map((x) => x.campaign)).toEqual(["2025-fall"]);
    expect(pickResults([], "2026-summer")).toEqual({ current: null, earlier: [] });
  });

  it("formats the last update in Türkiye time, TR and EN, and versions the link with it", () => {
    const x = f("2026-summer", "2026-10-12T13:30:00Z");
    expect(updatedText(x, "tr")).toBe("12 Ekim 2026, saat 16.30 (TSİ)");
    expect(updatedText(x, "en")).toBe("12 October 2026, 16:30 (GMT+3)");
    expect(resultsHref(x)).toBe("/staj/internships/New_Internships_2026-summer.pdf?v=1791811800");
    // Just after midnight UTC+3 is still the previous day in UTC: the date must follow Türkiye time.
    expect(updatedText(f("2026-summer", "2026-10-12T21:05:00Z"), "tr")).toBe("13 Ekim 2026, saat 00.05 (TSİ)");
  });

  it("reads the commit time from git, and falls back to the file time without history", () => {
    const dir = mkdtempSync(join(tmpdir(), "staj-results-"));
    const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_AUTHOR_DATE: "2026-10-12T16:30:00+03:00", GIT_COMMITTER_DATE: "2026-10-12T16:30:00+03:00" };
    const g = (...a: string[]) => execFileSync("git", ["-C", dir, "-c", "commit.gpgsign=false", ...a], { env, stdio: "ignore" });
    g("init", "-q");
    writeFileSync(join(dir, "New_Internships_2026-summer.pdf"), "%PDF-1.4\n%%EOF\n");
    writeFileSync(join(dir, "notes.txt"), "not a results file");
    g("add", "-A"); g("commit", "-q", "-m", "results");
    writeFileSync(join(dir, "New_Internships_2026-spring.pdf"), "%PDF-1.4\n%%EOF\n");     // never committed
    const mtime = new Date("2026-06-01T09:00:00Z");
    utimesSync(join(dir, "New_Internships_2026-spring.pdf"), mtime, mtime);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const got = readResults(dir).sort((a, b) => a.campaign.localeCompare(b.campaign));
    expect(got.map((x) => [x.campaign, new Date(x.updatedMs).toISOString()])).toEqual([
      ["2026-spring", "2026-06-01T09:00:00.000Z"],
      ["2026-summer", "2026-10-12T13:30:00.000Z"],
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    expect(readResults(join(dir, "missing"))).toEqual([]);
  });
});
