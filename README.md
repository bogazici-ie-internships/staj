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
| `server` | Code.gs rejection, mapped from its Turkish message in `SERVER_EN` (submit.js): `captcha_failed`, `invalid_key`, `missing_doc`, `not_pdf`, `too_large`, `bad_content`, `total_size`, `rate_limited`, `busy`, `in_progress`, `rollback`, `contract_mismatch`, `server_error`, … — `unknown` = a message missing from `SERVER_EN` |

When a new `error:` string is added to Code.gs, add it to `SERVER_EN` with a code too.

### Script options

- `data-domains` = host of `site_url` → localhost / forks / previews are not counted.
- `data-tag` = `donem.campaign_id` (settings.yml) → filter/compare terms in the dashboard.
