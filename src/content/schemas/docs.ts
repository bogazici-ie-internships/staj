// Phase 2a pages (UPDATE-06): Süreç, Rapor, SSS, Sonuçlar, İletişim, Formlar — migrated from the
// live MkDocs pages into a small typed block tree, in its own module (content.config.ts imports it).
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const L = z.object({ tr: z.string().trim().min(1), en: z.string().trim().min(1) }).strict();
/** Legacy anchors are explicit (from tests/baseline/url-inventory.json), never derived from the new wording. */
const Anchor = z.object({ tr: z.string().regex(/^[a-z0-9-]+$/), en: z.string().regex(/^[a-z0-9-]+$/) }).strict();
/** Provenance: "<tr file>:<line> · <en file>:<line>" on main (coverage report). "new" = added text, explained in the report. */
const Src = z.string().regex(/^(new( — .+)?|[\w/.-]+\.md:\d+ · [\w/.-]+\.md:\d+)$/);

export type Block =
  | { kind: "p"; text: { tr: string; en: string }; src: string }
  | { kind: "list"; ordered?: boolean; items: { text: { tr: string; en: string }; src: string; blocks?: Block[] }[] }
  | { kind: "files"; items: { doc: string; label: { tr: string; en: string }; src: string }[] }
  | { kind: "callout"; tone: "note" | "tip" | "warning" | "danger" | "summary"; title: { tr: string; en: string }; src: string; blocks: Block[] }
  | { kind: "cards"; cards: { icon: string; title: { tr: string; en: string }; src: string; blocks: Block[] }[] }
  | { kind: "table"; src: string; lang?: "en"; head: { tr: string; en: string }[]; rows: { src: string; cells: { tr: string; en: string }[] }[] }
  | { kind: "qa"; items: { anchor: { tr: string; en: string }; q: { tr: string; en: string }; src: string; blocks: Block[] }[] }
  | { kind: "doctable"; src: string; head: Record<"name" | "purpose" | "when" | "signer" | "format" | "download", { tr: string; en: string }>; groups: { anchor: { tr: string; en: string }; title: { tr: string; en: string }; src: string; rows: { doc: string; name: { tr: string; en: string }; purpose: { tr: string; en: string }; signer?: { tr: string; en: string }; signerSrc?: string; src: string }[] }[] }
  | { kind: "action"; label: { tr: string; en: string }; href: string; src: string }
  | { kind: "results"; src: string; scope: { tr: string; en: string }; open: { tr: string; en: string }; newTab: { tr: string; en: string };
      updated: { tr: string; en: string }; viewer: { tr: string; en: string }; empty: { tr: string; en: string } }
  | { kind: "contacts"; src: string; primary: { role: { tr: string; en: string }; name: { tr: string; en: string }; note: { tr: string; en: string } };
      mail: { src: string }; people: { src: string }; coordinator: { role: { tr: string; en: string }; note: { tr: string; en: string }; src: string } };

export const Block: z.ZodType<Block> = z.lazy(() => z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("p"), text: L, src: Src }).strict(),
  z.object({ kind: z.literal("list"), ordered: z.boolean().optional(), items: z.array(z.object({ text: L, src: Src, blocks: z.array(Block).optional() }).strict()).min(1) }).strict(),
  z.object({ kind: z.literal("files"), items: z.array(z.object({ doc: z.string().regex(/^[\w.-]+\.(pdf|docx)$/), label: L, src: Src }).strict()).min(1) }).strict(),
  z.object({ kind: z.literal("callout"), tone: z.enum(["note", "tip", "warning", "danger", "summary"]), title: L, src: Src, blocks: z.array(Block) }).strict(),
  z.object({ kind: z.literal("cards"), cards: z.array(z.object({ icon: z.string(), title: L, src: Src, blocks: z.array(Block) }).strict()).min(1) }).strict(),
  z.object({ kind: z.literal("table"), src: Src, lang: z.literal("en").optional(), head: z.array(L), rows: z.array(z.object({ src: Src, cells: z.array(L) }).strict()) }).strict(),
  z.object({ kind: z.literal("qa"), items: z.array(z.object({ anchor: Anchor, q: L, src: Src, blocks: z.array(Block) }).strict()).min(1) }).strict(),
  /** Formlar's document table (UPDATE-06): one row per file; format and size are read from public/belgeler at build.
   *  `signer` is filled only where the live text or the maintainer says who signs (`signerSrc` cites which); otherwise "—". */
  z.object({ kind: z.literal("doctable"), src: Src,
    head: z.object({ name: L, purpose: L, when: L, signer: L, format: L, download: L }).strict(), groups: z.array(z.object({ anchor: Anchor, title: L, src: Src,
    rows: z.array(z.object({ doc: z.string().regex(/^[\w.-]+\.(pdf|docx)$/), name: L, purpose: L, signer: L.optional(),
      signerSrc: z.string().regex(/^([\w/.-]+\.md:\d+( · [\w/.-]+\.md:\d+)*|maintainer: .+)$/).optional(), src: Src }).strict()).min(1) }).strict()).min(1) }).strict(),
  /** A button-styled link; href is "link:<settings.yml baglantilar key>" or a page:/doc: target. */
  z.object({ kind: z.literal("action"), label: L, href: z.string().regex(/^(link:\w+|page:[\w#-]+|doc:[\w.-]+)$/), src: Src }).strict(),
  /** Sonuçlar (RESULTS-01): the All Internships PDF from public/internships (src/lib/results.ts); only the labels
   *  live here. Placeholder: {time} in `updated`. Open only, no download button (maintainer, RESULTS-01). */
  z.object({ kind: z.literal("results"), src: Src, scope: L, open: L, newTab: L, updated: L, viewer: L, empty: L }).strict(),
  /** İletişim people: names and addresses come from settings.yml (iletisim.*); only the labels live here. */
  z.object({ kind: z.literal("contacts"), src: Src,
    primary: z.object({ role: L, name: L, note: L }).strict(), mail: z.object({ src: Src }).strict(), people: z.object({ src: Src }).strict(),
    coordinator: z.object({ role: L, note: L, src: Src }).strict() }).strict(),
]));

/** `alias`: a retired anchor that should still land on this section (e.g. a removed question, D-182). */
export type Section = { anchor: { tr: string; en: string }; alias?: { tr: string; en: string }; title: { tr: string; en: string }; src: string; blocks: Block[]; sections?: Section[] };
const Section: z.ZodType<Section> = z.lazy(() => z.object({ anchor: Anchor, alias: Anchor.optional(), title: L, src: Src, blocks: z.array(Block), sections: z.array(Section).optional() }).strict());

export const docs = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/docs" }),
  schema: z.object({
    page: z.enum(["surec", "rapor", "formlar", "sss", "sonuclar", "iletisim"]),
    anchor: Anchor, title: L, src: Src,
    meta: z.object({ src: Src, note: z.string() }).strict().optional(),
    lead: z.array(Block),
    sections: z.array(Section),
  }).strict(),
});
