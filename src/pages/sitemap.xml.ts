// /staj/sitemap.xml — same URL as the MkDocs site, every page in both
// languages with hreflang alternates.
import type { APIRoute } from "astro";
import { PAGE_PATHS, SITE_URL } from "../lib/paths";

export const GET: APIRoute = () => {
  const urls = Object.values(PAGE_PATHS).flatMap((rel) => {
    const tr = SITE_URL + rel, en = SITE_URL + "en/" + rel;
    const alts = `<xhtml:link rel="alternate" hreflang="tr" href="${tr}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/>`;
    return [`<url><loc>${tr}</loc>${alts}</url>`, `<url><loc>${en}</loc>${alts}</url>`];
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml" } });
};
