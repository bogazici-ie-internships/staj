// /staj/search/tr.json and /staj/search/en.json — the search documents (REVIEW-02 Note 3). Static, built from the
// typed content; fetched only when the search palette opens.
import type { APIRoute, GetStaticPaths } from "astro";
import { searchDocs } from "../../lib/search/docs";

export const getStaticPaths: GetStaticPaths = () => [{ params: { lang: "tr" } }, { params: { lang: "en" } }];
export const GET: APIRoute = async ({ params }) => {
  const docs = await searchDocs(params.lang as "tr" | "en");
  return new Response(JSON.stringify({ v: 1, docs }), { headers: { "content-type": "application/json" } });
};
