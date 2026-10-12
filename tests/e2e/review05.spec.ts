// REVIEW-05: the independent content audit (redesign-brief/audit/CONTENT-AUDIT.md, B-01…B-22) and the maintainer's
// Addition (H-01: one report and one submission per internship). One regression test per finding, on the built site.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { SETTINGS, SITE, open } from "./helpers";
import { longDateTime } from "../../src/lib/dates";

/** Visible text of a built page (tags dropped, entities decoded, whitespace collapsed). */
function text(rel: string): string {
  const html = readFileSync(join(SITE, rel, "index.html"), "utf8")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
  return html.replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
}
const html = (rel: string) => readFileSync(join(SITE, rel, "index.html"), "utf8");
const TR = { home: "", surec: "surec/", kurallar: "kurallar/", rapor: "rapor/", sss: "sss/", teslim: "teslim/" };
const EN = Object.fromEntries(Object.entries(TR).map(([k, v]) => [k, `en/${v}`])) as typeof TR;

// LANGUAGE-01 (D-183) shortened the wording; the rule is the same.
const LATE_DAY = { tr: "Son teslimden sonra başlayan her 24 saat 1 geç gün sayılır", en: "Every 24 hours that begin after the deadline count as 1 late day" };
// TR reworded by REVIEW-06 N-07.
const FIX_DOC = { tr: "eksik veya hatalı bir belgeyi tamamlamak üzere aynı stajın formunu yeniden göndermeyiniz", en: "do not submit the form again for the same internship" };
const ONE_REPORT = { tr: "Her staj için ayrı bir rapor hazırlanır; aynı şirkette yapılan farklı stajlar da ayrı raporlarla teslim edilir", en: "must be prepared for each internship; different internships completed at the same company are also submitted with separate reports" };
const PREV_WORKDAY = { tr: "bu günden önceki son iş gününe kadar gönder", en: "by the last workday before it" };   // LANGUAGE-01: active voice

test("B-01: SSS #appendices no longer says days are deducted only for late submission", () => {
  expect(text(TR.sss)).not.toContain("gün kesintisi yalnızca geç teslimde");
  expect(text(EN.sss)).not.toContain("deducted only for late submission");
  expect(text(TR.sss)).toContain("bu iki bölümün eklenmemesi gün kesintisine yol açmaz");
  expect(text(EN.sss)).toContain("leaving these two sections out does not lead to a deduction of days");
});

test("B-02: Rapor 'Bir Bakışta' says report faults may cost accepted days", () => {
  expect(text(TR.rapor)).toContain("değerlendirmede kabul edilen staj gününden kesinti yapılabilir");
  expect(text(EN.rapor)).toContain("may lead to a deduction from the accepted internship days");
});

test("B-03: the late-day definition is on Teslim, SSS, Kurallar and the Home board", async ({ page }) => {
  for (const rel of [TR.sss, TR.kurallar, TR.home]) expect(text(rel), rel).toContain(LATE_DAY.tr);
  for (const rel of [EN.sss, EN.kurallar, EN.home]) expect(text(rel), rel).toContain(LATE_DAY.en);
  await open(page, "teslim/");
  await expect(page.locator(".suf-deadline__rule")).toContainText(LATE_DAY.tr);
  await open(page, "en/teslim/");
  await expect(page.locator(".suf-deadline__rule")).toContainText(LATE_DAY.en);
});

test("B-04 + H-01: missing documents go by email with the reference; 'do not resubmit' is scoped to the same internship", async ({ page }) => {
  for (const rel of [TR.surec, TR.kurallar, TR.sss]) expect(text(rel), rel).toContain(FIX_DOC.tr);
  for (const rel of [EN.surec, EN.kurallar, EN.sss]) expect(text(rel), rel).toContain(FIX_DOC.en);
  // The receipt and the duplicate-guard refusal.
  for (const [lang, base] of [["tr", "teslim/"], ["en", "en/teslim/"]] as const) {
    await open(page, `${base}?preview=done`);
    const receipt = page.locator(".suf-receipt, [class*='suf-done']").first();
    await expect(receipt).toContainText(FIX_DOC[lang]);
    await open(page, `${base}?preview=red`);
    await expect(page.locator(".suf-step")).toContainText(lang === "tr" ? "Aynı staj için belgeleri başka bir sekmeden" : "sent the documents for the same internship from another tab");
  }
  // Nowhere does the site tell a student not to resubmit without saying "for the same internship".
  for (const rel of Object.values(TR)) for (const m of text(rel).matchAll(/[^.]*yeniden göndermeyiniz[^.]*/g)) expect(m[0], rel).toMatch(/aynı staj/);
  expect(text(TR.teslim)).not.toContain("Hatalı belge yüklediyseniz formu yeniden göndermeyiniz");
});

test("B-06: Kurallar has no per-section 'Kaynak: Internship Handbook' line; the lede keeps the Handbook sentence", () => {
  for (const [rel, word] of [[TR.kurallar, "Kaynak:"], [EN.kurallar, "Source:"]] as const) {
    expect(html(rel)).not.toContain("sec__src");
    expect(text(rel)).not.toContain(`${word} Internship Handbook`);
  }
  expect(text(TR.kurallar)).toContain("Internship Handbook esas alınarak özetlenmiştir");
});

test("B-07: results are announced periodically; nothing says 'at regular intervals' or that results are published on the site", async ({ page }) => {
  expect(text(TR.home)).not.toContain("düzenli aralıklarla");
  expect(text(EN.home)).not.toContain("regular intervals");
  expect(text(TR.home)).toContain("Sonuçlar için duyuruları ve Sonuçlar sayfasını takip ediniz");
  // D-182 (maintainer): the board's results row and its detail sentence are gone; "periodically" stays in the phase list.
  expect(text(TR.home)).toContain("sonuçlar periyodik olarak ilan edilir");
  await open(page, "teslim/?preview=done");
  await expect(page.locator(".suf-step, .suf-receipt").first()).toContainText("Değerlendirme sonuçları periyodik olarak ilan edilir");
});

test("B-08: the upper limit is in workdays", () => {
  expect(text(TR.sss)).toContain("46–47 iş gününü aşmaması");
  expect(text(TR.sss)).toContain("40 iş gününe yakın");
  expect(text(EN.sss)).toContain("not exceed 46–47 workdays");
});

test("B-09: the government-contribution card asks for a completely filled-in EK-1", async ({ page }) => {
  await open(page, "teslim/?preview=kimlik");
  await expect(page.locator(".suf-step")).toContainText("Yüklemeden önce EK-1'in eksiksiz doldurulduğundan emin olunuz");
  await open(page, "en/teslim/?preview=kimlik");
  await expect(page.locator(".suf-step")).toContainText("make sure that the EK-1 is filled in completely");
});

test("B-10: Home 'Stajdan Sonra' lists the conditional documents and the deadline", () => {
  // Lower case since REVIEW-06 N-04.
  expect(text(TR.home)).toContain("ve varsa Cumartesi Yazısı ile ödeme dekontu veya bordro ve EK-1 'i son teslim tarihine kadar");
  expect(text(EN.home)).toContain("if applicable, the Saturday Work Letter and the payment receipt or payslip with the EK-1 online by the deadline");
});

test("B-12: the search index carries the deadline dates from settings.yml and no leftover placeholder or gap", () => {
  const d = SETTINGS.donem;
  const deadlineMs = Date.parse(`${d.teslim_kilit.replace(" ", "T")}:00+03:00`);
  const closesMs = deadlineMs + Number(d.gec_teslim_gun) * 86_400_000;
  for (const lang of ["tr", "en"] as const) {
    const docs = JSON.parse(readFileSync(join(SITE, "search", `${lang}.json`), "utf8")).docs as { u: string; t: string; b: string }[];
    for (const x of docs) {
      expect(`${x.t} ${x.b}`, x.u).not.toMatch(/\{\w+\}/);
      expect(x.b, x.u).not.toMatch(/ {2}| [.,;]|\(\s*\)/);
    }
    const box = docs.find((x) => x.u === (lang === "en" ? "/staj/en/teslim/" : "/staj/teslim/"))!;
    expect(box.b).toContain(longDateTime(lang, deadlineMs));
    expect(box.b).toContain(longDateTime(lang, closesMs));
  }
});

test("B-14: the live Home and Teslim anchors exist again", () => {
  for (const [rel, ids] of [[TR.home, ["onemli-tarihler", "staj-sureci", "iletisim"]], [EN.home, ["important-dates", "internship-process", "contact"]],
    [TR.teslim, ["gonderemiyorsanz"]], [EN.teslim, ["if-you-cannot-submit"]]] as const)
    for (const id of ids) expect(html(rel).match(new RegExp(`\\sid="${id}"`, "g"))?.length ?? 0, `${rel}#${id}`).toBe(1);
  // The footer's #iletisim alias is on Home only (the İletişim page's own h1 is #iletisim).
  expect(html("iletisim/").match(/\sid="iletisim"/g)?.length).toBe(1);
});

test("B-15, B-16, B-21: Kurallar 2.7 'may consult', Topic Guide 'common fields', SSS Summer School consultation", () => {
  const k = text(TR.kurallar), ke = text(EN.kurallar);
  expect(k).toContain("Önce staj koordinatörüne veya staj asistanlarına danışabilirsiniz");
  expect(k).not.toContain("Başvurmadan önce");
  expect(ke).toContain("You may first consult the internship coordinator or the internship assistants");
  expect(k).toContain("Sık görülen alanlar şunlardır");
  expect(ke).toContain("Common fields include information technology");
  expect(text(TR.sss)).toContain("Bu tarihlerle çakışan bir staj planlıyorsanız önce staj asistanlarına");
  expect(text(EN.sss)).toContain("If you are planning an internship that overlaps with these dates");
});

test("B-17: footer sends EK-1 submissions to the coordinator and all other questions to the assistants", () => {
  const i = SETTINGS.iletisim;
  for (const rel of ["", "kurallar/", "teslim/"]) {
    const s = text(rel);
    expect(s).toContain(`EK-1 gönderimi için staj koordinatörü: ${i.staj_sorumlusu.ad} (${i.staj_sorumlusu.eposta}). Diğer sorularınızı staj asistanlarına iletiniz.`);
    expect(s).not.toContain("EK-1 ile ilgili konularda");
  }
  expect(text("en/")).toContain(`EK-1 submissions: the internship coordinator, ${i.staj_sorumlusu.ad} (${i.staj_sorumlusu.eposta}). Send all other questions to the internship assistants.`);
});

test("B-18: the EK-1 previous-workday rule is on Süreç (callout and rail) and SSS", () => {
  const s = html(TR.surec);
  expect(text(TR.surec).split(PREV_WORKDAY.tr).length - 1).toBeGreaterThanOrEqual(2); // callout + rail fact
  expect(s).toContain("en geç gönderim günü hafta sonuna veya resmî tatile denk gelirse");
  expect(text(TR.sss)).toContain(PREV_WORKDAY.tr);
  expect(text(EN.surec)).toContain(PREV_WORKDAY.en);
  expect(text(EN.sss)).toContain(PREV_WORKDAY.en);
});

test("B-19, B-20, B-22: EN article, Süreç submission statement, one timetable-template name", () => {
  expect(text(EN.teslim)).not.toContain("a academic");
  expect(text(TR.surec)).not.toContain("o gün teslim ettiğinizi gösteren bir belgeyi");
  expect(text(TR.surec)).toContain("yüklediğiniz belgelerin size ait, eksiksiz ve doğru olduğunu onaylarsınız");
  for (const [rel, name] of [[TR.surec, "Staj Timetable Şablonu"], [TR.rapor, "Staj Timetable Şablonu"], [EN.surec, "Internship Timetable Template"], [EN.rapor, "Internship Timetable Template"]] as const) {
    const links = [...html(rel).matchAll(/<a[^>]*Internship-Timetable\.docx[^>]*>([\s\S]*?)<\/a>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
    expect(links.length, rel).toBeGreaterThan(0);
    for (const l of links) expect(l, rel).toBe(name);
  }
});

test("H-01: one report per internship on Kurallar, Rapor and SSS; one submission per internship on SSS and Teslim", async ({ page }) => {
  for (const rel of [TR.kurallar, TR.rapor, TR.sss]) expect(text(rel), rel).toContain(ONE_REPORT.tr);
  for (const rel of [EN.kurallar, EN.rapor, EN.sss]) expect(text(rel), rel).toContain(ONE_REPORT.en);
  expect(html(TR.kurallar)).toContain('id="k-3-8"');
  expect(html(TR.sss)).toContain('id="ayri-rapor"');
  expect(html(EN.sss)).toContain('id="separate-reports"');
  expect(text(TR.sss)).toContain("formu her staj için ayrı ayrı gönderiniz");
  await open(page, "teslim/");
  await expect(page.locator("#suf-multiple")).toContainText("formu her staj için ayrı ayrı gönderiniz");
  await open(page, "en/teslim/");
  await expect(page.locator("#suf-multiple")).toContainText("submit the form separately for each internship");
});
