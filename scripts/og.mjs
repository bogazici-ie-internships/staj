// Renders the Open Graph cards (UPDATE-02 B14) from src/pages/og-card/[lang].astro with the
// real fonts and tokens: a throwaway build in dist-og/, a local server, one 1200×630 screenshot
// per language → public/assets/og-image.png (TR, the URL the old site used) and og-image-en.png.
//   node scripts/og.mjs
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { chromium } from "@playwright/test";

const PORT = 4410;
execSync("npx astro build", { stdio: "inherit", env: { ...process.env, STAJ_OG: "1", STAJ_OUT: "dist-og" } });
const server = spawn("node", ["scripts/serve.mjs", "--dir", "dist-og", "--port", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  for (const [lang, out] of [["tr", "og-image.png"], ["en", "og-image-en.png"]]) {
    await page.goto(`http://127.0.0.1:${PORT}/staj/og-card/${lang}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `public/assets/${out}`, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    // 256-colour palette (flat colours + anti-aliasing): ~3× smaller, visually identical. Pillow, like build_fonts.py.
    execSync(`python3 -c "from PIL import Image; p='public/assets/${out}'; Image.open(p).convert('RGB').quantize(256, dither=Image.Dither.NONE).save(p, optimize=True)"`);
    console.log(`public/assets/${out}`);
  }
  await browser.close();
} finally {
  server.kill();
  rmSync("dist-og", { recursive: true, force: true });
}
