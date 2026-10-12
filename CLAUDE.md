# Notes for coding agents

Boğaziçi IE compulsory internship guide. Astro static site (`base: '/staj'`), Turkish at the root, English under
`/en/`, published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
Live: https://bogazici-ie-internships.github.io/staj/

Read first: `README.md` (commands, gates, where each text lives), `_maintainer/QUICKSTART.md`,
`_maintainer/DEPLOYMENT.md` (publishing, term rollover, form key, rollback). A maintainer's local notes may exist in
`../CLAUDE.md` (outside this repo); follow them when present.

## Content
- All student-facing text is typed YAML in `src/content/**`; every text is a `{ tr, en }` pair. Dates, links and the
  announcement band live in `settings.yml` (single source of truth). Docs and code comments are in English.
- Results PDF: `public/internships/All_Internships.pdf` (Data Store's "All Internships" report), published with
  `npm run results:publish` (commits the PDF only, does not push).

## Submission portal
- The portal is a Google Apps Script web app. Its source (`_maintainer/Code.gs`) is not in this repo and must never
  be committed, printed or copied. `settings.yml › form_key` stays empty; CI fills it from the `FORM_KEY` secret.
- What the site depends on from the portal (error messages, `DEDUP_SEC`) is pinned in
  `tests/baseline/code-gs-snapshot.json`. If the portal changes, see DEPLOYMENT.md "If Code.gs changes".
- Local builds, review builds and tests never contact the real portal (fake portal; `npm run guard:fake`).

## How a change goes live
1. `git fetch --prune`; check `git status`, `git worktree list` and open PRs. If someone else is working, stop.
2. Branch from `origin/main` (never from old branches).
3. Gates: `npm run check`, `npm run test:unit`, `npm run lint:copy`, `npm run tokens:check`, `npm run build`,
   `npm run guard:fake`, `npm run test:e2e`, `python3 scripts/validate_campaign_contract.py --settings settings.yml`
   (+ `npm run test:visual` if the layout changed).
4. Nothing private enters the repo: no secrets or portal source, no grading criteria or internal grading details,
   no student data other than the published results PDF, no internal design or review notes.
5. One commit, push the branch, open a PR, wait for `ci.yml`, wait for the maintainer's OK. Then fold the change
   into the single "new site" commit (`main` is always two commits: the old MkDocs site and the new site on top):
   `git commit-tree <branch>^{tree} -p <old-site commit>` and push it with `--force-with-lease`, keeping the
   previous `main` on a local `backup/prev-main` branch. Watch the deploy run, then
   `npm run smoke -- https://bogazici-ie-internships.github.io/staj/`.
6. Delete the merged branch (local and remote), `git worktree prune`.

## Never
- Force-push `main` other than the fold above, push without `--force-with-lease`, or change the old-site commit.
  To undo the last change, fold the tree of `backup/prev-main` the same way.
- Commit `_maintainer/Code.gs` or fill `form_key` by hand.
- Change the Apps Script deployment unless the maintainer asks.
