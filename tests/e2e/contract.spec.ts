// The frozen portal contract, end to end. Every scenario recorded against the
// MkDocs site's submit.js (tests/baseline/contract-golden.json, recorder in
// scripts/baseline/record-contract.spec.js) is replayed through the new
// five-screen flow; requests to script.google.com and the Umami events must
// match the recording. Payload bytes are compared via hashes, ids via
// placeholders that still prove "same id" vs "new id" across a retry.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { CONTRACT, DAY, SAMPLE, DEADLINE, GRACE_DAYS, HOUR, events, flow, goldenFiles, mount, open, pdf, umamiStub } from "./helpers";

const GOLDEN = JSON.parse(readFileSync("tests/baseline/contract-golden.json", "utf8"));
const FILES = goldenFiles();
const IDENTITY = { name: SAMPLE.nameInput, sid: SAMPLE.sid, email: SAMPLE.emailMixed + " " };

const sha = (b64: string) => createHash("sha256").update(Buffer.from(b64, "base64")).digest("hex").slice(0, 16);
function capture(page: Page) {
  const requests: { method: string; url: string; contentType: string | null; cacheControl: string | null; body: string | null }[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith("https://script.google.com/")) {
      const h = r.headers();
      requests.push({ method: r.method(), url: r.url(), contentType: h["content-type"] || null, cacheControl: h["cache-control"] || null, body: r.postData() });
    }
  });
  return requests;
}
function normalise(requests: ReturnType<typeof capture>) {
  const ids: string[] = [];
  return requests.map((r) => {
    const base = { method: r.method, url: r.url, contentType: r.contentType, cacheControl: r.cacheControl };
    if (r.method !== "POST") return base;
    const p = JSON.parse(r.body!);
    if (!ids.includes(p.requestId)) ids.push(p.requestId);
    const files: Record<string, unknown> = {};
    for (const k of Object.keys(p.files).sort()) files[k] = { filename: p.files[k].filename, mimeType: p.files[k].mimeType, sha: sha(p.files[k].dataB64) };
    return { ...base, keys: Object.keys(p), payload: { ...p, requestId: `<id#${ids.indexOf(p.requestId)}>`, files } };
  });
}
const shape = (ev: [string, Record<string, unknown>][]) =>
  ev.map(([n, d]) => [n, Object.fromEntries(Object.entries(d || {}).map(([k, v]) => [k, k === "seconds" ? typeof v : v]))]);

async function toReview(page: Page, flags: ("saturday" | "reimbursement")[] = [], { ack = false, extra = {} as Record<string, string> } = {}) {
  await flow.start(page);
  await flow.identity(page, IDENTITY);
  for (const f of flags) await flow.situation(page, f);
  if (ack) await page.locator("#suf-ack").check({ force: true });
  await flow.next(page);
  for (const k of ["rapor", "sicil", "anketi", ...Object.keys(extra)]) await flow.attach(page, k, FILES[k]);
  await flow.next(page);
  await page.waitForSelector('[data-step="kontrol"]');
}
const ok = (at: number) => () => ({ ok: true, submissionId: "11111111-2222-4333-8444-555555555555", submittedAt: new Date(at).toISOString(), lateDays: 0 });

test.describe("contract: same requests and events as submit.js", () => {
  test.beforeEach(async ({ page }) => umamiStub(page));

  test("happy_saturday", async ({ page }) => {
    const at = DEADLINE - 2 * HOUR; const req = capture(page);
    await open(page, "teslim/", { at, reply: ok(at) }); await flow.ready(page);
    await toReview(page, ["saturday"], { extra: { cumartesi: "1" } });
    await flow.submit(page); await page.waitForSelector("#suf-done");
    expect(normalise(req)).toEqual(GOLDEN.happy_saturday.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.happy_saturday.events);
  });

  test("reimbursement", async ({ page }) => {
    const at = DEADLINE - 3 * DAY; const req = capture(page);
    await open(page, "teslim/", { at, reply: ok(at) }); await flow.ready(page);
    await toReview(page, ["reimbursement"], { extra: { dekont: "1", ek1: "1" } });
    await flow.submit(page); await page.waitForSelector("#suf-done");
    expect(normalise(req)).toEqual(GOLDEN.reimbursement.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.reimbursement.events);
  });

  test("situation_toggled_off_drops_files", async ({ page }) => {
    const at = DEADLINE - 3 * DAY; const req = capture(page);
    await open(page, "teslim/", { at, reply: ok(at) }); await flow.ready(page);
    await flow.start(page); await flow.identity(page, IDENTITY);
    await flow.situation(page, "saturday"); await flow.next(page);
    for (const k of ["rapor", "sicil", "anketi", "cumartesi"]) await flow.attach(page, k, FILES[k]);
    await flow.back(page); await flow.situation(page, "saturday", false); await flow.next(page);
    await expect(page.locator('[data-slot="cumartesi"]')).toHaveCount(0);
    await flow.next(page); await flow.submit(page); await page.waitForSelector("#suf-done");
    expect(normalise(req)).toEqual(GOLDEN.situation_toggled_off_drops_files.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.situation_toggled_off_drops_files.events);
  });

  test("late_with_ack", async ({ page }) => {
    const at = DEADLINE + 2 * HOUR; const req = capture(page);
    await open(page, "teslim/", { at, reply: () => ({ ok: true, submissionId: "x", submittedAt: new Date(at).toISOString(), lateDays: 1 }) });
    await flow.ready(page);
    await flow.start(page); await flow.identity(page, IDENTITY);
    await flow.next(page);                                   // blocked: late_ack
    await expect(page.locator(".suf-summary")).toContainText("geç teslim beyanını");
    await page.locator("#suf-ack").check({ force: true });
    await flow.next(page);
    for (const k of ["rapor", "sicil", "anketi"]) await flow.attach(page, k, FILES[k]);
    await flow.next(page); await flow.submit(page); await page.waitForSelector("#suf-done");
    expect(normalise(req)).toEqual(GOLDEN.late_with_ack.requests);
    // Same events. Order differs by design: the acknowledgement now sits on the
    // Kimlik screen, before any file is chosen (old: one page, files first).
    const got = shape(await events(page));
    const want = GOLDEN.late_with_ack.events;
    expect(got).toEqual([want[1], want[0], want[2], want[3]]);
  });

  test("en_server_error", async ({ page }) => {
    const req = capture(page);
    await open(page, "en/teslim/", { reply: () => ({ ok: false, error: "Geçersiz e-posta." }) }); await flow.ready(page);
    await toReview(page);
    await flow.submit(page);
    await expect(page.locator("#suf-msg")).toContainText("The email address is not valid.");   // site text (D-137)
    await expect(page.locator("#suf-msg")).not.toContainText("Geçersiz");
    expect(normalise(req)).toEqual(GOLDEN.en_server_error.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.en_server_error.events);
  });

  test("network_failure_then_retry_same_id", async ({ page }) => {
    const req = capture(page);
    await open(page, "teslim/", {});
    let first = true;
    await page.route("https://script.google.com/**", async (route) => {
      if (route.request().method() === "POST" && first) { first = false; return route.abort("failed"); }
      return route.fallback();
    });
    await flow.ready(page); await toReview(page);
    await flow.submit(page);
    await expect(page.locator("#suf-msg")).toContainText("Bağlantı kurulamadı");
    await expect(page.locator("#suf-submit")).toHaveText("Tekrar dene");
    await flow.submit(page); await page.waitForSelector("#suf-done");   // no re-picking
    expect(normalise(req)).toEqual(GOLDEN.network_failure_then_retry_same_id.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.network_failure_then_retry_same_id.events);
  });

  test("edit_then_retry_new_id", async ({ page }) => {
    let n = 0; const req = capture(page);
    await open(page, "teslim/", { reply: () => (n++ === 0 ? { ok: false, error: "Sunucu hatası, lütfen tekrar deneyin." }
      : { ok: true, submissionId: "x", submittedAt: new Date(DEADLINE - 3 * DAY).toISOString(), lateDays: 0 }) });
    await flow.ready(page); await toReview(page);
    await flow.submit(page); await expect(page.locator("#suf-msg")).not.toBeEmpty();
    await page.getByRole("button", { name: /Değiştir — Ad Soyad/ }).click();
    await page.fill("#suf-name", SAMPLE.name3Input);
    await flow.next(page); await flow.next(page);
    await flow.submit(page); await page.waitForSelector("#suf-done");
    expect(normalise(req)).toEqual(GOLDEN.edit_then_retry_new_id.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.edit_then_retry_new_id.events);
  });

  test("validation_empty_and_bad_file", async ({ page }) => {
    const req = capture(page);
    await open(page, "teslim/", {}); await flow.ready(page);
    await flow.start(page); await flow.next(page);          // empty Kimlik → required_fields
    await flow.identity(page, IDENTITY); await flow.next(page);
    await flow.attach(page, "rapor", { name: "rapor.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
    await flow.attach(page, "rapor", pdf("buyuk.pdf", 10.5 * 1024));
    await expect(page.locator('[data-slot="rapor"]')).toHaveAttribute("data-state", "error");
    expect(normalise(req)).toEqual(GOLDEN.validation_empty_and_bad_file.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.validation_empty_and_bad_file.events);
  });

  test("contract_mismatch", async ({ page }) => {
    const req = capture(page);
    await open(page, "teslim/", { contract: { ok: true, open: true, contract: { ...CONTRACT, campaignId: "baska-donem" } } });
    await expect(page.locator("#suf-gate")).toBeVisible();
    await expect(page.locator("#suf-retry")).toBeVisible();
    expect(normalise(req)).toEqual(GOLDEN.contract_mismatch.requests);
    expect(shape(await events(page))).toEqual(GOLDEN.contract_mismatch.events);
  });

  test("closed", async ({ page }) => {
    const req = capture(page);
    await open(page, "teslim/", { at: DEADLINE + GRACE_DAYS * DAY + HOUR });
    await expect(page.locator("#suf-closed")).toBeVisible();
    expect(normalise(req)).toEqual(GOLDEN.closed.requests ?? []);
    expect(shape(await events(page))).toEqual(GOLDEN.closed.events);
  });

  test("empty_form_key: nothing reaches script.google.com", async ({ page }) => {
    const req = capture(page);
    await mount(page, { formKey: "" });   // a build without a key
    await page.clock.install({ time: new Date(DEADLINE - 3 * DAY) });
    await page.goto("teslim/");
    await expect(page.locator("#suf-gate")).toBeVisible();
    expect(req).toHaveLength(GOLDEN.empty_form_key.scriptGoogleRequests);
    expect(shape(await events(page))).toEqual(GOLDEN.empty_form_key.events);
  });
});

test("built HTML carries the contract values from settings.yml", async ({ page }) => {
  await open(page, "teslim/");
  const d = await page.locator("#sufForm").evaluate((el: HTMLElement) => ({ ...el.dataset }));
  expect(d.portalUrl).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
  expect(d.formKey).toBe("test-key");
});
