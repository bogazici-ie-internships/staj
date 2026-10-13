// CI guard: a production build must never contain the in-browser fake portal
// (src/lib/submission/fake-portal.ts). Its log line is the marker.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const hits = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|html)$/.test(f) && readFileSync(p, "utf8").includes("staj-fake-portal")) hits.push(p);
  }
})("dist");
if (hits.length) { console.error("fake portal found in production build:\n  " + hits.join("\n  ")); process.exit(1); }
console.log("guard: no fake portal in dist/");
