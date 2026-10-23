// REVIEW-03 Note 1 (D-133): generated review documents quote old text (the live site, earlier commits). Any
// real-looking sample student number, student address or sample name in that text is replaced by the
// placeholders before writing, so design/ never carries one (tests/unit/sample-data.test.ts).
import { readFileSync } from "node:fs";
const SAMPLE = JSON.parse(readFileSync(new URL("../../src/lib/submission/sample.json", import.meta.url), "utf8"));
export const redactSample = (s) => s
  .replace(/\b20[0-2]\d40\d{4}\b/g, SAMPLE.sidHint)
  .replace(/[a-z0-9._%+-]+@std\.bogazici\.edu\.tr/gi, (m) => (m.toLowerCase() === SAMPLE.email ? m : SAMPLE.email))
  .replace(/Ayşe Yılmaz/g, SAMPLE.name);
