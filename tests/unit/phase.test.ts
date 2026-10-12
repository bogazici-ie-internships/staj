import { describe, expect, it } from "vitest";
import { left, leftText, phaseAt, lateText } from "../../src/lib/phase";
import { parseLock } from "../../src/lib/dates";

const DL = parseLock("2026-10-12 10:00")!.ms;
const H = 3600_000, D = 24 * H;

describe("phase (mirrors submit.js computePhase)", () => {
  it("open → late → closed around the grace window", () => {
    expect(phaseAt(DL - 1, DL, 10).name).toBe("open");
    expect(phaseAt(DL, DL, 10).name).toBe("open");            // the deadline minute itself is on time
    expect(phaseAt(DL + 1, DL, 10)).toMatchObject({ name: "late", daysLate: 1 });
    expect(phaseAt(DL + D, DL, 10).daysLate).toBe(1);
    expect(phaseAt(DL + D + 1, DL, 10).daysLate).toBe(2);
    expect(phaseAt(DL + 10 * D, DL, 10).name).toBe("late");
    expect(phaseAt(DL + 10 * D + 1, DL, 10).name).toBe("closed");
    expect(phaseAt(DL + 1, DL, 0).name).toBe("closed");      // no grace window
    expect(phaseAt(0, null, 10).name).toBe("unlocked");      // teslim_kilit: ""
  });
});

describe("countdown text: one definition everywhere", () => {
  it("days + hours, then hours + minutes, then minutes", () => {
    expect(leftText("tr", left(DL - 3 * D, DL))).toBe("3 gün 0 sa kaldı");
    expect(leftText("tr", left(DL - (2 * D + 17 * H + 20 * 60e3), DL))).toBe("2 gün 17 sa kaldı");
    expect(leftText("tr", left(DL - 2 * H, DL))).toBe("2 sa 0 dk kaldı");
    expect(leftText("tr", left(DL - 45 * 60e3, DL))).toBe("45 dakika kaldı");
    expect(leftText("tr", left(DL - 30e3, DL))).toBe("1 dakika kaldı");
    expect(leftText("en", left(DL - D - 3 * H, DL))).toBe("1 day 3 h left");
    expect(leftText("en", left(DL - 60e3, DL))).toBe("1 minute left");
  });
  it("deadline morning never says '1 gün' (the old Math.ceil bug)", () => {
    // 08:00 on 12 October, deadline 10:00 the same day.
    expect(leftText("tr", left(DL - 2 * H, DL))).not.toMatch(/gün/);
  });
  it("does not depend on the viewer's timezone (pure epoch arithmetic)", () => {
    // Midnight boundary in Turkey: 23:59 on 11 Oct → 10h01m left.
    const t = Date.parse("2026-10-11T23:59:00+03:00");
    expect(left(t, DL)).toMatchObject({ d: 0, h: 10, m: 1 });
  });
  it("late days", () => {
    expect(lateText("tr", 1)).toBe("1 gün geç");
    expect(lateText("en", 1)).toBe("1 day late");
    expect(lateText("en", 3)).toBe("3 days late");
  });
});

import { shortDate, shortRange } from "../../src/lib/dates";
describe("short dates", () => {
  it("TR numeric, EN with month names", () => {
    expect(shortDate("tr", { y: 2026, m: 10, d: 12 })).toBe("12.10");
    expect(shortDate("en", { y: 2026, m: 10, d: 12 })).toBe("12 Oct");
    expect(shortRange("en", { y: 2026, m: 2, d: 9 }, { y: 2026, m: 5, d: 15 })).toBe("9 Feb–15 May 2026");
    expect(shortRange("tr", { y: 2026, m: 2, d: 9 }, { y: 2026, m: 5, d: 15 })).toBe("09.02–15.05.2026");
  });
});
