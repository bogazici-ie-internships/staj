// RESULTS-01: the All Internships results PDF on Sonuçlar — "last updated" from the commit time, the versioned link.
import { execFileSync } from "node:child_process";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { readResults, resultsHref, updatedText, type ResultsFile } from "../../src/lib/results";

const f = (iso: string): ResultsFile => ({ file: "All_Internships.pdf", bytes: 200 * 1024, updatedMs: Date.parse(iso) });
const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_AUTHOR_DATE: "2026-10-12T16:30:00+03:00", GIT_COMMITTER_DATE: "2026-10-12T16:30:00+03:00" };

describe("results", () => {
  it("formats the last update in Türkiye time, TR and EN, and versions the link with it", () => {
    const x = f("2026-10-12T13:30:00Z");
    expect(updatedText(x, "tr")).toBe("12 Ekim 2026, saat 16.30 (TSİ)");
    expect(updatedText(x, "en")).toBe("12 October 2026, 16:30 (GMT+3)");
    expect(resultsHref(x)).toBe("/staj/internships/All_Internships.pdf?v=1791811800");
    // Just after midnight UTC+3 is still the previous day in UTC: the date must follow Türkiye time.
    expect(updatedText(f("2026-10-12T21:05:00Z"), "tr")).toBe("13 Ekim 2026, saat 00.05 (TSİ)");
  });

  it("reads the commit time from git", () => {
    const dir = mkdtempSync(join(tmpdir(), "staj-results-"));
    const g = (...a: string[]) => execFileSync("git", ["-C", dir, "-c", "commit.gpgsign=false", ...a], { env, stdio: "ignore" });
    g("init", "-q");
    writeFileSync(join(dir, "All_Internships.pdf"), "%PDF-1.4\n%%EOF\n");
    writeFileSync(join(dir, "New_Internships_2026-summer.pdf"), "%PDF-1.4\n%%EOF\n");   // other names are ignored
    g("add", "-A"); g("commit", "-q", "-m", "results");
    expect(readResults(dir)).toMatchObject({ file: "All_Internships.pdf", updatedMs: Date.parse("2026-10-12T13:30:00Z") });
  });

  it("falls back to the file time without history, and is empty without the file", () => {
    const dir = mkdtempSync(join(tmpdir(), "staj-results-"));
    writeFileSync(join(dir, "All_Internships.pdf"), "%PDF-1.4\n%%EOF\n");
    const mtime = new Date("2026-06-01T09:00:00Z");
    utimesSync(join(dir, "All_Internships.pdf"), mtime, mtime);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readResults(dir)?.updatedMs).toBe(mtime.getTime());
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    expect(readResults(join(dir, "missing"))).toBeNull();
  });
});
