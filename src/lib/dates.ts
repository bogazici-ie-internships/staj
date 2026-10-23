// Dates as settings.yml writes them, and as the site prints them.
// Everything is Turkey time (+03:00, no DST since 2016) and independent of the
// viewer's timezone. Shared by the build (Astro pages) and the browser.

export type Lang = "tr" | "en";
export interface Ymd { y: number; m: number; d: number }   // m: 1–12

export const AY_TAM = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const AY_KISA_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const AY_KISA_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const TR_OFFSET_MS = 3 * 3600_000;
export const DAY_MS = 86_400_000;

function valid(y: number, m: number, d: number): Ymd | null {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? { y, m, d } : null;
}

/** "21 Eylül 2026" → {2026, 9, 21}; null for anything else (e.g. "Güncellenecektir"). */
export function parseTrDate(text: unknown): Ymd | null {
  const parts = String(text ?? "").trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [gun, ay, yil] = parts;
  const m = AY_TAM.indexOf(ay) + 1;
  if (!m || !/^\d+$/.test(gun) || !/^\d+$/.test(yil)) return null;
  return valid(Number(yil), m, Number(gun));
}

/** "September 21, 2026" (settings.yml *_en fields) → Ymd; null otherwise. */
export function parseEnDate(text: unknown): Ymd | null {
  const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(String(text ?? "").trim());
  if (!m) return null;
  const mo = MONTHS_EN.indexOf(m[1]) + 1;
  return mo ? valid(Number(m[3]), mo, Number(m[2])) : null;
}

export interface Lock { date: Ymd; time: string; ms: number }
/** donem.teslim_kilit "2026-10-12 10:00" → the deadline; null when empty ("" = no lock). */
export function parseLock(text: unknown): Lock | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(text ?? "").trim());
  if (!m) return null;
  const date = valid(Number(m[1]), Number(m[2]), Number(m[3]));
  if (!date) return null;
  const ms = Date.UTC(date.y, date.m - 1, date.d, Number(m[4]), Number(m[5])) - TR_OFFSET_MS;
  return { date, time: `${m[4]}:${m[5]}`, ms };
}

export const ymdKey = (a: Ymd) => a.y * 10000 + a.m * 100 + a.d;
export const sameDay = (a: Ymd, b: Ymd) => ymdKey(a) === ymdKey(b);
export const iso = (a: Ymd) => `${a.y}-${String(a.m).padStart(2, "0")}-${String(a.d).padStart(2, "0")}`;
/** Days since epoch for a calendar date (no timezone involved). */
export const dayIndex = (a: Ymd) => Math.round(Date.UTC(a.y, a.m - 1, a.d) / DAY_MS);
export const fromDayIndex = (n: number): Ymd => {
  const t = new Date(n * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
/** Calendar day in Turkey for an instant. */
export const trDay = (ms: number) => Math.floor((ms + TR_OFFSET_MS) / DAY_MS);
export const trYmd = (ms: number): Ymd => fromDayIndex(trDay(ms));
/** "09.10.2026" in Türkiye time, for the receipt stamp. */
export function trNumDate(ms: number): string {
  const t = new Date(ms + TR_OFFSET_MS);
  return `${String(t.getUTCDate()).padStart(2, "0")}.${String(t.getUTCMonth() + 1).padStart(2, "0")}.${t.getUTCFullYear()}`;
}

export function trClock(ms: number): string {
  const t = new Date(ms + TR_OFFSET_MS);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** DESIGN.md §8 — TR "12 Ekim 2026", EN "12 October 2026". */
export function longDate(lang: Lang, a: Ymd): string {
  return `${a.d} ${(lang === "en" ? MONTHS_EN : AY_TAM)[a.m - 1]} ${a.y}`;
}
/** "12 Ekim" / "12 October" */
export function dayMonth(lang: Lang, a: Ymd): string {
  return `${a.d} ${(lang === "en" ? MONTHS_EN : AY_TAM)[a.m - 1]}`;
}
/** Absolute instant with the zone (DESIGN.md §8, reworded by UPDATE-03 §1). */
export function longDateTime(lang: Lang, ms: number): string {
  // Running text (UPDATE-03): "12 Ekim 2026, saat 10.00 (TSİ)" / "12 October 2026, 10:00 (GMT+3)".
  // Board cells and the strip keep the mono "12.10 · 10:00".
  return lang === "en" ? `${longDate(lang, trYmd(ms))}, ${trClock(ms)} (GMT+3)` : `${longDate(lang, trYmd(ms))}, saat ${trClock(ms).replace(":", ".")} (TSİ)`;
}
/** Mono board style: "12.10" */
export const dotDate = (a: Ymd) => `${p2(a.d)}.${p2(a.m)}`;
/** "12.10.2026" */
export const dotDateYear = (a: Ymd) => `${p2(a.d)}.${p2(a.m)}.${a.y}`;
/** "09.02–15.05.2026" (same year) / "21.12.2026 — 05.01.2027" */
export function dotRange(a: Ymd, b: Ymd): string {
  return a.y === b.y ? `${dotDate(a)}–${dotDateYear(b)}` : `${dotDateYear(a)}–${dotDateYear(b)}`;
}
/** Range in words: "9 Şubat – 15 Mayıs 2026" / "9 February – 15 May 2026" */
export function longRange(lang: Lang, a: Ymd, b: Ymd): string {
  return a.y === b.y ? `${dayMonth(lang, a)} – ${longDate(lang, b)}` : `${longDate(lang, a)} – ${longDate(lang, b)}`;
}

/** Short date for boards and strips: TR "12.10" (numeric is local convention),
 *  EN "12 Oct" (numeric dd.mm reads as 10 December to many English readers). */
export const shortDate = (lang: Lang, a: Ymd) => (lang === "en" ? `${a.d} ${AY_KISA_EN[a.m - 1]}` : dotDate(a));
export const shortDateYear = (lang: Lang, a: Ymd) => (lang === "en" ? `${a.d} ${AY_KISA_EN[a.m - 1]} ${a.y}` : dotDateYear(a));
export function shortRange(lang: Lang, a: Ymd, b: Ymd): string {
  if (lang !== "en") return dotRange(a, b);
  return a.y === b.y ? `${shortDate(lang, a)}–${shortDateYear(lang, b)}` : `${shortDateYear(lang, a)}–${shortDateYear(lang, b)}`;
}
