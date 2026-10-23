// Term comparison between the live site (`main`, docs/**/*.md) and the redesign copy
// (UPDATE-05 §2): for each family of document names, roles, units and key nouns, count every
// variant on both sides, and list bold / Title-Case terms that the redesign uses but `main` never does.
//   node scripts/copy/termdiff.mjs [ref=main]   → markdown on stdout
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { collect } from "./collect.mjs";

// [family, lang, [variant label, regex]...]; the first variant is what the redesign should use.
export const FAMILIES = [
  ["Saturday document", "tr", [["Cumartesi Yazısı", /Cumartesi Yazısı/g], ["Cumartesi Çalışma Yazısı", /Cumartesi Çalışma Yazısı/g], ["Cumartesi yazısı", /Cumartesi yazısı/g]]],
  ["Saturday document", "en", [["Saturday Work Letter", /Saturday Work Letter/g], ["Saturday letter", /Saturday letter/gi]]],
  ["Payment document", "tr", [["Ödeme Dekontu veya Bordro", /Ödeme Dekontu veya Bordro/g], ["Ödeme Dekontu / Bordro", /Ödeme Dekontu \/ Bordro/g], ["ödeme dekontu (lower)", /ödeme dekontu/g]]],
  ["Payment document", "en", [["payment receipt or payslip", /payment receipt or payslip/g], ["Payment Receipt or Payslip", /Payment Receipt or Payslip/g], ["payment receipt / payslip", /payment receipt \/ payslip/gi]]],
  ["EK-1", "tr", [["EK-1 (bare)", /EK-1(?! Formu)/g], ["EK-1 Formu", /EK-1 Formu/g]]],
  ["EK-1", "en", [["EK-1 (bare)", /EK-1(?! [Ff]orm)/g], ["EK-1 Form", /EK-1 Form/g], ["EK-1 form", /EK-1 form/g]]],
  ["Evaluation form", "tr", [["Staj Sicil Formu", /Staj Sicil Formu/g], ["Sicil Formu (bare)", /(?<!Staj )Sicil Formu/g]]],
  ["Evaluation form", "en", [["Trainee Evaluation Form", /Trainee Evaluation Form/g], ["evaluation form (lower)", /(?<!Trainee )[Ee]valuation [Ff]orm/g]]],
  ["Survey", "tr", [["Öğrenci Staj Anketi", /Öğrenci Staj Anketi/g], ["anket (bare)", /(?<!Staj )\banket(?:i|ini)?\b/g]]],
  ["Survey", "en", [["Student Internship Survey", /Student Internship Survey/g]]],
  ["Report", "tr", [["Staj Raporu", /Staj Raporu/g], ["staj raporu", /staj raporu/g]]],
  ["Report", "en", [["Internship Report", /Internship Report\b/g], ["internship report", /internship report/g]]],
  ["Compulsory letter", "tr", [["Staj Zorunluluk Belgesi", /Staj Zorunluluk Belgesi/g]]],
  ["Compulsory letter", "en", [["Compulsory Internship Letter", /Compulsory Internship Letter/g], ["internship letter", /(?<!Compulsory )internship letter/gi]]],
  ["Advisor role", "tr", [["staj koordinatörü", /staj koordinatör/gi], ["staj danışmanı", /staj danışman/gi]]],
  ["Advisor role", "en", [["internship coordinator", /internship coordinator/gi], ["internship advisor", /internship advisor/gi]]],
  ["Assistants", "tr", [["staj asistanları", /staj asistan/gi]]],
  ["Assistants", "en", [["internship assistants", /internship assistant/gi]]],
  ["Accounting unit", "tr", [["Hesap İşleri", /Hesap İşleri(?! Şube)/g], ["Hesap İşleri Şube Müdürlüğü", /Hesap İşleri Şube Müdürlüğü/g]]],
  ["Accounting unit", "en", [["Accounting Affairs", /Accounting Affairs/g], ["University Accounting Office", /University Accounting Office/g]]],
  ["Handbook", "tr", [["Internship Handbook", /Internship Handbook/g], ["Staj Kılavuzu (for the Handbook)", /\(Staj Kılavuzu\)/g]]],
  ["Day unit", "en", [["workday(s)", /\bworkdays?\b/gi], ["working day(s)", /\bworking[ -]days?\b/gi]]],
  ["Day unit", "tr", [["iş günü", /iş gün/g]]],
  ["Production internship", "en", [["Production Internship", /Production Internship/g], ["production internship (lower)", /production internship/g]]],
  ["General internship", "tr", [["serbest/genel staj", /serbest\/genel staj/gi]]],
  ["General internship", "en", [["General IE Internship", /General IE Internship/g], ["general internship (lower)", /general (IE )?internship/g]]],
  ["Government contribution", "tr", [["devlet katkısı", /devlet katkı/gi]]],
  ["Government contribution", "en", [["government contribution", /government contribution/gi], ["state contribution", /state contribution/gi]]],
  ["Timetable", "tr", [["çizelge", /çizelge/gi]]],
  ["Timetable", "en", [["timetable", /timetable/gi]]],
  ["Completion document", "tr", [["tamamlama belgesi", /tamamlama belge/gi]]],
  ["Completion document", "en", [["completion document", /completion document/gi]]],
  ["Summer School", "tr", [["Yaz Okulu", /Yaz Okulu/g], ["yaz okulu (lower)", /yaz okulu/g]]],
  ["Summer School", "en", [["Summer School", /Summer School/g], ["summer school (lower)", /summer school/g]]],
  ["Topic Guide", "tr", [["Konu Rehberi", /Konu Rehberi/g]]],
  ["Topic Guide", "en", [["Topic Guide", /Topic Guide/g]]],
  ["Email", "en", [["email", /\bemail/gi], ["e-mail", /\be-mail/gi]]],
  ["Email", "tr", [["e-posta", /e-posta/gi], ["mail (bare)", /(?<!e-)\bmail\b/gi]]],
];

function liveText(ref) {
  const files = execSync(`git ls-tree -r --name-only ${ref} docs`, { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".md"));
  const out = { tr: "", en: "" };
  for (const f of files) {
    const txt = execSync(`git show ${ref}:"${f}"`, { encoding: "utf8", maxBuffer: 1 << 24 })
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
    out[f.endsWith(".en.md") ? "en" : "tr"] += "\n" + txt.replace(/[ \t]*\n[ \t]*(?!\n)/g, " ").replace(/[ \t]+/g, " ");
  }
  return out;
}

export async function termdiff(ref = "4553fcd" /* last MkDocs commit, UPDATE-07 */) {
  const live = liveText(ref);
  const strings = [...(await collect()).values()].filter((v) => v.kind !== "server");
  const red = { tr: strings.map((v) => v.tr).join("\n"), en: strings.map((v) => v.en).join("\n") };
  const count = (s, re) => (s.match(re) || []).length;
  const rows = FAMILIES.map(([fam, lang, variants]) => {
    const live_ = variants.map(([l, re]) => [l, count(live[lang], re)]);
    const red_ = variants.map(([l, re]) => [l, count(red[lang], re)]);
    // Mismatch: the redesign uses a variant the live site never uses while the live site uses another one.
    const liveUsed = new Set(live_.filter(([, n]) => n).map(([l]) => l));
    const drift = red_.filter(([l, n]) => n && !liveUsed.has(l) && liveUsed.size).map(([l]) => l);
    return { fam, lang, live: live_, red: red_, drift };
  });
  // Bold and Title-Case multi-word terms in the redesign that the live site never contains.
  const terms = (s) => new Set([...s.matchAll(/\*\*([^*]{3,60})\*\*/g)].map((m) => m[1].trim())
    .concat([...s.matchAll(/(?<![.:!?]\s|^)\b(\p{Lu}[\p{L}-]+(?: (?:ve|veya|of|and|or|for|the) )?(?: ?\p{Lu}[\p{L}-]+){1,4})/gmu)].map((m) => m[1].trim())));
  const unseen = {};
  for (const lang of ["tr", "en"]) {
    const L = live[lang].toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-GB");
    unseen[lang] = [...terms(red[lang])].filter((t) => !L.includes(t.toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-GB"))).sort();
  }
  return { rows, unseen };
}

export function markdown({ rows, unseen }, ref = "4553fcd") {
  const fmt = (a) => a.filter(([, n]) => n).map(([l, n]) => `${l} ×${n}`).join(", ") || "—";
  const lines = [`Term families: \`${ref}\` docs/**/*.md (HTML stripped) vs. every redesign string (YAML + ui.ts). "Drift" = the redesign uses a variant the live site never uses.`, "",
    "| Family | Lang | Live site (`main`) | Redesign | Drift |", "|---|---|---|---|---|"];
  for (const r of rows) lines.push(`| ${r.fam} | ${r.lang.toUpperCase()} | ${fmt(r.live)} | ${fmt(r.red)} | ${r.drift.length ? "⚠︎ " + r.drift.join(", ") : "—"} |`);
  for (const lang of ["tr", "en"]) {
    lines.push("", `**${lang.toUpperCase()} bold / Title-Case terms in the redesign that never occur on the live site** (${unseen[lang].length}):`, "",
      unseen[lang].map((t) => `\`${t}\``).join(" · ") || "—");
  }
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ref = process.argv[2] || "4553fcd";
  console.log(markdown(await termdiff(ref), ref));
}
