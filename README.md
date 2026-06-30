# Internship Website — Maintainer Guide

Student-facing internship site for the Boğaziçi University IE Department. Built with
[MkDocs](https://www.mkdocs.org/) + [Material](https://squidfunk.github.io/mkdocs-material/);
it is a **static** site hosted free on GitHub Pages.

## Editing content (the easy way)

All content lives under `docs/` as **Markdown** (`.md`). No technical skills needed:

1. On GitHub, open the `.md` file you want to change → edit with the pencil (✏️).
2. "Commit changes".
3. A GitHub Action rebuilds and republishes automatically (1–2 minutes).

> Yellow `🔧 Doldurulacak` notes and `<!-- TODO ... -->` lines mark what still needs
> filling. **Values that change each term live in [`settings.yml`](settings.yml)** —
> edit only that file for the term label, key dates, the submission deadline lock,
> contacts (advisor, 3 assistants, 2 secretaries, offices) and links.

### Page map

| File | Page |
|---|---|
| `docs/index.md` | Home |
| `docs/surec/index.md` | Process steps — one page, `#oncesi` · `#sirasinda` · `#sonrasi` anchors |
| `docs/kurallar.md` | Rules (Handbook summary) |
| `docs/rapor.md` | Report template + topic guide + how it's graded |
| `docs/formlar.md` | Download center |
| `docs/teslim.md` | Submission portal (upload form) |
| `docs/sss.md` | FAQ |
| `docs/sonuclar.md` | Results access (not published — KVKK) |
| `docs/iletisim.md` | Contact (from `settings.yml`) |
| `docs/belgeler/` | Downloadable forms / PDFs |

Menu order is set in `mkdocs.yml` → `nav:`.

> Note: site content is **Turkish** (it serves Turkish students); these maintainer
> docs are in English.

## Single config file — `settings.yml`

Regularly-changing values (term, dates, deadline lock, contacts, registration form
link, portal URL/token) are centralized in [`settings.yml`](settings.yml) and pulled
into pages via the `mkdocs-macros` plugin (`{{ donem.etiket }}`, `{{ iletisim.* }}`,
`{{ baglantilar.* }}`). Each term, edit only this file.

## Adding a form / document

1. Put the file in `docs/belgeler/` (ASCII, no-space name, e.g. `Sample-Form.pdf`).
2. Link it on the relevant page: `[PDF](belgeler/Sample-Form.pdf)`.

> **Never commit student result lists (personal data) to this repo.** The site is
> public; results are shared only via the restricted channel in `docs/sonuclar.md`.

## Local preview (optional)

```bash
cd Website
pip install -r requirements.txt
mkdocs serve            # http://127.0.0.1:8000
mkdocs build --strict   # broken-link / anchor check (same as CI)
```

## Publishing (GitHub Pages)

1. Push this folder to a **public** GitHub repo (free Pages needs public).
2. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` to build and publish.
4. Set `site_url` (and optionally `repo_url`/`edit_uri`) in `mkdocs.yml` to the live URL.

## Submission portal

`docs/teslim.md` is the student upload form; the term label, deadline lock and
portal link live in [`settings.yml`](settings.yml).
