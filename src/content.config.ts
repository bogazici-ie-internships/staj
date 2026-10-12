// Typed content. Every visible string is a { tr, en } pair: a missing
// translation fails `astro build` / `astro check` (schema-enforced parity).
// TAs edit the YAML under src/content/ — see README "How TAs edit content".
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

/** A translated string; both languages required and non-empty. */
export const L = z.object({ tr: z.string().trim().min(1), en: z.string().trim().min(1) }).strict();

const rule = z.object({
  no: z.string().regex(/^\d+\.\d+$/, "§ numarası '1.4' biçiminde olmalı"),
  body: L,
  highlight: z.object({ value: L, caption: L }).strict().optional(),
  /** Pull-quote under the rule: a short restatement of an often-missed rule (B11). Decorative duplicate, aria-hidden. */
  pull: L.optional(),
  /** "department" = department practice, not Handbook text (UPDATE-02 A2). Data only: nothing renders it (REVIEW-02 Note 2). */
  source: z.enum(["handbook", "department"]).default("handbook"),
  terms: z.array(z.enum(["ek1", "sicil"])).default([]),
}).strict();

const rules = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/rules" }),
  schema: z.object({
    section: z.number().int().positive(),
    anchor: z.object({ tr: z.string().regex(/^[a-z0-9-]+$/), en: z.string().regex(/^[a-z0-9-]+$/) }).strict(),
    title: L,
    intro: L.optional(),
    rules: z.array(rule).default([]),
    /** Pull-quote before the callout (B11), same role as a rule's `pull`. */
    pull: L.optional(),
    callout: z.object({ kind: z.enum(["deadline", "note"]), title: L, body: L }).strict().optional(),
    topics: z.array(z.object({ id: z.string(), title: L, intro: L, items: z.array(L).min(1) }).strict()).optional(),
  }).strict().superRefine((s, ctx) => {
    const seen = new Set<string>();
    s.rules.forEach((r, i) => {
      if (!r.no.startsWith(`${s.section}.`)) ctx.addIssue({ code: "custom", path: ["rules", i, "no"], message: `§ ${r.no} bu bölümün (${s.section}) numarası değil` });
      if (seen.has(r.no)) ctx.addIssue({ code: "custom", path: ["rules", i, "no"], message: `§ ${r.no} iki kez kullanılmış` });
      seen.add(r.no);
    });
    if (!s.rules.length && !s.topics?.length) ctx.addIssue({ code: "custom", message: "Bölümde kural ya da konu yok" });
  }),
});

const glossary = defineCollection({
  loader: file("src/content/glossary.yaml"),
  schema: z.object({ id: z.string(), term: L, definition: L }).strict(),
});

const page = z.object({
  key: z.enum(["home", "surec", "kurallar", "rapor", "formlar", "sss", "sonuclar", "iletisim", "teslim"]),
  path: z.string(), title: L, short: L, description: L, head: L.optional(),
}).strict();

const chrome = defineCollection({
  loader: glob({ pattern: "chrome.yaml", base: "./src/content/pages" }),
  schema: z.object({
    brand: z.object({ service: L, institution: L, titleSuffix: L, seal: L, ogAlt: L, ogTitle: L, siteName: L }).strict(),
    pages: z.array(page).length(9),
    ui: z.record(z.string(), L),
    search: z.object({ suggestions: z.array(L).min(5).max(6) }).strict(),
    footer: z.object({ lastUpdated: L, department: L, departmentUrl: z.string().url(), about: L, help: L, ek1: L }).strict(),
    about: z.object({
      anchor: z.object({ tr: z.string().regex(/^[a-z0-9-]+$/), en: z.string().regex(/^[a-z0-9-]+$/) }).strict(),
      title: L, text: L,
      maintainer: z.object({ name: z.string().min(1), role: L }).strict(),
    }).strict(),
    units: z.object({ accounting: z.object({ name: L }).strict() }).strict(),
    notFound: z.object({ title: L, lead: L }).strict(),
    placeholder: z.object({ lead: L, live: L }).strict(),
    /** Open Graph card text (src/pages/og-card, built only for `npm run og`). */
    og: z.object({ flap: L, head: L, rows: z.array(z.object({ label: L, value: L }).strict()).length(3) }).strict(),
  }).strict(),
});

const home = defineCollection({
  loader: glob({ pattern: "home.yaml", base: "./src/content/pages" }),
  schema: z.object({
    hero: z.object({ index: L, title: L, lead: L, process: L }).strict(),
    board: z.object({
      caption: L, captionLate: L, closed: L, unlocked: L, zone: L, label: L,
      units: z.object({ d: L, h: L, m: L }).strict(),
      cols: z.object({ date: L, event: L, status: L }).strict(),
      rows: z.record(z.string(), L),
      status: z.object({ open: L, passed: L, late: L, closed: L }).strict(),
      details: z.object({ deadline: L, termEnds: L }).strict(),
      cta: L,
    }).strict(),
    calendar: z.object({
      index: L, title: L, lead: L, aria: L, today: L, deadlineChip: L, lateChip: L, lateRow: L, lateVerdict: L, scrollHint: L,
      legend: z.object({ ok: L, block: L, cond: L, mark: L, late: L }).strict(),
      verdict: z.object({ kapali: L, kosullu: L, teslim: L }).strict(),
    }).strict(),
    process: z.object({
      index: L, title: L, more: L,
      phases: z.array(z.object({ n: z.string(), name: L, title: L, anchor: z.string(), icon: z.enum(["file-pen-line", "calendar-clock", "upload"]), items: z.array(L).min(1) }).strict()).length(3),
    }).strict(),
  }).strict(),
});

const kurallarPage = defineCollection({
  loader: glob({ pattern: "kurallar.yaml", base: "./src/content/pages" }),
  schema: z.object({
    masthead: L, lede: L, keyFigures: L,
    ajanda: z.object({ terms: L }).strict(),
  }).strict(),
});

const docKey = z.enum(["rapor", "sicil", "anketi", "cumartesi", "dekont", "ek1"]);
const teslim = defineCollection({
  loader: glob({ pattern: "teslim.yaml", base: "./src/content/pages" }),
  schema: z.object({
    docs: z.record(docKey, L).refine((d) => docKey.options.every((k) => k in d), "her belge anahtarı için bir ad gerekli"),
    situations: z.object({
      saturday: z.object({ label: L, hint: L, when: L }).strict(),
      reimbursement: z.object({ label: L, hint: L, when: L }).strict(),
    }).strict(),
    prep: z.object({
      eyebrow: L, title: L, lead: L, deadline: L, lateRule: L, required: L, situational: L, multiple: L, limits: L,
      exceptionsTitle: L, exceptions: z.array(L).length(2), ek1Note: L, start: L, forms: L,
    }).strict(),
    steps: z.array(L).length(3), stepOf: L, back: L, next: L,
    identity: z.record(z.string(), L),
    documents: z.record(z.string(), L),
    review: z.object({ title: L, you: L, situations: L, none: L, files: L, change: L, declaration: L, submit: L, captcha: L }).strict(),
    receipt: z.object({
      title: L, reference: L, referenceHint: L, received: L, term: L, status: L, onTime: L, docs: L,
      download: L, downloadHint: L, nextTitle: L, next: z.array(L), ek1: L, print: L, zone: L, printFoot: L,
    }).strict(),
    serverErrors: z.object(Object.fromEntries(SERVER_TEXT_KEYS.map((k) => [k, L]))).strict(),
    help: z.object({ title: L, items: z.array(L.extend({ late: L.optional() })) }).strict(),   // `late`: the late-window wording (D-181)
    recovery: z.object({ found: L, restore: L, discard: L, notice: L, discarded: L }).strict(),
    noscript: L,
  }).strict(),
});

/** REVIEW-01 Note 1: header-band panel, Gazete rail and Teslim side panel labels (values come from settings/content). */
const layout = defineCollection({
  loader: glob({ pattern: "layout.yaml", base: "./src/content/pages" }),
  schema: z.object({
    panel: z.object({ title: L, term: L, deadline: L, lateEnd: L, none: L, submit: L }).strict(),
    rail: z.object({ contents: L, toggle: L, facts: L, help: z.object({ title: L, text: L, contact: L }).strict() }).strict(),
    facts: z.object({ before: L, ek1: L, during: L, duringRule: L, after: L, submitBy: L }).strict(),
    teslim: z.object({ steps: L, documents: L, deadline: L }).strict(),
  }).strict(),
});

import { docs } from "./content/schemas/docs";
import { SERVER_TEXT_KEYS } from "./lib/submission/contract";
export const collections = { rules, glossary, chrome, home, kurallarPage, teslim, docs, layout };
