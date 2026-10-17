// TypeScript port of main.py (the MkDocs strip geometry), kept 1:1 so the
// golden test (tests/unit/calendar.test.ts) can compare against Python's
// output on the real settings.yml. Field names stay Turkish on purpose: they
// are main.py's, and the golden file uses them.
//
// The list shows ONLY real periods and the deadline. "Internship possible"
// gaps are deliberately not rows (they live in the strip as background).
import { AY_KISA_EN, AY_KISA_TR, AY_TAM, MONTHS_EN, dayIndex, fromDayIndex, iso, parseTrDate, sameDay, ymdKey, type Lock, type Ymd } from "./dates";

export const MIN_ETIKET_GENISLIK = 2.2;

export interface TakvimRow {
  tarih?: string; tarih_en?: string;
  baslangic?: string; bitis?: string; baslangic_en?: string; bitis_en?: string;
  baslik: string; baslik_en?: string;
  kategori?: string; staj_durum?: "kapali" | "kosullu";
  notu?: string; notu_en?: string;
}

/** Python's round(x, 2) for the values this module produces. */
const r2 = (x: number) => Number(x.toFixed(2));

const ayInclusiveEnd = (a: Ymd): Ymd => fromDayIndex(dayIndex({ y: a.m === 12 ? a.y + 1 : a.y, m: (a.m % 12) + 1, d: 1 }) - 1);
const trTarih = (a: Ymd) => `${a.d} ${AY_TAM[a.m - 1]} ${a.y}`;
const enTarih = (a: Ymd) => `${MONTHS_EN[a.m - 1]} ${a.d}, ${a.y}`;

/** main.py son_teslim_metni: "12 Ekim 2026, 10:00" / "October 12, 2026, 10:00" */
export function sonTeslimMetni(kilit: Lock | null, ingilizce = false): string {
  if (!kilit) return "";
  return `${ingilizce ? enTarih(kilit.date) : trTarih(kilit.date)}, ${kilit.time}`;
}

const max = (a: Ymd, b: Ymd) => (ymdKey(a) >= ymdKey(b) ? a : b);
const min = (a: Ymd, b: Ymd) => (ymdKey(a) <= ymdKey(b) ? a : b);

export function seritGeometrisi(takvim: TakvimRow[], bas: Ymd, bit: Ymd, ingilizce = false, kilit: Lock | null = null) {
  const toplam = dayIndex(bit) - dayIndex(bas) + 1;
  if (toplam <= 0) throw new Error("serit_bitis, serit_baslangic'tan sonra olmalı");
  const sol = (d: Ymd) => Math.max(0, Math.min(100, ((dayIndex(d) - dayIndex(bas)) / toplam) * 100));
  const sag = (d: Ymd) => Math.max(0, Math.min(100, ((dayIndex(d) - dayIndex(bas) + 1) / toplam) * 100));

  const aylar: { etiket: string; orta: number }[] = [];
  let imlec: Ymd = { y: bas.y, m: bas.m, d: 1 };
  while (ymdKey(imlec) <= ymdKey(bit)) {
    const gb = max(imlec, bas), gs = min(ayInclusiveEnd(imlec), bit);
    if (ymdKey(gb) <= ymdKey(gs)) {
      const L = sol(gb), R = sag(gs);
      if (R - L >= MIN_ETIKET_GENISLIK) {
        aylar.push({ etiket: (ingilizce ? AY_KISA_EN : AY_KISA_TR)[imlec.m - 1], orta: r2((L + R) / 2) });
      }
    }
    imlec = { y: imlec.m === 12 ? imlec.y + 1 : imlec.y, m: (imlec.m % 12) + 1, d: 1 };
  }

  const METIN = ingilizce
    ? { v_kosullu: "Conditional", v_kapali: "Not possible", v_teslim: "Deadline" }
    : { v_kosullu: "Koşullu", v_kapali: "Yapılamaz", v_teslim: "Son teslim" };

  const bloklar: { anahtar: string; kategori: "cond" | "block"; sol: number; genislik: number; aralik: string }[] = [];
  const isaretler: { anahtar: string; sol: number; aralik: string; etiket: string }[] = [];
  const dolu: [Ymd, Ymd, string, TakvimRow][] = [];
  const teslimler: [Ymd, string, string][] = [];
  const belirsiz: TakvimRow[] = [];

  for (const e of takvim) {
    const ad = (ingilizce ? e.baslik_en : e.baslik) || e.baslik || "";
    if (e.staj_durum) {
      const b = parseTrDate(e.baslangic || e.tarih);
      const s = parseTrDate(e.bitis || e.tarih);
      if (!b || !s) { belirsiz.push(e); continue; }
      if (ymdKey(s) < ymdKey(bas) || ymdKey(b) > ymdKey(bit)) continue;
      const L = sol(max(b, bas)), R = sag(min(s, bit));
      if (R <= L) continue;
      const aralik = ingilizce ? `${e.baslangic_en ?? ""} – ${e.bitis_en ?? ""}` : `${e.baslangic ?? ""} – ${e.bitis ?? ""}`;
      bloklar.push({ anahtar: ad, kategori: e.staj_durum === "kosullu" ? "cond" : "block", sol: r2(L), genislik: r2(R - L), aralik });
      dolu.push([b, s, e.staj_durum, e]);
    } else if (e.kategori === "teslim") {
      const t = parseTrDate(e.tarih || e.baslangic);
      if (t && kilit && !sameDay(t, kilit.date)) {
        throw new Error(`takvim teslim tarihi (${e.tarih}) donem.teslim_kilit (${iso(kilit.date)}) ile uyuşmuyor — ikisini aynı güne getirin`);
      }
      if (!t || ymdKey(t) < ymdKey(bas) || ymdKey(t) > ymdKey(bit)) continue;
      let etiket: string, aralik: string;
      if (ingilizce) { etiket = `${MONTHS_EN[t.m - 1]} ${t.d}`; aralik = e.tarih_en || e.baslangic_en || ""; }
      else { etiket = `${t.d} ${AY_TAM[t.m - 1]}`; aralik = e.tarih || e.baslangic || ""; }
      if (kilit && sameDay(t, kilit.date)) aralik = sonTeslimMetni(kilit, ingilizce);
      isaretler.push({ anahtar: ad, sol: r2(sol(t)), aralik, etiket });
      teslimler.push([t, ad, aralik]);
    }
  }

  type Satir = { tur: "kapali" | "kosullu" | "teslim"; ad: string; hukum: string; anahtar: string; notu: string; aralik: string };
  const sirali: (Satir & { sirala: number })[] = [];
  for (const [b, , tur, k] of dolu) {
    const ad = (ingilizce ? k.baslik_en : k.baslik) || "";
    sirali.push({
      tur: tur === "kosullu" ? "kosullu" : "kapali", ad,
      hukum: tur === "kosullu" ? METIN.v_kosullu : METIN.v_kapali, anahtar: ad,
      notu: (ingilizce ? k.notu_en : k.notu) || "",
      aralik: ingilizce ? `${k.baslangic_en ?? ""} – ${k.bitis_en ?? ""}` : `${k.baslangic ?? ""} – ${k.bitis ?? ""}`,
      sirala: ymdKey(b),
    });
  }
  for (const [t, ad, aralik] of teslimler) {
    sirali.push({ tur: "teslim", ad, hukum: METIN.v_teslim, anahtar: ad, notu: "", aralik, sirala: ymdKey(t) });
  }
  // Python's sort is stable; so is Array.prototype.sort.
  sirali.sort((a, b) => a.sirala - b.sirala);
  const liste: Satir[] = sirali.map(({ sirala: _s, ...x }) => x);
  for (const e of belirsiz) {
    liste.push({
      tur: e.staj_durum === "kosullu" ? "kosullu" : "kapali",
      ad: (ingilizce ? e.baslik_en : e.baslik) || "",
      hukum: e.staj_durum === "kosullu" ? METIN.v_kosullu : METIN.v_kapali,
      anahtar: "", notu: (ingilizce ? e.notu_en : e.notu) || "",
      aralik: (ingilizce ? e.tarih_en : e.tarih) || "",
    });
  }
  return { aylar, bloklar, isaretler, liste, bas_yil: bas.y, bit_yil: bit.y, bas_iso: iso(bas), bit_iso: iso(bit) };
}
export type Serit = ReturnType<typeof seritGeometrisi>;
