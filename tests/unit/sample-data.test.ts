// REVIEW-03 Note 1 (D-132): no real-looking student data in the repository's own files. Fails on any IE-looking
// student number (20YY402NNN with a plausible entry year, 2000–2029) and on any @std.bogazici.edu.tr address other
// than the one placeholder in src/lib/submission/sample.json, in src/, tests/, design/ and _maintainer/.
// The live site's docs/ is the frozen migration reference and is not scanned; generated review documents that
// quote it are redacted by scripts/lib/redact-sample.mjs.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import SAMPLE from "../../src/lib/submission/sample.json" with { type: "json" };

const ROOTS = ["src", "tests", "design", "_maintainer"];
const SKIP_DIRS = new Set(["node_modules", "__screenshots__", "test-results", ".astro"]);
const TEXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".astro", ".json", ".yaml", ".yml", ".md", ".html", ".css", ".gs", ".txt", ".csv", ".svg"]);
const SID = /20[0-2]\d402\d{3}/g;
const ADDRESS = /[a-z0-9._%+-]+@std\.bogazici\.edu\.tr/gi;

function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(f)) files(p, out); }
    else if (TEXT.has(extname(f).toLowerCase())) out.push(p);
  }
  return out;
}

describe("sample data", () => {
  it("the shared sample passes the portal's checks and is clearly invented", () => {
    for (const sid of [SAMPLE.sid, SAMPLE.sid2]) { expect(sid).toMatch(/^20\d{8}$/); expect(Number(sid.slice(2, 4))).toBeGreaterThan(90); }
    expect(SAMPLE.email).toMatch(/^[a-z.]+@std\.bogazici\.edu\.tr$/);
  });
  it("no real-looking student number or student address anywhere else", () => {
    const hits: string[] = [];
    for (const root of ROOTS) for (const p of files(root)) {
      const s = readFileSync(p, "utf8");
      for (const m of s.matchAll(SID)) hits.push(`${p}: ${m[0]}`);
      for (const m of s.matchAll(ADDRESS)) if (m[0].toLowerCase() !== SAMPLE.email) hits.push(`${p}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });
});
