# Boğaziçi IE — Compulsory Internship Guide

Live site: <https://bogazici-ie-internships.github.io/staj/>

## Umami analytics (maintainers)

Cookieless pageview stats (page + hourly) in [Umami Cloud](https://cloud.umami.is). Tracking is **off** until you:

1. Create an Umami website for `https://bogazici-ie-internships.github.io/staj/`
2. Add GitHub repo secret **`UMAMI_WEBSITE_ID`** (the website UUID from Umami)
3. Deploy `main` (existing workflow injects the ID at build time)

Dashboard timezone: **Europe/Istanbul**. Local `mkdocs serve` keeps an empty ID → no script in the build.
