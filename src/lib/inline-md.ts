// A deliberately tiny Markdown subset for content strings: **bold**, *italic*,
// [text](target). Targets: "page:surec#oncesi" (site page in the reader's
// language), "doc:File.pdf" (/belgeler/), "#anchor", or an https URL.
// Everything else is escaped text — content can never inject HTML.
import type { Lang } from "./dates";
import { docPath, pagePath } from "./paths";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resolveTarget(target: string, lang: Lang): { href: string; external: boolean } {
  if (target.startsWith("page:")) {
    const [key, hash] = target.slice(5).split("#");
    return { href: pagePath(lang, key, hash), external: false };
  }
  if (target.startsWith("doc:")) return { href: docPath(target.slice(4)), external: false };
  if (target.startsWith("#")) return { href: target, external: false };
  if (/^https:\/\//.test(target) || /^mailto:/.test(target)) return { href: target, external: /^https:/.test(target) };
  throw new Error(`Bilinmeyen bağlantı hedefi: ${target}`);
}

/** Inline Markdown → HTML string (safe). `vars` fill {placeholders} first. */
export function md(text: string, lang: Lang, vars: Record<string, string | number> = {}): string {
  let s = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, target) => {
    const { href, external } = resolveTarget(target.replace(/&amp;/g, "&"), lang);
    return `<a href="${esc(href)}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  // FINAL-CHECK F-10: "EK-1" never breaks at its hyphen ("EK-" / "1'i"). Text only; tags (and their href) are skipped.
  s = s.replace(/(<[^>]*>)|EK-1/g, (m, tag) => tag ?? '<span class="nw">EK-1</span>');
  return s;
}
/** Plain text (for meta tags, aria labels): markup removed. */
export const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*?/g, "");
