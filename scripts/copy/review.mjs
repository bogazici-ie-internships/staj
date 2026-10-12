// Old → new table for the UPDATE-03 copy pass: compares every user-facing string at a git
// ref (default: the commit before the pass) with the working tree and writes the changed,
// added and removed pairs into design/reviews/copy-review.md between the GENERATED markers.
//   node scripts/copy/review.mjs [ref] [marker]     marker defaults to "copy-table"
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collect } from "./collect.mjs";
import { redactSample } from "../lib/redact-sample.mjs";

const REF = process.argv[2] || "57b3f7c";   // the pre-pass commit (was c42bb5b before the UPDATE-07 history rewrite, D-149)
const MARKER = process.argv[3] || "copy-table";
const OUT = "design/reviews/copy-review.md";
const tmp = mkdtempSync(join(tmpdir(), "copy-review-"));
try {
  execSync(`git archive ${REF} src | tar -x -C "${tmp}"`);
  symlinkSync(resolve("node_modules"), join(tmp, "node_modules"));
  const before = await collect(tmp);
  const after = await collect();
  const cell = (s) => (s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const groups = new Map();
  const put = (key, row) => { const file = key.split(" › ")[0]; (groups.get(file) ?? groups.set(file, []).get(file)).push(row); };
  let changed = 0, added = 0, removed = 0, same = 0;
  for (const [key, b] of before) {
    const a = after.get(key);
    if (!a) { removed++; put(key, `| \`${cell(key.split(" › ")[1])}\` | removed | ${cell(b.tr)} | | ${cell(b.en)} | |`); continue; }
    const trC = a.tr !== b.tr, enC = a.en !== b.en;
    if (!trC && !enC) { same++; continue; }
    changed++;
    put(key, `| \`${cell(key.split(" › ")[1])}\` | ${trC && enC ? "TR+EN" : trC ? "TR" : "EN"} | ${trC ? cell(b.tr) : "="} | ${trC ? cell(a.tr) : "="} | ${enC ? cell(b.en) : "="} | ${enC ? cell(a.en) : "="} |`);
  }
  for (const [key, a] of after) if (!before.has(key)) { added++; put(key, `| \`${cell(key.split(" › ")[1])}\` | new | | ${cell(a.tr)} | | ${cell(a.en)} |`); }
  const head = "| Key | Changed | TR old | TR new | EN old | EN new |\n|---|---|---|---|---|---|";
  const level = MARKER === "copy-table" ? "###" : "####";
  const body = [...groups.entries()].sort().map(([file, rows]) => `${level} ${file}\n\n${head}\n${rows.join("\n")}`).join("\n\n");
  const summary = `Compared \`${REF}\` with the working tree: **${changed} changed**, ${added} new, ${removed} removed, ${same} unchanged `
    + `(${after.size} strings now). "=" means that language did not change. Server messages: the Turkish side comes from the frozen Code.gs and is shown for reference.`;
  const doc = readFileSync(OUT, "utf8");
  const start = `<!-- GENERATED:${MARKER} -->`, end = `<!-- /GENERATED:${MARKER} -->`;
  writeFileSync(OUT, redactSample(doc.slice(0, doc.indexOf(start) + start.length) + `\n${summary}\n\n${body}\n` + doc.slice(doc.indexOf(end))));
  console.log(`${OUT}: ${changed} changed, ${added} new, ${removed} removed`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
