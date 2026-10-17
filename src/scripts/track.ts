// Umami custom events (port of docs/assets/track.js, same behaviour).
// Exposes window.stajTrack(name, data) for the submission island and reports
// JS errors from the site's own scripts (max 3 per page). Never sends names,
// student IDs, e-mails or file names — only categorical codes.
// No-op when Umami isn't loaded (local builds, empty ID, ad blockers).
type Ev = [string, Record<string, unknown>];
declare global { interface Window { umami?: { track: (n: string, d?: Record<string, unknown>) => void } } }

let queue: Ev[] = [];
let waited = 0;
function flush() {
  if (!window.umami || typeof window.umami.track !== "function") {
    if (waited < 20) { waited++; setTimeout(flush, 500); } else { queue = []; }
    return;
  }
  while (queue.length) {
    const [n, d] = queue.shift()!;
    try { window.umami.track(n, d); } catch { /* ignore */ }
  }
}
function track(name: string, data?: Record<string, unknown>) {
  if (waited >= 20 && !window.umami) return;
  queue.push([name, data || {}]);
  if (queue.length === 1) flush();
}
window.stajTrack = track;

const clip = (s: unknown, n: number) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) : t; };
const seen: Record<string, true> = {};
let count = 0;
function report(message: unknown, source: string | undefined, line: number | undefined) {
  if (!source || source.indexOf(location.origin) !== 0) return;
  const file = source.split("?")[0].split("/").pop();
  const key = `${file}:${line}:${message}`;
  if (seen[key] || count >= 3) return;
  seen[key] = true; count++;
  track("js_error", { message: clip(message, 200), where: `${file}:${line || 0}` });
}
window.addEventListener("error", (ev) => {
  if (ev.target && ev.target !== window) return;
  report(ev.message, ev.filename, ev.lineno);
});
window.addEventListener("unhandledrejection", (ev) => {
  const r = ev.reason as { stack?: string; message?: string } | undefined;
  const m = String(r?.stack || "").match(/(https?:\/\/[^\s)]+?):(\d+):(\d+)/);
  if (m) report(String(r?.message || r), m[1], Number(m[2]));
});
export {};
