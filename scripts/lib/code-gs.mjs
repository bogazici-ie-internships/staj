// UPDATE-07 (D-143): the parts of _maintainer/Code.gs the site depends on, read the same way by the snapshot
// script and the unit tests. Code.gs is gitignored (it holds the form key), so CI checks the committed snapshot
// (tests/baseline/code-gs-snapshot.json) and a local run checks the snapshot against Code.gs itself.
import { createHash } from "node:crypto";

// Concatenated values in `error:` expressions, replaced by example values.
const SAMPLE_VALUES = { "FILE_MAP[key].name": "rapor.pdf", "FILE_MAP[key].maxMb": "10", "CONFIG.MAX_TOTAL_MB": "45", "CONFIG.MAX_NAME_LEN": "80" };

/** { sha256, dedupSec, errors[] } — every error string doPost can return, plus the thrown contract error. */
export function codeGsSnapshot(src) {
  const errors = [...src.matchAll(/error:\s*((?:'[^']*'|\s*\+\s*|[A-Za-z_][\w.[\]]*)+?)\s*\}\s*\)/g)].map((m) => m[1])
    .filter((x) => x.trim() !== "err.message")
    .map((x) => x.split(/\s*\+\s*/).map((part) => (part.startsWith("'") ? part.slice(1, -1) : SAMPLE_VALUES[part] ?? `<${part}>`)).join(""));
  const thrown = [...src.matchAll(/throw new Error\('([^']+)'\)/g)].map((m) => m[1]).filter((x) => /^Teslim dönemi/.test(x));
  const dedup = src.match(/^\s*DEDUP_SEC:\s*(\d+)\s*,/m);
  return { sha256: createHash("sha256").update(src).digest("hex"), dedupSec: dedup ? Number(dedup[1]) : null, errors: [...new Set([...errors, ...thrown])] };
}
