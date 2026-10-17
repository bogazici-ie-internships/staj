// Build-only: format and size of a file in public/belgeler (Formlar table, download lists).
import { statSync } from "node:fs";
import { resolve } from "node:path";
import type { Lang } from "./dates";

export function fileInfo(name: string, lang: Lang): { format: string; size: string; kind: "pdf" | "docx" } {
  const bytes = statSync(resolve(process.cwd(), "public/belgeler", name)).size;
  const kind = name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  return { format: kind === "pdf" ? "PDF" : "Word (DOCX)", size: sizeLabel(bytes, lang), kind };
}

/** "70 KB" / "1,2 MB" (TR) · "1.2 MB" (EN). Also used for the results PDF (RESULTS-01). */
export function sizeLabel(bytes: number, lang: Lang): string {
  const kb = bytes / 1024;
  const fmt = (n: number, d = 0) => n.toLocaleString(lang === "en" ? "en-GB" : "tr-TR", { maximumFractionDigits: d });
  return kb >= 1024 ? `${fmt(kb / 1024, 1)} MB` : `${fmt(Math.max(1, kb))} KB`;
}
