# Publishing and Maintenance Guide

This file is for **risky operations**: term rollover, form-key rotation,
results-folder permissions. Day-to-day content edits only need QUICKSTART.md.

> The site itself and the Apps Script submission portal are **coupled**. The
> smallest mismatch between the two **closes the submission form.** Most of
> this file exists because of that.

---

## 1. How publishing works

Every push to `main` runs these steps via `.github/workflows/deploy.yml`:

1. `validate_workflow_actions.py` — validates the action versions pinned in
   the workflow.
2. `pip install -r requirements.txt` (Python 3.12).
3. **Config preparation:** the `FORM_KEY` repo secret is written into the
   `form_key` field of `settings.yml`; the footer's "Last updated" date in
   `mkdocs.yml` is updated using Turkey time.
4. `validate_campaign_contract.py --settings settings.yml`
5. `mkdocs build --strict`
6. Publish to GitHub Pages.

Live URL: <https://bogazici-ie-internships.github.io/staj/>

### Three behaviors worth knowing

- **The build fails if neither `FORM_KEY` nor `PORTAL_TOKEN` is defined.**
  The workflow reads `secrets.FORM_KEY` and falls back to the legacy
  `PORTAL_TOKEN` secret. Create `FORM_KEY` (same value) before removing the
  fallback from `deploy.yml`.
- **The build fails if `settings.yml` has no `form_key` field.** If you
  rename the field, update the regex in `deploy.yml` too — otherwise the
  build stops there (it will not silently publish with an empty key).
- **The footer date is automatic.** Don't hand-delete the
  `Last updated: ...` pattern in `mkdocs.yml`; the workflow searches for it
  and, if not found, the build fails with
  `footer 'Son guncelleme' deseni bulunamadi`.
- **CI runs contract validation without `--code`.** That means the
  `settings.yml` ↔ `Code.gs` comparison is **not** done in CI (`Code.gs` is
  gitignored, so it isn't on the runner). That comparison is done **locally,
  by hand** — see section 3.
- **CI also tries `--grader ../Grader/config/campaign.yaml`.** On the normal
  Website-only checkout that file is absent and the step prints a skip note.
  In a monorepo / local tree, the same command enforces the Website↔Grader
  field mapping automatically.

---

## 2. What the "contract" is

**9 fields** must match exactly between the site, Apps Script, and
`Grader/config/campaign.yaml`. The browser sends a `GET` to the portal every
time the Submission page opens and compares the returned values against the
values embedded in the page (`sameContract()`). On a mismatch the form closes
and the student sees "Teslim dönemi yapılandırması doğrulanamadı" ("Could not
verify submission term configuration").

| `settings.yml` → `donem.` | `Code.gs` → `CONFIG.` | `Grader/campaign.yaml` | Example |
|---|---|---|---|
| `contract_version` | `CONTRACT_VERSION` | `contract_version` | `1` |
| `campaign_id` | `CAMPAIGN_ID` | `campaign_id` | `2026-summer` |
| `etiket` | `CURRENT_TERM` | `term` | `2026 Yaz` |
| `year_done` | `YEAR_DONE` | `year_done` | `2026` |
| `semester` | `SEMESTER` | `semester` | `Summer` |
| `staj_baslangic` | `INTERNSHIP_START` | `internship_start` | `2026-05-16` |
| `staj_bitis` | `INTERNSHIP_END` | `internship_end` | `2026-09-20` |
| `teslim_kilit` | `DEADLINE` | `deadline` | `2026-10-12 10:00` |
| `gec_teslim_gun` | `LATE_GRACE_DAYS` | `grace_days` | `10` |

`teslim_kilit` / `deadline` is a naive local wall clock in **Europe/Istanbul**
(UTC+3, no DST). Code.gs appends `+03:00` when computing late days.

Before a term rollover, run the triple check locally:

```bash
python3 scripts/validate_campaign_contract.py --settings settings.yml \
  --code _maintainer/Code.gs --grader ../Grader/config/campaign.yaml
```

**Fields NOT part of the contract** (free to change): `etiket_en` is only
the on-screen English term name; it doesn't need to match anything on the
server. `takvim`, `iletisim`, and `baglantilar` are also outside the
contract.

### Format rules the validator enforces

`scripts/validate_campaign_contract.py` rejects:

- `contract_version` **other than 1**. To bump it, also update the constant
  on line 74 of the validator.
- `campaign_id` that doesn't match the lowercase-letters + digits + hyphens
  pattern (`2026-summer` ✓).
- `semester` other than `Summer` or `Winter`.
- `staj_baslangic` / `staj_bitis` not in `YYYY-MM-DD` format.
- `teslim_kilit` not in `YYYY-MM-DD HH:MM` format (the timezone on both
  sides is fixed at **+03:00**).
- `gec_teslim_gun` that is negative.

---

## 3. Term rollover (HIGH-RISK OPERATION)

When moving to a new term, the site and Apps Script must be updated
**together**. The form stays closed for whatever time elapses in between —
this is by design (closing beats accepting bad data), but keeping that
window short is up to you.

### Timing, first

Do the rollover **after the previous term's late-submission window has
fully closed**. Doing it early cuts off students who still have a
late-submission grace period. The window ends at: `teslim_kilit` +
`gec_teslim_gun` days.

### Steps

1. **Update the `donem:` block in `settings.yml`** — the 9 contract fields
   plus `etiket_en`. Don't push yet.

2. **Update the `takvim:` block** for the new academic calendar, and shift
   `serit_baslangic` / `serit_bitis` to the new year (currently a flat
   calendar year: Jan 1 – Dec 31, 2026).

   The bar's geometry and month labels are generated by `main.py` — not
   hand-tuned. Calendar rows outside this range don't show up at all.
   Validate after changing:

   ```bash
   python3 main.py
   ```

   The list only shows actual terms and deadlines; the "internship allowed"
   windows in between don't open a row (they show as the bar's background
   color).

3. **Update the `CONFIG` block in `Code.gs`** on the Apps Script side with
   the same values.

   Update `Grader/config/campaign.yaml` with the same 9 fields in the same pass. The
   grader is the third holder of this contract: portal ZIPs carry the campaign
   Code.gs stamped into them, and intake refuses the whole batch when its own
   copy disagrees.

4. **Validate the contract locally** — CI doesn't do this, this step can't
   be skipped:

   ```bash
   python3 scripts/validate_campaign_contract.py --settings settings.yml --code _maintainer/Code.gs
   ```

   Expected output: `campaign contract valid: v1 <campaign_id>`
   On a mismatch it lists exactly which field(s) don't match and exits `1`.

5. **Deploy Apps Script as a NEW VERSION.** Saving in the editor does not
   update the `/exec` URL. `Deploy → Manage deployments → Edit → Version:
   New version`. The deployment **URL must not change**; if it does, also
   update `portal_url` in `settings.yml`.


### FILE_MAP / durum kartları (Cumartesi & geri ödeme)

Site teslim formundaki durum kartları `flags.saturday` / `flags.reimbursement`
gönderir. `Code.gs` içinde `FILE_MAP.ek1` (`ek1.pdf`) ve bu bayraklara bağlı
zorunluluk kontrolleri olmalıdır. Takip sheet başlığına `EK-1` sütunu eklenir
(`Ödeme (Dekont/Bordro)`). **Yalnızca editörde kaydetmek yetmez** — yeni sürüm
dağıtın; aksi halde eski portal `ek1` alanını reddeder.

6. **Push the `settings.yml` change.** Build + publish takes ~1-2 minutes.

7. **Verify:** open the Submission page (hard-refresh — `Cmd/Ctrl+Shift+R`).
   - The submit button should go from "Checking server…" to "Submit".
   - No red warning banner at the top.
   - The countdown should reflect the new deadline.
   - Do the same check on `/en/teslim/`.

### What happens automatically after rollover

No manual work needed for these:

- **New Drive folder:** the portal writes submissions into a subfolder
  named `CURRENT_TERM`; creates it if missing. The previous term's folder is
  left untouched.
- **New tracking sheet:** created in that folder as
  `Teslim Listesi — <CURRENT_TERM>`.
- **Browser cache:** since the contract cache key includes `campaign_id`,
  the old cache is automatically invalidated when the term changes.

---

## 4. Form key (`form_key` / `FORM_KEY`)

**This value is not secret.** It's plainly visible in the published HTML;
anyone who "View Source"s the Submission page can read it. It is *not*
authentication — it's a rotatable friction layer in front of the portal
endpoint, meant to filter out crude traffic, nothing more.

The real controls are server-side, in `Code.gs`: student email domain check
(`@std.bogazici.edu.tr`), student-ID format, PDF signature-byte validation,
per-file/total size caps, request deduplication (`DEDUP_SEC`), and a volume
alert email (there is **no** sliding-window rate limit).

> The only reason it's kept as a repo secret is so it can be changed without
> a commit. Calling it a "secret" is misleading — don't rely on it to relax
> any server-side control.

### If you need to change it

1. Change `CONFIG.FORM_KEY` in `Code.gs`, **deploy as a new version**.
2. GitHub → repo → Settings → Secrets and variables → Actions → update the
   `FORM_KEY` secret with the same value.
3. Push an empty commit to `main`, or run the workflow manually via
   `workflow_dispatch`, so the site republishes with the new key.

Submissions get a "Geçersiz form anahtarı." ("Invalid form key.") error
during the gap between the two, so do this during a quiet hour.

---

## 4a. reCAPTCHA v3 (invisible)

No checkbox. On submit the browser asks Google for a score (0–1); the portal
rejects scores below `RECAPTCHA_MIN_SCORE` (default 0.5) once
`RECAPTCHA_SECRET` is set in Apps Script Script properties. Until that
property exists, verification is skipped so the live form stays open.

### Register the site (once)

1. Create an empty Google Cloud project (no billing card needed for classic v3):
   <https://console.cloud.google.com/projectcreate>
   Name e.g. `boun-ie-staj-teslim`. Skip the rest of Cloud setup.
2. Open <https://www.google.com/recaptcha/admin/create>
3. Select that project. Choose **reCAPTCHA v3** (score-based), **not**
   Enterprise and **not** the v2 checkbox.
4. Domains (one per line):
   - `bogazici-ie-internships.github.io`
   - `localhost` (for `mkdocs serve`)
5. You get two values:
   - **Site key** — public; `settings.yml` → `baglantilar.recaptcha_site_key`
   - **Secret key** — Apps Script property `RECAPTCHA_SECRET` only.
     Never commit it, never put it in HTML.

### Go live (quiet hour, this order)

1. Paste the **site key** into `settings.yml` and push `main`. The teslim
   page will load the v3 script; students still see no extra box.
2. In the Apps Script editor, paste `Code.gs`, run `authorizeUrlFetch`
   once, and accept the external-request permission.
3. Script properties: add `RECAPTCHA_SECRET` = the secret key.
4. **Deploy → Manage deployments → Edit → Version: New version.**
   URL must not change.

If you reverse steps 1 and 4 while the secret is already set, every
submission fails with "Robot doğrulaması başarısız" until the site catches up.

### Local preview

`mkdocs serve` with an empty `recaptcha_site_key` looks like today. With a
real site key and `localhost` in the domain list, the script loads; submit
still talks to the **live** portal, which ignores the token until
`RECAPTCHA_SECRET` is set.

Do not put a test **secret** on the production portal.

---

## 5. Results-folder permissions

`settings.yml` → `baglantilar.sonuclar_klasoru` points to a Google Drive
folder that the Results page **links to directly**.

This folder holds student names, IDs, and evaluation results. Sharing must
be **restricted** (authorized people / relevant students);
**"Anyone with the link" MUST NOT be set.**

Check this by hand at every term rollover — it can't be verified from the
repo.

---

## 6. Low-risk changes

These don't need a special sequence; editing `settings.yml` and pushing is
enough:

- **Contact info:** the `iletisim:` block. Keep the assistant list
  alphabetical.
- **Links:** `baglantilar.kayit_formu`, `bolum_sitesi`.
- **Calendar rows:** `takvim:` — `tarih:` for a single day, `baslangic:` /
  `bitis:` for a range. Also fill in the English counterparts (`*_en`).
- **Page text:** `docs/*.md`. Update the Turkish and English twins
  (`*.en.md`) **together**.

### If you changed styles / scripts

Bump the version number in `mkdocs.yml`, or students' browsers will keep
serving the stale file:

```yaml
extra_css:
  - assets/extra.css?v=104      # ← bump
extra_javascript:
  - assets/submit.js?v=2        # ← bump
```

---

## 7. Troubleshooting

**"Teslim dönemi yapılandırması doğrulanamadı" ("Could not verify submission
term configuration")**
There's a contract mismatch between the site and `Code.gs`. Run the
validation from section 3, step 4, locally; it will say which field doesn't
match. Most common cause: `Code.gs` was edited but **not deployed as a new
version**.

**"Teslim sunucusuna ulaşılamadı" ("Could not reach the submission
server")**
The portal isn't responding to the `GET` request. In Apps Script →
Deployments, verify the `/exec` URL is live and matches `portal_url` in
`settings.yml`.

**Received a "[Staj Portalı] Yüksek gönderim hacmi" ("High submission
volume") alert email**
This is **not a block**. Rate limits were deliberately removed; no student
is ever turned away for volume. The email only reports that the
`ALERT_THRESHOLD_HOUR` threshold (default **50**) was crossed in the last hour,
and it's sent at most once per hour.

If it's deadline day, this is normal — no action needed. If it's an
unexpected time, check the Drive folder and the tracking list, look at
traffic in Apps Script → Executions; if it's abuse, rotate `FORM_KEY` and
deploy a new version (section 4).

> **Note:** blocking controls are `DEDUP_SEC` (a second submission from the
> same email within 3 seconds) and, once `RECAPTCHA_SECRET` is set, the
> reCAPTCHA check. Volume itself never rejects a student. The portal's
> remaining ceiling is Google's Apps Script quotas — these can't be raised
> from `CONFIG`.

**I manually moved/deleted the folder or tracking sheet in Drive**
The portal caches the term folder's and tracking sheet's IDs in
`ScriptProperties` (to avoid a by-name search on every submission — a speed
optimization). If an ID becomes invalid, the code catches it, clears the
cached value, and falls back to searching — i.e., it self-heals. If you
still see odd behavior, deleting the `folderId:<campaign_id>` and
`sheetId:<campaign_id>` entries under Apps Script → Project Settings →
Script properties is enough; they're rediscovered on the next submission.

**I manually edited the tracking sheet's header row**
Header validation now runs at most once per hour per sheet
(`HEADER_CHECK_SEC`), not on every submission. A manually broken header is
caught within an hour at the latest; delete the script properties above if
you want it caught immediately. You shouldn't be hand-editing headers in
the first place (see section 8).

**A student can't submit**
The "Gönderemiyorsanız" ("If you can't submit") section on the Submission
page is the first line of help. If that doesn't resolve it, documents can
be accepted by email before the deadline — log the time received, to keep
late-submission rules from kicking in.

---

## 8. Do not

- **Do not commit `Code.gs`.** `.gitignore` blocks it; the real values
  should only live in the Apps Script editor and locally.
- **Do not hand-fill and push the `form_key` field in `settings.yml`.** It
  must stay empty; CI fills it in.
- **Do not bump `contract_version`** without also updating the validator.
- **Do not rename the tracking sheet's (`Teslim Listesi — …`) column
  headers.** If the portal sees a header mismatch on a sheet that already
  has data, it refuses to write and the submission fails.
- **Do not run a term rollover while the late-submission window is still
  open.**
