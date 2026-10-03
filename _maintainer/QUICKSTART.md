# Boğaziçi IE — Compulsory Internship Guide

Source of the Boğaziçi University Industrial Engineering Department's
compulsory internship site. Published in Turkish and English; online
submission of internship documents also goes through this site.

**Live:** <https://bogazici-ie-internships.github.io/staj/>

---

## How publishing works

Every push to `main` → GitHub Actions builds it → published to GitHub Pages.
No manual step; publishing takes 1-2 minutes.

To fix a page, edit the relevant `.md` file in the GitHub UI and commit —
that's enough.

> **Term rollover, form-key rotation, and results-folder permissions are
> different.** These need coordination with the Apps Script submission
> portal and, done wrong, close the submission form. Read
> **DEPLOYMENT.md** first if you're about to do one of these.
>
> Before changing campaign dates, run the triple check from this directory:
>
> ```bash
> python3 scripts/validate_campaign_contract.py --settings settings.yml \
>   --code _maintainer/Code.gs --grader ../Grader/config/campaign.yaml
> ```

---

## File map

```
docs/                 Page content (Markdown)
  *.md                Turkish — default language
  *.en.md             English twin; updated TOGETHER with the TR file
  surec/              Internship Process (multi-section page)
  belgeler/           Downloadable forms and guides (PDF / DOCX)
  assets/
    extra.css         All of the site's custom styling
    submit.js         ALL logic for the submission form (shared TR + EN)
    yearbar.js         Homepage year-bar interaction
    fonts/            Self-hosted Inter + Newsreader (no external requests)

overrides/            Material theme template overrides
settings.yml          Term, dates, contacts, links — SINGLE SOURCE OF TRUTH
mkdocs.yml            Site configuration, navigation, plugins
scripts/              Pre-publish validators
_maintainer/Code.gs     Apps Script submission portal — NOT COMMITTED (see below)
```

### Why `settings.yml` matters

Everything that changes regularly (term label, internship dates, deadline,
academic calendar, email addresses, form links) lives here and is printed
into pages as a macro. There's no need to update the same date in two
places — **don't hand-type a date into page text**, pull it from
`settings.yml`.

### Why `Code.gs` isn't in the repo

It's the server side of the submission portal and contains the Google Drive
folder ID. Kept out via `.gitignore`; the real copy lives in the Apps
Script editor. A local copy sits on disk because the pre-publish validator
reads it.

---

## Running locally

```bash
pip install -r requirements.txt
mkdocs serve
```

Opens at <http://127.0.0.1:8000>; reloads as you save files.

The Submission page talks to the **live** Apps Script portal. With an empty
`recaptcha_site_key` the captcha box stays hidden (same as production until
you register keys). The hourly volume alert cannot be tested from `mkdocs
serve`; it only runs after `Code.gs` is deployed.

Before publishing, run the same check CI runs:

```bash
mkdocs build --strict
```

`--strict` treats broken internal links and missing files as **errors**.
Anything that fails locally will also fail in CI.

### Contract validation (if you changed the term)

CI runs this check without `Code.gs`, so it does **not** verify site ↔
portal agreement. If you touched anything term-related, run this locally:

```bash
python3 scripts/validate_campaign_contract.py --settings settings.yml --code _maintainer/Code.gs
```

If you don't see `campaign contract valid: ...`, **do not push** — you'll
close the live form. See _maintainer/DEPLOYMENT.md sections 2-3.

---

## Bilingual content

Every page has a Turkish (`page.md`) and an English (`page.en.md`) version,
published under `/` and `/en/` by `mkdocs-static-i18n`.

- Update **both files** when content changes.
- If the English side links to a Turkish heading, the anchor (`{: #… }`)
  must match — e.g. `{: #uygunluk-zamanlama }` in `sss.en.md` is there for
  exactly this reason.
- Navigation-label translations live in `mkdocs.yml` → `nav_translations`.

**The submission form's logic is shared across both languages**
(`docs/assets/submit.js`). Change a validation rule or flow in one place;
pages only carry the visible labels and `data-*` configuration.

---

## Accessibility and performance notes

Deliberate choices — be careful not to break these:

- Fonts are self-hosted; **no** external request to Google Fonts.
- Color contrast is kept above WCAG AA in both light and dark mode;
  secondary-text tokens (`--md-default-fg-color--light`) are hand-tuned for
  both schemes.
- File-picker fields are hidden with a visually-hidden pattern, not
  `display:none` — so they stay keyboard-focusable.
- `prefers-reduced-motion` and `forced-colors` are supported.
- If you change `assets/*.css` / `*.js`, bump the `?v=` number in
  `mkdocs.yml`.
