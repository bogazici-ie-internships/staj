// REVIEW-03 Note 3 (D-136): design/reviews/teslim-states.html must show every state of tests/states/states.ts
// (8 frames each). Adding a state without regenerating (`npm run states`) fails here.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STATES } from "../states/states";

describe("teslim-states.html", () => {
  // The frames are generated, not committed (UPDATE-07, D-142): checked only where `npm run states` has run.
  // The page itself is generated and kept out of the public repo too: checked only where it exists.
  it("has every state, in both widths, TR/EN, light/dark", () => {
    if (!existsSync("design/reviews/teslim-states.html")) return;
    const html = readFileSync("design/reviews/teslim-states.html", "utf8");
    for (const s of STATES) expect(html).toContain(`id="${s.id}"`);
    if (!existsSync("design/reviews/teslim-states")) return;
    const missing = STATES.flatMap((s) => ["tr", "en"].flatMap((l) => ["light", "dark"].flatMap((c) => [1440, 360].map((w) => `${s.id}-${l}-${c}-${w}.jpg`))))
      .filter((f) => !existsSync(`design/reviews/teslim-states/${f}`));
    expect(missing).toEqual([]);
  });
});
