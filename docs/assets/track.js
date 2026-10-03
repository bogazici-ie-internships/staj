/* Umami custom events — extends the default pageview tracking (overrides/main.html).
   Exposes window.stajTrack(name, data) for other scripts (submit.js) and wires up
   site-wide delegated listeners: document downloads, outbound/mailto links, language
   switch, FAQ (details) opens, site search, 404 hits, copy / tab / print, engaged time,
   and anonymous session properties (phase, theme, language) via umami.identify.
   BUDGET: Umami Cloud bills every stored property as one extra event (Hobby = 100K/month).
   The event's URL is already recorded by Umami → never add page/lang properties; keep
   each event to the 1–3 properties we actually read in the dashboard.
   PRIVACY: never send names, student IDs, e-mails typed by users, or file names chosen
   by users. Only site-owned paths, public link targets and categorical codes. Copied
   text is NEVER sent (only its kind), and copies from form fields/search are ignored.
   No-op when Umami isn't loaded (local `mkdocs serve`, empty ID, ad blockers). */
(function () {
  var queue = [];
  var waited = 0;

  function flush() {
    if (!window.umami || typeof window.umami.track !== "function") {
      // Umami loads with `defer`; give it up to ~10s, then drop silently.
      if (waited < 20) { waited++; setTimeout(flush, 500); } else { queue = []; }
      return;
    }
    while (queue.length) {
      var ev = queue.shift();
      try {
        if (ev[0] === null) window.umami.identify(ev[1]);   // session properties, no distinct ID
        else window.umami.track(ev[0], ev[1]);
      } catch (_) {}
    }
  }

  function track(name, data) {
    if (waited >= 20 && !window.umami) return;
    queue.push([name, data || {}]);
    if (queue.length === 1) flush();
  }
  window.stajTrack = track;
  // Same wait-for-Umami queue as track(); null name = identify(data).
  function identify(data) { track(null, data); }

  function lang() { return document.documentElement.lang || "tr"; }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) : s; }

  var FILE_RE = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;

  // --- Link clicks: downloads, outbound, mailto, language switch, search results ---
  function onLinkClick(ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";

    if (a.classList.contains("staj-lang-toggle")) {
      track("lang_switch");   // direction = the event's URL (/en/… → to TR)
      return;
    }
    if (/^mailto:/i.test(href)) {
      track("mailto_click", { to: clip(href.replace(/^mailto:/i, "").split("?")[0], 100) });
      return;
    }
    if (/^tel:/i.test(href)) {
      track("tel_click");
      return;
    }

    var url;
    try { url = new URL(href, location.href); } catch (_) { return; }
    if (!/^https?:$/.test(url.protocol)) return;

    // In-site jump to a section (#anchor): right-rail TOC or a link in the content.
    if (url.origin === location.origin && url.hash.length > 1 && !/^#__/.test(url.hash) &&
        !a.closest(".md-search-result") && !FILE_RE.test(url.pathname)) {
      var id = decodeURIComponent(url.hash.slice(1));
      var samePage = url.pathname === location.pathname;
      var jump = { section: clip(id, 100), via: a.closest(".md-nav--secondary") ? "toc" : "content" };
      if (!samePage) jump.target = url.pathname;   // only cross-page jumps need it
      track("section_jump", jump);
      return;
    }
    if (a.closest(".md-search-result")) {
      var q = document.querySelector(".md-search__input");
      track("search_click", { q: searchSafe(q && q.value), target: url.pathname });
      return;
    }
    if (FILE_RE.test(url.pathname)) {
      track("download", {
        file: decodeURIComponent(url.pathname.split("/").pop())
      });
      return;
    }
    if (url.origin !== location.origin) {
      track("outbound", { url: clip(url.origin + url.pathname, 200) });
    }
  }
  document.addEventListener("click", onLinkClick, true);
  // Middle-click opens in a new tab without firing "click".
  document.addEventListener("auxclick", function (ev) { if (ev.button === 1) onLinkClick(ev); }, true);

  // --- FAQ / collapsible admonitions: which questions get opened ---
  // "toggle" doesn't bubble → listen in the capture phase. Count each question once per page load.
  var seenDetails = new WeakSet();
  document.addEventListener("toggle", function (ev) {
    var d = ev.target;
    if (!d || d.tagName !== "DETAILS" || !d.open || seenDetails.has(d)) return;
    seenDetails.add(d);
    var s = d.querySelector("summary");
    track("faq_open", { q: clip(s && s.textContent, 150) });
  }, true);

  // --- Site search: settled queries (debounced), skipping anything that looks personal ---
  function searchSafe(q) {
    q = clip(q, 60);
    if (!q || /@|\d{6,}/.test(q)) return "";
    return q.toLowerCase();
  }
  var searchTimer = null;
  var lastQuery = "";
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains("md-search__input")) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var q = searchSafe(t.value);
      if (q.length < 3 || q === lastQuery) return;
      lastQuery = q;
      var n = document.querySelectorAll(".md-search-result__item").length;
      track("search", { q: q, results: n });
    }, 1500);
  }, true);

  // --- 404: which missing URLs people land on, and from where ---
  function check404() {
    if (!document.querySelector(".staj-404")) return;
    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname + new URL(document.referrer).pathname : ""; } catch (_) {}
    track("not_found", { ref: clip(ref, 200) });   // missing path = the event's URL
  }
  // --- Arrival via a section link (e.g. /kurallar/#gecikme shared on WhatsApp) ---
  function checkLanding() {
    if (location.hash.length < 2 || /^#__/.test(location.hash)) return;
    var id = decodeURIComponent(location.hash.slice(1));
    var h = document.getElementById(id);
    if (!h) return;
    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (_) {}
    track("section_landing", { section: clip(id, 100), ref: ref });
  }

  // --- Reading depth on long pages: one read_depth event when the student leaves ---
  // A section counts as reached only if its heading stays on screen for DWELL_MS
  // (fast scrolling to the bottom doesn't count as reading). IntersectionObserver →
  // no scroll listeners, the browser notifies us.
  var MIN_SECTIONS = 4;
  var DWELL_MS = 2000;
  var depthObserver = null;
  var flushDepth = null;   // previous page's sender (instant navigation: report before re-init)
  function initDepth() {
    if (flushDepth) { flushDepth(); flushDepth = null; }
    if (depthObserver) { depthObserver.disconnect(); depthObserver = null; }
    if (!("IntersectionObserver" in window)) return;
    var heads = [].slice.call(document.querySelectorAll(".md-content article h2[id], .md-content article h3[id]"));
    if (heads.length < MIN_SECTIONS) return;
    depthActive = true;   // this page reports engaged time inside read_depth

    var timers = new Map();
    var reached = new Set();
    var deepest = -1;
    var sent = false;

    depthObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = heads.indexOf(e.target);
        if (e.isIntersecting) {
          if (reached.has(i) || timers.has(i)) return;
          timers.set(i, setTimeout(function () {
            timers.delete(i);
            reached.add(i);
            if (i > deepest) deepest = i;
          }, DWELL_MS));
        } else if (timers.has(i)) {
          clearTimeout(timers.get(i));
          timers.delete(i);
        }
      });
    });
    heads.forEach(function (h) { depthObserver.observe(h); });

    function send() {
      if (sent) return;
      sent = true;
      var h = deepest >= 0 ? heads[deepest] : null;
      track("read_depth", {
        deepest: h ? clip(h.id, 100) : "none",
        pct: Math.round((deepest + 1) / heads.length * 100),
        engaged: engagedBucket()
      });
    }
    // "hidden" fires on tab switch, app switch and (mostly) close on mobile; pagehide covers the rest.
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
    window.addEventListener("pagehide", send);
    flushDepth = send;
  }

  // --- JS errors from the site's own scripts (e.g. submit.js broken on some browser) ---
  // Browser-extension / third-party errors are ignored; max 3 distinct errors per page.
  var errSeen = {};
  var errCount = 0;
  function reportError(message, source, line, col) {
    if (!source || source.indexOf(location.origin) !== 0) return;
    var file = source.split("?")[0].split("/").pop();
    var key = file + ":" + line + ":" + message;
    if (errSeen[key] || errCount >= 3) return;
    errSeen[key] = true;
    errCount++;
    track("js_error", { message: clip(message, 200), where: file + ":" + (line || 0) });   // browser/OS: Umami session
  }
  window.addEventListener("error", function (ev) {
    if (ev.target && ev.target !== window) return;   // resource load errors (img/script 404) — not JS errors
    reportError(ev.message, ev.filename, ev.lineno, ev.colno);
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    var stack = String(r && r.stack || "");
    var m = stack.match(/(https?:\/\/[^\s)]+?):(\d+):(\d+)/);
    if (m) reportError(String(r && r.message || r), m[1], Number(m[2]), Number(m[3]));
  });

  // --- Session properties (Umami → Sessions): once per browser session, no distinct ID ---
  // phase: where this visit falls on the submission calendar. Computed HERE, not at
  // build time — the site is only rebuilt on push. Same +03:00 rules as submit.js.
  try {
    // sessionStorage unavailable (private mode) → falls back to once per page load.
    var sentBefore = false;
    try { sentBefore = sessionStorage.getItem("staj-identify") === "1"; sessionStorage.setItem("staj-identify", "1"); } catch (_) {}
    if (!sentBefore) sendSession();
  } catch (_) {}
  function sendSession() {
    var us = document.querySelector("script[data-staj-deadline]");
    var dl = us ? us.getAttribute("data-staj-deadline") : "";
    var dlMs = dl ? Date.parse(dl.trim().replace(" ", "T") + ":00+03:00") : NaN;
    var phase = "no_deadline";
    if (!isNaN(dlMs)) {
      var nowMs = Date.now();
      var graceMs = dlMs + (Number(us.getAttribute("data-staj-grace-days")) || 0) * 86400000;
      phase = nowMs <= dlMs ? "before_deadline" : nowMs <= graceMs ? "late_window" : "closed";
    }
    var scheme = document.body && document.body.getAttribute("data-md-color-scheme");
    var browserLang = String(navigator.language || "").slice(0, 2).toLowerCase();
    identify({
      phase: phase,
      theme: scheme === "slate" ? "dark" : "light",
      lang_mismatch: !!browserLang && browserLang !== lang()
    });
  }

  // Nearest h2/h3 above a node → which section something happened in.
  function sectionOf(node) {
    var heads = document.querySelectorAll(".md-content article h2[id], .md-content article h3[id]");
    var found = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) found = heads[i];
      else break;
    }
    return found;
  }

  // --- Copy: WHAT KIND of thing gets copied and from which section — never the text ---
  // Form fields / search box are skipped entirely (students type their own IDs there).
  try {
    var copySeen = {};
    document.addEventListener("copy", function () {
      try {
        // Skip only text-entry fields: a clicked tab/checkbox keeps focus on its
        // <input type=radio|checkbox> while the student copies page text.
        var ae = document.activeElement;
        if (ae && ((ae.tagName === "INPUT" && !/^(radio|checkbox|button|submit|reset)$/i.test(ae.type)) ||
                   ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || ae.isContentEditable)) return;
        var sel = window.getSelection && window.getSelection();
        var text = sel ? String(sel).trim() : "";
        if (!text || !sel.anchorNode) return;
        var el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
        if (!el || el.closest("form, .md-search, [contenteditable]")) return;
        var kind = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? "email"
          : el.closest("pre, code") ? "code"
          : /^https?:\/\/\S+$/.test(text) ? "url"
          : "text";
        var h = sectionOf(el);
        var key = kind + "|" + (h ? h.id : "");
        if (copySeen[key]) return;
        copySeen[key] = true;
        track("copy", { kind: kind, section: h ? clip(h.id, 100) : "none" });
      } catch (_) {}
    }, true);
  } catch (_) {}

  // --- Content tabs (pymdownx.tabbed): which tab students pick. Only user choices;
  // the default tab on load fires no "change". ---
  try {
    document.addEventListener("change", function (ev) {
      try {
        var t = ev.target;
        if (!t || t.type !== "radio" || !t.checked || !t.closest(".tabbed-set")) return;
        var lbl = document.querySelector('label[for="' + t.id + '"]');
        track("tab_switch", { tab: clip(lbl && lbl.textContent, 100) });
      } catch (_) {}
    }, true);
  } catch (_) {}

  // --- Print: which pages get printed (once per page load) ---
  try {
    var printed = false;
    window.addEventListener("beforeprint", function () {
      if (printed) return;
      printed = true;
      track("print");
    });
  } catch (_) {}

  // --- Engaged time: counts only while the tab is visible AND the student interacted
  // in the last IDLE_MS. Long pages report it inside read_depth (`engaged`); every
  // other page sends one engaged_time event on first hide — never both. ---
  var IDLE_MS = 30000;
  var TICK_MS = 5000;
  var flushEngaged = null;
  var engagedMs = 0;
  var depthActive = false;
  function bucket(s) {
    return s < 10 ? "0-10s" : s < 30 ? "10-30s" : s < 60 ? "30-60s" : s < 180 ? "1-3m" : s < 600 ? "3-10m" : "10m+";
  }
  function engagedBucket() { return bucket(Math.round(engagedMs / 1000)); }
  function initEngaged() {
    if (flushEngaged) { flushEngaged(); flushEngaged = null; }
    var lastActive = Date.now();
    engagedMs = 0;
    var sent = false;
    function active() { lastActive = Date.now(); }
    ["scroll", "pointerdown", "pointermove", "keydown", "touchstart", "wheel"].forEach(function (n) {
      window.addEventListener(n, active, { passive: true, capture: true });
    });
    var timer = setInterval(function () {
      if (document.visibilityState === "visible" && Date.now() - lastActive < IDLE_MS) engagedMs += TICK_MS;
    }, TICK_MS);
    function send() {
      if (sent) return;
      sent = true;
      clearInterval(timer);
      if (!depthActive) track("engaged_time", { bucket: engagedBucket() });
    }
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
    window.addEventListener("pagehide", send);
    flushEngaged = send;
  }

  function onPage() {
    check404();
    checkLanding();
    depthActive = false;
    try { initEngaged(); } catch (_) {}   // before initDepth: read_depth reads its counter
    initDepth();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(onPage);
  } else if (document.readyState !== "loading") {
    onPage();
  } else {
    document.addEventListener("DOMContentLoaded", onPage);
  }
})();
