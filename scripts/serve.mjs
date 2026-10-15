// Serves dist/ exactly as GitHub Pages will: under /staj/, directory index.html,
// the bilingual 404.html for anything missing. Zero dependencies.
//   npm run preview                 → http://localhost:4321/staj/
//   npm run preview -- --host       → also on your LAN (open from a phone on the same Wi-Fi)
// Review servers (UPDATE-07, D-150): `--review` — and `--host`, which exposes the site on the LAN — serve ONLY a
// fake-portal build (STAJ_PORTAL=fake: its `_astro/fake-portal.*.js` chunk carries the "staj-fake-portal"
// marker). The check runs at start and again while serving, so if the folder is overwritten by a production or
// test build, the server answers 503 instead of a page that talks to the real Apps Script.
// `--allow-real` lifts it for a deliberate local check of a production build on the LAN.
import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const host = args.includes("--host") ? "0.0.0.0" : "127.0.0.1";
const port = Number(args[args.indexOf("--port") + 1]) || 4321;
const dirArg = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "dist";
const root = fileURLToPath(new URL(`../${dirArg}/`, import.meta.url));
const reviewOnly = (args.includes("--review") || host === "0.0.0.0") && !args.includes("--allow-real");
/** True when `dir` is a fake-portal build (the only kind a review server may serve). */
export function isFakePortalBuild(dir) {
  try {
    return readdirSync(join(dir, "_astro")).some((f) => /^fake-portal\..*\.js$/.test(f) && readFileSync(join(dir, "_astro", f), "utf8").includes("staj-fake-portal"));
  } catch { return false; }
}
let checkedAt = 0, fake = false;
const stillFake = () => { if (Date.now() - checkedAt > 2000) { fake = isFakePortalBuild(root); checkedAt = Date.now(); } return fake; };
if (reviewOnly && !stillFake()) {
  console.error(`refusing to serve ${dirArg}/: not a fake-portal build. Review servers serve only STAJ_PORTAL=fake builds (npm run build:review); use --allow-real for a deliberate production check.`);
  process.exit(1);
}
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".xml": "application/xml", ".txt": "text/plain", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".wasm": "application/wasm", ".pf_meta": "application/octet-stream" };

async function file(p) { try { const s = await stat(p); return s.isDirectory() ? file(join(p, "index.html")) : p; } catch { return null; } }

createServer(async (req, res) => { try {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/" || url.pathname === "/staj") { res.writeHead(302, { location: "/staj/" }); return res.end(); }
  if (!url.pathname.startsWith("/staj/")) { res.writeHead(404); return res.end(); }
  if (reviewOnly && !stillFake()) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    return res.end(`${dirArg}/ is no longer a fake-portal build; this review server stopped serving it. Rebuild it with the review command and restart the server.`);
  }
  const rel = normalize(decodeURIComponent(url.pathname.slice("/staj/".length))).replace(/^(\.\.[/\\])+/, "");
  // GitHub Pages redirects /staj/teslim → /staj/teslim/
  if (!extname(rel) && rel && !url.pathname.endsWith("/")) { res.writeHead(301, { location: url.pathname + "/" }); return res.end(); }
  const p = await file(join(root, rel));
  if (!p) { res.writeHead(404, { "content-type": TYPES[".html"] }); return res.end(await readFile(join(root, "404.html"))); }
  // gzip text like GitHub Pages does, so Lighthouse sees realistic transfer sizes.
  let body = await readFile(p);
  const headers = { "content-type": TYPES[extname(p)] || "application/octet-stream", "cache-control": "no-cache" };
  if (/\.(html|css|js|mjs|json|svg|xml|txt)$/.test(p) && /gzip/.test(req.headers["accept-encoding"] || "")) {
    body = gzipSync(body); headers["content-encoding"] = "gzip"; headers["vary"] = "accept-encoding";
  }
  res.writeHead(200, headers);
  res.end(body);
} catch (e) { res.writeHead(500); res.end(String(e)); } }).listen(port, host, () => {
  console.log(`${dirArg}/ → http://localhost:${port}/staj/${reviewOnly ? "  (review: fake-portal builds only)" : ""}`);
  if (host === "0.0.0.0") for (const nets of Object.values(networkInterfaces())) for (const n of nets ?? [])
    if (n.family === "IPv4" && !n.internal) console.log(`  phone (same Wi-Fi) → http://${n.address}:${port}/staj/`);
});
