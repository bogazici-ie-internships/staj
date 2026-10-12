// main.py → src/lib/calendar.ts. Two checks:
//  1. golden: the port reproduces Python's output (tests/baseline/calendar-golden.json) on the settings it was
//     recorded from, frozen in tests/baseline/calendar-settings.yml (UPDATE-07, D-144: main.py and its recorder
//     were removed with MkDocs; they remain in the pre-redesign tag);
//  2. main.py's own self-test, assertion for assertion.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { seritGeometrisi, sonTeslimMetni, type TakvimRow } from "../../src/lib/calendar";
import { dayIndex, parseLock, parseTrDate, type Ymd } from "../../src/lib/dates";

const golden = JSON.parse(readFileSync("tests/baseline/calendar-golden.json", "utf8"));
const settings = YAML.parse(readFileSync("tests/baseline/calendar-settings.yml", "utf8"));

describe("golden: main.py on the recorded settings", () => {
  const bas = parseTrDate(settings.serit_baslangic)!;
  const bit = parseTrDate(settings.serit_bitis)!;
  const kilit = parseLock(settings.donem.teslim_kilit);
  it.each(["tr", "en"] as const)("%s geometry is identical", (lang) => {
    expect(seritGeometrisi(settings.takvim, bas, bit, lang === "en", kilit)).toEqual(golden[lang]);
  });
  it("deadline text is identical", () => {
    expect(sonTeslimMetni(kilit)).toBe(golden.son_teslim.tr);
    expect(sonTeslimMetni(kilit, true)).toBe(golden.son_teslim.en);
  });
});

describe("main.py self-test (ported 1:1)", () => {
  const bas = parseTrDate("15 Mayıs 2026")!, bit = parseTrDate("31 Ağustos 2027")!;
  const takvim: TakvimRow[] = [
    { baslangic: "24 Haziran 2026", bitis: "12 Ağustos 2026", baslik: "Yaz Okulu", baslik_en: "Summer School",
      baslangic_en: "June 24, 2026", bitis_en: "August 12, 2026", kategori: "akademik", staj_durum: "kosullu" },
    { baslangic: "21 Eylül 2026", bitis: "22 Aralık 2026", baslik: "Güz Dönemi", baslik_en: "Fall Semester",
      baslangic_en: "September 21, 2026", bitis_en: "December 22, 2026", kategori: "akademik", staj_durum: "kapali" },
    { tarih: "12 Ekim 2026", tarih_en: "October 12, 2026", baslik: "Teslim", baslik_en: "Deadline", kategori: "teslim" },
    { baslangic: "9 Şubat 2026", bitis: "1 Mayıs 2026", baslik: "ARALIK DIŞI", baslik_en: "OUT OF RANGE",
      kategori: "akademik", staj_durum: "kapali" },
    { baslangic: "9 Şubat 2026", bitis: "15 Mayıs 2026", baslik: "SINIRDA", baslik_en: "ON BOUNDARY",
      kategori: "akademik", staj_durum: "kapali" },
  ];
  const g = seritGeometrisi(takvim, bas, bit);
  const toplam = dayIndex(bit) - dayIndex(bas) + 1;
  const pct = (a: Ymd) => ((dayIndex(a) - dayIndex(bas)) / toplam) * 100;

  it("474 days in range", () => expect(toplam).toBe(474));
  it("Summer School starts 40 days in, conditional", () => {
    const yaz = g.bloklar.find((b) => b.anahtar === "Yaz Okulu")!;
    expect(Math.abs(yaz.sol - (40 / toplam) * 100)).toBeLessThan(0.01);
    expect(yaz.kategori).toBe("cond");
  });
  it("end date is inclusive", () => {
    const guz = g.bloklar.find((b) => b.anahtar === "Güz Dönemi")!;
    expect(Math.abs(guz.sol + guz.genislik - pct({ y: 2026, m: 12, d: 23 }))).toBeLessThan(0.01);
  });
  it("a row ending before the strip is never drawn", () => {
    expect(g.bloklar.filter((b) => b.anahtar === "ARALIK DIŞI")).toEqual([]);
  });
  it("a row ending on the strip start draws a one-day slice", () => {
    const s = g.bloklar.filter((b) => b.anahtar === "SINIRDA");
    expect(s).toHaveLength(1);
    expect(s[0].sol).toBe(0);
    expect(Math.abs(s[0].genislik - (1 / toplam) * 100)).toBeLessThan(0.01);
  });
  it("partial first month is labelled; labels ascend", () => {
    expect(g.aylar[0].etiket).toBe("May");
    g.aylar.slice(1).forEach((a, i) => expect(g.aylar[i].orta).toBeLessThan(a.orta));
    expect(g.isaretler).toHaveLength(1);
    expect(g.isaretler[0].etiket).toBe("12 Ekim");
  });
  it("list holds only real periods and deadlines", () => {
    expect(g.liste.every((x) => ["kapali", "kosullu", "teslim"].includes(x.tur))).toBe(true);
    expect(g.liste.map((x) => x.ad)).toEqual(["SINIRDA", "Yaz Okulu", "Güz Dönemi", "Teslim"]);
  });
  it("teslim_kilit drives the deadline text; a mismatching row is a build error", () => {
    const kilit = parseLock("2026-10-12 10:00");
    expect(kilit?.date).toEqual({ y: 2026, m: 10, d: 12 });
    expect(kilit?.time).toBe("10:00");
    expect(sonTeslimMetni(kilit)).toBe("12 Ekim 2026, 10:00");
    expect(sonTeslimMetni(kilit, true)).toBe("October 12, 2026, 10:00");
    expect(parseLock("")).toBeNull();
    expect(sonTeslimMetni(null)).toBe("");
    const gk = seritGeometrisi(takvim, bas, bit, false, kilit);
    expect(gk.liste.filter((x) => x.tur === "teslim").map((x) => x.aralik)).toEqual(["12 Ekim 2026, 10:00"]);
    expect(() => seritGeometrisi(takvim, bas, bit, false, parseLock("2026-10-13 10:00"))).toThrow(/uyuşmuyor/);
  });
  it("a period with no announced date goes to the end of the list, not on the strip", () => {
    const gb = seritGeometrisi([...takvim, { tarih: "Güncellenecektir", baslik: "Bahar 2027", staj_durum: "kapali" }], bas, bit);
    expect(gb.liste.at(-1)).toMatchObject({ ad: "Bahar 2027", aralik: "Güncellenecektir", anahtar: "" });
    expect(gb.bloklar.find((b) => b.anahtar === "Bahar 2027")).toBeUndefined();
  });
});
