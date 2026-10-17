// Copy lint (UPDATE-03 §5): terminology + voice rules and TR/EN parity over every
// user-facing string (scripts/copy/collect.mjs).
//   node scripts/copy/lint.mjs        → prints problems, exit 1 if any
// Also run by tests/unit/copy.test.ts, so it is part of `npm run test:unit`.
import { pathToFileURL } from "node:url";
import { collect } from "./collect.mjs";

// ---- Voice: phrases the official department voice does not use (UPDATE-03 §1–2) ------------
const BANNED = {
  both: [
    [/!/, "no exclamation marks"],
    [/\p{Extended_Pictographic}/u, "no emoji"],
    [/§/, "no \"§\": numbered items use plain decimals (REVIEW-01 Note 4)"],
  ],
  tr: [
    [/omurga/i, "chatty aside (\"raporun omurgası\")"],
    // "çok daha zor" was banned as a chatty aside (UPDATE-03); LANGUAGE-01 (D-183) brings the live site's reason back
    // ("sonradan toplu doldurmak çok daha zordur"), so it is allowed again.
    // LANGUAGE-01 (D-183): the bureaucratic register the live site did not use. Plain present instead ("gerekir", "yer alır").
    [/\p{L}+(mekte|makta)(dır|dir)(?!\p{L})/iu, "bureaucratic \"-mektedir / -maktadır\" ending; write the plain verb (\"gerekir\", \"yer alır\", \"korunur\") (LANGUAGE-01)"],
    [/(?<!\p{L})(söz konusu|düzenli olarak)(?!\p{L})/iu, "padding (\"söz konusu\", \"düzenli olarak\") (LANGUAGE-01)"],
    [/sizi tanıyalım/i, "chatty heading"],
    [/sizin için\./i, "slogan (\"Bu form sizin için.\")"],
    [/(?<!\p{L})(galiba|genelde|aslında|hemen)(?!\p{L})/iu, "hedging / casual adverb"],
    [/(?<!\p{L})yazın(?!\p{L})/iu, "casual \"yazın\"; use \"iletiniz / başvurunuz\""],
    [/zamanında\./i, "slogan (\"Staj, zamanında.\")"],
    [/Hesap İşleri/, "unit name: write {accounting} (one place: chrome.yaml › units.accounting, UPDATE-04 §2)"],
    [/Cumartesi Çalışma Yazısı/, "document name: \"Cumartesi Yazısı\" (live site, UPDATE-05 §2)"],
    [/(?<!Staj )Sicil Formu/, "document name: \"Staj Sicil Formu\""],
    [/zorunluluk belgesi/, "document name: \"Staj Zorunluluk Belgesi\""],
    [/EK-1 Formu/, "running text says \"EK-1\"; \"EK-1 Formu\" only as the document slot name (live site, UPDATE-05 §2)"],
    [/staj danışman/iu, "role: \"staj koordinatörü\" (maintainer decision, UPDATE-05 §1); \"akademik danışman\" is a different role"],
    [/\(Staj Kılavuzu\)/, "the Handbook is \"Internship Handbook\"; \"Staj Kılavuzu\" is never its name (UPDATE-05 §2)"],
    [/−1 iş günü/, "no \"−1 iş günü\" shorthand"],
  ],
  en: [
    [/\b\w+n't\b|\b(I|you|we|they|it|that|there|let|here|what)['’](m|re|ll|ve|s|d)\b/i, "no contractions"],
    [/\brobot\b/i, "\"security verification\", not \"robot check\""],
    [/\bworking[ -]days?\b/i, "\"workday\", as on the live EN pages (UPDATE-05 §2)"],
    [/\binternship advisor/i, "role: \"internship coordinator\" (maintainer decision, UPDATE-05 §1)"],
    [/\bproduction internship/, "type name: \"Production Internship\" (live EN)"],
    [/\bTick\b|\bAbout you\b|\bGet your\b|\bHave your\b|\bon time\.$/, "casual phrasing"],
    [/Accounting (Affairs|Office)/, "unit name: write {accounting} (one place: chrome.yaml › units.accounting, UPDATE-04 §2)"],
    [/Saturday letter|Saturday Letter/, "document name: \"Saturday Work Letter\""],
    [/(?<!Compulsory )[Ii]nternship [Ll]etter/, "document name: \"Compulsory Internship Letter\""],
    [/EK-1 Form\b/, "running text says \"EK-1\"; \"EK-1 Form\" only as the document slot name (live site, UPDATE-05 §2)"],
    [/\be-mail/i, "spelling: \"email\""],
    [/\bsummariz|\borganiz|\bprogram\b/, "British spelling (summarise, organisation, programme)"],
  ],
};

// Body text uses the polite "-iniz" imperative; the short "-in" form is allowed only on buttons and
// very short items (UPDATE-03 §1), i.e. strings of up to 40 characters.
const SHORT_IMPERATIVE = /(?<!\p{L})(yükleyin|iletin|gönderin|kullanın|seçin|girin|bırakın|bakın|edin|alın|doldurun|danışın|basın|kaydedin|yazdırın|düzeltin|işaretleyin|deneyin|yenileyin|bekleyin|imzalatın|hazırlayın|başvurun)(?!\p{L})/iu;

// Page and section titles: noun phrases in Title Case, never questions (UPDATE-03 §1).
const TITLE_KEY = /(^|\.)((title|masthead|keyFigures|docsToggle|nextTitle|closedTitle|summaryTitle))$/;
const NOT_TITLE = /fit\.routeTitle$|\.label\.|ui\.ts › flow\.(?!closedTitle|summaryTitle)/;
const SMALL = new Set(["ve", "ile", "veya", "için", "of", "and", "or", "the", "for", "to", "in", "a", "an", "with", "by", "on", "·", "—", "&"]);
const titleCase = (s) => s.replace(/\{[^}]+\}('\p{L}+)?/gu, "X").split(/\s+/).filter(Boolean)
  .every((w, i) => (i > 0 && SMALL.has(w)) || /^[^\p{L}]*[\p{Lu}\d]/u.test(w));

// ---- Parity: TR and EN must carry the same facts (UPDATE-03 §2) ---------------------------
const WORDS_EN = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const WORDS_TR = { bir: 1, iki: 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
const UNIT_EN = "(?:working )?(?:days?|weeks?|minutes?|hours?|semesters?|pages?)";
const UNIT_TR = "(?:iş )?(?:gün|hafta|dakika|saat|yarıyıl|sayfa)";
function numbers(s, lang) {
  const out = [...s.replace(/\{[^}]+\}|\$\{[^}]+\}|https?:\S+|GMT\+3/g, "").matchAll(/\d+/g)].map((m) => m[0]);
  const [words, unit] = lang === "en" ? [WORDS_EN, UNIT_EN] : [WORDS_TR, UNIT_TR];
  for (const m of s.matchAll(new RegExp(`\\b(${Object.keys(words).join("|")})\\s+${unit}`, "giu"))) out.push(String(words[m[1].toLowerCase()]));
  return out.sort().join(",");
}
// Fragments are compared without the #id: legacy anchors differ per language (#oncesi vs #oncesi, #duruma-gore… vs #sections-added…).
const links = (s) => [...s.matchAll(/\]\(([^)#]+)(#[^)]*)?\)/g)].map((m) => m[1]).sort().join(" ");
// {name} in YAML, ${name} in ui.ts templates (plural switches like ${n === 1 ? …} are language-specific).
const holes = (s) => [...s.matchAll(/\{(\w+)\}|\$\{(\w+)\}/g)].map((m) => m[1] || m[2]).sort().join(",");
const bold = (s) => (s.match(/\*\*/g) || []).length;

export async function lint(root) {
  const strings = await collect(root);
  const problems = [];
  const add = (key, lang, msg, text) => problems.push({ key, lang, msg, text });
  for (const [key, v] of strings) {
    if (v.kind === "server") { // Turkish side is Code.gs (frozen); only our English rendering is linted
      for (const [re, msg] of [...BANNED.both, ...BANNED.en]) if (re.test(v.en)) add(key, "en", msg, v.en);
      continue;
    }
    for (const lang of ["tr", "en"]) {
      for (const [re, msg] of [...BANNED.both, ...BANNED[lang]]) {
        if (key.includes("units.accounting") && msg.startsWith("unit name")) continue; // the one place it is written
        if (/› docs\.ek1$|\.items\.\d+\.label$|\.rows\.\d+\.name$/.test(key) && /^running text/.test(msg)) continue; // document names (slot, download label, Formlar row)
        if (re.test(v[lang])) add(key, lang, msg, v[lang]);
      }
      if (lang === "tr" && v.tr.length > 40 && SHORT_IMPERATIVE.test(v.tr)) add(key, lang, "body text uses -iniz (\"iletiniz\"), not -in", v.tr);
      if (TITLE_KEY.test(key) && !NOT_TITLE.test(key)) {
        if (/\?\s*$/.test(v[lang])) add(key, lang, "titles are not questions", v[lang]);
        if (!titleCase(v[lang])) add(key, lang, "titles are in Title Case", v[lang]);
      }
    }
    if (holes(v.tr) !== holes(v.en)) add(key, "both", `placeholders differ: {${holes(v.tr)}} vs {${holes(v.en)}}`, `${v.tr} | ${v.en}`);
    if (links(v.tr) !== links(v.en)) add(key, "both", `link targets differ: ${links(v.tr)} vs ${links(v.en)}`, `${v.tr} | ${v.en}`);
    if (bold(v.tr) !== bold(v.en)) add(key, "both", `bold spans differ: ${bold(v.tr) / 2} vs ${bold(v.en) / 2}`, `${v.tr} | ${v.en}`);
    if (!v.fn && numbers(v.tr, "tr") !== numbers(v.en, "en")) add(key, "both", `numbers differ: [${numbers(v.tr, "tr")}] vs [${numbers(v.en, "en")}]`, `${v.tr} | ${v.en}`);
    if (!v.tr.trim() || !v.en.trim()) add(key, "both", "empty string", "");
  }
  return { problems, count: strings.size };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { problems, count } = await lint();
  for (const p of problems) console.log(`✘ ${p.key} [${p.lang}] ${p.msg}\n    ${p.text}`);
  console.log(problems.length ? `\n${problems.length} problem(s) in ${count} strings` : `copy lint: ${count} strings, 0 problems`);
  process.exit(problems.length ? 1 : 0);
}
