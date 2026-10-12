// Build-time access to the single-file copy collections.
import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import type { Lang } from "./dates";
import { settings } from "./settings";

type Copy = "chrome" | "home" | "kurallarPage" | "teslim" | "layout";
async function raw<C extends Copy>(c: C): Promise<CollectionEntry<C>["data"]> {
  const all = (await getCollection(c)) as CollectionEntry<C>[];
  if (all.length !== 1) throw new Error(`${c}: tam olarak bir dosya bekleniyordu`);
  return all[0].data;
}
// Shared values filled into every { tr, en } pair at build time, in that pair's language:
//  - {accounting}: the unit name, written once in chrome.yaml (UPDATE-04 §2, D-71);
//  - {accountingEmail}, {generalEmail}, {coordinatorName}, {coordinatorEmail}: from settings.yml
//    (one source; D-78), as the live site's {{ iletisim.* }} did;
//  - link targets "link:<key>" → settings.yml baglantilar.<key> (the live site's {{ baglantilar.* }}).
const VAR = /\{(accounting|accountingEmail|generalEmail|coordinatorName|coordinatorEmail)\}/g;
function fill(o: any, vars: Record<"tr" | "en", Record<string, string>>): any {
  if (Array.isArray(o)) return o.map((v) => fill(v, vars));
  if (o && typeof o === "object") {
    if (typeof o.tr === "string" && typeof o.en === "string" && Object.keys(o).length === 2) {
      const sub = (s: string, l: "tr" | "en") => s.replace(VAR, (_, k) => vars[l][k])
        .replace(/\]\(link:(\w+)\)/g, (_, k) => {
          const url = (settings.baglantilar as Record<string, string>)[k];
          if (!url) throw new Error(`settings.yml baglantilar.${k} yok`);
          return `](${url})`;
        });
      return { tr: sub(o.tr, "tr"), en: sub(o.en, "en") };
    }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fill(v, vars)]));
  }
  return o;
}
async function vars() {
  const u = (await raw("chrome")).units.accounting;
  const i = settings.iletisim;
  const common = { accountingEmail: i.hesap_isleri_eposta, generalEmail: i.genel_eposta, coordinatorName: i.staj_sorumlusu.ad, coordinatorEmail: i.staj_sorumlusu.eposta };
  return { tr: { accounting: u.name.tr, ...common }, en: { accounting: u.name.en, ...common } };
}
export async function copy<C extends Copy>(c: C): Promise<CollectionEntry<C>["data"]> {
  return fill(await raw(c), await vars());
}
/** One Phase 2a page (src/content/docs/<page>.yaml), with the shared values filled in. */
export async function docPage(page: string) {
  const e = (await getCollection("docs")).find((d) => d.data.page === page);
  if (!e) throw new Error(`docs: ${page}.yaml yok`);
  return fill(e.data, await vars()) as typeof e.data;
}
export async function glossary() {
  const v = await vars();
  return (await getCollection("glossary")).map((e) => fill(e.data, v) as typeof e.data);
}
export async function rules() {
  const v = await vars();
  const all = (await getCollection("rules")).map((e) => fill(e.data, v) as typeof e.data).sort((a, b) => a.section - b.section);
  const sections = all.map((s) => s.section);
  if (new Set(sections).size !== sections.length) throw new Error("kurallar: aynı § bölüm numarası iki dosyada");
  return all;
}
/** Pick the language from a { tr, en } pair. */
export const t = (v: { tr: string; en: string }, lang: Lang) => v[lang];
export { getEntry };
