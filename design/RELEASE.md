# Release runbook — redesign (Astro) → `main`

> Released 2026-10-12 as f2aee6b (fast-forward, single commit on top of 4553fcd); kept as history. `main` has
> since been folded to two commits (old site + new site); day-to-day changes and rollbacks follow CLAUDE.md and
> `_maintainer/DEPLOYMENT.md` §6a.

The release happened only after the maintainer said "yayına al" (it had first been planned for no earlier than
22 October, after the late window). The new site went onto `main` as **one commit** on top of the MkDocs history,
which then ended at `4553fcd`, as a fast-forward: no merge commit, and the redesign's working history stayed local.
Internal process files (`design/*` except this file) were not part of the public commit.

Times below are Türkiye time.

## 1. Pre-flight (all must hold before the release)

- [ ] **CI green on the PR** (`ci.yml`): validators, `astro check`, unit, copy lint, build, guard, browser tests.
- [ ] **Accessibility / performance:**
  - axe has 0 violations in the browser tests (every page, TR/EN, light/dark, Teslim screens);
  - Lighthouse summary (`design/lighthouse/summary.md`, local only, not committed): re-run `scripts/lighthouse.sh "" kurallar/ teslim/ …` if older than the last content change.
- [ ] **URL parity:** `tests/e2e/parity.spec.ts` passes. That covers:
  - all 18 MkDocs URLs, with their titles, descriptions, canonical, hreflang and OG;
  - every link anchor;
  - the sitemap;
  - documents and assets at the same URLs.
- [ ] **`Code.gs` untouched:** the redesign never changes the portal. Run `shasum -a 256 _maintainer/Code.gs`; it
      must print `a049a05159d3a0b810c4296adaa632cdcde90bcf0901c189f30f0562bb928c94`, which is also in
      `tests/baseline/code-gs-snapshot.json`. The deployed Apps Script version must be the one in the editor
      (no pending "new version").
- [ ] **Settings show the post-deadline state:** at the release moment the 2026 Summer window is over, so
      Teslim must show "Bu Dönemin Teslim Süresi Sona Erdi" and Home the closed board. Check:
      `npm run smoke -- <local preview> --at <release time>` (see §3), and `settings.yml › donem` unchanged.
- [ ] **Next campaign later:** nothing to do now. The rollover (DEPLOYMENT.md §3) is done separately, when the
      next term's dates are known, together with Code.gs and Grader.
- [ ] **Secrets on the repo:** `FORM_KEY` (or `PORTAL_TOKEN`) and `UMAMI_WEBSITE_ID` exist (Settings → Secrets).
      The deploy fails loudly without the key.

## 2. Release steps

1. Build the single release commit on a branch from `main` (`release-2026-10`), push only that branch and open
   the PR to `main`, with the description from this file. Wait for `ci.yml`. Never push `redesign`.
2. Tag the current site: `git tag -a pre-redesign 4553fcd -m "MkDocs site before the redesign"` and
   `git push origin pre-redesign`.
3. Final OK from the maintainer.
4. Fast-forward `main` to the reviewed commit: `git push origin release-2026-10:main` (never force). `main` is then
   the old history plus one commit, and a single `git revert <commit>` undoes it.
5. Watch Actions → "Siteyi yayınla (GitHub Pages)" (about 5 min). If the build job fails, nothing is published:
   the MkDocs site stays live; fix on a branch and open a new PR.
6. Run the smoke test against the live site (§3). Then hard-refresh Teslim (TR and EN) by hand and open one
   document link.

## 3. Smoke test

```bash
npm run smoke -- https://bogazici-ie-internships.github.io/staj/
npm run smoke -- http://localhost:4400/staj/ --at 2026-10-23T10:00:00+03:00   # a local preview, at a chosen time
```

Checks, in both languages (`scripts/smoke.mjs`):
- every old URL answers 200 and keeps its link anchors;
- documents and assets answer 200; `sitemap.xml` lists every page; `robots.txt` points to it;
- each page has its OG image, and the image answers 200;
- both search indexes load and a search returns results;
- Teslim shows the phase that follows from `settings.yml` and the clock (closed after the late window);
- no console errors.

The script blocks Google (portal, reCAPTCHA), so it never submits or contacts the portal. It exits non-zero on
any failure and lists each one.

## 4. Rollback

Only `main` may deploy to Pages (the `github-pages` environment allows the `main` branch only), so redeploying
the `pre-redesign` tag through `workflow_dispatch` is refused unless an admin adds a tag rule. Roll back with a
revert on `main`:

```bash
git checkout main && git pull
git revert <release-commit> --no-edit
git push origin main          # deploy.yml of the MkDocs site runs again and republishes it
```

- **When:** any smoke failure that affects students (Teslim, documents, broken pages). Do it without waiting.
- **Time:** about 2 min to revert and push, plus about 3–5 min for the MkDocs build and deploy; the old site is
  live within about 10 min.
- **After a rollback:** fix on a branch from `main`, then release again. To re-apply the reverted commit, revert
  the revert commit.

## 5. After the next campaign opens

- [ ] One real test submission by a TA on the live site, with the TA's own `@std` test account or an agreed
      test identity and small sample PDFs. Check:
  - the receipt and its reference number;
  - the ZIP in the term's Drive folder;
  - the row in "Teslim Listesi".
- [ ] Delete that ZIP and that row afterwards, so the Grader never sees them.
- [ ] Umami → Events: `submit_start`, `submit_attempt`, `submit_success` arrived for that submission.

## PR description (template)

> Redesign of the compulsory internship guide (Astro, TR/EN), replacing the MkDocs site at the same URLs.
> - **URLs:** all 18 old URLs, anchors, documents and the sitemap keep their addresses (URL-parity tests).
> - **Teslim portal:** same Apps Script contract; `Code.gs` unchanged (golden contract tests replay every
>   recorded scenario).
> - **Checks:** CI runs the validators, type check, unit tests, copy lint, build, guard and browser tests
>   including axe.
> - **Rollback:** `git revert <this commit>` (design/RELEASE.md §4).
>
> 🤖 Generated with [Claude Code](https://claude.com/claude-code)
