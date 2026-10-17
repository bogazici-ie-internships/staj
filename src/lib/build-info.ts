// Build-time facts: the footer's "Son güncelleme" (Turkey date of the build),
// Umami (env, public ID; empty = no script), and the campaign tag for Umami.
import { trYmd } from "./dates";

// STAJ_BUILD_DATE (YYYY-MM-DD) pins the footer date for reproducible visual baselines.
const pinned = process.env.STAJ_BUILD_DATE ? Date.parse(`${process.env.STAJ_BUILD_DATE}T12:00:00+03:00`) : NaN;
export const buildYmd = trYmd(Number.isNaN(pinned) ? Date.now() : pinned);
export const umamiId = (process.env.UMAMI_WEBSITE_ID || "").trim();
