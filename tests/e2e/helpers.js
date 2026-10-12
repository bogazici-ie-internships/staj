// Shared harness. The built site is served straight from disk under /staj/
// (the site_url path), the Apps Script portal and reCAPTCHA are faked, and
// every date is derived from settings.yml — so the suite keeps working when
// the term, deadline or grace window change.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const YAML = require("yaml");

const ROOT = path.resolve(__dirname, "..", "..");
const SITE = path.resolve(process.env.SITE_DIR || path.join(ROOT, "site"));
const SETTINGS = YAML.parse(fs.readFileSync(path.join(ROOT, "settings.yml"), "utf8"));
const D = SETTINGS.donem;
const ORIGIN = "http://localhost:9999";
const PORTAL = "https://script.google.com/";

const HOUR = 3600e3, DAY = 24 * HOUR;
// "2026-10-12 10:00" in Turkey time (+03:00).
const DEADLINE = Date.parse(D.teslim_kilit.replace(" ", "T") + ":00+03:00");
const GRACE_DAYS = Number(D.gec_teslim_gun) || 0;

const CONTRACT = {
  contractVersion: Number(D.contract_version), campaignId: String(D.campaign_id), term: String(D.etiket),
  yearDone: Number(D.year_done), semester: String(D.semester),
  internshipStart: String(D.staj_baslangic), internshipEnd: String(D.staj_bitis),
  deadline: String(D.teslim_kilit), graceDays: GRACE_DAYS,
};

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml",
};

/**
 * Serves the build and fakes the portal.
 *  contract: GET reply (default: matching contract)
 *  reply(payload): POST reply object (default: success with server time)
 * Returns { posts } — every POST payload the page sent.
 */
async function mount(page, { contract = { ok: true, open: true, contract: CONTRACT }, reply } = {}) {
  const posts = [];
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.href.startsWith(PORTAL)) {
      let body = contract;
      if (req.method() === "POST") {
        const payload = JSON.parse(req.postData() || "{}");
        posts.push(payload);
        body = reply ? reply(payload) : { ok: true, submissionId: crypto.randomUUID(),
          submittedAt: new Date().toISOString(), lateDays: 0 };
      }
      return route.fulfill({ status: 200, contentType: "application/json",
        headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    }
    if (/(^|\.)google\.com$|gstatic\.com$/.test(url.hostname)) {
      return route.fulfill({ status: 200, contentType: "text/javascript",
        body: "window.grecaptcha={ready:function(f){f()},execute:function(){return Promise.resolve('test-token')}};" });
    }
    if (url.origin !== ORIGIN) return route.abort();
    let rel = decodeURIComponent(url.pathname);
    if (!rel.startsWith("/staj/")) return route.fulfill({ status: 404, body: "" });
    let file = path.join(SITE, rel.slice("/staj/".length));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      return route.fulfill({ status: 404, contentType: TYPES[".html"], body: fs.readFileSync(path.join(SITE, "404.html")) });
    }
    let body = fs.readFileSync(file);
    // A local build has an empty form key (it is injected in CI); give it one
    // so the form behaves like production.
    if (file.endsWith(".html")) {
      body = Buffer.from(body.toString("utf8").replace(/data-form-key(=""|='')?(?=[\s>])/, 'data-form-key="test-key"'));
    }
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || "application/octet-stream", body });
  });
  return { posts };
}

/** Opens a page at a fixed moment (ms) with the clock under test control. */
async function open(page, rel, { at = DEADLINE - 3 * DAY, ...opts } = {}) {
  const net = await mount(page, opts);
  await page.clock.install({ time: new Date(at) });
  await page.goto(rel);
  return net;
}

/** A real (tiny) PDF of roughly `kb` kilobytes. */
function pdf(name, kb = 20) {
  const pad = Math.max(0, kb * 1024 - 32);
  return { name, mimeType: "application/pdf",
    buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), crypto.randomBytes(pad), Buffer.from("\n%%EOF\n")]) };
}

async function waitReady(page) {
  await page.waitForFunction(() => {
    const b = document.getElementById("suf-submit");
    return b && !b.disabled;
  });
}

async function fillValid(page, files = {}) {
  await page.fill("#suf-name", "ayşe yılmaz");
  await page.fill("#suf-sid", "2021405123");
  await page.fill("#suf-email", "ayse.yilmaz@std.bogazici.edu.tr");
  const set = { rapor: pdf("rapor.pdf", 200), sicil: pdf("sicil.pdf", 60), anketi: pdf("anket.pdf", 20), ...files };
  for (const k of ["rapor", "sicil", "anketi"]) {
    await page.setInputFiles(`.suf-drop[data-key="${k}"] input[type=file]`, set[k]);
  }
  return set;
}

module.exports = { SETTINGS, CONTRACT, DEADLINE, GRACE_DAYS, HOUR, DAY, mount, open, pdf, waitReady, fillValid };
