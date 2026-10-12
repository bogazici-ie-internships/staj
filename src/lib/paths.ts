// Every internal URL goes through here, so base path and locale prefix are
// never hand-written in a component. TR has no prefix, EN lives under /en/.
import type { Lang } from "./dates";

export const BASE = "/staj/";
export const SITE_URL = "https://bogazici-ie-internships.github.io/staj/";
export type PageKey = "home" | "surec" | "kurallar" | "rapor" | "formlar" | "sss" | "sonuclar" | "iletisim" | "teslim";
export const PAGE_PATHS: Record<PageKey, string> = {
  home: "", surec: "surec/", kurallar: "kurallar/", rapor: "rapor/", formlar: "formlar/",
  sss: "sss/", sonuclar: "sonuclar/", iletisim: "iletisim/", teslim: "teslim/",
};

export function pagePath(lang: Lang, key: PageKey | string, hash = ""): string {
  const rel = (PAGE_PATHS as Record<string, string>)[key] ?? key;
  return `${BASE}${lang === "en" ? "en/" : ""}${rel}${hash ? `#${hash}` : ""}`;
}
export const docPath = (file: string) => `${BASE}belgeler/${file}`;
export const assetPath = (file: string) => `${BASE}${file.replace(/^\//, "")}`;

/** Same page in the other language ("/staj/kurallar/" ⇄ "/staj/en/kurallar/"). */
export function alternatePath(pathname: string, to: Lang): string {
  const rel = pathname.replace(/^\/staj\//, "").replace(/^en\//, "");
  return `${BASE}${to === "en" ? "en/" : ""}${rel}`;
}
