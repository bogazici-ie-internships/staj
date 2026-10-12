// Build-only: format and size of a file in public/belgeler (Formlar table, download lists).
import { statSync } from "node:fs";
import { resolve } from "node:path";
import type { Lang } from "./dates";

export function fileInfo(name: string, lang: Lang): { format: string; size: string; kind: "pdf" | "docx" } {
  const bytes = statSync(resolve(process.cwd(), "public/belgeler", name)).size;
  const kind = name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  const kb = bytes / 1024;
  const fmt = (n: number, d = 0) => n.toLocaleString(lang === "en" ? "en-GB" : "tr-TR", { maximumFractionDigits: d });
  const size = kb >= 1024 ? `${fmt(kb / 1024, 1)} MB` : `${fmt(kb)} KB`;
  return { format: kind === "pdf" ? "PDF" : "Word (DOCX)", size, kind };
}
