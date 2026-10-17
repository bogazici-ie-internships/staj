// UPDATE-03: every user-facing string follows the official voice and fixed terminology,
// and TR/EN carry the same placeholders, links, bold spans and numbers (scripts/copy/lint.mjs).
import { describe, expect, it } from "vitest";
import { lint } from "../../scripts/copy/lint.mjs";

describe("copy lint", () => {
  it("terminology, voice and TR/EN parity", async () => {
    const { problems, count } = await lint();
    expect(count).toBeGreaterThan(350);
    expect(problems.map((p: { key: string; lang: string; msg: string }) => `${p.key} [${p.lang}] ${p.msg}`)).toEqual([]);
  });
});
