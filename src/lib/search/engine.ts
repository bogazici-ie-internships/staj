// Search engine (REVIEW-02 Note 3, D-125): MiniSearch over the documents of src/lib/search/docs.ts. The same
// module runs in the browser (palette) and in the golden-query test.
// - Folding (fold.ts) on index and query: case and Turkish diacritics ignored ("sicil" = "Sicil", "gec" = "geç").
// - Boosts: title 3 > keywords 2 > heading (context) 1.2 > body 1. Prefix matching from the first character; light fuzzy matching for typos.
// - Turkish suffixes without a stemmer: a second pass searches each long query word cut to ~60% of its length as a
//   prefix ("sigortamı" → "sigor", "belgeleri" → "belge", "raporu" → "rapo"), at a lower weight.
import MiniSearch, { type SearchResult } from "minisearch";
import { fold, STOP, tokens } from "./fold";
import type { SearchDoc } from "./docs";

export type { SearchDoc };
export interface Hit { doc: SearchDoc; score: number; terms: string[] }

const tokenize = (s: string) => tokens(s);
const processTerm = (term: string) => (term.length < 2 && !/\d/.test(term)) || STOP.has(term) ? null : term;

export function createIndex(docs: SearchDoc[]) {
  const ms = new MiniSearch<SearchDoc>({
    fields: ["t", "k", "h", "b"], storeFields: [], idField: "id", tokenize, processTerm,
    searchOptions: { tokenize, processTerm },
  });
  ms.addAll(docs);
  const byId = new Map(docs.map((d) => [d.id, d]));
  return { ms, byId };
}
export type Index = ReturnType<typeof createIndex>;

const fuzzy = (term: string) => (term.length >= 7 ? 0.25 : term.length >= 5 ? 1 : false);
const cut = (w: string) => w.slice(0, Math.max(4, Math.ceil(w.length * 0.6)));

export function search(index: Index, query: string, limit = 12): Hit[] {
  const raw = tokens(query);
  const words = raw.filter((w) => processTerm(w));
  // Results from the first character: a lone letter is searched as a prefix only.
  if (!words.length) return raw.length ? index.ms.search(raw[0], { prefix: true, fuzzy: false, boost: { t: 3, k: 2, h: 1.2, b: 1 }, processTerm: (x) => x })
    .slice(0, limit).map((r) => ({ doc: index.byId.get(r.id as number)!, score: r.score, terms: r.terms })) : [];
  const opts = { boost: { t: 3, k: 2, h: 1.2, b: 1 }, prefix: true, combineWith: "OR" as const };
  const scores = new Map<number, { score: number; terms: Set<string> }>();
  const take = (rs: SearchResult[], weight: number) => {
    for (const r of rs) {
      const e = scores.get(r.id as number) ?? { score: 0, terms: new Set<string>() };
      e.score += r.score * weight;
      for (const x of r.terms) e.terms.add(x);
      scores.set(r.id as number, e);
    }
  };
  take(index.ms.search(words.join(" "), { ...opts, fuzzy }), 1);
  const cuts = words.filter((w) => w.length >= 6).map(cut);
  if (cuts.length) take(index.ms.search(cuts.join(" "), { ...opts, fuzzy: false }), 0.6);
  // Documents that match every query word rank above those that match only some.
  if (words.length > 1) take(index.ms.search(words.join(" "), { ...opts, fuzzy, combineWith: "AND" }), 0.8);
  return [...scores.entries()].map(([id, e]) => ({ doc: index.byId.get(id)!, score: e.score, terms: [...e.terms] }))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** ~150 characters of `text` around the first matched word, matches wrapped in <mark> (HTML-escaped). */
export function snippet(text: string, terms: string[], len = 150): string {
  const f = fold(text);
  const ts = [...new Set(terms.filter((x) => x.length >= 2))].sort((a, b) => b.length - a.length);
  const re = ts.length ? new RegExp(`(^|[^a-z0-9])(${ts.map((x) => x.replace(/[^a-z0-9]/g, "")).filter(Boolean).join("|")})`, "g") : null;
  let first = re ? f.search(re) : -1;
  if (first < 0) first = 0;
  let start = Math.max(0, first - Math.floor(len / 3));
  if (start > 0) { const sp = text.indexOf(" ", start); if (sp > 0 && sp < first) start = sp + 1; }
  let end = Math.min(text.length, start + len);
  if (end < text.length) { const sp = text.lastIndexOf(" ", end); if (sp > first) end = sp; }
  const seg = text.slice(start, end), fseg = f.slice(start, end);
  let out = "", i = 0;
  if (re) for (const m of fseg.matchAll(re)) {
    const s0 = m.index! + m[1].length, s1 = s0 + m[2].length;
    out += esc(seg.slice(i, s0)) + "<mark>" + esc(seg.slice(s0, s1)) + "</mark>"; i = s1;
  }
  out += esc(seg.slice(i));
  return (start > 0 ? "… " : "") + out + (end < text.length ? " …" : "");
}
