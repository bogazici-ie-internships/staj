// Draft conversion of the live pages (main, docs/*.md) into src/content/docs/<page>.yaml
// (UPDATE-06 Phase 2a). TR and EN are parsed separately and paired block by block; the
// structures were checked to be identical (only the TR files carry one extra abbreviation).
// Mechanical steps only — every draft is then reviewed and edited by hand:
//  - links → page:/doc:/link:/#, Jinja {{ … }} → {placeholders} filled from settings.yml at build,
//  - live-site terms (UPDATE-05): staj koordinatörü / internship coordinator, {accounting},
//  - voice (UPDATE-03): TR body imperatives -in → -iniz, EN contractions expanded.
// Each block keeps `src: "<tr file>:<line> · <en file>:<line>"` for the coverage report.
//   node scripts/migrate/convert.mjs surec rapor sss sonuclar iletisim     (writes drafts; never overwrites reviewed files without --force)
import { existsSync, writeFileSync } from "node:fs";
import YAML from "yaml";
import { parse, readMain } from "./mkdocs.mjs";

const FILE = { surec: "surec/index", rapor: "rapor", formlar: "formlar", sss: "sss", sonuclar: "sonuclar", iletisim: "iletisim" };
const PAGE = { "kurallar.md": "kurallar", "rapor.md": "rapor", "teslim.md": "teslim", "sss.md": "sss", "formlar.md": "formlar", "iletisim.md": "iletisim", "sonuclar.md": "sonuclar", "surec/index.md": "surec", "index.md": "home" };

const TR_IMP = ["alın", "bakın", "başvurun", "bırakın", "danışın", "deneyin", "doldurun", "düzeltin", "edin", "gönderin", "hazırlayın", "iletin", "imzalatın", "isteyin", "işaretleyin", "kaydedin", "kontrol edin", "kullanın", "olun", "okuyun", "seçin", "sorun", "tutun", "yazın", "yükleyin", "yazdırın", "verin", "biriktirin", "belgeleyin", "girin", "bekleyin", "ekleyin", "inceleyin", "dikkat edin", "unutmayın", "yollayın", "konuşun", "alabilirsiniz"];
const TO_INIZ = (w) => w.endsWith("abilirsiniz") ? w : w.replace(/(ın|in|un|ün)$/, (m) => ({ ın: "ınız", in: "iniz", un: "unuz", ün: "ünüz" })[m]);

export function inline(text, lang, from) {
  let s = text
    .replace(/:material-[\w-]+:(\{[^}]*\})?\s*/g, "")
    .replace(/\)\{[^}]*\}/g, ")")
    .replace(/\{\{\s*iletisim\.staj_sorumlusu\.ad\s*\}\}/g, "{coordinatorName}")
    .replace(/\{\{\s*iletisim\.staj_sorumlusu\.eposta\s*\}\}/g, "{coordinatorEmail}")
    .replace(/\{\{\s*iletisim\.genel_eposta\s*\}\}/g, "{generalEmail}")
    .replace(/\{\{\s*iletisim\.hesap_isleri_eposta\s*\}\}/g, "{accountingEmail}")
    .replace(/\(\{\{\s*baglantilar\.(\w+)\s*\}\}\)/g, "(link:$1)")
    .replace(/\]\((?:\.\.\/)*belgeler\/([^)]+)\)/g, "](doc:$1)")
    .replace(/\]\((?:\.\.\/)*([\w/]+?)\.md(#[\w-]+)?\)/g, (_, p, h) => `](page:${PAGE[(from.includes("/") && !p.includes("/") ? "" : "") + p + ".md"] ?? p}${h ?? ""})`);
  if (lang === "tr") {
    s = s.replace(/([Ss])taj danışmanının/g, "$1taj koordinatörünün").replace(/([Ss])taj danışmanına/g, "$1taj koordinatörüne")
      .replace(/([Ss])taj danışmanından/g, "$1taj koordinatöründen").replace(/([Ss])taj danışmanı(?!\p{L})/gu, "$1taj koordinatörü")
      .replace(/Hesap İşleri Müdürlüğü/g, "{accounting}").replace(/Hesap İşleri(?! Şube)/g, "{accounting}");
    if (s.length > 40) for (const v of TR_IMP) s = s.replace(new RegExp(`(?<!\\p{L})${v}(?=[\\s.,;:)]|$)`, "gu"), TO_INIZ(v));
  } else {
    s = s.replace(/[Ii]nternship [Aa]dvisor/g, (m, at) => (at === 0 ? "Internship coordinator" : "internship coordinator"))
      .replace(/(the )?Department of Accounting Affairs/g, "{accounting}").replace(/Accounting Affairs/g, "{accounting}")
      .replace(/\bcan't\b/gi, "cannot").replace(/\bdon't\b/gi, "do not").replace(/\bdoesn't\b/gi, "does not").replace(/\bisn't\b/gi, "is not")
      .replace(/\bwon't\b/gi, "will not").replace(/\byou're\b/gi, "you are").replace(/\bit's\b/gi, "it is").replace(/\baren't\b/gi, "are not")
      .replace(/\bdidn't\b/gi, "did not").replace(/\bwasn't\b/gi, "was not").replace(/\byou'll\b/gi, "you will").replace(/\byou've\b/gi, "you have");
  }
  return s.trim();
}
const L = (tr, en, ftr, fen) => ({ tr: inline(tr ?? "", "tr", ftr), en: inline(en ?? tr ?? "", "en", fen) });
const src = (a, b) => `${a.file}:${a.line} · ${b.file}:${b.line}`;
const TONE = { tip: "tip", note: "note", info: "note", warning: "warning", danger: "danger", ozet: "summary", question: "note", success: "note" };

function blocks(tr, en) {
  const out = [];
  for (let i = 0; i < tr.length; i++) {
    const a = tr[i], b = en[i] ?? a;
    if (a.type === "abbr") continue; // glossary: kept as the shared glossary collection (coverage map)
    if (a.type === "p") out.push({ kind: "p", text: L(a.text, b.text, a.file, b.file), src: src(a, b) });
    else if (a.type === "list") {
      // A "files" list is one whose items are nothing but a link to /belgeler/ (icons stripped).
      const files = a.items.every((it) => /^(:material-[\w-]+:(\{[^}]*\})?\s*)?\[[^\]]+\]\((?:\.\.\/)*belgeler\/[^)]+\)$/.test(it.text.trim()) && !it.children.length);
      if (files) out.push({ kind: "files", items: a.items.map((it, k) => { const d = it.text.match(/belgeler\/([^)]+)\)/)[1]; return { doc: d, label: L(it.text.replace(/.*\[([^\]]+)\].*/, "$1"), b.items[k].text.replace(/.*\[([^\]]+)\].*/, "$1")), src: `${a.file}:${it.line} · ${b.file}:${b.items[k].line}` }; }) });
      else out.push({ kind: "list", ...(a.ordered ? { ordered: true } : {}), items: a.items.map((it, k) => ({ text: L(it.text, b.items[k]?.text, a.file, b.file), src: `${a.file}:${it.line} · ${b.file}:${b.items[k]?.line}`, ...(it.children.length ? { blocks: blocks(it.children, b.items[k].children) } : {}) })) });
    } else if (a.type === "admonition") out.push({ kind: "callout", tone: TONE[a.kind] ?? "note", title: L(a.title, b.title, a.file, b.file), src: src(a, b), blocks: blocks(a.children, b.children) });
    else if (a.type === "details") {
      const last = out[out.length - 1];
      const item = { anchor: { tr: "", en: "" }, q: L(a.title, b.title, a.file, b.file), src: src(a, b), blocks: blocks(a.children, b.children) };
      if (last?.kind === "qa") last.items.push(item); else out.push({ kind: "qa", items: [item] });
    } else if (a.type === "card") {
      const last = out[out.length - 1];
      const card = { icon: "info", title: L(a.title.replace(/\*\*/g, ""), b.title.replace(/\*\*/g, ""), a.file, b.file), src: src(a, b), blocks: blocks(a.children, b.children) };
      if (last?.kind === "cards") last.cards.push(card); else out.push({ kind: "cards", cards: [card] });
    } else if (a.type === "table") out.push({ kind: "table", src: src(a, b), head: a.head.map((h, k) => L(h, b.head[k], a.file, b.file)), rows: a.rows.map((r, k) => ({ src: `${a.file}:${r.line} · ${b.file}:${b.rows[k].line}`, cells: r.cells.map((c, j) => L(c, b.rows[k].cells[j], a.file, b.file)) })) });
    else if (a.type === "html") out.push({ kind: "html", src: src(a, b), note: "TODO: render from settings.yml" });
    else if (a.type === "tab") out.push({ kind: "tab", title: L(a.title, b.title, a.file, b.file), src: src(a, b), blocks: blocks(a.children, b.children) });
    else if (a.type === "h") throw new Error(`heading inside block list at ${a.file}:${a.line}`);
  }
  return out;
}

// Split a flat block list into nested sections by heading level.
function sections(tr, en, level) {
  const out = { lead: [[], []], sections: [] };
  let cur = null;
  for (let i = 0; i < tr.length; i++) {
    const a = tr[i], b = en[i] ?? a;
    if (a.type === "h" && a.level === level) { cur = { a, b, tr: [], en: [] }; out.sections.push(cur); continue; }
    if (cur) { cur.tr.push(a); cur.en.push(b); } else { out.lead[0].push(a); out.lead[1].push(b); }
  }
  return {
    lead: out.lead,
    sections: out.sections.map((s) => {
      const inner = level < 4 ? sections(s.tr, s.en, level + 1) : { lead: [s.tr, s.en], sections: [] };
      return { anchor: { tr: s.a.id, en: s.b.id }, title: L(s.a.text, s.b.text, s.a.file, s.b.file), src: src(s.a, s.b),
        blocks: blocks(inner.lead[0], inner.lead[1]), ...(inner.sections.length ? { sections: inner.sections } : {}) };
    }),
  };
}

export function convert(page) {
  const f = FILE[page];
  const tr = parse(readMain(`docs/${f}.md`), `${f}.md`), en = parse(readMain(`docs/${f}.en.md`), `${f}.en.md`);
  const meta = [tr.find((b) => b.type === "meta"), en.find((b) => b.type === "meta")];
  const t = tr.filter((b) => b.type !== "meta"), e = en.filter((b) => b.type !== "meta");
  const h1 = [t.findIndex((b) => b.type === "h" && b.level === 1), e.findIndex((b) => b.type === "h" && b.level === 1)];
  const body = sections(t.slice(h1[0] + 1), e.slice(h1[1] + 1), 2);
  return {
    page,
    anchor: { tr: t[h1[0]].id, en: e[h1[1]].id },
    title: L(t[h1[0]].text, e[h1[1]].text, f, f), src: src(t[h1[0]], e[h1[1]]),
    ...(meta[0] ? { meta: { src: `${f}.md:2 · ${f}.en.md:2`, note: "→ chrome.yaml pages.description (already migrated, UPDATE-03)" } } : {}),
    lead: blocks(body.lead[0], body.lead[1]),
    sections: body.sections,
  };
}

if (process.argv[1].endsWith("convert.mjs")) {
  const force = process.argv.includes("--force");
  for (const page of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
    const out = `src/content/docs/${page}.yaml`;
    if (existsSync(out) && !force) { console.log(`skip ${out} (exists; --force to overwrite a reviewed file)`); continue; }
    writeFileSync(out, `# ${page} — migrated from main docs/${FILE[page]}.md (+ .en.md) by scripts/migrate/convert.mjs,\n# then reviewed by hand (UPDATE-06 Phase 2a). \`src\` = source lines, used by the coverage report.\n` + YAML.stringify(convert(page), { lineWidth: 0 }));
    console.log("wrote", out);
  }
}
