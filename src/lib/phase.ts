// ONE definition of "how long is left" and "are we open / late / closed",
// shared by the deadline strip, the home board and the submission flow.
// Browser-safe (no Node imports). Times are epoch ms; the deadline is the
// +03:00 instant from donem.teslim_kilit.
import { DAY_MS, type Lang } from "./dates";

export type PhaseName = "open" | "late" | "closed" | "unlocked";
export interface Phase { name: PhaseName; daysLate: number; deadlineMs: number | null; closesMs: number | null }

/** Mirrors submit.js computePhase: closed after deadline + grace, late in between. */
export function phaseAt(now: number, deadlineMs: number | null, graceDays: number): Phase {
  if (deadlineMs == null) return { name: "unlocked", daysLate: 0, deadlineMs: null, closesMs: null };
  const closesMs = deadlineMs + graceDays * DAY_MS;
  if (now > closesMs) return { name: "closed", daysLate: 0, deadlineMs, closesMs };
  if (now > deadlineMs) {
    // Every 24 h that has begun counts as one late day (same as Code.gs).
    return { name: "late", daysLate: Math.ceil((now - deadlineMs) / DAY_MS), deadlineMs, closesMs };
  }
  return { name: "open", daysLate: 0, deadlineMs, closesMs };
}

export interface Left { d: number; h: number; m: number; totalMin: number }
/** Whole minutes left, rounded UP: 09:59:30 against 10:00 is "1 minute", never "0". */
export function left(now: number, targetMs: number): Left {
  const totalMin = Math.max(0, Math.ceil((targetMs - now) / 60_000));
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60, totalMin };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 gün 17 sa kaldı" · "5 sa 12 dk kaldı" · "12 dakika kaldı" (minute precision, DESIGN.md §3). */
export function leftText(lang: Lang, l: Left): string {
  if (lang === "en") {
    if (l.d > 0) return `${plural(l.d, "day", "days")} ${l.h} h left`;
    if (l.h > 0) return `${l.h} h ${l.m} min left`;
    return `${plural(Math.max(1, l.m), "minute", "minutes")} left`;
  }
  if (l.d > 0) return `${l.d} gün ${l.h} sa kaldı`;
  if (l.h > 0) return `${l.h} sa ${l.m} dk kaldı`;
  return `${Math.max(1, l.m)} dakika kaldı`;
}

export function lateText(lang: Lang, days: number): string {
  return lang === "en" ? `${plural(days, "day", "days")} late` : `${days} gün geç`;
}
