// Collects every user-facing string pair (UPDATE-03): the content YAML ({tr, en} leaves),
// src/i18n/ui.ts (functions shown by their template) and the English renderings of the
// Turkish server messages (src/lib/submission/contract.ts; the Turkish side comes from the
// frozen Code.gs and is listed for reference only).
//   collect(root) → Map<key, { tr, en, kind }>    root = a checkout (default: this repo)
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const isPair = (v) => v && typeof v === "object" && !Array.isArray(v) && typeof v.tr === "string" && typeof v.en === "string"
  && Object.keys(v).every((k) => k === "tr" || k === "en");
// Array items are named by a stable field when they have one, so inserting an item does not renumber the rest.
const itemName = (v, i) => (v && typeof v === "object" && (v.no ?? v.id ?? v.key ?? v.n)) ?? i;

function walk(node, path, out, file) {
  if (isPair(node)) { out.set(`${file} › ${path.join(".")}`, { tr: node.tr, en: node.en, kind: "yaml" }); return; }
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, String(itemName(v, i))], out, file));
  // `anchor` ({ tr, en } URL ids, often legacy MkDocs slugs) and `src` (migration provenance) are not copy.
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) { if (k !== "anchor" && k !== "src") walk(v, [...path, k], out, file); }
}

function yamlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? yamlFiles(join(dir, d.name))
    : d.name.endsWith(".yaml") ? [join(dir, d.name)] : []);
}

const show = (v) => (typeof v === "function" ? v.toString().replace(/^\([^)]*\)\s*=>\s*/, "").replace(/^`|`$/g, "") : v);

export async function collect(root = process.cwd()) {
  const out = new Map();
  const content = join(root, "src/content");
  for (const f of yamlFiles(content).sort()) walk(YAML.parse(readFileSync(f, "utf8")), [], out, relative(content, f));

  const { ui } = await import(pathToFileURL(join(root, "src/i18n/ui.ts")).href + `?t=${Date.now()}`);
  const flat = (o, p = []) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, [...p, k]) : [[[...p, k].join("."), v]]));
  const en = new Map(flat(ui.en));
  for (const [k, v] of flat(ui.tr)) out.set(`ui.ts › ${k}`, { tr: show(v), en: show(en.get(k)), kind: "ui", fn: typeof v === "function" });

  const src = readFileSync(join(root, "src/lib/submission/contract.ts"), "utf8");
  for (const m of src.matchAll(/^\s*\[\/\^(.+?)\/, "(.+?)", "([a-z_]+)"(?:, "([a-z0-9]+)")?\],?$/gm)) {
    out.set(`server › ${m[3]}${m[4] ? "." + m[4] : ""}`, { tr: m[1].replace(/\\/g, ""), en: m[2], kind: "server" });
  }
  return out;
}
