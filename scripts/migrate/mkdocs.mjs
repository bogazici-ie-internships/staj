// A small parser for the MkDocs-Material Markdown on `main` (docs/**/*.md), enough for the
// migration (UPDATE-06 Phase 2a): headings (with {: #id }), admonitions (!!! / ???), content tabs
// (=== "…"), grid cards, tables, nested lists, paragraphs, abbreviations and raw HTML blocks.
// Every block keeps its 1-based source line, which the coverage report cites.
import { execSync } from "node:child_process";

// UPDATE-07 (D-145): the last MkDocs commit, so these tools keep working after the redesign is merged into main.
export const MKDOCS_REF = "4553fcd";
export function readMain(path, ref = MKDOCS_REF) {
  return execSync(`git show ${ref}:"${path}"`, { encoding: "utf8", maxBuffer: 1 << 24 });
}

/** MkDocs/Python-Markdown default slug (toc.slugify): NFKD → ASCII, drop non-word, spaces → "-". */
export function slugify(s) {
  return s.normalize("NFKD").replace(/[^\x00-\x7F]/g, "").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/[-\s]+/g, "-");
}

const ind = (s) => s.match(/^ */)[0].length;
const blank = (l) => !l.s.trim();

export function parse(text, file) {
  let lines = text.split("\n").map((s, i) => ({ s: s.replace(/\t/g, "    "), n: i + 1, file }));
  if (lines[0]?.s.trim() === "---") { // front matter
    const end = lines.findIndex((l, i) => i > 0 && l.s.trim() === "---");
    const fm = lines.slice(1, end).map((l) => l.s).join("\n");
    lines = lines.slice(end + 1);
    const desc = fm.match(/description:\s*"(.*)"/);
    return [{ type: "meta", text: desc ? desc[1] : "", line: 2, file }, ...block(lines)];
  }
  return block(lines);
}

// Lines indented by at least `n` (or blank) following index i, dedented by n.
function body(lines, i, n) {
  const out = [];
  let j = i;
  while (j < lines.length && (blank(lines[j]) || ind(lines[j].s) >= n)) { out.push({ ...lines[j], s: lines[j].s.slice(Math.min(n, ind(lines[j].s))) }); j++; }
  while (out.length && blank(out[out.length - 1])) { out.pop(); }
  return { lines: out, next: j - (out.length ? 0 : 0) };
}

function block(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const L = lines[i], s = L.s;
    if (blank(L)) { i++; continue; }
    let m;
    // Containers that only wrap markdown: ignore the tag lines themselves.
    if (/^<\/?div\b[^>]*>\s*$/.test(s.trim())) { i++; continue; }
    if ((m = s.match(/^(#{1,6})\s+(.*?)(?:\s*\{:\s*#([\w-]+)\s*\})?\s*$/))) {
      out.push({ type: "h", level: m[1].length, text: m[2], id: m[3] ?? slugify(m[2]), line: L.n, file: L.file }); i++; continue;
    }
    if ((m = s.match(/^(!!!|\?\?\?\+?)\s+([\w-]+)(?:\s+([\w-]+))?(?:\s+"(.*)")?\s*$/))) {
      const b = body(lines, i + 1, 4);
      out.push({ type: m[1] === "!!!" ? "admonition" : "details", kind: m[2], cls: m[3] ?? null, title: m[4] ?? "", line: L.n, file: L.file, children: block(b.lines) });
      i += 1 + b.lines.length; continue;
    }
    if ((m = s.match(/^===\s+"(.*)"\s*$/))) {
      const b = body(lines, i + 1, 4);
      out.push({ type: "tab", title: m[1], line: L.n, file: L.file, children: block(b.lines) });
      i += 1 + b.lines.length; continue;
    }
    if ((m = s.match(/^-\s{3}:[\w-]+:(?:\{[^}]*\})?\s*(.*)$/))) { // grid card
      const b = body(lines, i + 1, 4);
      const kids = b.lines.filter((l) => l.s.trim() !== "---");
      out.push({ type: "card", title: m[1], line: L.n, file: L.file, children: block(kids) });
      i += 1 + b.lines.length; continue;
    }
    if (s.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].s.trim().startsWith("|")) {
        const t = lines[i].s.trim();
        if (!/^\|[\s:|-]+\|$/.test(t)) rows.push({ cells: t.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()), line: lines[i].n });
        i++;
      }
      out.push({ type: "table", head: rows[0].cells, rows: rows.slice(1), line: rows[0].line, file: L.file }); continue;
    }
    if ((m = s.match(/^\*\[(.+?)\]:\s*(.*)$/))) { out.push({ type: "abbr", term: m[1], text: m[2], line: L.n, file: L.file }); i++; continue; }
    if ((m = s.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)) && ind(s) === 0) {
      const items = [];
      const ordered = /\d/.test(m[2]);
      while (i < lines.length) {
        const mm = lines[i].s.match(/^([-*]|\d+\.)\s+(.*)$/);
        if (!mm || /\d/.test(mm[1]) !== ordered) break; // a bullet list followed by a numbered one = two lists
        const contentIndent = lines[i].s.indexOf(mm[2]);
        const first = { s: mm[2], n: lines[i].n, file: L.file };
        const cont = [];
        let j = i + 1;
        while (j < lines.length && (blank(lines[j]) || ind(lines[j].s) >= 2) && !/^([-*]|\d+\.)\s/.test(lines[j].s)) {
          if (blank(lines[j]) && !(lines[j + 1] && ind(lines[j + 1].s) >= 2)) break;
          cont.push({ ...lines[j], s: lines[j].s.slice(Math.min(ind(lines[j].s), Math.max(contentIndent, 2))) }); j++;
        }
        // Lines continuing the item's first paragraph vs. nested blocks (lists, admonitions).
        const para = [first.s];
        let k = 0;
        while (k < cont.length && cont[k].s.trim() && !/^([-*]|\d+\.)\s|^!!!|^\?\?\?/.test(cont[k].s.trim())) { para.push(cont[k].s.trim()); k++; }
        items.push({ text: para.join(" "), line: first.n, children: block(cont.slice(k).map((l) => ({ ...l, s: l.s.replace(/^ {0,4}/, (x) => x) }))) });
        i = j;
        while (i < lines.length && blank(lines[i])) {
          if (lines[i + 1] && /^([-*]|\d+\.)\s/.test(lines[i + 1].s)) { i++; break; }
          break;
        }
      }
      out.push({ type: "list", ordered, items, line: items[0].line, file: L.file }); continue;
    }
    if (s.trim().startsWith("<") || /^\{%/.test(s.trim())) { // raw HTML / Jinja block
      const start = i; const buf = [];
      while (i < lines.length && !blank(lines[i])) { buf.push(lines[i]); i++; }
      out.push({ type: "html", text: buf.map((l) => l.s).join("\n"), lines: buf.map((l) => ({ n: l.n, s: l.s })), line: lines[start].n, file: L.file }); continue;
    }
    // Paragraph
    const start = i; const buf = [];
    while (i < lines.length && !blank(lines[i]) && !/^(#{1,6}\s|!!!|\?\?\?|===\s|\||\*\[|<\/?div|-\s{3}:)/.test(lines[i].s) && !(buf.length && /^([-*]|\d+\.)\s/.test(lines[i].s))) { buf.push(lines[i].s.trim()); i++; }
    if (!buf.length) { i++; continue; }
    out.push({ type: "p", text: buf.join(" "), line: lines[start].n, file: L.file });
  }
  return out;
}

/** REVIEW-05 (coverage gap T-14): a raw-HTML block was one unit, so a sentence on its 2nd line (the Teslim "EK-1'in
 *  eksiksiz doldurulduğundan emin olun" note) could be lost while the block still counted as mapped. Every later line
 *  of a block that carries visible text is now its own unit ("html-line"). Comments ({# #}, <!-- -->), <style> and
 *  Jinja ({% %}, {{ }}) are not text. The block's first line stays the block unit, so existing citations still hold. */
function htmlLines(b) {
  const out = [];
  const st = { j: false, c: false, s: false };
  const strip = (t, open, close, flag) => {
    let r = "", x = t;
    while (x.length) {
      if (st[flag]) { const e = x.indexOf(close); if (e < 0) { x = ""; break; } st[flag] = false; x = x.slice(e + close.length); }
      else { const s0 = x.indexOf(open); if (s0 < 0) { r += x; break; } r += x.slice(0, s0); st[flag] = true; x = x.slice(s0 + open.length); }
    }
    return r;
  };
  (b.lines ?? []).forEach((l, k) => {
    let t = strip(l.s, "{#", "#}", "j");
    t = strip(t, "<!--", "-->", "c");
    t = strip(t, "<style", "</style>", "s");
    t = t.replace(/\{%[^%]*%\}/g, " ").replace(/\{\{[^}]*\}\}/g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (k > 0 && /\p{L}{3}/u.test(t)) out.push({ kind: "html-line", line: l.n, text: t });
  });
  return out;
}

/** Flatten to coverage units: every heading, paragraph, list item, table row, admonition/card/tab title, abbr, and
 *  every text line of a raw-HTML block after its first. */
export function units(blocks, out = []) {
  for (const b of blocks) {
    if (b.type === "meta") out.push({ kind: "meta", line: b.line, text: b.text });
    else if (b.type === "h") out.push({ kind: `h${b.level}`, line: b.line, text: b.text, id: b.id });
    else if (b.type === "p") out.push({ kind: "p", line: b.line, text: b.text });
    else if (b.type === "abbr") out.push({ kind: "abbr", line: b.line, text: `${b.term}: ${b.text}` });
    else if (b.type === "html") { out.push({ kind: "html", line: b.line, text: b.text }); out.push(...htmlLines(b)); }
    else if (b.type === "table") { out.push({ kind: "table-head", line: b.line, text: b.head.join(" | ") }); for (const r of b.rows) out.push({ kind: "row", line: r.line, text: r.cells.join(" | ") }); }
    else if (b.type === "list") for (const it of b.items) { out.push({ kind: "li", line: it.line, text: it.text }); units(it.children, out); }
    else { out.push({ kind: b.type, line: b.line, text: b.title }); units(b.children, out); }
  }
  return out;
}
