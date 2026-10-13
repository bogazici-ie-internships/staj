// The frozen portal contract, at unit level. The browser-level golden
// comparison lives in tests/e2e/contract.spec.ts.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  MAX_MB, MAX_TOTAL_MB, buildPayload, checkEmail, checkFile, checkName, checkSid, createRequestId,
  liveEmailOk, liveSidOk, requiredDocs, sameContract, serverCode, serverError, serverText, titleCaseName, type Campaign,
  DEDUP_SEC, SERVER_ERRORS, SERVER_TEXT_KEYS,
} from "../../src/lib/submission/contract";
import SAMPLE from "../../src/lib/submission/sample.json" with { type: "json" };

const golden = JSON.parse(readFileSync("tests/baseline/contract-golden.json", "utf8"));
const C: Campaign = { contractVersion: 1, campaignId: "2026-summer", term: "2026 Yaz", yearDone: 2026, semester: "Summer",
  internshipStart: "2026-05-16", internshipEnd: "2026-09-20", deadline: "2026-10-12 10:00", graceDays: 10 };

const pdfFile = (bytes: string, name = "a.pdf", type = "application/pdf") => new File([bytes], name, { type });

describe("names and fields (submit.js)", () => {
  it("title-cases Turkish names like Code.gs", () => {
    expect(titleCaseName("  örnek   öğrenci ")).toBe(SAMPLE.name);
    expect(titleCaseName("İKİNCİ ıssız-IŞILTI")).toBe("İkinci Issız-Işıltı");
    expect(titleCaseName("ikinci")).toBe("İkinci");
  });
  it("student id: 10 digits starting with 20", () => {
    expect(checkSid("")).toBe("required_fields");
    expect(checkSid("1099402001")).toBe("sid_format");
    expect(checkSid(` ${SAMPLE.sid} `)).toBeNull();
    expect(liveSidOk("")).toBe(true);
    expect(liveSidOk("20214")).toBe(false);
  });
  it("email: required → valid → student domain", () => {
    expect(checkEmail("")).toBe("required_fields");
    expect(checkEmail("ornek")).toBe("email_invalid");
    expect(checkEmail(SAMPLE.emailOther)).toBe("email_domain");
    expect(checkEmail("ORNEK.OGRENCI@STD.bogazici.edu.tr ")).toBeNull();
    expect(liveEmailOk(SAMPLE.emailOther)).toBe(false);
    expect(checkName("  ")).toBe("required_fields");
  });
  it("situations decide the extra slots", () => {
    expect(requiredDocs({ saturday: false, reimbursement: false }).map((d) => d.key)).toEqual(["rapor", "sicil", "anketi"]);
    expect(requiredDocs({ saturday: true, reimbursement: true }).map((d) => d.key)).toEqual(["rapor", "sicil", "anketi", "cumartesi", "dekont", "ek1"]);
  });
});

describe("file checks mirror Code.gs", () => {
  it("accepts a real PDF", async () => expect(await checkFile("rapor", pdfFile("%PDF-1.4\nxx\n%%EOF\n"))).toBe("ok"));
  it("rejects by type/extension", async () => expect(await checkFile("rapor", pdfFile("x", "a.docx", "application/msword"))).toBe("not_pdf"));
  it("rejects a renamed non-PDF (signature)", async () => expect(await checkFile("rapor", pdfFile("PK\u0003\u0004 %%EOF"))).toBe("not_pdf"));
  it("rejects a truncated PDF (no %%EOF in the last 2 KB)", async () =>
    expect(await checkFile("rapor", pdfFile("%PDF-1.4\n" + "x".repeat(4000)))).toBe("not_pdf"));
  it("size limit is strictly greater-than, per document", async () => {
    const at = (n: number) => pdfFile("%PDF-" + "x".repeat(n - 12) + "\n%%EOF\n");
    expect(await checkFile("ek1", at(1024 * 1024))).toBe("ok");
    expect(await checkFile("ek1", at(1024 * 1024 + 1))).toBe("too_large");
  });
  it("limits match FILE_MAP in Code.gs (when the local copy exists)", () => {
    expect(MAX_TOTAL_MB).toBe(45);
    const gs = "_maintainer/Code.gs";
    if (!existsSync(gs)) return;
    const src = readFileSync(gs, "utf8");
    for (const [k, mb] of Object.entries(MAX_MB)) expect(src).toMatch(new RegExp(`${k}:\\s*\\{[^}]*maxMb: ${mb}\\s*\\}`));
    expect(src).toMatch(/MAX_TOTAL_MB:\s+45/);
  });
});

describe("contract gate", () => {
  const ok = { ok: true, open: true, contract: { ...C } };
  it("matches only on every field, strictly", () => {
    expect(sameContract(ok, C)).toBe(true);
    expect(sameContract({ ...ok, open: false }, C)).toBe(false);
    for (const k of Object.keys(C) as (keyof Campaign)[]) {
      const bad = { ...ok, contract: { ...C, [k]: typeof C[k] === "number" ? (C[k] as number) + 1 : C[k] + "x" } };
      expect(sameContract(bad, C), k).toBe(false);
    }
  });
});

describe("payload", () => {
  it("has submit.js's keys in submit.js's order", () => {
    const p = buildPayload({ formKey: "k", campaign: C, requestId: "r", recaptchaToken: "t", name: SAMPLE.nameInput,
      studentId: ` ${SAMPLE.sid} `, email: ` ${SAMPLE.emailMixed} `, flags: { saturday: true, reimbursement: false }, hp: "",
      files: { rapor: { filename: "r.pdf", dataB64: "AA==" } } });
    expect(Object.keys(p)).toEqual(golden.happy_saturday.requests[1].keys);
    expect(p).toMatchObject({ name: SAMPLE.name, studentId: SAMPLE.sid, email: SAMPLE.emailMixed,
      flags: { saturday: true, reimbursement: false }, files: { rapor: { filename: "r.pdf", mimeType: "application/pdf", dataB64: "AA==" } } });
  });
  it("request ids are v4 UUIDs, also without randomUUID", () => {
    expect(createRequestId()).toMatch(/^[0-9a-f-]{36}$/);
    const noUuid = { getRandomValues: (a: Uint8Array<ArrayBuffer>) => crypto.getRandomValues(a) } as unknown as Crypto;
    expect(createRequestId(noUuid)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createRequestId(null as unknown as Crypto)).toBe("");
  });
});

describe("server messages", () => {
  // REVIEW-04 Note 1 (D-137): known server strings become the site's own TR/EN texts (teslim.yaml › serverErrors).
  const T = YAML.parse(readFileSync("src/content/pages/teslim.yaml", "utf8")).serverErrors as Record<string, { tr: string; en: string }>;
  const say = (m: string, lang: "tr" | "en", docName?: string) => { const e = serverError(m); return e ? serverText(T[e.key][lang], e, docName) : m; };
  it("shows the site's text for known errors (TR and EN), keeps captured values, passes unknown ones", () => {
    expect(say("Geçersiz e-posta.", "en")).toBe("The email address is not valid. Check it in the Student Information step.");
    expect(say("Geçersiz e-posta.", "tr")).toBe("E-posta adresi geçerli değil. Öğrenci Bilgileri adımında adresinizi kontrol ediniz.");
    expect(say("rapor.pdf çok büyük (>10 MB).", "en", "Internship Report")).toBe("Internship Report (rapor.pdf) can be at most 10 MB. Make the file smaller and select it again in the Documents step.");
    expect(say("rapor.pdf çok büyük (>10 MB).", "tr")).toContain("rapor.pdf en fazla 10 MB");
    expect(say("Toplam boyut çok büyük (>45 MB).", "en")).toBe("The combined file size exceeds the 45 MB limit. Make your files smaller and select them again in the Documents step.");
    expect(say("Ad Soyad çok uzun (en fazla 80 karakter).", "tr")).toContain("en fazla 80 karakter");
    expect(say("Bilinmeyen.", "en")).toBe("Bilinmeyen.");
  });
  it("duplicate-submission guard: says what happened, gives the wait, covers the second tab", () => {
    const tr = say("Az önce bir gönderim aldık; birkaç saniye sonra tekrar deneyin.", "tr"), en = say("Az önce bir gönderim aldık; birkaç saniye sonra tekrar deneyin.", "en");
    expect(tr).toContain(`en az ${DEDUP_SEC} saniye`); expect(tr).toContain("başka bir sekmeden veya cihazdan"); expect(tr).toContain("referans numarası");
    expect(en).toContain(`at least ${DEDUP_SEC} seconds`); expect(en).toContain("another tab or device"); expect(en).toContain("reference number");
  });
  // Code.gs is gitignored (it holds the form key): CI checks the committed snapshot, a local run also checks
  // that the snapshot is current (UPDATE-07, D-143). Regenerate: node scripts/baseline/code_gs_snapshot.mjs
  const SNAP = JSON.parse(readFileSync("tests/baseline/code-gs-snapshot.json", "utf8")) as { sha256: string; dedupSec: number; errors: string[] };
  it("DEDUP_SEC equals Code.gs CONFIG.DEDUP_SEC", () => {
    expect(SNAP.dedupSec, "DEDUP_SEC not found in Code.gs").not.toBeNull();
    expect(DEDUP_SEC).toBe(SNAP.dedupSec);
  });
  it.skipIf(!existsSync("_maintainer/Code.gs"))("the Code.gs snapshot is current (local copy present)", async () => {
    const { codeGsSnapshot } = await import("../../scripts/lib/code-gs.mjs");
    const { sha256, dedupSec, errors } = codeGsSnapshot(readFileSync("_maintainer/Code.gs", "utf8"));
    expect({ sha256, dedupSec, errors }, "Code.gs changed: run node scripts/baseline/code_gs_snapshot.mjs").toEqual({ sha256: SNAP.sha256, dedupSec: SNAP.dedupSec, errors: SNAP.errors });
  });
  it("every error Code.gs can return maps to a site text, and every text exists in TR and EN", () => {
    const all = SNAP.errors;
    expect(all.length).toBeGreaterThanOrEqual(27);
    expect(all.filter((x) => !serverError(x))).toEqual([]);
    expect(Object.keys(T).sort()).toEqual([...SERVER_TEXT_KEYS].sort());
    for (const k of SERVER_TEXT_KEYS) { expect(T[k].tr, k).toBeTruthy(); expect(T[k].en, k).toBeTruthy(); }
    // Placeholders a pattern captures are used by its text, in both languages.
    for (const [re, key] of SERVER_ERRORS) for (const g of ["file", "mb", "max"]) if (re.source.includes(`?<${g}>`))
      for (const l of ["tr", "en"] as const) expect(T[key][l], `${key}.${l}`).toMatch(g === "file" ? /\{doc\}/ : new RegExp(`\\{${g}\\}`));
  });
  it("maps to Umami codes + slot keys", () => {
    expect(serverCode("rapor.pdf geçerli bir PDF değil.")).toEqual({ code: "not_pdf", doc: "rapor" });
    expect(serverCode("staj_sicil_formu.pdf çok büyük (>5 MB).")).toEqual({ code: "too_large", doc: "sicil" });
    expect(serverCode("Geri ödeme için EK-1 gerekli")).toEqual({ code: "missing_doc", doc: "ek1" });
    expect(serverCode("Geçersiz e-posta.")).toEqual({ code: "email_invalid", doc: "" });
    expect(serverCode("??")).toEqual({ code: "unknown", doc: "" });
  });
});
