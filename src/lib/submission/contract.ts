// The submission contract with the Apps Script portal (_maintainer/Code.gs).
// FROZEN: payload shape, endpoint, validations and analytics codes are the
// same as the MkDocs site's docs/assets/submit.js (golden-tested in
// tests/e2e/contract.spec.ts against tests/baseline/contract-golden.json).
// Browser-safe; no DOM access here.

/** Per-document MB limits — must match FILE_MAP in Code.gs. */
export const MAX_MB = { rapor: 10, sicil: 5, anketi: 5, cumartesi: 5, dekont: 5, ek1: 1 } as const;
export const MAX_TOTAL_MB = 45;
export type DocKey = keyof typeof MAX_MB;
export const DOC_KEYS = Object.keys(MAX_MB) as DocKey[];
export const REQUIRED_KEYS: DocKey[] = ["rapor", "sicil", "anketi"];
export const SIT_KEYS = { saturday: ["cumartesi"], reimbursement: ["dekont", "ek1"] } as const satisfies Record<string, readonly DocKey[]>;
export type SitFlag = keyof typeof SIT_KEYS;
export type Flags = Record<SitFlag, boolean>;
export const CONTRACT_CACHE_TTL_MS = 10 * 60 * 1000;
export const CONTRACT_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 180_000;
export const MB = 1024 * 1024;

export interface Campaign {
  contractVersion: number; campaignId: string; term: string; yearDone: number; semester: string;
  internshipStart: string; internshipEnd: string; deadline: string; graceDays: number;
}

/** "örnek öğrenci" → "Örnek Öğrenci", "ikinci" → "İkinci" — mirrors titleCaseName_ in Code.gs. */
export function titleCaseName(raw: string): string {
  const upper = (ch: string) => (ch === "i" ? "İ" : ch === "ı" ? "I" : ch.toUpperCase());
  const lower = (s: string) => s.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();
  return String(raw || "").trim().split(/\s+/).map((word) =>
    word.split("-").map((part) => (part ? upper(part.charAt(0)) + lower(part.slice(1)) : part)).join("-"),
  ).join(" ");
}

export type ValidationCode =
  | "required_fields" | "sid_format" | "email_invalid" | "email_domain" | "missing_required"
  | "missing_situational" | "late_ack" | "total_size" | "not_verified" | "unavailable"
  | "request_id" | "closed" | "honeypot";

export const SID_RE = /^20\d{8}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DOMAIN_RE = /^std\.bogazici\.edu\.tr$/i;

export const checkName = (v: string): ValidationCode | null => (v.trim() ? null : "required_fields");
export function checkSid(v: string): ValidationCode | null {
  const s = v.trim();
  return !s ? "required_fields" : SID_RE.test(s) ? null : "sid_format";
}
export function checkEmail(v: string): ValidationCode | null {
  const s = v.trim();
  if (!s) return "required_fields";
  if (!EMAIL_RE.test(s)) return "email_invalid";
  return DOMAIN_RE.test(s.split("@")[1] || "") ? null : "email_domain";
}
/** As-you-type hint (submit.js input listeners): only a non-empty wrong value warns. */
export const liveSidOk = (v: string) => !v.trim() || SID_RE.test(v.trim());
export function liveEmailOk(v: string) {
  const s = v.trim();
  return !s || (EMAIL_RE.test(s) && DOMAIN_RE.test(s.split("@")[1] || ""));
}

export function requiredDocs(flags: Flags): { key: DocKey; situational: boolean }[] {
  const out = REQUIRED_KEYS.map((key) => ({ key, situational: false }));
  for (const f of Object.keys(SIT_KEYS) as SitFlag[]) {
    if (flags[f]) for (const key of SIT_KEYS[f]) out.push({ key, situational: true });
  }
  return out;
}

export type FileCheck = "ok" | "not_pdf" | "too_large";
/**
 * Client-side mirror of Code.gs: PDF by type or extension, size ≤ limit,
 * first bytes "%PDF-" and "%%EOF" within the last 2048 bytes (hasPdfEof_).
 * Reads only those two slices, never the whole file.
 */
export async function checkFile(key: DocKey, f: Pick<File, "name" | "type" | "size" | "slice">): Promise<FileCheck> {
  const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (!isPdf) return "not_pdf";
  if (f.size > MAX_MB[key] * MB) return "too_large";
  const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
  const sig = head.length === 5 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
  if (!sig) return "not_pdf";
  const tail = new Uint8Array(await f.slice(Math.max(0, f.size - 2048)).arrayBuffer());
  let s = "";
  for (const b of tail) s += String.fromCharCode(b);
  return s.includes("%%EOF") ? "ok" : "not_pdf";
}

/** submit.js sameContract — strict equality on every campaign field. */
export function sameContract(remote: unknown, c: Campaign): boolean {
  const r = remote as { ok?: unknown; open?: unknown; contract?: Record<string, unknown> } | null;
  const k = r?.contract;
  return !!(r && r.ok === true && r.open === true && k &&
    Number(k.contractVersion) === c.contractVersion &&
    String(k.campaignId) === c.campaignId &&
    String(k.term) === c.term &&
    Number(k.yearDone) === c.yearDone &&
    String(k.semester) === c.semester &&
    String(k.internshipStart) === c.internshipStart &&
    String(k.internshipEnd) === c.internshipEnd &&
    String(k.deadline || "") === c.deadline &&
    Number(k.graceDays || 0) === c.graceDays);
}
export const contractCacheKey = (c: Campaign) => `staj-contract:${c.contractVersion}:${c.campaignId}`;

export function createRequestId(cryptoApi: Crypto | null | undefined = globalThis.crypto): string {
  if (!cryptoApi) return "";
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi.getRandomValues !== "function") return "";
  const b = new Uint8Array(16);
  cryptoApi.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface PayloadInput {
  formKey: string; campaign: Campaign; requestId: string; recaptchaToken: string;
  name: string; studentId: string; email: string; flags: Flags; hp: string;
  files: Partial<Record<DocKey, { filename: string; dataB64: string }>>;
}
/** Exactly submit.js's payload: same keys, same order, same value types. */
export function buildPayload(p: PayloadInput) {
  const files: Record<string, { filename: string; mimeType: "application/pdf"; dataB64: string }> = {};
  for (const [k, f] of Object.entries(p.files)) if (f) files[k] = { filename: f.filename, mimeType: "application/pdf", dataB64: f.dataB64 };
  return {
    token: p.formKey, contractVersion: p.campaign.contractVersion,
    campaignId: p.campaign.campaignId, requestId: p.requestId,
    recaptchaToken: p.recaptchaToken,
    name: titleCaseName(p.name), studentId: p.studentId.trim(), email: p.email.trim(),
    flags: { saturday: !!p.flags.saturday, reimbursement: !!p.flags.reimbursement },
    hp: p.hp, files,
  };
}

// --- Server messages ------------------------------------------------------
// REVIEW-04 Note 1 (D-137): Code.gs answers in Turkish only, in its own wording. The site never shows that text
// for a known message: each server string maps to a site-authored TR/EN text (teslim.yaml › serverErrors, by the
// second column) that says what happened and what to do. Captured values (file name, MB, length) are kept.
// Unknown strings still pass through as raw text. The third column is the Umami reason code: unchanged.
// Keep in step with the `error:` strings in doPost (tests/unit/contract.test.ts reads Code.gs and checks each).
/** Code.gs CONFIG.DEDUP_SEC: the same e-mail address cannot start a second submission within this many seconds. */
export const DEDUP_SEC = 3;
export const SERVER_TEXT_KEYS = ["invalid_key", "captcha_failed", "invalid_request_id", "closed", "required_fields", "name_too_long",
  "name_invalid", "email_too_long", "email_invalid", "email_domain", "sid_format", "rate_limited", "bad_package", "unknown_field",
  "missing_doc", "missing_cumartesi", "missing_dekont", "missing_ek1", "bad_content", "total_size", "too_large", "not_pdf",
  "busy", "in_progress", "rollback", "contract_mismatch", "server_error"] as const;
export type ServerTextKey = (typeof SERVER_TEXT_KEYS)[number];
// [pattern (named groups: file, mb, max), site text key, Umami code, doc?]
export const SERVER_ERRORS: [RegExp, ServerTextKey, string, DocKey?][] = [
  [/^Geçersiz form anahtarı\.$/, "invalid_key", "invalid_key"],
  [/^Robot doğrulaması başarısız/, "captcha_failed", "captcha_failed"],
  [/^Geçersiz gönderim anahtarı/, "invalid_request_id", "invalid_request_id"],
  [/^Teslim süresi doldu/, "closed", "closed"],
  [/^Ad Soyad, Öğrenci No ve E-posta zorunludur\.$/, "required_fields", "required_fields"],
  [/^Ad Soyad çok uzun \(en fazla (?<max>\d+) karakter\)\.$/, "name_too_long", "name_too_long"],
  [/^Ad Soyad alanında geçersiz kontrol karakteri var\.$/, "name_invalid", "name_invalid"],
  [/^E-posta adresi çok uzun\.$/, "email_too_long", "email_too_long"],
  [/^Geçersiz e-posta\.$/, "email_invalid", "email_invalid"],
  [/^Lütfen @std\.bogazici\.edu\.tr/, "email_domain", "email_domain"],
  [/^Geçersiz öğrenci numarası/, "sid_format", "sid_format"],
  [/^Az önce bir gönderim aldık/, "rate_limited", "rate_limited"],
  [/^Belge paketi geçersiz\.$/, "bad_package", "bad_package"],
  [/^Tanınmayan belge alanı gönderildi\.$/, "unknown_field", "unknown_field"],
  [/^Eksik zorunlu belge: (?<file>.+)$/, "missing_doc", "missing_doc"],
  [/^Cumartesi çalışması için/, "missing_cumartesi", "missing_doc", "cumartesi"],
  [/^Geri ödeme için Ödeme Dekontu/, "missing_dekont", "missing_doc", "dekont"],
  [/^Geri ödeme için EK-1/, "missing_ek1", "missing_doc", "ek1"],
  [/^(?<file>.+) içeriği geçersiz\.$/, "bad_content", "bad_content"],
  // Before the generic "(.+) çok büyük" pattern, which would also match it.
  [/^Toplam boyut çok büyük \(>(?<mb>\d+) MB\)\.$/, "total_size", "total_size"],
  [/^(?<file>.+) çok büyük \(>(?<mb>\d+) MB\)\.$/, "too_large", "too_large"],
  [/^(?<file>.+) geçerli bir PDF değil\.$/, "not_pdf", "not_pdf"],
  [/^Teslim sunucusu önceki bir isteği tamamlıyor/, "busy", "busy"],
  [/^Bu teslim isteği hâlâ işleniyor/, "in_progress", "in_progress"],
  [/^Teslim tamamlanamadı/, "rollback", "rollback"],
  [/^Teslim dönemi yapılandırması uyuşmuyor/, "contract_mismatch", "contract_mismatch"],
  [/^Sunucu hatası, lütfen tekrar deneyin\.$/, "server_error", "server_error"],
];
export interface ServerError { key: ServerTextKey; code: string; doc: string; file: string; mb: string; max: string }
/** The site text a server error maps to, with its captured values; null for a string the site does not know. */
export function serverError(m: unknown): ServerError | null {
  const msg = String(m || "");
  for (const [re, key, code, docKey] of SERVER_ERRORS) {
    const hit = msg.match(re);
    if (!hit) continue;
    const g = hit.groups ?? {};
    const file = g.file ?? "";
    return { key, code, doc: docKey || (file ? SERVER_DOC[file.replace(/\.pdf$/i, "")] || "" : ""), file, mb: g.mb ?? "", max: g.max ?? "" };
  }
  return null;
}
/** The values a site text may use: {doc} {file} {mb} {max} {sec}. `docName` is the site's name for the document. */
export function serverVars(e: ServerError, docName?: string): Record<string, string> {
  const doc = docName ? (e.file ? `${docName} (${e.file})` : docName) : e.file;
  return { doc, file: e.file, mb: e.mb, max: e.max, sec: String(DEDUP_SEC) };
}
/** A site text with its values filled in (plain; the island renders it through md()). */
export const serverText = (template: string, e: ServerError, docName?: string) =>
  template.replace(/\{(doc|file|mb|max|sec)\}/g, (_, k) => serverVars(e, docName)[k]);
/** Server file names (Code.gs FILE_MAP) → slot keys, so `doc` reads the same for client and server errors. */
export const SERVER_DOC: Record<string, DocKey> = { rapor: "rapor", staj_sicil_formu: "sicil", staj_anketi: "anketi",
  cumartesi_yazisi: "cumartesi", dekont: "dekont", ek1: "ek1" };
export function serverCode(m: unknown): { code: string; doc: string } {
  const e = serverError(m);
  return e ? { code: e.code, doc: e.doc } : { code: "unknown", doc: "" };
}

/** Network-ish failure, as submit.js classified it. */
export const isNetworkError = (e: unknown) =>
  (e as Error)?.name === "AbortError" || /fetch|load failed|network|networkerror/i.test(String((e as Error)?.message ?? e));
