// HISTORICAL (UPDATE-07, D-145): needs the MkDocs site and tests/legacy, which were removed with MkDocs. Run it
// from the pre-redesign tree (`git worktree add ../staj-old pre-redesign`); its output is frozen in tests/baseline/.
// Records the OLD submission form's network + analytics contract (golden file).
// Runs against the MkDocs build in site/ with the old tests/e2e harness:
//   git checkout 4553fcd -- . && mkdocs build   (the pre-redesign site)
//   cd tests/legacy && npm ci && NODE_PATH=$PWD/node_modules npx playwright test -c ../../scripts/baseline/record.config.js
// Output: tests/baseline/contract-golden.json. The new suite
// (tests/e2e/contract.spec.ts) must reproduce every record exactly.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { test } = require("@playwright/test");
const H = require("../../tests/legacy/helpers");

const OUT = path.resolve(__dirname, "../../tests/baseline/contract-golden.json");
const golden = {};

function sha(b64) { return crypto.createHash("sha256").update(Buffer.from(b64, "base64")).digest("hex").slice(0, 16); }

// Same shape the new suite produces: ids become placeholders, file bytes become hashes.
function normalise(p, ids) {
  const out = { ...p };
  if (!ids.includes(p.requestId)) ids.push(p.requestId);
  out.requestId = `<id#${ids.indexOf(p.requestId)}>`;
  out.files = {};
  for (const k of Object.keys(p.files || {}).sort()) {
    const f = p.files[k];
    out.files[k] = { filename: f.filename, mimeType: f.mimeType, sha: sha(f.dataB64) };
  }
  return { keys: Object.keys(p), payload: out };
}

async function harness(page, opts = {}) {
  const requests = [];
  await page.addInitScript(() => {
    window.__events = [];
    window.umami = { track: (n, d) => window.__events.push([n, d]) };
  });
  page.on("request", (r) => {
    if (r.url().startsWith("https://script.google.com/")) {
      const h = r.headers();
      requests.push({ method: r.method(), url: r.url(), contentType: h["content-type"] || null,
        cacheControl: h["cache-control"] || null, body: r.postData() });
    }
  });
  const net = await H.open(page, opts.rel || "teslim/", opts);
  return { requests, net };
}

function events(list) {
  // Wall-clock durations vary between runs; the property and its type do not.
  return list.map(([n, d]) => [n, Object.fromEntries(Object.entries(d || {}).map(([k, v]) =>
    [k, k === "seconds" ? typeof v : v]))]);
}

async function finish(name, page, { requests }) {
  const ids = [];
  const ev = await page.evaluate(() => window.__events);
  golden[name] = {
    requests: requests.map((r) => ({ method: r.method, url: r.url, contentType: r.contentType,
      cacheControl: r.cacheControl,
      ...(r.method === "POST" ? normalise(JSON.parse(r.body), ids) : {}) })),
    events: events(ev),
  };
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(golden, null, 1) + "\n");
});

const FILES = {
  rapor: H.pdf("rapor.pdf", 200), sicil: H.pdf("sicil.pdf", 60), anketi: H.pdf("anket.pdf", 20),
  cumartesi: H.pdf("cumartesi.pdf", 15), dekont: H.pdf("dekont.pdf", 30), ek1: H.pdf("ek1.pdf", 40),
};
// Deterministic bytes, so the hashes in the golden file are reproducible.
for (const [k, f] of Object.entries(FILES)) {
  f.buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), crypto.createHash("sha512").update(k).digest(),
    Buffer.alloc(1024 * 4, k), Buffer.from("\n%%EOF\n")]);
}
async function fill(page) {
  await page.fill("#suf-name", H.SAMPLE.nameInput);
  await page.fill("#suf-sid", H.SAMPLE.sid);
  await page.fill("#suf-email", H.SAMPLE.emailMixed + " ");
  for (const k of ["rapor", "sicil", "anketi"]) await page.setInputFiles(`.suf-drop[data-key="${k}"] input`, FILES[k]);
}
const ok = (at) => () => ({ ok: true, submissionId: "11111111-2222-4333-8444-555555555555",
  submittedAt: new Date(at).toISOString(), lateDays: 0 });

test("happy_saturday", async ({ page }) => {
  const at = H.DEADLINE - 2 * H.HOUR;
  const h = await harness(page, { at, reply: ok(at) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-sit-sat");
  await page.setInputFiles('.suf-drop[data-key="cumartesi"] input', FILES.cumartesi);
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("happy_saturday", page, h);
});

test("reimbursement", async ({ page }) => {
  const at = H.DEADLINE - 3 * H.DAY;
  const h = await harness(page, { at, reply: ok(at) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-sit-pay");
  await page.setInputFiles('.suf-drop[data-key="dekont"] input', FILES.dekont);
  await page.setInputFiles('.suf-drop[data-key="ek1"] input', FILES.ek1);
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("reimbursement", page, h);
});

test("situation_toggled_off_drops_files", async ({ page }) => {
  const at = H.DEADLINE - 3 * H.DAY;
  const h = await harness(page, { at, reply: ok(at) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-sit-sat");
  await page.setInputFiles('.suf-drop[data-key="cumartesi"] input', FILES.cumartesi);
  await page.click("#suf-sit-sat");
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("situation_toggled_off_drops_files", page, h);
});

test("late_with_ack", async ({ page }) => {
  const at = H.DEADLINE + 2 * H.HOUR;
  const h = await harness(page, { at, reply: () => ({ ok: true, submissionId: "x", submittedAt: new Date(at).toISOString(), lateDays: 1 }) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-submit");            // blocked: late_ack
  await page.check("#suf-ack");
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("late_with_ack", page, h);
});

test("en_server_error", async ({ page }) => {
  const h = await harness(page, { rel: "en/teslim/", reply: () => ({ ok: false, error: "Geçersiz e-posta." }) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-submit");
  await page.locator("#suf-msg").filter({ hasText: "Invalid email address." }).waitFor();
  await finish("en_server_error", page, h);
  golden.en_server_error.message = await page.locator("#suf-msg").textContent();
});

test("network_failure_then_retry_same_id", async ({ page }) => {
  const h = await harness(page, {});
  let first = true;
  await page.route("https://script.google.com/**", async (route) => {
    if (route.request().method() === "POST" && first) { first = false; return route.abort("failed"); }
    return route.fallback();
  });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-submit");
  await page.locator("#suf-msg.err").waitFor();
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("network_failure_then_retry_same_id", page, h);
});

test("edit_then_retry_new_id", async ({ page }) => {
  let n = 0;
  const h = await harness(page, { reply: () => (n++ === 0 ? { ok: false, error: "Sunucu hatası, lütfen tekrar deneyin." }
    : { ok: true, submissionId: "x", submittedAt: new Date(H.DEADLINE - 3 * H.DAY).toISOString(), lateDays: 0 }) });
  await H.waitReady(page); await fill(page);
  await page.click("#suf-submit"); await page.locator("#suf-msg.err").waitFor();
  await page.fill("#suf-name", H.SAMPLE.name3Input);
  await page.click("#suf-submit"); await page.locator("#suf-done").waitFor();
  await finish("edit_then_retry_new_id", page, h);
});

test("validation_empty_and_bad_file", async ({ page }) => {
  const h = await harness(page, {});
  await H.waitReady(page);
  await page.click("#suf-submit");
  await page.setInputFiles('.suf-drop[data-key="rapor"] input', { name: "rapor.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
  await page.setInputFiles('.suf-drop[data-key="rapor"] input', H.pdf("buyuk.pdf", 10.5 * 1024));
  await finish("validation_empty_and_bad_file", page, h);
});

test("contract_mismatch", async ({ page }) => {
  const h = await harness(page, { contract: { ok: true, open: true, contract: { ...H.CONTRACT, campaignId: "baska-donem" } } });
  await page.locator("#suf-gate").waitFor();
  await finish("contract_mismatch", page, h);
});

test("closed", async ({ page }) => {
  const h = await harness(page, { at: H.DEADLINE + H.GRACE_DAYS * H.DAY + H.HOUR });
  await page.locator("#suf-closed").waitFor();
  await finish("closed", page, h);
});

test("empty_form_key", async ({ page }) => {
  const requests = [];
  await page.addInitScript(() => { window.__events = []; window.umami = { track: (n, d) => window.__events.push([n, d]) }; });
  page.on("request", (r) => { if (/script\.google\.com/.test(r.url())) requests.push(r.url()); });
  await H.mount(page, {});
  // Undo the harness's key injection: serve the page exactly as a keyless build.
  await page.route("**/staj/teslim/", (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8",
    body: fs.readFileSync(path.resolve(__dirname, "../../site/teslim/index.html")) }));
  await page.clock.install({ time: new Date(H.DEADLINE - 3 * H.DAY) });
  await page.goto("teslim/");
  await page.locator("#suf-gate").waitFor();
  golden.empty_form_key = { scriptGoogleRequests: requests.length, events: events(await page.evaluate(() => window.__events)) };
});
