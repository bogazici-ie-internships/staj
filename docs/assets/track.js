/* Umami custom events — extends the default pageview tracking (overrides/main.html).
   Deliberately minimal: analytics focus on the submission portal. This file only
   exposes window.stajTrack(name, data) for submit.js (submit_* events) and reports
   JS errors from the site's own scripts. Page views are counted by Umami itself.
   BUDGET: Umami Cloud bills every stored property as one extra event (Hobby = 100K/month).
   The event's URL is already recorded by Umami → never add page/lang properties.
   PRIVACY: never send names, student IDs, e-mails or file names chosen by users —
   only categorical codes.
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
      try { window.umami.track(ev[0], ev[1]); } catch (_) {}
    }
  }

  function track(name, data) {
    if (waited >= 20 && !window.umami) return;
    queue.push([name, data || {}]);
    if (queue.length === 1) flush();
  }
  window.stajTrack = track;

  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) : s; }

  // --- JS errors from the site's own scripts (e.g. submit.js broken on some browser) ---
  // Browser-extension / third-party errors are ignored; max 3 distinct errors per page.
  var errSeen = {};
  var errCount = 0;
  function reportError(message, source, line) {
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
    reportError(ev.message, ev.filename, ev.lineno);
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    var stack = String(r && r.stack || "");
    var m = stack.match(/(https?:\/\/[^\s)]+?):(\d+):(\d+)/);
    if (m) reportError(String(r && r.message || r), m[1], Number(m[2]));
  });
})();
