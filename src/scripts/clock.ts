// Live time on static pages, minute precision, no aria-live (DESIGN.md §3):
// the deadline strip chip and the calendar's Bugün marker. The HTML carries
// absolute dates; this only adds "how long" and "where are we now".
import { left, leftText, phaseAt } from "../lib/phase";
import { DAY_MS, TR_OFFSET_MS, type Lang } from "../lib/dates";
import { ui } from "../i18n/ui";

function updateStrip(now: number) {
  const el = document.querySelector<HTMLElement>("[data-deadline-strip]");
  if (!el) return;
  const lang = (document.documentElement.lang === "en" ? "en" : "tr") as Lang;
  const dl = el.dataset.deadline ? Number(el.dataset.deadline) : null;
  const p = phaseAt(now, dl, Number(el.dataset.grace || 0));
  el.dataset.phase = p.name;
  // The campaign phase for the whole page (D-181): texts with a late-window wording follow it; unlike the strip it
  // never turns "submitted".
  document.documentElement.dataset.phase = p.name;
  const status = el.querySelector<HTMLElement>("[data-status]");
  const chip = el.querySelector<HTMLElement>("[data-chip]");
  const S = ui[lang].strip;
  if (status) status.textContent = `${{ open: S.open, late: S.late, closed: S.closed, unlocked: S.unlocked }[p.name]} · ${el.dataset.term}`;
  if (!chip) return;
  if (p.name === "open") chip.textContent = leftText(lang, left(now, p.deadlineMs!));
  else if (p.name === "late") chip.textContent = `${S.closes}: ${leftText(lang, left(now, p.closesMs!))}`;
  const live = p.name === "open" || p.name === "late";
  chip.toggleAttribute("data-empty", !live);
  chip.toggleAttribute("aria-hidden", !live);
  // Closed / no deadline: nothing to count, so the reserved space collapses once.
  chip.hidden = !live;
}

function updateToday(now: number) {
  document.querySelectorAll<HTMLElement>("[data-today-track]").forEach((track) => {
    const start = Date.parse(`${track.dataset.start}T00:00:00+03:00`);
    const end = Date.parse(`${track.dataset.end}T00:00:00+03:00`) + DAY_MS;
    const marker = track.querySelector<HTMLElement>("[data-today]");
    if (!marker || isNaN(start)) return;
    if (now < start || now >= end) { marker.hidden = true; return; }
    // Day precision in Turkey time, centred on today.
    const day = Math.floor((now + TR_OFFSET_MS) / DAY_MS) - Math.floor((start + TR_OFFSET_MS) / DAY_MS);
    const total = Math.round((end - start) / DAY_MS);
    marker.style.setProperty("--x", `${((day + 0.5) / total) * 100}%`);
    marker.hidden = false;
    track.dataset.todayReady = "true";
  });
}

function scrollStripToToday() {
  // Phones open the scrollable strip at today, not January (as yearbar.js did).
  document.querySelectorAll<HTMLElement>("[data-strip-scroll]").forEach((sc) => {
    const marker = sc.querySelector<HTMLElement>("[data-today]");
    if (!marker || marker.hidden || sc.scrollWidth <= sc.clientWidth + 1) return;
    const x = marker.offsetLeft;
    sc.scrollLeft = Math.max(0, x - sc.clientWidth / 3);
  });
}

// After a successful submission the strip stops counting at this student (this page only).
let submitted = false;
document.addEventListener("staj:submitted", () => {
  submitted = true;
  const el = document.querySelector<HTMLElement>("[data-deadline-strip]");
  const chip = el?.querySelector<HTMLElement>("[data-chip]");
  const lang = (document.documentElement.lang === "en" ? "en" : "tr") as Lang;
  if (el) el.dataset.phase = "submitted";
  const status = el?.querySelector<HTMLElement>("[data-status]");
  if (status && el) status.textContent = `${ui[lang].flow.submitted} · ${el.dataset.term}`;
  if (chip) chip.hidden = true;   // nothing left to count for this student
});
function tick() {
  if (submitted) { updateToday(Date.now()); return; } const now = Date.now(); updateStrip(now); updateToday(now); }
tick();
scrollStripToToday();
// Minute precision: align to the next minute boundary, then every minute.
setTimeout(() => { tick(); setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000) + 50);
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
