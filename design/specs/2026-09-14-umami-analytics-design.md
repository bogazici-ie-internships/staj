# Umami Cloud analytics — design spec

**Date:** 2026-09-14  
**Status:** Implemented (2026-09-14) — enable tracking by setting GitHub secret `UMAMI_WEBSITE_ID`  
**Site:** [Boğaziçi EM Zorunlu Staj Kılavuzu](https://bogazici-ie-internships.github.io/staj/) (MkDocs Material, GitHub Pages)

## Goal

Measure **page-level traffic with hourly granularity** (primary metric: **pageviews**). Only the site maintainer views data (Umami Cloud dashboard). No public stats page on the staj site.

## Non-goals

- Unique-user counts as a decision metric (available in Umami as estimate only)
- Form submission analytics (handled separately by submission portal / `submit.js`)
- Self-hosted analytics infrastructure
- Google Analytics or ad-tech trackers
- Cookie consent banner (not required for cookieless Umami script when configured without cookies)

## Context

- Static site: no server-side logging on GitHub Pages
- Deploy: push to `main` → GitHub Actions → `mkdocs build --strict` → Pages
- i18n: TR and EN pages are separate URLs (e.g. `/staj/teslim/` vs `/staj/en/teslim/`) — both are tracked as distinct paths (intentional)
- No analytics today

## Architecture

```
Visitor browser
    → loads HTML from GitHub Pages
    → deferred Umami script (cloud.umami.is)
    → POST pageview event (path, referrer, device class; no PII)
Umami Cloud
    → aggregates by page + hour (Europe/Istanbul in UI)
Maintainer
    → logs into Umami Cloud dashboard (account not linked from public site)
```

**Change surface on the live site:** one deferred third-party script tag in the global HTML template (`overrides/main.html` `extrahead` block), plus configuration for the public website ID.

## Configuration

| Item | Where | Notes |
|------|--------|--------|
| Umami website ID | `mkdocs.yml` → `extra.umami_website_id` | Public in HTML; filled at deploy from `UMAMI_WEBSITE_ID` secret |
| Script URL | Fixed: `https://cloud.umami.is/script.js` | Umami Cloud |
| Time zone for reports | Umami dashboard user setting | Use **Europe/Istanbul** |
| Umami site domain | Umami project settings | `bogazici-ie-internships.github.io` with path prefix awareness in page reports |

**Local preview (`mkdocs serve`):** either omit the script when `dev_addr` / env flag indicates local, or register a separate Umami “website” for localhost. **Recommendation:** do not send local preview traffic to production stats (guard in template or empty ID in local `settings.yml`).

## Data the maintainer will use

- **Pages:** list of paths with total pageviews for a date range
- **Hourly chart:** site-wide or filtered to one page
- **Referrers:** coarse source (direct, Google, etc.)
- **Export:** CSV when needed for Excel (Umami feature availability per plan)

Example interpretation: spike on `/staj/teslim/` between 10:00–12:00 TR on deadline week → demand signal, not exact headcount.

## Privacy & compliance (KVKK-oriented)

- Umami default script is **cookieless**; no student identity collected
- No analytics link in public footer required for admin-only use
- Optional later: one sentence on `iletisim.md` that anonymous usage statistics are collected to improve the guide (not in initial scope unless department asks)
- Third-party processor: Umami Cloud (review their DPA / data location when creating account)

## Deployment & rollback

1. Create Umami Cloud account and website entry for the GitHub Pages URL
2. Add website ID to repo config; add script to template
3. Merge to `main` → automatic deploy (existing workflow unchanged unless we add optional build-time ID injection — **not required** if ID is committed)
4. **Rollback:** remove script block + ID in one commit; redeploy restores prior behavior immediately

**Risk:** script failure should not break site (defer, no inline dependency). **Risk:** `--strict` build must still pass (template-only change).

## Testing

- [ ] `mkdocs build --strict` locally with ID set
- [ ] After deploy: Umami “Realtime” shows own visit
- [ ] Hit TR and EN pages; confirm distinct paths in Pages list
- [ ] Confirm submission form still works (script must not block `submit.js`)
- [ ] Optional: add a small CI check that `umami_website_id` is non-empty only on release builds (YAGNI for v1)

## Future extensions (out of scope)

- Plausible migration if UX needs upgrade
- Weekly automated email report
- Separate Umami views merged in spreadsheet for TR+EN pairs

## Approval

Maintainer confirmed approach: **Umami Cloud**, page × hour **pageviews**, dashboard access **maintainer only**.
