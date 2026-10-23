// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import paintDirective from "./src/directives/integration.ts";

const SITE = "https://bogazici-ie-internships.github.io";

// Which portal adapter the submission island talks to (src/lib/submission/portal.ts):
//   real — the Apps Script URL from settings.yml. Production and the e2e suite
//          (Playwright intercepts script.google.com; nothing leaves the machine).
//   fake — an in-browser stand-in for local review: `astro dev` and
//          `npm run build:review`. It never ships: CI greps dist/ for its marker.
const isDev = process.argv.includes("dev");
const portalMode = process.env.STAJ_PORTAL || (isDev ? "fake" : "real");
if (!["real", "fake"].includes(portalMode)) throw new Error(`STAJ_PORTAL must be real|fake, got ${portalMode}`);

export default defineConfig({
  site: SITE,
  base: "/staj",
  trailingSlash: "always",
  outDir: process.env.STAJ_OUT || "dist",
  build: { format: "directory", inlineStylesheets: "always" },
  i18n: {
    locales: ["tr", "en"],
    defaultLocale: "tr",
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    react(),
    paintDirective(),
  ],
  vite: {
    define: {
      "import.meta.env.PUBLIC_PORTAL_MODE": JSON.stringify(portalMode),
    },
  },
});
