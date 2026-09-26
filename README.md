# Boğaziçi IE — Compulsory Internship Guide

Live site: <https://bogazici-ie-internships.github.io/staj/>

## Browser tests

`tests/e2e/` holds Playwright tests that run against the built site on every
push, between `mkdocs build` and publishing — a failing test stops the deploy.
They cover the submission form (validation, file rules, deadline/late flow,
confirmation screen and downloads), every page in both languages, and colour
contrast. Dates come from `settings.yml`, so nothing needs editing per term.

Run locally:

```bash
mkdocs build --strict
cd tests/e2e && npm ci && npx playwright install chromium && npx playwright test
```

(`PW_CHANNEL=chrome npx playwright test` uses an installed Chrome instead.)

## Umami analytics (maintainers)

Cookieless pageview stats (page + hourly) in [Umami Cloud](https://cloud.umami.is). Tracking is **off** until you:

1. Create an Umami website for `https://bogazici-ie-internships.github.io/staj/`
2. Add GitHub repo secret **`UMAMI_WEBSITE_ID`** (the website UUID from Umami)
3. Deploy `main` (existing workflow injects the ID at build time)

Dashboard timezone: **Europe/Istanbul**. Local `mkdocs serve` keeps an empty ID → no script in the build.

### Custom events (`docs/assets/track.js`, `docs/assets/submit.js`)

Umami → *Events* tab. No personal data is sent (no names, IDs, e-mails or uploaded file names).

**Budget:** Umami Cloud counts every pageview **and every stored property** as one event
(Hobby = 100K/month). The event's URL (page + language) is recorded automatically, so events
carry no `page`/`lang` properties — keep new events to 1–3 properties.

| Event | Data |
|---|---|
| `download` | `file` |
| `outbound` / `mailto_click` / `tel_click` | `url` / `to` / – |
| `lang_switch` | – (direction = event URL) |
| `faq_open` | `q` (question title) |
| `search` / `search_click` | `q` (skips `@` / long digit runs), `results` / `target` |
| `not_found` | `ref` (missing path = event URL) |
| `section_jump` / `section_landing` | `section`, `via` (toc/content), `target` (cross-page only) / `section`, `ref` |
| `read_depth` | pages with ≥4 h2/h3: `deepest`, `pct`, `engaged` (active-time bucket) |
| `engaged_time` | all other pages: `bucket` — time visible **and** active (≤30 s idle) |
| `copy` | `kind` (email/code/url/text — never the text), `section`; form fields & search ignored |
| `tab_switch` | `tab` (label) — user choices only |
| `print` | – |
| `js_error` | own scripts only, max 3/page: `message`, `where` (file:line) |
| `submit_start` → `submit_attempt` → `submit_success` | funnel; `term`, `late`, `late_days`, `files`, flags, `seconds` |
| `submit_blocked` / `submit_file_rejected` / `submit_error` / `submit_gate_fail` / `submit_closed` | `reason` code |

### Script options & session properties

- `data-domains` = host of `site_url` → localhost / forks / previews are not counted.
- `data-tag` = `donem.campaign_id` (settings.yml) → filter/compare terms in the dashboard.
- `umami.identify` once per browser session (no distinct ID, Umami → *Sessions*): `phase`
  (`before_deadline` / `late_window` / `closed` / `no_deadline`, computed in the browser from
  `teslim_kilit` + `gec_teslim_gun`), `theme` (light/dark), `lang_mismatch` (browser language ≠ site language).
