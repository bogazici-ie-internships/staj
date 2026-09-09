---
hide:
  - navigation
  - toc
---

{% set _MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'] %}
{% if donem.teslim_kilit %}{% set _p = donem.teslim_kilit.split(' ') %}{% set _d = _p[0].split('-') %}{% set deadline_en = _MONTHS[(_d[1]|int)-1] ~ ' ' ~ (_d[2]|int) ~ ', ' ~ _d[0] ~ ' ' ~ _p[1] %}{% else %}{% set deadline_en = '' %}{% endif %}

# Submission

{# ONE submission-status block. There used to be three visual systems here -
   a gold deadline strip, a two-column phase timeline and marker rows - all
   shouting "important" and none connected to the others. Now one block, one
   accent (gold = deadline semantics), hierarchy carried by internal rules.
   .staj-deadline__countdown and #suf-countdown are PRESERVED: assets/submit.js
   writes --urgent/--late onto that class. #}
<div class="staj-status">
  <div class="staj-status__head">
    <span class="staj-status__label">Report &amp; document deadline</span>
    <span class="staj-status__date">{{ deadline_en or "to be announced" }}</span>
    <span class="staj-deadline__countdown" id="suf-countdown" aria-live="polite"></span>
  </div>

  <p class="staj-status__rule">Uploads remain open for <strong>{{ (donem.gec_teslim_gun | default(0)) | int }} days</strong> after the deadline. During that time <strong>one workday is deducted from your internship for each late day</strong>; <strong>online submission closes</strong> when the period ends.</p>

  <ul class="staj-status__exceptions">
    <li><span class="staj-status__if">If you interned during an academic term (e.g. Erasmus or another exchange)</span> <span class="staj-status__then"><strong>do not use this form.</strong> Submit your documents by <a href="../iletisim/">email</a> within <strong>three weeks</strong> of completing the internship (<a href="../sss/#uygunluk-zamanlama">FAQ: Eligibility &amp; Timing</a>).</span></li>
    <li><span class="staj-status__if">If only your internship remains for graduation</span> <span class="staj-status__then"><strong>do not use this form.</strong> Send your documents to the <a href="../iletisim/">general internship email</a>.</span></li>
    <li><span class="staj-status__if">If your insurance was opened through the EK-1</span> <span class="staj-status__then">this form is <strong>not enough</strong>: also send the completion document from your company to the <a href="../surec/#sonrasi">Department of Accounting Affairs</a>. <strong>Without it, insurance will not close and you cannot do another mandatory internship.</strong></span></li>
  </ul>
</div>

<style>
  /* Page-specific rule: keep the form from growing too wide. margin-inline:auto
     is gone - centring started the text at 196px while the other eight pages
     start at 126. All nine now share one left edge. */
  .md-content__inner{max-width:54rem}
</style>

<div class="suf-gate" id="suf-gate" role="status" aria-live="polite" style="display:none">
  <span id="suf-gate-text"></span>
  <button class="suf-retry" id="suf-retry" type="button" style="display:none">Check again</button>
</div>
<div class="suf-closed" id="suf-closed" role="alert" style="display:none"></div>
<div class="suf-done" id="suf-done" role="status" aria-live="polite" style="display:none"></div>

{# Form logic lives in assets/submit.js - ONE source shared by TR and EN.
   Term/campaign values reach it through the data-* attributes below.
   data-term is the CONTRACT comparison value and is NEVER translated: it must
   match CURRENT_TERM in Code.gs exactly. data-term-display carries the
   translated label that is shown on screen. #}
<form class="suf" id="sufForm" novalidate
  data-locale="en"
  data-portal-url="{{ baglantilar.portal_url }}"
  data-form-key="{{ baglantilar.form_key }}"
  data-deadline="{{ donem.teslim_kilit }}"
  data-deadline-display="{{ deadline_en }}"
  data-term="{{ donem.etiket }}"
  data-term-display="{{ donem.etiket_en }}"
  data-contract-version="{{ donem.contract_version | int }}"
  data-campaign-id="{{ donem.campaign_id }}"
  data-year-done="{{ donem.year_done | int }}"
  data-semester="{{ donem.semester }}"
  data-internship-start="{{ donem.staj_baslangic }}"
  data-internship-end="{{ donem.staj_bitis }}"
  data-grace-days="{{ (donem.gec_teslim_gun | default(0)) | int }}">
  <div class="suf-bar"><b>Internship Document Upload</b><span class="suf-term">{{ donem.etiket_en }}</span></div>
  <div class="suf-body">

    <div class="suf-late" id="suf-late" role="alert" style="display:none">
      <b id="suf-late-head"></b>
      <p id="suf-late-text"></p>
      <label class="suf-ack"><input type="checkbox" id="suf-ack">
        <span>I understand that my submission is late and that one workday will be deducted from my internship for each late day.</span></label>
    </div>

    <div class="suf-sec">
      <h2>Student Information</h2>
      <div class="suf-grid">
        <div class="suf-field"><label for="suf-name">Full Name *</label><input type="text" id="suf-name" placeholder="Full Name" required aria-required="true"></div>
        <div class="suf-field"><label for="suf-sid">Student ID *</label><input type="text" id="suf-sid" placeholder="20xxxxxxxx" inputmode="numeric" required aria-required="true" aria-describedby="suf-sid-warn"><small class="suf-warn" id="suf-sid-warn" aria-live="polite"></small></div>
        <div class="suf-field"><label for="suf-email">Email *</label><input type="email" id="suf-email" placeholder="example@std.bogazici.edu.tr" required aria-required="true" aria-describedby="suf-email-warn"><small class="suf-warn" id="suf-email-warn" aria-live="polite"></small></div>
      </div>
      <input type="text" class="suf-hp" id="suf-hp" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="Leave this field blank">
    </div>

    <div class="suf-sec">
      <h2>Required documents</h2>
      <div class="suf-req-row">
        <label class="suf-drop" data-key="rapor"><span class="m"><b>Internship Report</b><span>PDF · maximum 10 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
        <label class="suf-drop" data-key="sicil"><span class="m"><b>Signed and Stamped Trainee Evaluation Form</b><span>PDF · maximum 5 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
        <label class="suf-drop" data-key="anketi"><span class="m"><b>Student Internship Survey</b><span>PDF · maximum 5 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
      </div>
    </div>

    <div class="suf-sec suf-sit">
      <p class="suf-sit__sub">Select any situation that applies. The PDFs under a selected situation become required. If none apply, leave this section empty.</p>
      <div class="suf-sit-grid">
        <button type="button" class="suf-sit-card" id="suf-sit-sat" aria-pressed="false" data-reveal="suf-rev-sat" data-flag="saturday">
          <span class="suf-sit-card__mark" aria-hidden="true"></span>
          <span class="suf-sit-card__tag">Saturday</span>
          <span class="suf-sit-card__title">I worked on a weekend</span>
          <span class="suf-sit-card__desc">Upload the company’s signed or stamped Saturday Work Letter.</span>
        </button>
        <button type="button" class="suf-sit-card" id="suf-sit-pay" aria-pressed="false" data-reveal="suf-rev-pay" data-flag="reimbursement">
          <span class="suf-sit-card__mark" aria-hidden="true"></span>
          <span class="suf-sit-card__tag">Reimbursement</span>
          <span class="suf-sit-card__title">The company wants a partial refund</span>
          <span class="suf-sit-card__desc">A payment receipt or payslip and the same EK-1 used at the start of the internship are required.</span>
        </button>
      </div>

      <div class="suf-sit-reveal" id="suf-rev-sat" hidden>
        <h3 class="suf-sit-reveal__h">Upload for Saturday work</h3>
        <div class="suf-reveal-row suf-reveal-row--one">
          <label class="suf-drop suf-drop--req" data-key="cumartesi"><span class="m"><b>Saturday Work Letter *</b><span>PDF · maximum 5 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
        </div>
      </div>

      <div class="suf-sit-reveal" id="suf-rev-pay" hidden>
        <h3 class="suf-sit-reveal__h">Upload for reimbursement</h3>
        <p class="suf-sit-reveal__note">Before uploading, make sure the EK-1 is filled in completely.</p>
        <div class="suf-reveal-row">
          <label class="suf-drop suf-drop--req" data-key="dekont"><span class="m"><b>Payment Receipt or Payslip *</b><span>PDF · maximum 5 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
          <label class="suf-drop suf-drop--req" data-key="ek1"><span class="m"><b>EK-1 Form *</b><span>PDF · maximum 5 MB</span></span><span class="pick">Choose file</span><input type="file" accept=".pdf,application/pdf"></label>
        </div>
      </div>
    </div>

    <button type="submit" class="suf-submit" id="suf-submit" disabled>Checking server…</button>
    <p class="suf-hint" id="suf-hint" hidden></p>
    <div class="suf-msg" id="suf-msg" role="alert" aria-live="assertive"></div>
  </div>
</form>

## If you cannot submit

- **Hard-refresh** the page with Cmd/Ctrl + Shift + R.
- Every document must be a **PDF**. The report may be no larger than **10 MB**,
  each other document no larger than **5 MB**, and the combined size must be
  below **45 MB**.
- Use your student email address ending in **@std.bogazici.edu.tr**.
- Check your internet or VPN connection and select **Submit** again.
- If you still cannot upload, email the documents to the
  [internship assistants](iletisim.md) **before the deadline**.
