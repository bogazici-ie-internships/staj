// Shared harness: serves dist/ from disk under /staj/, fakes the Apps Script
// portal and reCAPTCHA, and derives every date from settings.yml — so the suite
// keeps working when the term, deadline or grace window change.
// (Port of tests/legacy/helpers.js; same mount/open/pdf semantics.)
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { Page } from "@playwright/test";
import YAML from "yaml";
import SAMPLE from "../../src/lib/submission/sample.json" with { type: "json" };
export { SAMPLE };

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const SITE = resolve(process.env.SITE_DIR || join(ROOT, "dist"));
export const SETTINGS = YAML.parse(readFileSync(join(ROOT, "settings.yml"), "utf8"));
const D = SETTINGS.donem;
export const ORIGIN = "http://localhost:9999";
export const PORTAL = "https://script.google.com/";
export const HOUR = 3600e3, DAY = 24 * HOUR;
export const DEADLINE = Date.parse(D.teslim_kilit.replace(" ", "T") + ":00+03:00");
export const GRACE_DAYS = Number(D.gec_teslim_gun) || 0;
export const CONTRACT = {
  contractVersion: Number(D.contract_version), campaignId: String(D.campaign_id), term: String(D.etiket),
  yearDone: Number(D.year_done), semester: String(D.semester),
  internshipStart: String(D.staj_baslangic), internshipEnd: String(D.staj_bitis),
  deadline: String(D.teslim_kilit), graceDays: GRACE_DAYS,
};

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
  ".pdf": "application/pdf", ".xml": "application/xml", ".docx": "application/octet-stream", ".txt": "text/plain",
  ".wasm": "application/wasm", // Pagefind (UPDATE-06 search), as scripts/serve.mjs serves it
};

export interface MountOpts {
  contract?: unknown;
  reply?: (payload: Record<string, any>) => unknown;
  /** The data-form-key the page gets, whatever the build wrote (default "test-key"). UPDATE-07 (D-141): the deploy
   *  build carries the real key, so the harness always sets it; "" stands for a build without a key. */
  formKey?: string;
  /** Serve another build directory (default: SITE). */
  site?: string;
  /** Serve under another origin (e.g. a LAN address; default: ORIGIN). */
  origin?: string;
}
export interface Net { posts: Record<string, any>[] }

export async function mount(page: Page, { contract = { ok: true, open: true, contract: CONTRACT }, reply, formKey = "test-key", site = SITE, origin = ORIGIN }: MountOpts = {}): Promise<Net> {
  const posts: Record<string, any>[] = [];
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.href.startsWith(PORTAL)) {
      let body = contract;
      if (req.method() === "POST") {
        const payload = JSON.parse(req.postData() || "{}");
        posts.push(payload);
        body = reply ? reply(payload) : { ok: true, submissionId: randomUUID(), submittedAt: new Date().toISOString(), lateDays: 0 };
      }
      return route.fulfill({ status: 200, contentType: "application/json",
        headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    }
    if (/(^|\.)google\.com$|gstatic\.com$/.test(url.hostname)) {
      return route.fulfill({ status: 200, contentType: "text/javascript",
        body: "window.grecaptcha={ready:function(f){f()},execute:function(){return Promise.resolve('test-token')}};" });
    }
    if (url.origin !== origin) return route.abort();
    const rel = decodeURIComponent(url.pathname);
    if (!rel.startsWith("/staj/")) return route.fulfill({ status: 404, body: "" });
    let file = join(site, rel.slice("/staj/".length));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      return route.fulfill({ status: 404, contentType: TYPES[".html"], body: readFileSync(join(site, "404.html")) });
    }
    let body = readFileSync(file);
    if (file.endsWith(".html")) {
      body = Buffer.from(body.toString("utf8").replace(/data-form-key(="[^"]*"|='[^']*')?(?=[\s>])/, `data-form-key="${formKey}"`));
    }
    return route.fulfill({ status: 200, contentType: TYPES[extname(file)] || "application/octet-stream", body });
  });
  return { posts };
}

/** Opens a page at a fixed moment (ms) with the clock under test control. */
export async function open(page: Page, rel: string, { at = DEADLINE - 3 * DAY, ...opts }: MountOpts & { at?: number } = {}) {
  const net = await mount(page, opts);
  await page.clock.install({ time: new Date(at) });
  await page.goto(rel);
  return net;
}

export interface TestFile { name: string; mimeType: string; buffer: Buffer }
/** A real (tiny) PDF of roughly `kb` kilobytes. */
export function pdf(name: string, kb = 20): TestFile {
  const pad = Math.max(0, Math.round(kb * 1024) - 32);
  return { name, mimeType: "application/pdf",
    buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), randomBytes(pad), Buffer.from("\n%%EOF\n")]) };
}
/** The deterministic files the golden recording used (scripts/baseline/record-contract.spec.js). */
export function goldenFiles() {
  const names: Record<string, string> = { rapor: "rapor.pdf", sicil: "sicil.pdf", anketi: "anket.pdf",
    cumartesi: "cumartesi.pdf", dekont: "dekont.pdf", ek1: "ek1.pdf" };
  return Object.fromEntries(Object.entries(names).map(([k, name]) => [k, { name, mimeType: "application/pdf",
    buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), createHash("sha512").update(k).digest(),
      Buffer.alloc(1024 * 4, k), Buffer.from("\n%%EOF\n")]) }])) as Record<string, TestFile>;
}

// --- Driving the 5-screen flow (Hazırlık → Kimlik → Belgeler → Kontrol → Makbuz) ---
type Identity = { name?: string; sid?: string; email?: string };
export const flow = {
  /** Contract check finished OK (the old suite waited for Submit to enable). */
  ready: (page: Page) => page.waitForSelector('#sufForm[data-contract="ready"]'),
  start: (page: Page) => page.click("#suf-start"),
  next: (page: Page) => page.click("#suf-next"),
  back: (page: Page) => page.click("#suf-back"),
  async identity(page: Page, v: Identity = {}) {
    await page.fill("#suf-name", v.name ?? SAMPLE.nameInput);
    await page.fill("#suf-sid", v.sid ?? SAMPLE.sid);
    await page.fill("#suf-email", v.email ?? SAMPLE.email);
  },
  situation: (page: Page, flag: "saturday" | "reimbursement", on = true) =>
    page.locator(`[data-flag="${flag}"] input[type=checkbox]`).setChecked(on, { force: true }),
  attach: (page: Page, key: string, file: TestFile) => page.setInputFiles(`[data-slot="${key}"] input[type=file]`, file),
  submit: (page: Page) => page.click("#suf-submit"),
  /** Hazırlık → Kimlik (filled) → Belgeler (3 required attached) → Kontrol. */
  async toReview(page: Page, opts: { files?: Record<string, TestFile>; identity?: Identity; flags?: ("saturday" | "reimbursement")[]; ack?: boolean } = {}) {
    const files: Record<string, TestFile> = { rapor: pdf("rapor.pdf", 200), sicil: pdf("sicil.pdf", 60), anketi: pdf("anket.pdf", 20), ...opts.files };
    await flow.start(page);
    await flow.identity(page, opts.identity);
    for (const f of opts.flags ?? []) await flow.situation(page, f);
    if (opts.ack) await page.locator("#suf-ack").check({ force: true });
    await flow.next(page);
    for (const k of Object.keys(files)) if (await page.locator(`[data-slot="${k}"]`).count()) await flow.attach(page, k, files[k]);
    await flow.next(page);
    await page.waitForSelector('[data-step="kontrol"]');
    return files;
  },
};

export async function umamiStub(page: Page) {
  await page.addInitScript(() => {
    (window as any).__events = [];
    (window as any).umami = { track: (n: string, d: unknown) => (window as any).__events.push([n, d]) };
  });
}
export const events = (page: Page) => page.evaluate(() => (window as any).__events as [string, Record<string, unknown>][]);
