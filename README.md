# Boğaziçi IE — Compulsory Internship Guide

Live site: <https://bogazici-ie-internships.github.io/staj/> · Astro 7 static site, Turkish and English, with the
online document submission (Teslim) talking to an Apps Script portal.

- **Teaching assistants:** day-to-day edits → [`_maintainer/QUICKSTART.md`](_maintainer/QUICKSTART.md).
- **Risky operations** (term rollover, form key, reCAPTCHA, publishing results, rollback) → [`_maintainer/DEPLOYMENT.md`](_maintainer/DEPLOYMENT.md).
- **Release runbook** → [`design/RELEASE.md`](design/RELEASE.md).

## Local commands

Needs Node 24 (`.nvmrc`; ≥ 22.12 works) and, for the validators, Python 3.12 with `pip install -r requirements-ci.txt`.

```bash
npm ci
npm run dev                 # http://localhost:4321/staj/ — fake portal, live reload (add -- --host for a phone)
npm run review              # the five review builds (fake portal) on :4321–4325, LAN-reachable
npm run build               # what deploy.yml builds (real portal; needs no key locally, CI requires one)
```

Nothing local talks to the real Apps Script: `dev` and the review builds use an in-browser fake portal, and the
browser tests intercept every request. Review builds live in `dist-review-*`; `dist/` is only for test and
production builds, and the review servers (`serve.mjs --review`, implied by `--host`) refuse to serve anything
but a fake-portal build.

| Gate (all run in CI) | Command |
|---|---|
| types | `npm run check` |
| unit (contract, calendar, copy, search, sample-data guard) | `npm run test:unit` |
| copy lint (voice, Title Case, terms, TR/EN parity) | `npm run lint:copy` |
| design tokens in sync with the generator | `npm run tokens:check` |
| browser tests incl. axe, URL parity, Teslim contract | `npm run build && npm run test:e2e` |
| no fake portal in a production build | `npm run guard:fake` |
| campaign contract (settings ↔ Code.gs ↔ Grader when present) | `python3 scripts/validate_campaign_contract.py --settings settings.yml` |
| workflow action versions | `python3 scripts/validate_workflow_actions.py` |

Also local: `npm run test:visual` (screenshots, macOS baselines, not committed),
`scripts/lighthouse.sh [page …]` (writes `design/lighthouse/summary.md`).

## How TAs edit content (one small YAML edit on GitHub)

| To change… | Edit | Example |
|---|---|---|
| a date, deadline, late window, contact, link, calendar row | `settings.yml` | `teslim_kilit: "2026-10-12 10:00"` |
| a site-wide announcement | `settings.yml › duyuru` | see QUICKSTART |
| a rule | `src/content/rules/<n>-*.yaml` | change the `tr:` and `en:` text of `- no: "2.3"` |
| a key figure on Kurallar | the rule's `highlight` | `value: { tr: "20 sayfa", en: "20 pages" }` |
| a term definition (EK-1, Sicil Formu) | `src/content/glossary.yaml` | `definition: { tr: "…", en: "…" }` |
| Süreç, Rapor, SSS, Formlar, Sonuçlar, İletişim | `src/content/docs/<page>.yaml` | a section's `blocks` |
| Home or Teslim wording, server error texts | `src/content/pages/home.yaml`, `teslim.yaml` | `title: { tr: "…", en: "…" }` |
| page titles / meta descriptions / nav labels | `src/content/pages/chrome.yaml` | `description: { tr: "…", en: "…" }` |
| search synonyms | `src/content/search-keywords.yaml` | a group of equivalent words |
| a downloadable form | `public/belgeler/<file>` (same file name = same URL) | |

Every text is a `{ tr, en }` pair; the build fails if one language is missing or a number is duplicated, and the
copy lint enforces the voice. Links inside text: `[metin](page:surec#oncesi)` or `[Handbook](doc:Revised-Handbook-of-Internship.pdf)`.
Document limits (MB) are NOT content: they must match `Code.gs` and live in `src/lib/submission/contract.ts`.

## Review pages (local, generated, not committed)

The review images are regenerated on demand and kept out of the public repo (UPDATE-07, D-142):

| Page | Regenerate |
|---|---|
| `design/reviews/teslim-states.html` — every Teslim step and state | `npm run review`, then `npm run states` |
| `design/reviews/makbuz/*.pdf` — sample printed receipts | `npm run receipts` |
| `design/polish/index.html` — before/after frames | `SHOTS_SET=<set> SHOTS_PHASE=after npm run shots`, then `node scripts/polish-index.mjs` |
| `design/screenshots/index.html` — the visual grid | `npm run test:visual -- -u && npm run grid` |
| Linux visual baselines | GitHub → Actions → "Görsel temel görüntüler (Linux)" → Run workflow; download the artifact |

## Umami analytics (maintainers)

Cookieless pageview stats (page + hourly) in [Umami Cloud](https://cloud.umami.is). Tracking is **off** until you:

1. Create an Umami website for `https://bogazici-ie-internships.github.io/staj/`
2. Add GitHub repo secret **`UMAMI_WEBSITE_ID`** (the website UUID from Umami)
3. Deploy `main` (`deploy.yml` passes it to the build; `src/lib/build-info.ts` reads it)

Dashboard timezone: **Europe/Istanbul**. Local builds have no ID → no script.

### Custom events (`src/scripts/track.ts`, `src/lib/submission/analytics.ts`)

Umami → *Events* tab. Analytics focus on the **submission portal**; the rest of the site only
counts pageviews (+ `js_error`). No personal data is sent (no names, IDs, e-mails or uploaded file names).

**Budget:** Umami Cloud counts every pageview **and every stored property** as one event
(Hobby = 100K/month). The event's URL (page + language) is recorded automatically, so events
carry no `page`/`lang` properties — keep new events to 1–3 properties.

| Event | Data |
|---|---|
| `submit_start` | `term`, `late` — first file picked |
| `submit_attempt` | `files`, `total_mb` — upload started |
| `submit_success` | `seconds`, `late_days` |
| `submit_error` | `stage`, `code`, `doc` (slot key, document errors only) |
| `js_error` | own scripts only, max 3/page: `message`, `where` (file:line) |

**What went wrong?** Umami → *Events* → `submit_error` → break down by `code` (and `doc`).

| `stage` | `code` values |
|---|---|
| `closed` | `closed` (portal shown closed) |
| `gate` | `mismatch` / `unreachable` / `unavailable` (term contract check) |
| `validation` | `required_fields`, `sid_format`, `email_invalid`, `email_domain`, `missing_required`, `missing_situational`, `late_ack`, `total_size`, `not_verified`, `unavailable`, `request_id`, `closed`, `honeypot` |
| `file` | `not_pdf`, `too_large` (+ `doc`) |
| `upload` | `network`, `timeout`, `captcha`, `http_<status>`, `bad_json`, `other` |
| `server` | Code.gs rejection, mapped from its Turkish message in `SERVER_ERRORS` (`src/lib/submission/contract.ts`): `captcha_failed`, `invalid_key`, `missing_doc`, `not_pdf`, `too_large`, `bad_content`, `total_size`, `rate_limited`, `busy`, `in_progress`, `rollback`, `contract_mismatch`, `server_error`, … — `unknown` = a message missing from `SERVER_ERRORS` |

When a new `error:` string is added to Code.gs, add it to `SERVER_ERRORS` with a code, give it TR/EN text in `src/content/pages/teslim.yaml › serverErrors`, and run `node scripts/baseline/code_gs_snapshot.mjs` (the unit tests fail until every Code.gs message has a text).

### Script options

- `data-domains` = host of `site_url` → localhost / forks / previews are not counted.
- `data-tag` = `donem.campaign_id` (settings.yml) → filter/compare terms in the dashboard.
