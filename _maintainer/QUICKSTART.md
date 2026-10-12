# Boğaziçi IE — Compulsory Internship Guide (quick start)

Source of the Boğaziçi University Industrial Engineering Department's compulsory internship site, in Turkish and
English, including the online submission of internship documents.

**Live:** <https://bogazici-ie-internships.github.io/staj/>

---

## How publishing works

Every push to `main` → GitHub Actions builds the site, runs the tests, and publishes it to GitHub Pages
(about 5 minutes). If a test fails, nothing is published and the live site stays as it was; the failing step is
shown in the repository's **Actions** tab.

To fix a text, edit the YAML file in the GitHub web editor and commit to `main`. That's all.

> **Term rollover, form-key rotation and reCAPTCHA are different.** They must be coordinated with the Apps Script
> submission portal and, done wrong, close the submission form. Read **DEPLOYMENT.md** first.

---

## Where things are

```
settings.yml               Term, deadline, late window, calendar, contacts, links, announcement — SINGLE SOURCE
src/content/
  rules/*.yaml             Kurallar (each rule, its number, its key figure)
  glossary.yaml            Terms (EK-1, Staj Sicil Formu …)
  docs/<page>.yaml         Süreç, Rapor, SSS, Formlar, Sonuçlar, İletişim
  pages/home.yaml          Home
  pages/teslim.yaml        Submission page texts, receipt, server error messages
  pages/chrome.yaml        Navigation, page titles, meta descriptions, search suggestions
  search-keywords.yaml     Search synonyms
public/belgeler/           Downloadable forms (PDF / DOCX); the file name is the URL
_maintainer/Code.gs        Apps Script portal — NOT COMMITTED (it holds the form key)
```

Every visible text is a pair: `{ tr: "…", en: "…" }`. Write both. The build fails if one is missing; the copy
check (`npm run lint:copy`) flags tone and term mistakes (e.g. "-iniz" in Turkish body text, Title Case headings).
Don't type a date into a text: dates come from `settings.yml`.

## Common edits

- **A sentence on a page:** find it in `src/content/` (GitHub's search: press `/`), change `tr:` and `en:`.
- **A form:** replace the file in `public/belgeler/` with the same name (the link stays the same).
- **Contacts:** `settings.yml › iletisim` (keep the assistant list alphabetical).
- **Calendar rows:** `settings.yml › takvim` — `tarih:` for one day, `baslangic:` / `bitis:` for a range, with the
  `*_en` counterparts.

### Post an announcement

Add this block at the end of `settings.yml` (both languages, end time in Türkiye time):

```yaml
duyuru:
  mesaj: "Sonuç listesi güncellendi. [Sonuçlar](page:sonuclar) sayfasına bakınız."
  mesaj_en: "The results list has been updated. See the [Results](page:sonuclar) page."
  bitis: "2026-12-31 23:59"
  # kapatilamaz: true      # urgent: students cannot close it
```

It appears above the deadline strip on every page until `bitis`, then hides itself. Students can close it
(remembered in their browser) unless `kapatilamaz: true`. Changing the text shows it again to everyone. Remove the
block when it is no longer needed.

### Publish the results list

The Sonuçlar page shows the term's results PDF from `public/internships/` (`New_Internships_<campaign>.pdf`), with
an embedded viewer on desktop and an "open" button. "Son güncelleme" is the time the file was committed. The file
of `settings.yml › donem.campaign_id` is shown first (or the newest one); other terms' files are listed under it.
On a `main` checkout that is up to date with GitHub, with `../Data Store` next to this folder:

```bash
npm run results:publish -- 2026-summer     # Data Store generates the PDF, the script checks it and commits it
git push origin main                       # publishes it (about 5 minutes)
```

The script runs `reports/generate_report.py --campaign <id> --out public/internships/New_Internships_<id>.pdf` in
Data Store (with its `.venv`; set `DATA_STORE_DIR` if Data Store is elsewhere), checks the PDF, prints its size
and page count and commits only that file; it never pushes. `--no-commit` generates and checks only.
**Manual alternative:** copy the PDF into `public/internships/` under the same name, commit it and push.
For a one-line remark under the file (e.g. that late submissions follow), fill `settings.yml › sonuclar.not` and
`not_en`. A published file stays in the repository's history; publish only the final list.

### Set the next campaign

This is the term rollover in **DEPLOYMENT.md §3** — do it only after the current late window has closed, and in
the same pass as `Code.gs` and `Grader/config/campaign.yaml`. In `settings.yml` it means: the `donem:` block (the
nine contract fields plus `etiket_en`), the `takvim:` rows and `serit_baslangic` / `serit_bitis`. Then run:

```bash
python3 scripts/validate_campaign_contract.py --settings settings.yml \
  --code _maintainer/Code.gs --grader ../Grader/config/campaign.yaml
```

If it doesn't print `campaign contract valid: …`, **do not push** — the live form would close.

---

## Running locally

```bash
npm ci
npm run dev            # http://localhost:4321/staj/ — reloads as you save
```

The local site uses a **fake** submission portal in the browser: nothing is sent anywhere. To look at every
Teslim screen, add `?preview=kimlik` (or `belgeler`, `kontrol`, `done` …) to the Teslim URL; the full list is in
`tests/states/states.ts`.

Before pushing a bigger change, run what CI runs:

```bash
npm run check && npm run test:unit && npm run lint:copy && npm run build && npm run test:e2e
```

---

## Accessibility and performance notes

Deliberate choices — be careful not to break these:

- Fonts are self-hosted (OFL); no request to Google Fonts. Search loads only when opened.
- Contrast stays above WCAG AA in light and dark mode; the browser tests run axe on every page.
- `prefers-reduced-motion` is supported (no entrance or board animation).
- Assets are fingerprinted by the build: no `?v=` cache-busting is needed.
