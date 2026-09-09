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
  var MAX_MB = { rapor: 10, sicil: 5, anketi: 5, cumartesi: 5, dekont: 5, ek1: 5 };
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
      months: AYLAR,
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
      countdownLeft: function (days) {
        return days === 0 ? "<b>Bugün</b> son gün" : "<b>" + days + "</b> gün kaldı";
      },
      btnUploading: "Gönderiliyor…",
      btnChecking: "Sunucu kontrol ediliyor…",
      btnSubmit: "Gönder",
      hintRequired: "Lütfen tüm zorunlu alanları doldurun.",
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
      errRequiredFields: "Ad Soyad, Öğrenci No ve E-posta zorunludur.",
      errSid: "Öğrenci numarası 20 ile başlayan 10 hane olmalı.",
      errEmailInvalid: "Geçerli bir e-posta girin.",
      errEmailDomain: "Lütfen @std.bogazici.edu.tr uzantılı öğrenci e-postanızı kullanın.",
      errAllRequired: "Tüm zorunlu belgeleri yüklemeniz gerekir.",
      errSitRequired: "Seçtiğiniz durumlar için gerekli belgeleri yükleyin.",
      errTotalSize: function (mb) { return "Toplam boyut çok büyük (>" + mb + " MB)."; },
      errRequestId: "Tarayıcı güvenli bir gönderim kimliği oluşturamadı. Sayfayı güncelleyip tekrar deneyin.",
      msgUploading: "Belgeler yükleniyor — bu sayfayı KAPATMAYIN. Onay ekranı görünene kadar bekleyin; büyük dosyalarda bu bir dakikayı bulabilir.",
      errServer: function (status) { return "Sunucu hatası (" + status + ")"; },
      errUnexpectedResponse: "Sunucudan beklenmeyen yanıt — gönderim doğrulanamadı.",
      errUnverified: "Gönderim doğrulanamadı.",
      doneHtml: function (name, sid, submissionId, items, term) {
        var idBlock = submissionId
          ? "<div class=\"suf-done__id\">" +
              "<span class=\"suf-done__id-label\">Referans no</span>" +
              "<span class=\"suf-done__id-value\">" + submissionId + "</span>" +
              "<p class=\"suf-done__id-hint\">Tesliminiz bu numarayla kayda geçmiştir.</p>" +
            "</div>"
          : "";
        return "<p class=\"suf-done__title\">Teslim alındı</p>" +
          "<p class=\"suf-done__who\">" + name + " — " + sid +
            (term ? " · " + term : "") + "</p>" +
          idBlock +
          "<p class=\"suf-done__docs-label\">Alınan belgeler (" + items.length + ")</p>" +
          "<ul class=\"suf-done__docs\"><li>" + items.join("</li><li>") + "</li></ul>" +
          "<p class=\"suf-done__foot\">Bu ekran <b>teslim onayınızdır</b> — ekran görüntüsü almanız önerilir. " +
            "Değerlendirme <a href=\"../sonuclar/\">Sonuçlar</a> sayfasında periyodik olarak ilan edilir.</p>";
      },
      errNetwork: "Bağlantı kurulamadı. Sayfayı sert yenileyin (Cmd/Ctrl+Shift+R), bağlantınızı kontrol edip tekrar Gönder'e basın. Sürerse son teslim anından önce belgeleri e-posta ile staj asistanlarına iletin.",
      errFailed: function (m) { return "Gönderim başarısız: " + m + " — Lütfen tekrar deneyin veya staj asistanlarıyla iletişime geçin."; },
      gateMismatch: "Teslim dönemi yapılandırması doğrulanamadı. Güvenliğiniz için gönderim kapalı; lütfen tekrar kontrol edin veya staj asistanlarıyla iletişime geçin.",
      gateUnreachable: "Teslim sunucusuna ulaşılamadı. Bilgileriniz ve seçtiğiniz dosyalar korunuyor; bağlantınızı kontrol edip tekrar deneyin."
    },

    en: {
      months: MONTHS,
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
        return days === 0 ? "<b>Due today</b>" : "<b>" + days + "</b> " + (days === 1 ? "day" : "days") + " left";
      },
      btnUploading: "Uploading…",
      btnChecking: "Checking server…",
      btnSubmit: "Submit",
      hintRequired: "Please fill in all required fields.",
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
      errRequiredFields: "Full Name, Student ID, and Email are required.",
      errSid: "The student ID must contain 10 digits and begin with 20.",
      errEmailInvalid: "Enter a valid email address.",
      errEmailDomain: "Use your student email address ending in @std.bogazici.edu.tr.",
      errAllRequired: "Upload all required documents.",
      errSitRequired: "Upload the documents required for the situations you selected.",
      errTotalSize: function (mb) { return "The combined file size is too large (maximum " + mb + " MB)."; },
      errRequestId: "The browser could not create a secure submission ID. Refresh the page and try again.",
      msgUploading: "Uploading documents — DO NOT close this page. Wait until the confirmation screen appears; with large files this can take up to a minute.",
      errServer: function (status) { return "Server error (" + status + ")"; },
      errUnexpectedResponse: "Unexpected server response; the submission could not be verified.",
      errUnverified: "The submission could not be verified.",
      doneHtml: function (name, sid, submissionId, items, term) {
        var idBlock = submissionId
          ? "<div class=\"suf-done__id\">" +
              "<span class=\"suf-done__id-label\">Reference no.</span>" +
              "<span class=\"suf-done__id-value\">" + submissionId + "</span>" +
              "<p class=\"suf-done__id-hint\">Your submission is recorded under this number.</p>" +
            "</div>"
          : "";
        return "<p class=\"suf-done__title\">Submission received</p>" +
          "<p class=\"suf-done__who\">" + name + " — " + sid +
            (term ? " · " + term : "") + "</p>" +
          idBlock +
          "<p class=\"suf-done__docs-label\">Documents received (" + items.length + ")</p>" +
          "<ul class=\"suf-done__docs\"><li>" + items.join("</li><li>") + "</li></ul>" +
          "<p class=\"suf-done__foot\">This screen is your <b>submission confirmation</b> — we recommend taking a screenshot. " +
            "Evaluation outcomes are announced periodically on the <a href=\"../sonuclar/\">Results</a> page.</p>";
      },
      errNetwork: "Could not connect. Hard-refresh the page (Cmd/Ctrl+Shift+R), check your connection, and select Submit again. If the problem continues, email the documents to the internship assistants before the deadline.",
      errFailed: function (m) { return "Submission failed: " + m + " — Try again or contact the internship assistants."; },
      gateMismatch: "The submission-term configuration could not be verified. Submission is disabled for your protection. Check again or contact the internship assistants.",
      gateUnreachable: "The submission server could not be reached. Your information and selected files are preserved; check your connection and try again."
    }
  };

  function init() {
    var form = document.getElementById("sufForm");
    if (!form || form.dataset.sufBound === "1") return;
    form.dataset.sufBound = "1";

    var d = form.dataset;
    var T = STRINGS[d.locale] || STRINGS.tr;

    var WEB_APP_URL      = d.portalUrl || "";
    var FORM_KEY         = d.formKey || "";
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

    var dlMs     = deadlineMs(DEADLINE);
    var graceMs  = dlMs ? dlMs + GRACE_DAYS * 86400000 : null;
    var now      = Date.now();
    var isClosed = graceMs && now > graceMs;           // deadline + grace period passed → hard close
    var isLate   = dlMs && !isClosed && now > dlMs;    // within the grace window, late
    var daysLate = isLate ? Math.ceil((now - dlMs) / 86400000) : 0;

    if (isClosed) {
      gate.style.display = "none";
      form.style.display = "none";
      closed.style.display = "block";
      closed.innerHTML = T.closedHtml(TERM_DISPLAY);
      return;
    }

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
    if (isLate) {
      document.getElementById("suf-late-head").textContent = T.lateHead(daysLate);
      document.getElementById("suf-late-text").textContent =
        T.lateText(DEADLINE_DISPLAY, daysLate, fmtDeadline(graceMs));
      document.getElementById("suf-late").style.display = "";
    }

    // Days remaining/overdue for submission — a simple info line in the top box.
    var cd = document.getElementById("suf-countdown");
    if (cd && dlMs) {
      if (isLate) {
        cd.innerHTML = T.countdownLate(daysLate);
        cd.className = "staj-deadline__countdown staj-deadline__countdown--late";
      } else {
        var days = Math.ceil((dlMs - now) / 86400000);
        if (days >= 0) {
          cd.innerHTML = T.countdownLeft(days);
          cd.className = "staj-deadline__countdown" + (days < 7 ? " staj-deadline__countdown--urgent" : "");
        }
      }
    }

    var msg = document.getElementById("suf-msg");
    var hint = document.getElementById("suf-hint");
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
      if (input) input.value = "";
      drop.classList.remove("ok");
      if (hintEl && hintEl.dataset.baseHint) hintEl.textContent = hintEl.dataset.baseHint;
      if (pickEl) pickEl.textContent = T.pickChoose;
    }

    function syncSubmit() {
      var filesOk = REQUIRED_KEYS.every(function (k) { return picked[k]; });
      var sitOk = sitRequiredKeys().every(function (k) { return picked[k]; });
      var ackOk = !isLate || (ackEl && ackEl.checked);   // acknowledgment checkbox required when late
      if (isUploading) {
        btn.disabled = true;
        btn.textContent = T.btnUploading;
        if (hint) hint.hidden = true;
        return;
      }
      if (!contractReady) {
        btn.disabled = true;
        btn.textContent = contractChecking ? T.btnChecking : T.btnSubmit;
        if (hint) hint.hidden = true;
        return;
      }
      btn.disabled = !(filesOk && sitOk && ackOk);
      btn.textContent = T.btnSubmit;
      if (hint) {
        var showHint = !(filesOk && sitOk && ackOk);
        hint.textContent = T.hintRequired;
        hint.hidden = !showHint;
      }
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
        if (!isPdf) { showMsg(T.notPdf(f.name), "err"); input.value = ""; clearSlot(); return; }
        var lim = MAX_MB[key] || 10;
        if (f.size > lim * 1024 * 1024) { showMsg(T.tooLarge(f.name, lim), "err"); input.value = ""; clearSlot(); return; }
        picked[key] = f;
        drop.classList.add("ok");
        hintEl.textContent = f.name + " · " + (f.size / 1048576).toFixed(1) + " MB";
        pickEl.textContent = T.pickChange;
        msg.classList.remove("show");   // hide any previous error message once a valid selection is made
        syncSubmit();
      });
    });

    var emailEl = document.getElementById("suf-email");
    var emailWarn = document.getElementById("suf-email-warn");
    emailEl.addEventListener("input", function () {
      var v = emailEl.value.trim();
      var dom = (v.split("@")[1] || "");
      var ok = !v || (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && /^std\.bogazici\.edu\.tr$/i.test(dom));
      emailWarn.textContent = ok ? "" : T.emailWarn;
      emailWarn.classList.toggle("show", !ok);
      emailEl.classList.toggle("bad", !ok);
    });

    var sidEl = document.getElementById("suf-sid");
    var sidWarn = document.getElementById("suf-sid-warn");
    sidEl.addEventListener("input", function () {
      var v = sidEl.value.trim();
      var ok = !v || /^20\d{8}$/.test(v);
      sidWarn.textContent = ok ? "" : T.sidWarn;
      sidWarn.classList.toggle("show", !ok);
      sidEl.classList.toggle("bad", !ok);
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

    function showDone(html) {
      var done = document.getElementById("suf-done");
      if (gate) gate.style.display = "none";
      if (closed) closed.style.display = "none";
      form.style.display = "none";
      done.innerHTML = html;
      done.style.display = "block";
      var help = document.getElementById("gonderemiyorsanz") || document.getElementById("if-you-cannot-submit");
      if (help) {
        help.style.display = "none";
        var next = help.nextElementSibling;
        if (next && next.tagName === "UL") next.style.display = "none";
      }
      done.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center"
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (graceMs && Date.now() > graceMs) { showMsg(T.errClosed, "err"); return; }
      if (isLate && ackEl && !ackEl.checked) { showMsg(T.errAck, "err"); return; }
      if (!WEB_APP_URL || !FORM_KEY) { showMsg(T.errUnavailable, "err"); return; }
      if (!contractReady) { showMsg(T.errNotVerified, "err"); return; }
      if (document.getElementById("suf-hp").value) { return; }

      var name = titleCaseName(document.getElementById("suf-name").value);
      var sid = document.getElementById("suf-sid").value.trim();
      var email = document.getElementById("suf-email").value.trim();
      if (!name || !sid || !email) { showMsg(T.errRequiredFields, "err"); return; }
      if (!/^20\d{8}$/.test(sid)) { showMsg(T.errSid, "err"); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showMsg(T.errEmailInvalid, "err"); return; }
      if (!/^std\.bogazici\.edu\.tr$/i.test((email.split("@")[1] || ""))) { showMsg(T.errEmailDomain, "err"); return; }
      for (var i = 0; i < REQUIRED_KEYS.length; i++) {
        if (!picked[REQUIRED_KEYS[i]]) { showMsg(T.errAllRequired, "err"); return; }
      }
      var sitKeys = sitRequiredKeys();
      for (var s = 0; s < sitKeys.length; s++) {
        if (!picked[sitKeys[s]]) { showMsg(T.errSitRequired, "err"); return; }
      }

      var total = 0; Object.keys(picked).forEach(function (k) { total += picked[k].size; });
      if (total > MAX_TOTAL_MB * 1024 * 1024) { showMsg(T.errTotalSize(MAX_TOTAL_MB), "err"); return; }

      if (!requestId) requestId = createRequestId();
      if (!requestId) { showMsg(T.errRequestId, "err"); return; }

      isUploading = true; syncSubmit(); showMsg(T.msgUploading, "ok");

      var keys = Object.keys(picked);
      var flags = sitFlags();
      // Safety net against an upload that silently hangs (neither a response nor an error comes back):
      // abort after 180s so the button doesn't stay locked on "Gönderiliyor…" forever. A generous timeout →
      // it won't cut off large-but-progressing uploads, only genuinely stuck ones.
      var ctrl = new AbortController();
      var uploadTimer = setTimeout(function () { ctrl.abort(); }, 180000);
      Promise.all(keys.map(function (k) { return readB64(picked[k]); })).then(function (b64s) {
        var files = {};
        keys.forEach(function (k, i) {
          files[k] = { filename: picked[k].name, mimeType: "application/pdf", dataB64: b64s[i] };
        });
        var payload = { token: FORM_KEY, contractVersion: CONTRACT_VERSION,
          campaignId: CAMPAIGN_ID, requestId: requestId,
          name: name, studentId: sid, email: email,
          flags: flags,
          hp: document.getElementById("suf-hp").value, files: files };
        return fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload), signal: ctrl.signal });
      }).then(function (res) {
        clearTimeout(uploadTimer);
        if (!res.ok) { throw new Error(T.errServer(res.status)); }
        return res.json().catch(function () { throw new Error(T.errUnexpectedResponse); });
      }).then(function (out) {
        if (!out || out.ok !== true) { throw new Error((out && out.error) || T.errUnverified); }
        // Submission complete: the beforeunload warning MUST fall silent. Otherwise the
        // student gets a needless warning when closing the tab after seeing the confirmation.
        isUploading = false;
        var items = keys.map(function (k) { return escHtml(picked[k].name); });
        showDone(T.doneHtml(escHtml(name), escHtml(sid),
          out.submissionId ? escHtml(out.submissionId) : "", items, escHtml(TERM_DISPLAY)));
      }).catch(function (err) {
        clearTimeout(uploadTimer);
        var m = String(err && err.message || err);
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

    // Local-only UI previews: /teslim/?preview=done|fail
    var previewHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var previewMode = previewHost
      ? new URLSearchParams(location.search).get("preview")
      : null;
    if (previewMode === "done") {
      showDone(T.doneHtml(
        "Ayşe Yılmaz",
        "2021405123",
        "STJ-2026S-8F3K2A",
        [
          "Staj_Raporu_Ayşe_Yılmaz.pdf",
          "Staj_Sicil_Formu.pdf",
          "Ogrenci_Staj_Anketi.pdf",
          "Cumartesi_Yazisi.pdf"
        ],
        escHtml(TERM_DISPLAY)
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
    var cachedContract = readContractCache();
    if (cachedContract) {
      contractReady = true;
      gate.style.display = "none";
      syncSubmit();
    }
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
