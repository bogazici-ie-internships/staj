# Test migration map: `tests/legacy/*.spec.js` → `tests/e2e/*.spec.ts`

The legacy suite (MkDocs + `submit.js`) was retired with the MkDocs site in UPDATE-07 (D-145): every check it
had is ported below, and URL/anchor parity lives in `tests/e2e/parity.spec.ts` and `scripts/smoke.mjs`. It remains
in the `pre-redesign` tag (`4553fcd`), where the golden contract can be re-recorded. No assertion was deleted. Where a selector or wording changed
on purpose the reason is given. On top of the port, `tests/e2e/contract.spec.ts` replays all 11
recorded `submit.js` scenarios (`tests/baseline/contract-golden.json`) byte-for-byte through the new flow.

## form.spec.js → flow.spec.ts

| Legacy test / assertion | New test / assertion | Why it changed |
|---|---|---|
| opens after server check (TR/EN): `#suf-submit` text "Gönder"/"Submit", `#suf-gate` hidden | same test: `#sufForm[data-contract=ready]`, `#suf-gate` hidden, `#suf-submit` "Kabul ediyorum ve gönder"/"Accept and send" (enabled) on Kontrol | Submit now lives on step 3 with the DESIGN.md §6 label. |
| contract mismatch: gate + retry visible, submit disabled, 0 POSTs | same, submit checked on Kontrol | — |
| empty submit: 3 `.suf-field input.bad`, 3 `.suf-req-row .suf-drop.bad`, "Gönderilmedi: 6 alan", focus `#suf-name`, `aria-invalid`, `#suf-hint` hidden, 0 POSTs | 3 `input[aria-invalid=true]` on Kimlik + summary "3 alanı düzeltin"; then 3 `[data-slot][data-state=error]` on Belgeler (+3 summary items); **focus on the error summary**, summary link moves focus to `#suf-name`; `aria-invalid` kept; `#suf-hint` hidden kept; 0 POSTs | Two screens instead of one page; DESIGN.md §4 "error summary receives focus" (GOV.UK pattern). |
| wrong domain + wrong ID: warn elements visible, focus `#suf-sid` | both fields `aria-invalid`, both messages shown above their inputs, focus on summary | same reason as above |
| file rules: not PDF / 10 MB report / 1 MB EK-1 / 900 KB EK-1 ok (`.bad`/`.ok`, `.m span` text) | same four cases via `data-state="error"/"added"` and slot text; **plus** a renamed non-PDF (signature check) | class names → `data-state`; new client check mirrors Code.gs. |
| situational doc required (`.suf-drop[data-key=cumartesi].bad`) | `[data-slot=cumartesi][data-state=error]` after Continue | — |
| drag-and-drop picks with same rules | same; dispatches dragenter/dragover/drop and gives the item a `webkitGetAsEntry` like a real OS drag | React Aria reads dropped files through FileSystemEntry. |
| — | new: first-page preview + page count after choosing a real PDF | UPDATE-01 (pdf.js). |
| countdown "3 gün kaldı" → "2 saat kaldı" → "dakika kaldı" | "3 gün 0 sa kaldı" → "2 sa 0 dk kaldı" (or 1 sa 59 dk) → "dakika kaldı" | D-07: one countdown definition everywhere (accepted). |
| deadline passes while open → late notice, "1 gün geç teslim", ack required (`#suf-msg` "geç teslim onayını"), then 1 POST | same; message now in the error summary; late notice appears **on the Kontrol screen** mid-flow | — |
| deadline passes before the 30 s tick → caught at Submit | same | — |
| grace over → `#suf-closed` visible, `#sufForm` hidden | `#suf-closed` visible, no Start button | `#sufForm` is now the wrapper that also holds the closed panel. |
| success: payload fields, `.suf-done__title` focused, "Zamanında", form hidden, 4 downloads byte-equal | same + reference id, file count line, submit button gone | — |
| — | new: double-click sends one request; progress visible while sending | UPDATE-01 §1. |
| late EN receipt "1 day late" | same | — |
| legacy response without time → `.suf-done__when` count 0 | same | — |
| EN translates TR server error; form keeps data; submit enabled | same; data checked on the Kontrol list; button reads "Try again" | UPDATE-01 retry wording. |
| Umami: server rejection → `submit_error {stage:server, code:not_pdf, doc:rapor}`, events start/attempt/error | same | — |

## pages.spec.js → pages.spec.ts / parity.spec.ts / a11y.spec.ts

| Legacy | New | Why |
|---|---|---|
| 18 pages open, no JS errors, no overflow at 375 px | same at 375 **and 320 px** | WCAG reflow (DESIGN.md §7). |
| 404 bilingual, title centred | same (`section[lang=en]` because the EN switch link also has `lang=en`) | — |
| home: `.staj-lede__meta` date+time, link to `teslim/`, no registration button in the opening | strip date `dd.mm.yyyy · hh:mm TSİ` links to Teslim; board rows show date + time; hero CTA → Teslim; exactly one primary button in the hero (registration is a tertiary link) | new markup |
| — | new: board/strip live states (open, late) and the Bugün marker position | — |
| contrast ≥ 4.5:1 for 11 selectors, light + dark | same measurement for 15 selectors of the new pages | selectors changed with the markup |
| — | new: parity (titles, descriptions, canonical, hreflang, OG, anchors, `/belgeler/*`, sitemap) | REDESIGN_PROMPT URL parity |
| — | new: axe on all built pages × light/dark × TR/EN, Teslim screens, phone menu, keyboard-only flow, reduced motion | REDESIGN_PROMPT quality gates |

`test.fixme` (deferred, not deleted): old content anchors on the six Phase 2 placeholder pages
(`surec`, `rapor`, `formlar`, `sss`, `sonuclar`, `iletisim`, TR + EN = 10 tests). They return with
those pages' content in Phase 2.
