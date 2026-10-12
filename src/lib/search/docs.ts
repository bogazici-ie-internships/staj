// Build-only: the search documents (REVIEW-02 Note 3, D-125). One document per meaningful unit, each with the
// exact anchor it links to: every rule and topic (Kurallar), glossary term, SSS question + answer, Süreç and Rapor
// section / card, Formlar document row, Teslim note / document list / help item, contact card and page lead.
// Fields: u url · p page name · h heading (context) · t title · k keywords (from search-keywords.yaml) · b body.
import { readFileSync } from "node:fs";
import YAML from "yaml";
import type { Block, Section } from "../../content/schemas/docs";
import { copy, docPage, glossary, rules, t } from "../content";
import { plain } from "../inline-md";
import { pagePath } from "../paths";
import { settings, site } from "../settings";
import { longDateTime, type Lang } from "../dates";
import { readResults, updatedText } from "../results";
import { ui } from "../../i18n/ui";
import { fold } from "./fold";
import { docRowId, termId } from "./ids";

/** `d`: the title shown in results when it differs from the searchable `t` (a rule's lead phrase). */
export interface SearchDoc { id: number; u: string; p: string; h: string; t: string; k: string; b: string; d?: string }

// Placeholders are filled before a text reaches the index (REVIEW-05 B-12); one left over fails the build below.
const clean = (s: string) => plain(s).replace(/\s+/g, " ").trim();
const KW = YAML.parse(readFileSync("src/content/search-keywords.yaml", "utf8")) as { groups: string[][]; ignore?: string[] };
const GROUPS: string[][] = KW.groups.map((g) => g.map(String));
/** Phrases that use a group's word in another sense; removed before the groups are matched (REVIEW-05: the EK-1
 *  "hafta sonuna veya resmî tatile" day is not weekend work, so it must not pull in the Cumartesi Yazısı group). */
const IGNORE = (KW.ignore ?? []).map((x) => " " + fold(String(x)).replace(/[^a-z0-9]+/g, " ").trim() + " ");
/** Every phrase of every group the text contains (at a word start, so suffixed forms count: "dekontu" ⊃ "dekont"). */
function keywords(text: string): string {
  let f = " " + fold(text).replace(/[^a-z0-9]+/g, " ") + " ";
  for (const x of IGNORE) f = f.split(x).join(" ");
  const out = new Set<string>();
  for (const g of GROUPS) if (g.some((ph) => f.includes(" " + fold(ph).replace(/[^a-z0-9]+/g, " ").trim()))) g.forEach((x) => out.add(x));
  return [...out].join(" · ");
}

function blockText(blocks: Block[], lang: Lang): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "p") out.push(t(b.text, lang));
    else if (b.kind === "list") for (const it of b.items) { out.push(t(it.text, lang)); if (it.blocks) out.push(blockText(it.blocks, lang)); }
    else if (b.kind === "callout") out.push(t(b.title, lang), blockText(b.blocks, lang));
    else if (b.kind === "files") for (const it of b.items) out.push(t(it.label, lang));
    else if (b.kind === "table") for (const r of b.rows) out.push(r.cells.map((c) => t(c, lang)).join(" "));
    else if (b.kind === "action") out.push(t(b.label, lang));
    else if (b.kind === "results") {
      // The card's text, never the PDF's contents (RESULTS-01).
      const current = readResults();
      out.push(current ? `${t(b.scope, lang)} ${t(b.open, lang)} ${t(b.updated, lang).replace("{time}", updatedText(current, lang))}` : t(b.empty, lang));
    }
  }
  return out.map(clean).filter(Boolean).join(" ");
}

export async function searchDocs(lang: Lang): Promise<SearchDoc[]> {
  const chrome = await copy("chrome");
  const pageName = (key: string) => t(chrome.pages.find((p) => p.key === key)!.title, lang);
  const termsTitle = t((await copy("kurallarPage")).ajanda.terms, lang);
  const docs: Omit<SearchDoc, "id" | "k">[] = [];
  const add = (d: Omit<SearchDoc, "id" | "k">) => { if (d.t || d.b) docs.push({ ...d, t: clean(d.t), h: clean(d.h), b: clean(d.b), ...(d.d ? { d: clean(d.d) } : {}) }); };

  // Kurallar: rules, section intros/callouts, Topic Guide topics, glossary terms.
  const P = pageName("kurallar");
  for (const s of await rules()) {
    const sec = `${s.section}. ${t(s.title, lang)}`;
    add({ u: pagePath(lang, "kurallar", s.anchor[lang]), p: P, h: sec, t: t(s.title, lang), b: [s.intro ? t(s.intro, lang) : "", s.callout ? `${t(s.callout.title, lang)} ${t(s.callout.body, lang)}` : ""].join(" ") });
    // A rule's title in results: its highlight value or its lead phrase (first bold run), after its number.
    const lead = (body: string) => (body.match(/\*\*([^*]+)\*\*/)?.[1] ?? "").replace(/[:;,.]$/, "");
    for (const r of s.rules) add({ u: pagePath(lang, "kurallar", `k-${r.no.replace(".", "-")}`), p: P, h: sec, t: `${r.no} ${r.highlight ? t(r.highlight.value, lang) : ""}`, d: `${r.no} ${r.highlight ? t(r.highlight.value, lang) : lead(t(r.body, lang))}`, b: t(r.body, lang) });
    for (const tp of s.topics ?? []) add({ u: pagePath(lang, "kurallar", `topic-${tp.id}`), p: P, h: sec, t: t(tp.title, lang), b: [t(tp.intro, lang), ...tp.items.map((x) => t(x, lang))].join(" ") });
  }
  for (const g of await glossary()) add({ u: pagePath(lang, "kurallar", termId(g.id)), p: P, h: termsTitle, t: t(g.term, lang), b: t(g.definition, lang) });

  // Phase 2a pages: lead, every section and subsection (own blocks), cards, SSS questions, Formlar rows, contacts.
  for (const key of ["surec", "rapor", "sss", "formlar", "sonuclar", "iletisim"] as const) {
    const doc = await docPage(key);
    const P2 = pageName(key);
    const lead = blockText(doc.lead, lang);
    if (lead) add({ u: pagePath(lang, key), p: P2, h: P2, t: t(doc.title, lang), b: lead });
    const walk = (s: Section, parent: string) => {
      const title = t(s.title, lang);
      add({ u: pagePath(lang, key, t(s.anchor, lang)), p: P2, h: parent, t: title, b: blockText(s.blocks, lang) });
      for (const b of s.blocks) {
        if (b.kind === "cards") for (const c of b.cards) add({ u: pagePath(lang, key, t(s.anchor, lang)), p: P2, h: title, t: t(c.title, lang).replace(/^\d+\.\s*/, ""), b: blockText(c.blocks, lang) });
        if (b.kind === "qa") for (const q of b.items) add({ u: pagePath(lang, key, t(q.anchor, lang)), p: P2, h: title, t: t(q.q, lang), b: blockText(q.blocks, lang) });
      }
      for (const c of s.sections ?? []) walk(c, title);
    };
    for (const s of doc.sections) walk(s, P2);
    for (const b of doc.lead) {
      if (b.kind === "doctable") for (const g of b.groups) for (const r of g.rows)
        add({ u: pagePath(lang, key, docRowId(r.doc)), p: P2, h: t(g.title, lang), t: t(r.name, lang), b: [t(r.purpose, lang), r.signer ? t(r.signer, lang) : "", r.doc].join(" ") });
      if (b.kind === "contacts") {
        const i = settings.iletisim;
        add({ u: pagePath(lang, key, "ct-primary"), p: P2, h: t(b.primary.role, lang), t: `${t(b.primary.name, lang)} · ${t(b.primary.role, lang)}`, b: [t(b.primary.note, lang), i.genel_eposta, ...i.staj_asistanlari.map((a) => `${a.ad} ${a.eposta}`)].join(" ") });
        add({ u: pagePath(lang, key, "ct-coord"), p: P2, h: t(b.coordinator.role, lang), t: `${t(b.coordinator.role, lang)} · ${i.staj_sorumlusu.ad}`, b: [t(b.coordinator.note, lang), i.staj_sorumlusu.eposta].join(" ") });
      }
      if (b.kind === "callout") add({ u: pagePath(lang, key), p: P2, h: P2, t: t(b.title, lang), b: blockText(b.blocks, lang) });
    }
  }

  // Teslim: the "not for this form" note, the document lists, the help items.
  const ts = await copy("teslim");
  const PT = pageName("teslim");
  add({ u: pagePath(lang, "teslim", "suf-exc"), p: PT, h: PT, t: t(ts.prep.exceptionsTitle, lang), b: ts.prep.exceptions.map((x) => t(x, lang)).join(" ") });
  add({ u: pagePath(lang, "teslim", "suf-req"), p: PT, h: PT, t: t(ts.prep.required, lang), b: (["rapor", "sicil", "anketi"] as const).map((d) => t(ts.docs[d], lang)).join(" · ") });
  add({ u: pagePath(lang, "teslim", "suf-sit"), p: PT, h: PT, t: t(ts.prep.situational, lang), b: [t(ts.situations.saturday.when, lang), t(ts.docs.cumartesi, lang), t(ts.situations.reimbursement.when, lang), t(ts.docs.dekont, lang), t(ts.docs.ek1, lang)].join(" · ") });
  // The deadline box with its dates from settings.yml, as the Teslim page shows it (REVIEW-05 B-12).
  const deadlineText = site.deadlineMs == null ? ui[lang].strip.unlocked : `${t(ts.prep.deadline, lang)}${lang === "en" ? ":" : ""} ${longDateTime(lang, site.deadlineMs)}.`;
  const lateText = site.deadlineMs != null && site.graceDays > 0 && site.closesMs != null ? t(ts.prep.lateRule, lang).replace("{closes}", longDateTime(lang, site.closesMs)) : "";
  add({ u: pagePath(lang, "teslim"), p: PT, h: PT, t: t(ts.prep.deadline, lang), b: [deadlineText, lateText].join(" ") });
  add({ u: pagePath(lang, "teslim", "suf-multiple"), p: PT, h: PT, t: t(ts.prep.title, lang), b: t(ts.prep.multiple, lang) });
  for (const x of ts.help.items) add({ u: pagePath(lang, "teslim", "help"), p: PT, h: t(ts.help.title, lang), t: t(ts.help.title, lang), b: t(x, lang) });

  const left = docs.find((d) => [d.t, d.h, d.b, d.d ?? ""].some((x) => /\{\w+\}/.test(x)));
  if (left) throw new Error(`arama dizini: doldurulmamış yer tutucu (${left.u}): ${left.b.slice(0, 120)}`);
  return docs.map((d, id) => ({ id, ...d, k: keywords(`${d.t} ${d.b}`) }));
}
