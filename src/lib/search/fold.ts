// Turkish-aware text folding for search (REVIEW-02 Note 3, D-125). Used identically on the index and on the
// query, in the browser and in the build: lower case + diacritics removed, one character in, one character out
// (so match positions in the folded text are positions in the original, for snippet highlighting).
//   İ I ı → i · Ş ş → s · Ç ç → c · Ğ ğ → g · Ö ö → o · Ü ü → u · â î û → a i u
const MAP: Record<string, string> = {
  "İ": "i", "I": "i", "ı": "i", "Ş": "s", "ş": "s", "Ç": "c", "ç": "c", "Ğ": "g", "ğ": "g",
  "Ö": "o", "ö": "o", "Ü": "u", "ü": "u", "Â": "a", "â": "a", "Î": "i", "î": "i", "Û": "u", "û": "u",
};
export function foldChar(c: string): string {
  const m = MAP[c];
  if (m) return m;
  const l = c.toLowerCase();
  if (l.length !== 1) return c;
  const base = l.normalize("NFD").charAt(0);
  return base.length === 1 ? base : l;
}
export const fold = (s: string) => { let o = ""; for (const c of s) o += c.length === 1 ? foldChar(c) : " "; return o; };

/** Words: letters and digits; apostrophes, hyphens and punctuation split ("Formu'nu" → "formu", "nu"; "EK-1" → "ek", "1").
 *  "ek-1" also yields "ek1", so "ek1" and "EK-1" meet. */
export function tokens(s: string): string[] {
  const f = fold(s);
  const out = f.split(/[^a-z0-9]+/).filter(Boolean);
  for (const m of f.matchAll(/\b([a-z]+)-(\d+)\b/g)) out.push(m[1] + m[2]);
  return out;
}
/** Words too common to help ranking (both languages). */
export const STOP = new Set(["ve", "ile", "bir", "bu", "da", "de", "mi", "mu", "icin", "veya", "the", "and", "of", "a", "an", "to", "in", "for", "is", "or", "on", "be", "are", "nu", "ni", "na", "ne", "nin", "nun", "in", "un"]);
