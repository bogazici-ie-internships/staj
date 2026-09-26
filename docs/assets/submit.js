/* Submission form — SINGLE source of logic (TR + EN).
 *
 * Previously these ~360 lines existed TWICE, as inline <script> blocks inside
 * teslim.md and teslim.en.md. The two were kept in sync, but fixing one
 * validation rule required fixing it in both files; a missed edit would
 * silently break just ONE language. Now the logic lives here, and everything
 * page-specific comes from outside:
 *
 *   - Term/campaign values    -> data-* attributes on #sufForm
 *                                (printed via Jinja from settings.yml)
 *   - On-screen text          -> the STRINGS table below, by language
 *                                (language: data-locale)
 *
 * Static form labels ("Ad Soyad", "Zorunlu Belgeler" etc.) are content, so
 * they stay in the markdown files; only the text PRODUCED by JS moved here.
 *
 * Loaded site-wide (like yearbar.js); exits early outside the submission
 * page since #sufForm won't be found there.
 */
(function () {
  "use strict";

  // "ayşe yılmaz" → "Ayşe Yılmaz" — mirrors titleCaseName_ in Code.gs so the
  // confirmation screen shows the name exactly as it is recorded.
  function titleCaseName(raw) {
    function upper(ch) { return ch === "i" ? "İ" : ch === "ı" ? "I" : ch.toUpperCase(); }
    function lower(str) { return str.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase(); }
    return String(raw || "").trim().split(/\s+/).map(function (word) {
      return word.split("-").map(function (part) {
        return part ? upper(part.charAt(0)) + lower(part.slice(1)) : part;
      }).join("-");
    }).join(" ");
  }

  // Per-document MB limits — must match FILE_MAP in Code.gs.
  var MAX_MB = { rapor: 10, sicil: 5, anketi: 5, cumartesi: 5, dekont: 5, ek1: 1 };
  var MAX_TOTAL_MB = 45;
  var REQUIRED_KEYS = ["rapor", "sicil", "anketi"];
  var SIT_KEYS = {
    saturday: ["cumartesi"],
    reimbursement: ["dekont", "ek1"]
  };
  var CONTRACT_CACHE_TTL_MS = 10 * 60 * 1000;

  var AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  var STRINGS = {
    tr: {
      // e.g. "22 Ekim 2026 10:00"
      fmtDate: function (d, hh, mm) {
        return d.getUTCDate() + " " + AYLAR[d.getUTCMonth()] + " " + d.getUTCFullYear() + " " + hh + ":" + mm;
      },
      closedHtml: function (term) {
        return "<b>" + term + " dönemi için teslim kapanmıştır.</b><br>" +
          "Yine de bir teslim iletmek istiyorsanız, durumunuzu açıklayan bir e-posta ile birlikte " +
          "belgelerinizi <b>zip olarak</b> <a href=\"../iletisim/\">staj asistanlarına</a> iletin.";
      },
      lateHead: function (days) { return days + " gün geç teslim"; },
      lateText: function (deadline, days, closesAt) {
        return "Son teslim " + deadline + " idi. Şu an " + days + " gün geç teslim ediyorsunuz; " +
          "her geç gün staj sürenizden 1 iş günü düşer. Yükleme en geç " + closesAt + " tarihinde kapanır.";
      },
      countdownLate: function (days) { return "<b>" + days + "</b> gün geç"; },
      // One shape for every range: "<b>N</b> birim kaldı". The date and hour
      // are already printed large right above the pill.
      countdownLeft: function (days) { return "<b>" + days + "</b> gün kaldı"; },
      remHours: function (h) { return "<b>" + h + "</b> saat kaldı"; },
      remMinutes: function (m) { return "<b>" + m + "</b> dakika kaldı"; },
      download: "İndir",
      downloadLabel: function (doc) { return doc + " dosyasını indir"; },
      btnUploading: "Gönderiliyor…",
      btnChecking: "Sunucu kontrol ediliyor…",
      btnSubmit: "Gönder",
      errSummary: function (n) {
        return "Gönderilmedi: " + n + " alan eksik ya da hatalı. İşaretli alanları düzeltip tekrar Gönder'e basın.";
      },
      errNameRequired: "Adınızı ve soyadınızı girin.",
      errSidRequired: "Öğrenci numaranızı girin.",
      errEmailRequired: "Öğrenci e-postanızı girin.",
      errFileMissing: "Bu belgeyi seçin.",
      pickChoose: "Dosya seç",
      pickChange: "Değiştir",
      notPdf: function (name) { return name + " bir PDF değil. Yalnızca PDF dosyaları yüklenebilir."; },
      tooLarge: function (name, mb) { return name + " çok büyük (>" + mb + " MB)."; },
      emailWarn: "@std.bogazici.edu.tr uzantılı öğrenci e-postanızı kullanmanız gerekir.",
      sidWarn: "Öğrenci no 20 ile başlayan 10 hane olmalı.",
      errClosed: "Teslim süresi doldu. Yükleme kapandı.",
      errAck: "Devam etmek için geç teslim onayını işaretleyin.",
      errUnavailable: "Teslim formu şu anda kullanılamıyor. Lütfen staj asistanlarıyla iletişime geçin.",
      errNotVerified: "Teslim sunucusu henüz doğrulanmadı. Lütfen kontrolün tamamlanmasını bekleyin veya tekrar deneyin.",
      errSid: "Öğrenci numarası 20 ile başlayan 10 hane olmalı.",
      errEmailInvalid: "Geçerli bir e-posta girin.",
      errEmailDomain: "Lütfen @std.bogazici.edu.tr uzantılı öğrenci e-postanızı kullanın.",
      errCaptcha: "Robot doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.",
      errCaptchaLoad: "Robot doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin.",
      errTotalSize: function (mb) { return "Toplam boyut çok büyük (>" + mb + " MB)."; },
      errRequestId: "Tarayıcı güvenli bir gönderim kimliği oluşturamadı. Sayfayı güncelleyip tekrar deneyin.",
      msgUploading: "Belgeler yükleniyor — bu sayfayı KAPATMAYIN. Onay ekranı görünene kadar bekleyin; büyük dosyalarda bu bir dakikayı bulabilir.",
      errServer: function (status) { return "Sunucu hatası (" + status + ")"; },
      errUnexpectedResponse: "Sunucudan beklenmeyen yanıt — gönderim doğrulanamadı.",
      errUnverified: "Gönderim doğrulanamadı.",
      doneHtml: function (name, sid, submissionId, items, term, when, lateDays) {
        var idBlock = submissionId
          ? "<div class=\"suf-done__id\">" +
              "<span class=\"suf-done__id-label\">Referans no</span>" +
              "<span class=\"suf-done__id-value\">" + submissionId + "</span>" +
              "<p class=\"suf-done__id-hint\">Tesliminiz bu numarayla kayda geçmiştir.</p>" +
            "</div>"
          : "";
        var status = lateDays == null ? "" : lateDays > 0
          ? " · <span class=\"suf-done__late\">" + lateDays + " gün geç</span>"
          : " · <span class=\"suf-done__ontime\">Zamanında</span>";
        return "<h2 class=\"suf-done__title\" tabindex=\"-1\">Teslim alındı</h2>" +
          "<p class=\"suf-done__who\">" + name + " · " + sid +
            (term ? " · " + term : "") + "</p>" +
          (when ? "<p class=\"suf-done__when\">Alındı: " + when + status + "</p>" : "") +
          idBlock +
          "<p class=\"suf-done__docs-label\">Alınan belgeler (" + items.length + ")</p>" +
          "<ul class=\"suf-done__docs\"><li>" + items.join("</li><li>") + "</li></ul>" +
          "<p class=\"suf-done__dl-hint\">Gönderdiğiniz dosyaları indirip doğru belgeleri yüklediğinizi kontrol edebilirsiniz. " +
            "Bu bağlantılar sayfa kapanınca kaybolur.</p>" +
          "<p class=\"suf-done__foot\">Bu ekran <b>teslim onayınızdır</b>; ekran görüntüsü almanız önerilir. " +
            "Değerlendirme <a href=\"../sonuclar/\">Sonuçlar</a> sayfasında periyodik olarak ilan edilir.</p>" +
          "<p class=\"suf-done__fix\">Yanlış belge mi yüklediniz? Formu yeniden göndermeyin; referans numaranızla " +
            "<a href=\"../iletisim/\">staj asistanlarına</a> yazın.</p>";
      },
      errNetwork: "Bağlantı kurulamadı. Bilgileriniz ve seçtiğiniz dosyalar bu sayfada duruyor: bağlantınızı kontrol edip aynı Gönder düğmesine yeniden basın (sayfayı yenilemeyin). Sürerse son teslim anından önce belgeleri e-posta ile staj asistanlarına iletin.",
      errFailed: function (m) { return "Gönderim başarısız: " + m + " Lütfen tekrar deneyin veya staj asistanlarıyla iletişime geçin."; },
      gateMismatch: "Teslim dönemi yapılandırması doğrulanamadı. Güvenliğiniz için gönderim kapalı; lütfen tekrar kontrol edin veya staj asistanlarıyla iletişime geçin.",
      gateUnreachable: "Teslim sunucusuna ulaşılamadı. Bilgileriniz ve seçtiğiniz dosyalar korunuyor; bağlantınızı kontrol edip tekrar deneyin."
    },

    en: {
      // "October 22, 2026 10:00"
      fmtDate: function (d, hh, mm) {
        return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear() + " " + hh + ":" + mm;
      },
      closedHtml: function (term) {
        return "<b>Submission for " + term + " is closed.</b><br>" +
          "If you still need to submit, email your documents as a <b>zip file</b> to the " +
          "<a href=\"../iletisim/\">internship assistants</a> and explain your circumstances.";
      },
      lateHead: function (days) { return days + (days === 1 ? " day late" : " days late"); },
      lateText: function (deadline, days, closesAt) {
        return "The deadline was " + deadline + ". Your submission is " + days +
          (days === 1 ? " day" : " days") + " late; one workday will be deducted for each late day. " +
          "Uploads close on " + closesAt + ".";
      },
      countdownLate: function (days) {
        return "<b>" + days + "</b> " + (days === 1 ? "day" : "days") + " late";
      },
      countdownLeft: function (days) {
        return "<b>" + days + "</b> " + (days === 1 ? "day" : "days") + " left";
      },
      remHours: function (h) { return "<b>" + h + "</b> " + (h === 1 ? "hour left" : "hours left"); },
      remMinutes: function (m) { return "<b>" + m + "</b> " + (m === 1 ? "minute left" : "minutes left"); },
      download: "Download",
      downloadLabel: function (doc) { return "Download " + doc; },
      btnUploading: "Uploading…",
      btnChecking: "Checking server…",
      btnSubmit: "Submit",
      errSummary: function (n) {
        return "Not submitted: " + n + (n === 1 ? " item needs" : " items need") +
          " attention. Fix the highlighted fields and select Submit again.";
      },
      errNameRequired: "Enter your full name.",
      errSidRequired: "Enter your student ID.",
      errEmailRequired: "Enter your student email address.",
      errFileMissing: "Choose this file.",
      pickChoose: "Choose file",
      pickChange: "Change",
      notPdf: function (name) { return name + " is not a PDF. Only PDF files may be uploaded."; },
      tooLarge: function (name, mb) { return name + " is too large (maximum " + mb + " MB)."; },
      emailWarn: "Use your student email address ending in @std.bogazici.edu.tr.",
      sidWarn: "The student ID must contain 10 digits and begin with 20.",
      errClosed: "The submission period has ended. Uploads are closed.",
      errAck: "Confirm the late-submission notice to continue.",
      errUnavailable: "The submission form is unavailable right now. Please contact the internship assistants.",
      errNotVerified: "The submission server has not been verified yet. Wait for the check to finish or try again.",
      errSid: "The student ID must contain 10 digits and begin with 20.",
      errEmailInvalid: "Enter a valid email address.",
      errEmailDomain: "Use your student email address ending in @std.bogazici.edu.tr.",
      errCaptcha: "The robot check could not complete. Refresh the page and try again.",
      errCaptchaLoad: "The robot check could not load. Refresh the page and try again.",
      errTotalSize: function (mb) { return "The combined file size is too large (maximum " + mb + " MB)."; },
      errRequestId: "The browser could not create a secure submission ID. Refresh the page and try again.",
      msgUploading: "Uploading documents — DO NOT close this page. Wait until the confirmation screen appears; with large files this can take up to a minute.",
      errServer: function (status) { return "Server error (" + status + ")"; },
      errUnexpectedResponse: "Unexpected server response; the submission could not be verified.",
      errUnverified: "The submission could not be verified.",
      doneHtml: function (name, sid, submissionId, items, term, when, lateDays) {
        var idBlock = submissionId
          ? "<div class=\"suf-done__id\">" +
              "<span class=\"suf-done__id-label\">Reference no.</span>" +
              "<span class=\"suf-done__id-value\">" + submissionId + "</span>" +
              "<p class=\"suf-done__id-hint\">Your submission is recorded under this number.</p>" +
            "</div>"
          : "";
        var status = lateDays == null ? "" : lateDays > 0
          ? " · <span class=\"suf-done__late\">" + lateDays + (lateDays === 1 ? " day late" : " days late") + "</span>"
          : " · <span class=\"suf-done__ontime\">On time</span>";
        return "<h2 class=\"suf-done__title\" tabindex=\"-1\">Submission received</h2>" +
          "<p class=\"suf-done__who\">" + name + " · " + sid +
            (term ? " · " + term : "") + "</p>" +
          (when ? "<p class=\"suf-done__when\">Received: " + when + status + "</p>" : "") +
          idBlock +
          "<p class=\"suf-done__docs-label\">Documents received (" + items.length + ")</p>" +
          "<ul class=\"suf-done__docs\"><li>" + items.join("</li><li>") + "</li></ul>" +
          "<p class=\"suf-done__dl-hint\">Download the files you sent to check that you uploaded the right documents. " +
            "These links disappear when you close the page.</p>" +
          "<p class=\"suf-done__foot\">This screen is your <b>submission confirmation</b>; we recommend taking a screenshot. " +
            "Evaluation outcomes are announced periodically on the <a href=\"../sonuclar/\">Results</a> page.</p>" +
          "<p class=\"suf-done__fix\">Uploaded the wrong file? Do not submit the form again; email the " +
            "<a href=\"../iletisim/\">internship assistants</a> and quote your reference number.</p>";
      },
      errNetwork: "Could not connect. Your details and selected files are still on this page: check your connection and select the same Submit button again (do not refresh). If the problem continues, email the documents to the internship assistants before the deadline.",
      errFailed: function (m) { return "Submission failed: " + m + " Try again or contact the internship assistants."; },
      gateMismatch: "The submission-term configuration could not be verified. Submission is disabled for your protection. Check again or contact the internship assistants.",
      gateUnreachable: "The submission server could not be reached. Your information and selected files are preserved; check your connection and try again."
    }
  };

  // The Apps Script backend (Code.gs) answers in Turkish only. On the English
  // page its known messages are translated here; anything unknown passes
  // through unchanged. Keep in step with the `error:` strings in Code.gs doPost.
  var SERVER_EN = [
    [/^Geçersiz form anahtarı\.$/, "Invalid form key. Refresh the page and try again."],
    [/^Robot doğrulaması başarısız/, "The robot check failed. Refresh the page and try again."],
    [/^Geçersiz gönderim anahtarı/, "Invalid submission ID. Refresh the page and try again."],
    [/^Teslim süresi doldu/, "The submission period has ended. Uploads are closed."],
    [/^Ad Soyad, Öğrenci No ve E-posta zorunludur\.$/, "Full Name, Student ID, and Email are required."],
    [/^Ad Soyad çok uzun \(en fazla (\d+) karakter\)\.$/, "The name is too long (maximum $1 characters)."],
    [/^Ad Soyad alanında geçersiz kontrol karakteri var\.$/, "The name contains an invalid control character."],
    [/^E-posta adresi çok uzun\.$/, "The email address is too long."],
    [/^Geçersiz e-posta\.$/, "Invalid email address."],
    [/^Lütfen @std\.bogazici\.edu\.tr/, "Use your student email address ending in @std.bogazici.edu.tr."],
    [/^Geçersiz öğrenci numarası/, "Invalid student ID (10 digits beginning with 20)."],
    [/^Az önce bir gönderim aldık/, "We just received a submission. Try again in a few seconds."],
    [/^Belge paketi geçersiz\.$/, "The document package is invalid."],
    [/^Tanınmayan belge alanı gönderildi\.$/, "An unrecognised document field was sent."],
    [/^Eksik zorunlu belge: (.+)$/, "Missing required document: $1"],
    [/^Cumartesi çalışması için/, "The Saturday Work Letter is required for Saturday work."],
    [/^Geri ödeme için Ödeme Dekontu/, "A payment receipt or payslip is required for the government contribution."],
    [/^Geri ödeme için EK-1/, "The EK-1 form is required for the government contribution."],
    [/^(.+) içeriği geçersiz\.$/, "$1: the file content is invalid."],
    [/^(.+) çok büyük \(>(\d+) MB\)\.$/, "$1 is too large (maximum $2 MB)."],
    [/^Toplam boyut çok büyük \(>(\d+) MB\)\.$/, "The combined file size is too large (maximum $1 MB)."],
    [/^(.+) geçerli bir PDF değil\.$/, "$1 is not a valid PDF."],
    [/^Teslim sunucusu önceki bir isteği tamamlıyor/, "The server is finishing a previous request. Select the same button again in a few seconds."],
    [/^Bu teslim isteği hâlâ işleniyor/, "This submission is still being processed. Select the same button again in a few seconds."],
    [/^Teslim tamamlanamadı/, "The submission could not be completed and the temporary file was rolled back. Try again."],
    [/^Sunucu hatası, lütfen tekrar deneyin\.$/, "Server error. Please try again."]
  ];
  function serverMessage(m, locale) {
    if (locale !== "en") return m;
    for (var i = 0; i < SERVER_EN.length; i++) {
      var hit = m.match(SERVER_EN[i][0]);
      if (hit) return SERVER_EN[i][1].replace(/\$(\d)/g, function (_, n) { return hit[n] || ""; });
    }
    return m;
  }

  // Umami funnel events (track.js). Categorical data only — never name / ID / e-mail / file names.
  function track(name, data) {
    try { if (typeof window.stajTrack === "function") window.stajTrack(name, data); } catch (_) {}
  }

  function init() {
    var form = document.getElementById("sufForm");
    if (!form || form.dataset.sufBound === "1") return;
    form.dataset.sufBound = "1";

    var d = form.dataset;
    var T = STRINGS[d.locale] || STRINGS.tr;

    var WEB_APP_URL      = d.portalUrl || "";
    var FORM_KEY         = d.formKey || "";
    var RECAPTCHA_SITE_KEY = (d.recaptchaSiteKey || "").trim();
    var DEADLINE         = d.deadline || "";
    var DEADLINE_DISPLAY = d.deadlineDisplay || "";
    var TERM             = d.term || "";                 // used for contract comparison (not translated)
    var TERM_DISPLAY     = d.termDisplay || d.term || ""; // shown on screen
    // NOTE: data-* values are always STRINGS. sameContract() uses strict
    // equality, so converting numeric fields to Number() here is REQUIRED.
    var CONTRACT_VERSION = Number(d.contractVersion);
    var CAMPAIGN_ID      = d.campaignId || "";
    var YEAR_DONE        = Number(d.yearDone);
    var SEMESTER         = d.semester || "";
    var INTERNSHIP_START = d.internshipStart || "";
    var INTERNSHIP_END   = d.internshipEnd || "";
    var GRACE_DAYS       = Number(d.graceDays) || 0;

    var CONTRACT_CACHE_KEY = "staj-contract:" + CONTRACT_VERSION + ":" + CAMPAIGN_ID;

    var gate = document.getElementById("suf-gate");
    var gateText = document.getElementById("suf-gate-text");
    var retryBtn = document.getElementById("suf-retry");
    var closed = document.getElementById("suf-closed");

    function deadlineMs(s) {
      if (!s) return null;
      var t = Date.parse(s.trim().replace(" ", "T") + ":00+03:00");
      return isNaN(t) ? null : t;
    }
    // In Turkey time (+03:00) — independent of the viewer's own timezone.
    function fmtDeadline(ms) {
      var dt = new Date(ms + 3 * 3600000);   // shift to +03:00, then read the UTC fields
      var hh = ("0" + dt.getUTCHours()).slice(-2), mm = ("0" + dt.getUTCMinutes()).slice(-2);
      return T.fmtDate(dt, hh, mm);
    }

    // Calendar day number in Turkey time — "today"/"tomorrow" must not depend on the viewer's timezone.
    function trDay(ms) { return Math.floor((ms + 3 * 3600000) / 86400000); }

    var dlMs     = deadlineMs(DEADLINE);
    var graceMs  = dlMs ? dlMs + GRACE_DAYS * 86400000 : null;
    var isClosed = false, isLate = false, daysLate = 0;
    // Phase is recomputed on load, every 30 s and again inside the submit
    // handler. It used to be frozen at page load: a page opened at 09:50 and
    // submitted at 10:05 never showed the late notice or its acknowledgment.
    function computePhase(now) {
      isClosed = !!(graceMs && now > graceMs);           // deadline + grace period passed → hard close
      isLate   = !!(dlMs && !isClosed && now > dlMs);    // within the grace window, late
      daysLate = isLate ? Math.ceil((now - dlMs) / 86400000) : 0;
    }
    computePhase(Date.now());

    function showClosed() {
      gate.style.display = "none";
      form.style.display = "none";
      closed.style.display = "block";
      closed.innerHTML = T.closedHtml(TERM_DISPLAY);
      track("submit_closed", { term: TERM, lang: d.locale || "tr" });
    }
    if (isClosed) { showClosed(); return; }

    function sameContract(remote) {
      var contract = remote && remote.contract;
      return remote && remote.ok === true && remote.open === true && contract &&
        Number(contract.contractVersion) === CONTRACT_VERSION &&
        String(contract.campaignId) === CAMPAIGN_ID &&
        String(contract.term) === TERM &&
        Number(contract.yearDone) === YEAR_DONE &&
        String(contract.semester) === SEMESTER &&
        String(contract.internshipStart) === INTERNSHIP_START &&
        String(contract.internshipEnd) === INTERNSHIP_END &&
        String(contract.deadline || "") === DEADLINE &&
        Number(contract.graceDays || 0) === GRACE_DAYS;
    }

    function readContractCache() {
      try {
        var raw = window.sessionStorage && window.sessionStorage.getItem(CONTRACT_CACHE_KEY);
        if (!raw) return null;
        var cached = JSON.parse(raw);
        if (!cached || !cached.checkedAt || Date.now() - Number(cached.checkedAt) > CONTRACT_CACHE_TTL_MS ||
            !sameContract(cached.response)) {
          clearContractCache();
          return null;
        }
        return cached.response;
      } catch (_) {
        clearContractCache();
        return null;
      }
    }

    function writeContractCache(remote) {
      try {
        if (window.sessionStorage)
          window.sessionStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify({ checkedAt: Date.now(), response: remote }));
      } catch (_) {}
    }

    function clearContractCache() {
      try {
        if (window.sessionStorage) window.sessionStorage.removeItem(CONTRACT_CACHE_KEY);
      } catch (_) {}
    }

    function contractFailure(message, retryable) {
      track("submit_gate_fail", {
        reason: message === T.gateMismatch ? "mismatch" : message === T.gateUnreachable ? "unreachable" : "unavailable"
      });
      contractReady = false;
      contractChecking = false;
      clearContractCache();
      gate.style.display = "";
      gate.setAttribute("role", "alert");
      gateText.textContent = message;
      retryBtn.style.display = retryable ? "" : "none";
      syncSubmit();
    }

    // If within the late-submission window: warning banner + required acknowledgment checkbox.
    var ackEl = document.getElementById("suf-ack");
    function renderLate() {
      if (!isLate) return;
      document.getElementById("suf-late-head").textContent = T.lateHead(daysLate);
      document.getElementById("suf-late-text").textContent =
        T.lateText(DEADLINE_DISPLAY, daysLate, fmtDeadline(graceMs));
      document.getElementById("suf-late").style.display = "";
    }
    renderLate();

    // Time remaining/overdue — a simple info line in the top box. Under 24 h
    // it counts hours/minutes (Math.ceil used to read "1 gün kaldı" at 08:00 on
    // the deadline morning); otherwise Turkey calendar days.
    var cd = document.getElementById("suf-countdown");
    function renderCountdown(now) {
      if (!cd || !dlMs) return;
      if (isLate) {
        cd.innerHTML = T.countdownLate(daysLate);
        cd.className = "staj-deadline__countdown staj-deadline__countdown--late";
        return;
      }
      if (now > dlMs) return;
      var dayDiff = trDay(dlMs) - trDay(now);
      var html;
      if (dlMs - now < 86400000) {
        var mins = Math.max(1, Math.ceil((dlMs - now) / 60000));
        html = mins < 60 ? T.remMinutes(mins) : T.remHours(Math.floor(mins / 60));
      } else {
        html = T.countdownLeft(dayDiff);
      }
      cd.innerHTML = html;
      cd.className = "staj-deadline__countdown" + (dayDiff < 7 ? " staj-deadline__countdown--urgent" : "");
    }
    renderCountdown(Date.now());

    var msg = document.getElementById("suf-msg");
    var btn = document.getElementById("suf-submit");
    var picked = {};
    var requestId = "";
    var contractReady = false;
    var contractChecking = false;
    var isUploading = false;

    function createRequestId() {
      var cryptoApi = window.crypto;
      if (!cryptoApi) return "";
      if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
      if (typeof cryptoApi.getRandomValues !== "function") return "";
      var bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = Array.prototype.map.call(bytes, function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
        hex.slice(16, 20) + "-" + hex.slice(20);
    }

    function showMsg(text, kind) { msg.textContent = text; msg.className = "suf-msg show " + kind; }
    var FUNNEL = { term: TERM, late: !!isLate, lang: d.locale || "tr" };
    function funnel(name, extra) {
      var data = {};
      Object.keys(FUNNEL).forEach(function (k) { data[k] = FUNNEL[k]; });
      Object.keys(extra || {}).forEach(function (k) { data[k] = extra[k]; });
      track(name, data);
    }
    // Validation stop before upload: show the message AND record which check blocked the student.
    function block(reason, text) { funnel("submit_blocked", { reason: reason }); showMsg(text, "err"); }
    var started = false;
    function escHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
      });
    }

    function sitFlags() {
      var flags = { saturday: false, reimbursement: false };
      form.querySelectorAll(".suf-sit-card[aria-pressed='true']").forEach(function (card) {
        var f = card.getAttribute("data-flag");
        if (f && Object.prototype.hasOwnProperty.call(flags, f)) flags[f] = true;
      });
      return flags;
    }

    function sitRequiredKeys() {
      var flags = sitFlags();
      var keys = [];
      Object.keys(SIT_KEYS).forEach(function (flag) {
        if (!flags[flag]) return;
        SIT_KEYS[flag].forEach(function (k) { keys.push(k); });
      });
      return keys;
    }

    function clearKey(key) {
      delete picked[key];
      var drop = form.querySelector('.suf-drop[data-key="' + key + '"]');
      if (!drop) return;
      var input = drop.querySelector("input[type=file]");
      var hintEl = drop.querySelector(".m span");
      var pickEl = drop.querySelector(".pick");
      if (input) { input.value = ""; input.removeAttribute("aria-invalid"); }
      drop.classList.remove("ok", "bad");
      if (hintEl && hintEl.dataset.baseHint) hintEl.textContent = hintEl.dataset.baseHint;
      if (pickEl) pickEl.textContent = T.pickChoose;
    }

    function getRecaptchaToken() {
      if (!RECAPTCHA_SITE_KEY) return Promise.resolve("");
      if (typeof window.grecaptcha === "undefined" || typeof window.grecaptcha.execute !== "function") {
        return Promise.reject(new Error(T.errCaptchaLoad));
      }
      return new Promise(function (resolve, reject) {
        window.grecaptcha.ready(function () {
          window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "submit" }).then(resolve, function () {
            reject(new Error(T.errCaptcha));
          });
        });
      });
    }

    // Document name as printed on its slot ("Staj Raporu"), in the page's language.
    function docLabel(key) {
      var b = form.querySelector('.suf-drop[data-key="' + key + '"] .m b');
      return b ? b.textContent.replace(/\s*\*\s*$/, "") : key;
    }

    // Submit is no longer disabled while fields are missing: a disabled button
    // can't be focused or explain itself. It stays enabled and the click marks
    // every problem inline; only the server check / upload lock it.
    function syncSubmit() {
      if (isUploading) {
        btn.disabled = true;
        btn.textContent = T.btnUploading;
        return;
      }
      if (!contractReady) {
        btn.disabled = true;
        btn.textContent = contractChecking ? T.btnChecking : T.btnSubmit;
        return;
      }
      btn.disabled = false;
      btn.textContent = T.btnSubmit;
    }

    // Inline, per-field error state (also exposed to assistive tech).
    function setFieldError(input, warnEl, text) {
      input.classList.toggle("bad", !!text);
      if (text) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      if (warnEl) {
        warnEl.textContent = text || "";
        warnEl.classList.toggle("show", !!text);
      }
    }
    function setSlotError(key, text) {
      var drop = form.querySelector('.suf-drop[data-key="' + key + '"]');
      if (!drop) return null;
      var input = drop.querySelector("input[type=file]");
      var hintEl = drop.querySelector(".m span");
      drop.classList.toggle("bad", !!text);
      if (text) {
        input.setAttribute("aria-invalid", "true");
        hintEl.textContent = text;
      } else {
        input.removeAttribute("aria-invalid");
      }
      return input;
    }
    syncSubmit();
    if (ackEl) ackEl.addEventListener("change", syncSubmit);

    form.querySelectorAll(".suf-sit-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var on = card.getAttribute("aria-pressed") === "true";
        on = !on;
        card.setAttribute("aria-pressed", on ? "true" : "false");
        var rev = document.getElementById(card.getAttribute("data-reveal"));
        if (rev) {
          if (on) rev.removeAttribute("hidden");
          else rev.setAttribute("hidden", "");
        }
        var flag = card.getAttribute("data-flag");
        if (!on && flag && SIT_KEYS[flag]) {
          SIT_KEYS[flag].forEach(clearKey);
        }
        syncSubmit();
      });
    });

    form.querySelectorAll(".suf-drop").forEach(function (drop) {
      var input = drop.querySelector("input[type=file]");
      var key = drop.getAttribute("data-key");
      var hintEl = drop.querySelector(".m span");
      var pickEl = drop.querySelector(".pick");
      var baseHint = hintEl.textContent;   // document description — restored when a selection is cancelled/invalid
      hintEl.dataset.baseHint = baseHint;
      function clearSlot() {
        clearKey(key);
        syncSubmit();
      }
      input.addEventListener("change", function () {
        var f = input.files[0];
        if (!f) { clearSlot(); return; }
        var isPdf = (f.type === "application/pdf") || /\.pdf$/i.test(f.name);
        // Invalid file: also CLEAR the previous valid selection (prevents the wrong file silently remaining).
        // The reason is shown ON the slot as well: the shared message box sits
        // far below the fields on a phone.
        if (!isPdf) {
          funnel("submit_file_rejected", { slot: key, reason: "not_pdf" });
          showMsg(T.notPdf(f.name), "err"); input.value = ""; clearSlot();
          setSlotError(key, T.notPdf(f.name)); return;
        }
        var lim = MAX_MB[key] || 10;
        if (f.size > lim * 1024 * 1024) {
          funnel("submit_file_rejected", { slot: key, reason: "too_large", mb: Math.round(f.size / 1048576) });
          showMsg(T.tooLarge(f.name, lim), "err"); input.value = ""; clearSlot();
          setSlotError(key, T.tooLarge(f.name, lim)); return;
        }
        if (!started) { started = true; funnel("submit_start", { first_slot: key }); }
        picked[key] = f;
        setSlotError(key, "");
        drop.classList.add("ok");
        hintEl.textContent = f.name + " · " + (f.size / 1048576).toFixed(1) + " MB";
        pickEl.textContent = T.pickChange;
        msg.classList.remove("show");   // hide any previous error message once a valid selection is made
        syncSubmit();
      });

      // The dashed slot looks like a drop zone, so it behaves like one: a
      // dropped PDF goes through exactly the same checks as a picked one.
      ["dragenter", "dragover"].forEach(function (type) {
        drop.addEventListener(type, function (ev) { ev.preventDefault(); drop.classList.add("drag"); });
      });
      drop.addEventListener("dragleave", function (ev) {
        if (!drop.contains(ev.relatedTarget)) drop.classList.remove("drag");
      });
      drop.addEventListener("drop", function (ev) {
        ev.preventDefault();
        drop.classList.remove("drag");
        var files = ev.dataTransfer && ev.dataTransfer.files;
        if (!files || !files.length || isUploading) return;
        try {
          var dt = new DataTransfer();
          dt.items.add(files[0]);
          input.files = dt.files;
        } catch (_) { return; }
        input.dispatchEvent(new Event("change"));
      });
    });
    // A file dropped next to a slot must not make the browser open the PDF and
    // throw away everything typed so far.
    ["dragover", "drop"].forEach(function (type) {
      document.addEventListener(type, function (ev) {
        if (!(ev.target.closest && ev.target.closest(".suf-drop"))) ev.preventDefault();
      });
    });

    var nameEl = document.getElementById("suf-name");
    var nameWarn = document.getElementById("suf-name-warn");
    nameEl.addEventListener("input", function () {
      if (nameEl.value.trim()) setFieldError(nameEl, nameWarn, "");
      syncSubmit();
    });

    var emailEl = document.getElementById("suf-email");
    var emailWarn = document.getElementById("suf-email-warn");
    emailEl.addEventListener("input", function () {
      var v = emailEl.value.trim();
      var dom = (v.split("@")[1] || "");
      var ok = !v || (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && /^std\.bogazici\.edu\.tr$/i.test(dom));
      setFieldError(emailEl, emailWarn, ok ? "" : T.emailWarn);
      syncSubmit();
    });

    var sidEl = document.getElementById("suf-sid");
    var sidWarn = document.getElementById("suf-sid-warn");
    sidEl.addEventListener("input", function () {
      var v = sidEl.value.trim();
      var ok = !v || /^20\d{8}$/.test(v);
      setFieldError(sidEl, sidWarn, ok ? "" : T.sidWarn);
      syncSubmit();
    });

    // If the student tries to close the tab while an upload is in progress,
    // trigger the browser's own "are you sure you want to leave?" warning.
    // WHY: if the files reached the server, Apps Script COMPLETES the process
    // even if the client leaves. The student can't see the confirmation screen,
    // assumes the submission failed, and re-uploads; since requestId leaves with
    // the page, server-side idempotency can't kick in and a DUPLICATE record
    // is created.
    // isUploading is read fresh each time → it falls silent on its own once the upload finishes.
    window.addEventListener("beforeunload", function (ev) {
      if (!isUploading) return;
      ev.preventDefault();
      ev.returnValue = "";   // older browsers require this
      return "";
    });

    function readB64(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(",")[1]); };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }

    var phaseTimer = null;
    function showDone(html) {
      if (phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
      var done = document.getElementById("suf-done");
      if (gate) gate.style.display = "none";
      if (closed) closed.style.display = "none";
      form.style.display = "none";
      // Visible BEFORE it is filled: a live region that is still display:none
      // when its content changes is not announced by screen readers.
      done.style.display = "block";
      done.innerHTML = html;
      var help = document.getElementById("gonderemiyorsanz") || document.getElementById("if-you-cannot-submit");
      if (help) {
        help.style.display = "none";
        var next = help.nextElementSibling;
        if (next && next.tagName === "UL") next.style.display = "none";
      }
      // The focused Submit button was just hidden; without this, focus fell
      // back to <body> and keyboard / screen-reader users lost their place.
      var title = done.querySelector(".suf-done__title");
      if (title) title.focus({ preventScroll: true });
      done.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center"
      });
    }

    // Received documents: type first (what the grader looks for), file name
    // second, plus a download link so the student can check what they sent.
    // The link points at the student's OWN copy still held by the browser
    // (object URL): no request to the server, Drive or the Apps Script quota.
    // It lives only as long as the page.
    function doneItems(keys, nameOf, fileOf) {
      return keys.map(function (k) {
        var label = docLabel(k);
        var line = "<b>" + escHtml(label) + "</b> · " + escHtml(nameOf(k));
        var file = fileOf && fileOf(k);
        if (file && window.URL && typeof URL.createObjectURL === "function") {
          line += " <a class=\"suf-done__dl\" href=\"" + URL.createObjectURL(file) + "\" download=\"" +
            escHtml(nameOf(k)) + "\" aria-label=\"" + escHtml(T.downloadLabel(label)) + "\">" + T.download + "</a>";
        }
        return line;
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      // The clock is read again here, not trusted from page load.
      var wasLate = isLate;
      computePhase(Date.now());
      if (isClosed) { block("closed", T.errClosed); return; }
      if (isLate && !wasLate) { FUNNEL.late = true; renderLate(); renderCountdown(Date.now()); syncSubmit(); }
      if (isLate && ackEl && !ackEl.checked) { block("late_ack", T.errAck); ackEl.focus(); return; }
      if (!WEB_APP_URL || !FORM_KEY) { block("unavailable", T.errUnavailable); return; }
      if (!contractReady) { block("not_verified", T.errNotVerified); return; }
      if (document.getElementById("suf-hp").value) { funnel("submit_blocked", { reason: "honeypot" }); return; }

      var name = titleCaseName(nameEl.value);
      var sid = sidEl.value.trim();
      var email = emailEl.value.trim();
      // Every problem is marked at once (field + slot), the first one gets
      // focus; a single submit_blocked event keeps the analytics contract.
      var problems = [];
      function flag(reason, el) { problems.push({ reason: reason, el: el }); }
      if (!name) { setFieldError(nameEl, nameWarn, T.errNameRequired); flag("required_fields", nameEl); }
      if (!sid) { setFieldError(sidEl, sidWarn, T.errSidRequired); flag("required_fields", sidEl); }
      else if (!/^20\d{8}$/.test(sid)) { setFieldError(sidEl, sidWarn, T.errSid); flag("sid_format", sidEl); }
      if (!email) { setFieldError(emailEl, emailWarn, T.errEmailRequired); flag("required_fields", emailEl); }
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setFieldError(emailEl, emailWarn, T.errEmailInvalid); flag("email_invalid", emailEl); }
      else if (!/^std\.bogazici\.edu\.tr$/i.test((email.split("@")[1] || ""))) { setFieldError(emailEl, emailWarn, T.errEmailDomain); flag("email_domain", emailEl); }
      REQUIRED_KEYS.forEach(function (k) {
        if (!picked[k]) flag("missing_required", setSlotError(k, T.errFileMissing));
      });
      sitRequiredKeys().forEach(function (k) {
        if (!picked[k]) flag("missing_situational", setSlotError(k, T.errFileMissing));
      });
      if (problems.length) {
        funnel("submit_blocked", { reason: problems[0].reason });
        showMsg(T.errSummary(problems.length), "err");
        if (problems[0].el) problems[0].el.focus();
        return;
      }

      var total = 0; Object.keys(picked).forEach(function (k) { total += picked[k].size; });
      if (total > MAX_TOTAL_MB * 1024 * 1024) { block("total_size", T.errTotalSize(MAX_TOTAL_MB)); return; }

      if (!requestId) requestId = createRequestId();
      if (!requestId) { block("request_id", T.errRequestId); return; }

      isUploading = true; syncSubmit(); showMsg(T.msgUploading, "ok");

      var keys = Object.keys(picked);
      var flags = sitFlags();
      var uploadStart = Date.now();
      funnel("submit_attempt", {
        files: keys.length, total_mb: Math.round(total / 1048576),
        saturday: flags.saturday, reimbursement: flags.reimbursement
      });
      // Safety net against an upload that silently hangs (neither a response nor an error comes back):
      // abort after 180s so the button doesn't stay locked on "Gönderiliyor…" forever. A generous timeout →
      // it won't cut off large-but-progressing uploads, only genuinely stuck ones.
      var ctrl = new AbortController();
      var uploadTimer = setTimeout(function () { ctrl.abort(); }, 180000);
      Promise.all([
        Promise.all(keys.map(function (k) { return readB64(picked[k]); })),
        getRecaptchaToken()
      ]).then(function (parts) {
        var b64s = parts[0];
        var recaptchaToken = parts[1];
        var files = {};
        keys.forEach(function (k, i) {
          files[k] = { filename: picked[k].name, mimeType: "application/pdf", dataB64: b64s[i] };
        });
        var payload = { token: FORM_KEY, contractVersion: CONTRACT_VERSION,
          campaignId: CAMPAIGN_ID, requestId: requestId,
          recaptchaToken: recaptchaToken,
          name: name, studentId: sid, email: email,
          flags: flags,
          hp: document.getElementById("suf-hp").value, files: files };
        return fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload), signal: ctrl.signal });
      }).then(function (res) {
        clearTimeout(uploadTimer);
        if (!res.ok) { var se = new Error(T.errServer(res.status)); se.trackReason = "http_" + res.status; throw se; }
        return res.json().catch(function () { var je = new Error(T.errUnexpectedResponse); je.trackReason = "bad_json"; throw je; });
      }).then(function (out) {
        if (!out || out.ok !== true) {
          var re = new Error(serverMessage((out && out.error) || T.errUnverified, d.locale));
          re.trackReason = "rejected";
          throw re;
        }
        // Submission complete: the beforeunload warning MUST fall silent. Otherwise the
        // student gets a needless warning when closing the tab after seeing the confirmation.
        isUploading = false;
        funnel("submit_success", {
          late_days: daysLate, files: keys.length,
          saturday: flags.saturday, reimbursement: flags.reimbursement,
          seconds: Math.round((Date.now() - uploadStart) / 1000)
        });
        var items = doneItems(keys, function (k) { return picked[k].name; }, function (k) { return picked[k]; });
        // Receipt time and on-time/late come ONLY from the server (it decides
        // lateness at receipt, after an upload that can take minutes). The
        // student's clock never goes on a screen they keep as proof. A reply
        // replayed from the server's idempotency cache may predate these
        // fields; the line is then simply left out.
        var serverAt = out.submittedAt ? Date.parse(out.submittedAt) : NaN;
        showDone(T.doneHtml(escHtml(name), escHtml(sid),
          out.submissionId ? escHtml(out.submissionId) : "", items, escHtml(TERM_DISPLAY),
          isNaN(serverAt) ? "" : fmtDeadline(serverAt),
          typeof out.lateDays === "number" ? out.lateDays : null));
      }).catch(function (err) {
        clearTimeout(uploadTimer);
        var m = String(err && err.message || err);
        var reason = (err && err.trackReason) ||
          (err && err.name === "AbortError" ? "timeout" :
           m === T.errCaptcha || m === T.errCaptchaLoad ? "captcha" :
           /fetch|load failed|network|networkerror/i.test(m) ? "network" : "other");
        funnel("submit_error", { reason: reason, seconds: Math.round((Date.now() - uploadStart) / 1000) });
        if ((err && err.name === "AbortError") || /fetch|load failed|network|networkerror/i.test(m)) {
          showMsg(T.errNetwork, "err");
        } else {
          showMsg(T.errFailed(m), "err");
        }
        isUploading = false; syncSubmit();
      });
    });

    function checkContract() {
      if (contractChecking) return;
      contractChecking = true;
      // The checking state is shown ONLY on the Submit button (syncSubmit → "Sunucu kontrol ediliyor…").
      // The top banner (gate) doesn't repeat the same message; it appears only if verification FAILS.
      if (!contractReady) {
        gate.style.display = "none";
        retryBtn.style.display = "none";
      }
      syncSubmit();

      var contractCtrl = new AbortController();
      var contractTimer = setTimeout(function () { contractCtrl.abort(); }, 15000);
      fetch(WEB_APP_URL, { method: "GET", cache: "no-store", signal: contractCtrl.signal })
        .then(function (res) {
          if (!res.ok) throw new Error(T.errServer(res.status));
          return res.json();
        })
        .then(function (remote) {
          clearTimeout(contractTimer);
          contractChecking = false;
          if (!sameContract(remote)) { contractFailure(T.gateMismatch, true); return; }
          contractReady = true;
          writeContractCache(remote);
          gate.style.display = "none";
          retryBtn.style.display = "none";
          syncSubmit();
        })
        .catch(function () {
          clearTimeout(contractTimer);
          contractFailure(T.gateUnreachable, true);
        });
    }

    retryBtn.addEventListener("click", checkContract);

    // Keeps the countdown and the late state honest while the page stays open.
    function tickPhase() {
      if (!document.body.contains(form)) { clearInterval(phaseTimer); phaseTimer = null; return; }
      var wasLate = isLate;
      var now = Date.now();
      computePhase(now);
      if (isClosed) {
        if (!isUploading) { clearInterval(phaseTimer); phaseTimer = null; showClosed(); }
        return;
      }
      if (isLate && !wasLate) { FUNNEL.late = true; renderLate(); }
      renderCountdown(now);
      syncSubmit();
    }
    phaseTimer = setInterval(tickPhase, 30000);

    // Local-only UI previews: /teslim/?preview=done|fail
    var previewHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var previewMode = previewHost
      ? new URLSearchParams(location.search).get("preview")
      : null;
    if (previewMode === "done") {
      var sample = {
        rapor: "Staj_Raporu_Ayşe_Yılmaz.pdf",
        sicil: "Staj_Sicil_Formu.pdf",
        anketi: "Ogrenci_Staj_Anketi.pdf",
        cumartesi: "Cumartesi_Yazisi.pdf"
      };
      showDone(T.doneHtml(
        "Ayşe Yılmaz",
        "2021405123",
        "STJ-2026S-8F3K2A",
        doneItems(Object.keys(sample), function (k) { return sample[k]; }, function () {
          return new Blob(["%PDF-1.4\n%%EOF\n"], { type: "application/pdf" });
        }),
        escHtml(TERM_DISPLAY),
        fmtDeadline(Date.now()),   // sample values, as the server would send them
        Number(new URLSearchParams(location.search).get("late")) || 0   // ?preview=done&late=3
      ));
      return;
    }
    if (previewMode === "fail") {
      if (gate) gate.style.display = "none";
      if (closed) closed.style.display = "none";
      document.getElementById("suf-name").value = "Ayşe Yılmaz";
      document.getElementById("suf-sid").value = "2021405123";
      document.getElementById("suf-email").value = "ayse.yilmaz@std.bogazici.edu.tr";
      showMsg(T.errFailed("Sunucu bağlantısı zaman aşımına uğradı"), "err");
      msg.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }

    if (!WEB_APP_URL || !FORM_KEY) {
      contractFailure(T.errUnavailable, false);
      return;
    }
    function loadRecaptcha() {
      if (!RECAPTCHA_SITE_KEY) return;
      var note = document.getElementById("suf-captcha-note");
      if (note) note.hidden = false;
      if (document.getElementById("suf-recaptcha-script")) return;
      var s = document.createElement("script");
      s.id = "suf-recaptcha-script";
      s.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(RECAPTCHA_SITE_KEY);
      s.async = true;
      s.defer = true;
      s.onerror = function () { showMsg(T.errCaptchaLoad, "err"); };
      document.head.appendChild(s);
    }

    var cachedContract = readContractCache();
    if (cachedContract) {
      contractReady = true;
      gate.style.display = "none";
      syncSubmit();
    }
    loadRecaptcha();
    checkContract();
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { init(); });
  } else if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
