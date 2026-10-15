// settings.yml — the single source of truth (same path, same schema as the
// MkDocs site). Read once at build time and validated; a typo fails the build
// with a Turkish message instead of shipping a wrong date.
// Build-only module (uses node:fs) — never import it from an island.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "astro/zod";
import YAML from "yaml";
import { seritGeometrisi, type TakvimRow } from "./calendar";
import { DAY_MS, parseEnDate, parseLock, parseTrDate, sameDay, type Ymd } from "./dates";

const TakvimSchema = z.object({
  tarih: z.string().optional(), tarih_en: z.string().optional(),
  baslangic: z.string().optional(), bitis: z.string().optional(),
  baslangic_en: z.string().optional(), bitis_en: z.string().optional(),
  baslik: z.string().min(1), baslik_en: z.string().optional(),
  kategori: z.string().optional(),
  staj_durum: z.enum(["kapali", "kosullu"]).optional(),
  notu: z.string().optional(), notu_en: z.string().optional(),
});

const SettingsSchema = z.object({
  donem: z.object({
    contract_version: z.number().int(),
    campaign_id: z.string().min(1),
    etiket: z.string().min(1),
    etiket_en: z.string().min(1),
    year_done: z.number().int(),
    semester: z.string().min(1),
    staj_baslangic: z.string(),
    staj_bitis: z.string(),
    teslim_kilit: z.string(),
    gec_teslim_gun: z.number().int().min(0),
  }),
  iletisim: z.object({
    genel_eposta: z.string().email(),
    hesap_isleri_eposta: z.string().email(),
    staj_sorumlusu: z.object({ ad: z.string(), eposta: z.string().email() }),
    staj_asistanlari: z.array(z.object({ ad: z.string(), eposta: z.string().email() })),
  }),
  baglantilar: z.object({
    portal_url: z.string().url(),
    form_key: z.string(),
    recaptcha_site_key: z.string(),
  }),
  /** Optional one-line remark under the results file on Sonuçlar (RESULTS-01), e.g. that late submissions follow. */
  sonuclar: z.object({ not: z.string().default(""), not_en: z.string().default("") }).strict()
    .refine((o) => !o.not === !o.not_en, "sonuclar.not ve not_en birlikte doldurulmalı").default({ not: "", not_en: "" }),
  serit_baslangic: z.string(),
  serit_bitis: z.string(),
  takvim: z.array(TakvimSchema),
  /** Optional site-wide announcement band (UPDATE-06 Phase 2b): TR/EN message (inline Markdown) shown
   *  above the deadline strip until `bitis` ("YYYY-MM-DD HH:MM", Türkiye time). Absent or past = no band. */
  /** Optional site-wide band (D-95). Students can close it unless `kapatilamaz: true` (urgent notices, D-102). */
  duyuru: z.object({ mesaj: z.string().min(1), mesaj_en: z.string().min(1), bitis: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
    kapatilamaz: z.boolean().default(false) }).strict().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

// STAJ_SETTINGS: test builds only (the announcement-band e2e builds with a sample `duyuru`); deploys never set it.
export function loadSettings(path = resolve(process.cwd(), process.env.STAJ_SETTINGS || "settings.yml")): Settings {
  const raw = YAML.parse(readFileSync(path, "utf8"));
  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("settings.yml geçersiz:\n" + parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
  }
  const s = parsed.data;
  // *_en strings are display copies of the Turkish dates: they must name the same day.
  for (const row of s.takvim) {
    for (const [tr, en] of [["tarih", "tarih_en"], ["baslangic", "baslangic_en"], ["bitis", "bitis_en"]] as const) {
      const a = parseTrDate(row[tr]), b = parseEnDate(row[en]);
      if (a && row[en] !== undefined && (!b || !sameDay(a, b))) {
        throw new Error(`settings.yml takvim "${row.baslik}": ${en} (${row[en]}) ${tr} (${row[tr]}) ile aynı gün değil`);
      }
    }
  }
  if (!parseTrDate(s.serit_baslangic) || !parseTrDate(s.serit_bitis)) {
    throw new Error("serit_baslangic / serit_bitis okunamadı — biçim: '15 Mayıs 2026'");
  }
  if (s.donem.teslim_kilit && !parseLock(s.donem.teslim_kilit)) {
    throw new Error("donem.teslim_kilit biçimi 'YYYY-MM-DD HH:MM' olmalı");
  }
  return s;
}

/** Everything the pages need, derived once. */
export function deriveSite(s: Settings) {
  const lock = parseLock(s.donem.teslim_kilit);
  const graceDays = s.donem.gec_teslim_gun;
  const stripStart = parseTrDate(s.serit_baslangic)!;
  const stripEnd = parseTrDate(s.serit_bitis)!;
  const takvim = s.takvim as TakvimRow[];
  // Throws when the calendar's deadline row and teslim_kilit disagree (as main.py did).
  const serit = { tr: seritGeometrisi(takvim, stripStart, stripEnd, false, lock), en: seritGeometrisi(takvim, stripStart, stripEnd, true, lock) };
  const terms = takvim
    .filter((r) => r.staj_durum)
    .map((r) => ({ row: r, start: parseTrDate(r.baslangic ?? r.tarih), end: parseTrDate(r.bitis ?? r.tarih) }));
  return {
    term: { tr: s.donem.etiket, en: s.donem.etiket_en },
    lock,
    deadlineMs: lock?.ms ?? null,
    graceDays,
    closesMs: lock ? lock.ms + graceDays * DAY_MS : null,
    stripStart, stripEnd, serit, terms,
  };
}
export type Site = ReturnType<typeof deriveSite>;
export type Term = { row: TakvimRow; start: Ymd | null; end: Ymd | null };

/**
 * form_key is injected by deploy.yml (regex into settings.yml, as before).
 * CI must never publish a keyless portal; a local build only warns.
 */
export function formKey(s: Settings): string {
  const key = s.baglantilar.form_key;
  if (!key && process.env.CI) {
    throw new Error("form anahtari tanimsiz — FORM_KEY sırrı settings.yml'e yazılmadı (deploy.yml)");
  }
  return key;
}

export const settings = loadSettings();
export const site = deriveSite(settings);

/** The announcement to show at `now`, or null (absent, or its end time has passed). */
export interface Announcement { tr: string; en: string; untilMs: number; id: string; dismissible: boolean }
export function activeAnnouncement(s: Pick<Settings, "duyuru">, now = Date.now()): Announcement | null {
  if (!s.duyuru) return null;
  const until = parseLock(s.duyuru.bitis);
  if (!until || until.ms <= now) return null;
  // The id is a digest of the texts and the end time: closing one notice never hides a new or edited one.
  const id = createHash("sha256").update([s.duyuru.mesaj, s.duyuru.mesaj_en, s.duyuru.bitis].join("\u0000")).digest("hex").slice(0, 12);
  return { tr: s.duyuru.mesaj, en: s.duyuru.mesaj_en, untilMs: until.ms, id, dismissible: !s.duyuru.kapatilamaz };
}
