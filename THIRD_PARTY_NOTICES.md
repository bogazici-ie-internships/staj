# Third-party notices

Everything below is free and open source; licences were checked in each project's own repository
on 2026-10-09 (not only the npm metadata). Versions are pinned exactly in `package.json` /
`package-lock.json`. No paid or "Pro" tier of any project is used.

## Shipped to the browser

| Package | Version | Licence | Where it runs | Gzipped cost |
|---|---|---|---|---|
| react, react-dom (Meta) | 19.3.0 | MIT | Home board island, Teslim island | ~65 KB shared runtime (only on Home and Teslim) |
| react-aria-components (Adobe, github.com/adobe/react-spectrum) | 1.22.0 | Apache-2.0 | Teslim: TextField, Checkbox, FileTrigger, DropZone, Meter, ProgressBar, Button | inside Teslim island (~53 KB incl. flow code) |
| @number-flow/react, number-flow (github.com/barvian/number-flow) | 0.6.2 | MIT | Home board countdown digits | inside Board island (~6.5 KB) |
| pdfjs-dist (Mozilla, github.com/mozilla/pdf.js) | 6.4.299 | Apache-2.0 | Teslim only, lazy: loaded after the first file is chosen ("Doğru dosya mı?" preview) | ~128 KB + worker ~350 KB, never on first load |
| @starwind-ui/astro + @starwind-ui/runtime (github.com/starwind-ui/starwind-ui) | 1.3.0 | MIT | Headless Drawer (phone menu sheet) and Collapsible (Kurallar contents on phones); styled with our tokens, no Tailwind | ~9 KB (Drawer) + ~2 KB (Collapsible) |
| Astro runtime (github.com/withastro/astro) | 7.3.8 | MIT | island loader | ~1 KB |
| Lucide icons (lucide-static, github.com/lucide-icons/lucide) | 1.48.0 | ISC (permissive, MIT-like); notice in `public/assets/LICENSE-lucide.txt` | 19 stroke icons, path data inlined at build by `scripts/build_icons.mjs` (phases, document types, states, arrows) | ~3.9 KB source, only the icons a page uses |
| MiniSearch (minisearch, github.com/lucaong/minisearch) | 7.1.2 | MIT | Site search (⌘K, REVIEW-02): the index is built in the browser from `/staj/search/<lang>.json` when the palette first opens | 0 KB on page load; on first search ≈ 8.6 KB JS (palette + MiniSearch, gz) + ≈ 14.5 KB index (gz) |

The native HTML `popover` attribute (calendar segments, board rows, "Bölüm uygulaması" notes) and the
generated contour lines, paper grain, split-flap and receipt stamp are our own code: no dependency.

## Fonts (self-hosted, subset by `scripts/build_fonts.py`; licence files in `public/fonts/`)

| Family | Source package | Licence |
|---|---|---|
| Bricolage Grotesque | @fontsource-variable/bricolage-grotesque 5.3.0 | SIL OFL 1.1, no Reserved Font Name |
| Schibsted Grotesk | @fontsource-variable/schibsted-grotesk 5.3.0 | SIL OFL 1.1, no Reserved Font Name |
| JetBrains Mono | @fontsource-variable/jetbrains-mono 5.3.0 | SIL OFL 1.1, no Reserved Font Name |
| Newsreader | @fontsource-variable/newsreader 5.3.0 | SIL OFL 1.1, no Reserved Font Name |

## Build and test only (not shipped)

astro 7.3.8 (MIT), @astrojs/react 7.0.1 (MIT), @astrojs/check 0.9.10 (MIT), typescript 6.0.3
(Apache-2.0), yaml 2.9.1 (ISC), vitest 5.0.3 (MIT), @playwright/test 1.64.0 (Apache-2.0),
@axe-core/playwright 4.13.0 (MPL-2.0, test-only), @google/design.md 0.4.0 (Apache-2.0),
fontTools (MIT, Python, font build only), Pillow 10.3.0 (MIT-CMU, Python; `npm run og` palette-compresses
the Open Graph PNGs).

## Recipe sources reviewed but not copied in Phase 1

| Source | Licence finding | Status |
|---|---|---|
| coss ui (cosscom/coss) | Repository default is **AGPL-3.0**; only `apps/ui/` and `apps/origin/` are MIT (LICENSING.md). | Allowed only from those two directories, with attribution. Nothing copied yet. |
| Animate UI (imskyleen/animate-ui) | **MIT + Commons Clause** — not an OSI open-source licence. | Not used (UPDATE-01 requires MIT/Apache). |
| Motion Primitives (ibelick/motion-primitives) | MIT | Allowed; nothing needed in Phase 1. |
| Arc (uiarc.dev) | MIT per UPDATE-01 | Not needed in Phase 1. |
| Vaul, Aceternity UI, Magic UI | — | Excluded by UPDATE-01. |
