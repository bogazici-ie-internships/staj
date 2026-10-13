---
# DESIGN.md — Boğaziçi IE Zorunlu Staj · "Kronometre × Akademi Gazetesi"
# Format: google-labs-code/design.md (alpha). Tokens below are the source of truth;
# the Markdown sections explain intent. Values are binding unless marked "öneri".
version: 1.0
name: kronometre-gazete
colors:
  light:
    paper:        "#F6F4EE"   # page ground
    surface:      "#FFFFFF"   # boards, inputs, cards
    ink:          "#0E1726"   # text, strong rules
    ink-2:        "#3D4A5C"   # secondary text (≈8:1 on paper)
    muted:        "#56627A"   # labels, metadata (≈5.5:1 on paper)
    rule:         "rgba(14,23,38,0.15)"
    primary:      "#17457F"   # BU navy — dominant; closed terms, primary buttons, accents
    on-primary:   "#FFFFFF"
    primary-tint: "#E8EEF6"   # selected states
    conditional:  "#2A9D9A"   # Bosphorus teal — ONLY fill/line for "koşullu" (Yaz Okulu); never small text
    signal:       "#D23A22"   # ONLY deadline / late semantics, as fill (white text on it)
    signal-text:  "#B02A16"   # signal used as text on paper/white (≈5.8:1)
    signal-tint:  "#FBE9E5"
    success:      "#1F7A4D"
    error:        "#B42318"
  dark:   # "Gece Vardiyası"
    paper:        "#0B1020"
    surface:      "#121A2E"
    ink:          "#E8ECF4"
    ink-2:        "#C3CCDD"
    muted:        "#A9B4CC"
    rule:         "rgba(232,236,244,0.14)"
    rule-strong:  "#3A4766"
    primary:      "#3A6DB5"
    on-primary:   "#FFFFFF"
    accent-text:  "#7CC4FF"   # links, phase labels in dark
    conditional:  "#4FC3BF"
    signal:       "#FF6B57"   # fill; text on it = paper (#0B1020)
    signal-text:  "#FF8A7A"
    signal-tint:  "#2A1A22"
    success:      "#4FC08A"
    error:        "#FF8A7A"
typography:
  display: { family: "Bricolage Grotesque", source: Google Fonts, license: OFL, axes: "opsz 12–96, wdth 75–100, wght 200–800", use: "Kronometre headings; font-stretch 75–85%, weight 700–800, tracking −0.02 to −0.035em" }
  editorial: { family: "Newsreader", source: Google Fonts, license: OFL, axes: "opsz 6–72, wght 200–800, ital", use: "long-form body (19px/1.6, 60–68ch) and editorial headings (opsz 72, weight 500–600); italic for section names like 'Önce / Sırasında / Sonra'" }
  ui: { family: "Schibsted Grotesk", source: Google Fonts, license: OFL, axes: "wght 400–900, ital", use: "UI, short body, forms, nav, buttons" }
  mono: { family: "JetBrains Mono", source: Google Fonts, license: OFL, use: "dates, times, countdown, file names, sizes, reference numbers, section indices; font-variant-numeric: tabular-nums" }
  rules:
    - "Max 4 families (above). No Inter, Roboto, Space Grotesk, Geist, Fraunces, Familjen."
    - "Self-host via Astro Fonts API or Fontsource; load latin + latin-ext; test 'ğĞşŞıİçÇöÖüÜ'."
  scale: "Utopia fluid scale 360→1440px, ratio 1.2→1.333. Display hero clamp(64px,10vw,156px); h2 clamp(36px,4vw,56px); body 17–19px; labels 12–14px mono."
radius: { none: 0, field: 2px }      # nothing else; no rounded cards, no pills (except status dots / circular seal)
border: { hairline: "1px solid var(--rule)", strong: "2px solid var(--ink)", double: "3px double var(--ink)" }
shadow: { hard: "4px 4px 0 var(--ink)" }   # primary CTA only; no blur shadows anywhere
spacing: "4px base: 4 8 12 16 24 32 48 64 96; page gutter 16px (≤600px) / 32px; max content width 1320px; reading measure 66ch"
grid: "12 columns, visible as 1px column rules (decorative, aria-hidden) on hero and calendar"
motion:
  default: none
  allowed: [hero-countdown-digit-change, calendar-today-marker, cross-page-view-transition-of-h1]
  easing: "cubic-bezier(0.2, 0, 0, 1)"
  duration: "160–320ms"
  rule: "All motion inside @media (prefers-reduced-motion: no-preference). No motion inside the submission form except progress bar."
---

# Kronometre × Akademi Gazetesi

## 1. Concept
The site is a **departure board run by a department newspaper**.
- **Kronometre** (the board) speaks wherever time matters: Home, Teslim (submission), calendar, Formlar, Sonuçlar, İletişim. Grid, mono dates, big condensed grotesk, one signal colour for deadlines, 1px rules, sharp corners.
- **Akademi Gazetesi** (the paper) speaks wherever students read: Süreç, Kurallar, Rapor Hazırlama, SSS. Newsreader body, § numbering, drop-cap intro, double rules, an "Ajanda" sidebar, big-number rule cards.
- Both share one header, nav, footer, token set and dark theme. A page never mixes the two voices in the same block.
Bold comes from type scale, grid discipline and dates taking the stage — not from decoration.

## 2. Page → voice map
| Page | Voice | Must-have |
|---|---|---|
| Ana sayfa | Kronometre (+ Gazete "Kurallardan" strip) | Top deadline strip; hero "Staj, zamanında."; departure board (Tarih/Olay/Durum) with live countdown; 12-month calendar strip with Bugün + Teslim markers; 01/02/03 phases; contact |
| Teslim | Kronometre | Step flow (§6) |
| Süreç | Gazete | Three chapters Önce/Sırasında/Sonra (italic Newsreader titles), drop cap intro, sticky in-page contents on desktop |
| Kurallar | Gazete | § numbered rules (§ 1.1 …), big-number cards for 40 iş günü / 15 gün üretim / en az 15 gün / 20 sayfa, Handbook link as binding source |
| Rapor | Gazete | Outline as numbered chapters, margin notes for definitions |
| SSS | Gazete | Accordion grouped by topic, Pagefind search on top, deep-linkable answers |
| Formlar & Belgeler | Kronometre | Document table: ad · ne zaman · kim imzalar · format · indir |
| Sonuçlar, İletişim | Kronometre | Simple boards; consistent help location (WCAG 3.2.6) |

## 3. Signature elements
1. **Deadline strip** (top of every page): ink band, mono text, signal chip "2 gün 17 sa kaldı" (minute precision; no per-second updates; no aria-live).
2. **Departure board**: 2px ink frame, countdown DD/HH/MM in mono, rows Tarih · Olay · Durum; current deadline row on signal-tint with a signal "Açık" chip.
3. **Calendar strip**: 12 month columns with 1px rules, mono month labels "01 Oca"; closed terms = primary fill with label; Yaz Okulu = conditional teal hatch (repeating 135° lines) + border; Teslim = 3px signal line + chip; Bugün = dashed ink line + ink chip. Below it, the exact-date list (the strip is decorative + role="img" with full aria-label; the list is the accessible truth). On narrow screens the strip scrolls inside its frame; the list stays.
4. **Section indices**: mono "02 — Takvim" above h2 on Kronometre pages; "§" numbers on Gazete pages.
5. **Drop cap + double rule** opening on Gazete pages (Newsreader, primary colour drop cap).
6. **Receipt-style confirmation** after submission.
7. **Seal**: original full-colour BU seal on a white circle; never tinted.

## 4. Components (each needs default / hover / focus-visible / active / disabled / error / success where applicable)
- Button primary: primary fill, white text, 2px radius, hard shadow; height ≥ 52px on mobile.
- Button secondary: 2px ink border, transparent. Tertiary: underlined text link ≥ 44px hit area.
- Text input: 2px ink border, white surface, label above, hint below label, error = 2px error border + message above input + aria-invalid + aria-describedby.
- Error summary: "Bir sorun var" / "There is a problem", list of links to fields, receives focus on submit.
- Step indicator: 3 segments (Kimlik · Belgeler · Kontrol), current filled primary + aria-current="step", "Adım n / 3" in mono.
- Document slot: 2px frame; name + requirement (mono "PDF ≤ 5 MB"); states Bekleniyor (dashed) / Eklendi, henüz gönderilmedi (✓ success icon + filename + size + "Değiştir"/"Kaldır") / Hata (error border + reason + how to fix). Always a "Dosya seç" button; drag-and-drop is an enhancement (WCAG 2.5.7).
- Situation option: large checkbox card; selected = primary border + primary-tint.
- Check-answers row: key · value · "Değiştir" (with visually hidden context).
- Confirmation panel: success fill, white text, no links inside.
- Status chip: mono 12px, fill + text, never colour alone.
- Accordion (SSS), table (Formlar), callout "Bu formu kullanmayın, eğer…" (2px ink frame, no side stripe).

## 5. Do / Don't
DO: one dominant colour (primary) + one signal colour reserved for deadlines; states as colour + icon + text; real content and real dates from settings.yml; absolute date + time + "TSİ" next to every relative countdown; plain Turkish ("Dosya 5 MB'tan küçük olmalı", not "Geçersiz giriş").
DON'T: gradients (except hatch patterns), glassmorphism, blur shadows, rounded cards, pills everywhere, side-stripe callouts, uppercase kickers on every section, identical 3-card grids with hover lift, emoji icons, bento grids, marketing copy ("🚀 Hemen başla"), lorem ipsum, invented statistics, motion in the form, signal colour for anything that is not a deadline.

## 6. Submission flow (Teslim)
0. **Hazırlık**: what you need (required + situational docs with limits), deadline + late rule, "Bu formu kullanmayın, eğer…" exceptions, CTA "Başla", "Formları indir".
1. **Kimlik**: Ad Soyad, Öğrenci numarası (10 digits, hint), öğrenci e-postası (@std.bogazici.edu.tr), situation checkboxes (Cumartesi; Devlet katkısı) which decide step 2's slots. If late: late banner + required acknowledgement checkbox here.
2. **Belgeler**: slots for required + selected situational docs; instant client-side validation (PDF signature, size, per-doc limit, total < 45 MB); running total meter; error summary on Continue.
3. **Kontrol et**: check-answers (personal info, situations, files with name/size/"Değiştir"), declaration, button "Kabul ediyorum ve gönder"; during upload show determinate progress "3/4 dosya yükleniyor — sayfayı kapatmayın", keep data on network failure and offer retry without re-selecting files.
4. **Makbuz**: "Belgeleriniz alındı", request/reference id (mono), timestamp TSİ, term, on-time/late status, file list, "Sırada ne var", print/save as PDF, EK-1 reminder for Hesap İşleri. Page must be printable.
Steps are client-side screens of ONE submission; payload and endpoint stay exactly as today.

## 7. Accessibility (acceptance criteria)
WCAG 2.2 AA. Text 4.5:1, large text/UI 3:1 (verify every pair, both themes). Focus ring 2px ink + 2px paper offset (dark: 2px #7CC4FF). Targets ≥ 44px. Sticky elements never cover focused fields (2.4.11). No info by colour alone. %200 zoom and 320px width with no horizontal page scroll. Keyboard-complete flow. prefers-reduced-motion honoured. Countdown: minute precision, no aria-live. Error summary focus management. axe: zero violations.

## 8. i18n
TR default at /staj/, EN at /staj/en/; same components, every string in both. TR strings run ~20% longer — test both. Dates: TR "12 Ekim 2026, 10:00 TSİ"; EN "12 October 2026, 10:00 (GMT+3)". Server error messages mapped to both languages.

## 9. Reference mockups
`reference/*.dc.html` are the approved mockups (HTML with inline styles; ignore the `x-dc`/`sc-if` wrapper syntax and the DCLogic script except as logic hints):
- Main.dc.html — Kronometre home (tema: Açık/Koyu, cihaz: Masaüstü/Telefon); live countdown + Bugün marker logic in the script.
- Akademi.dc.html — Gazete voice: masthead, Ajanda sidebar, almanac calendar table, "Kurallardan" § cards, chapters. Use its voice for Süreç/Kurallar/Rapor/SSS, NOT its masthead for the global header (global header is Kronometre's).
- T1-Hazirlik.dc.html, T2-Kimlik.dc.html — first two flow screens; steps 2–4 follow §6 in the same language.
Fonts in Akademi mockup (Fraunces, Familjen) are replaced by Newsreader and Schibsted Grotesk per tokens.
