// ⌘K / Ctrl+K and the header button open the search palette (UPDATE-06). Nothing loads with the page.
//  - Hover / focus on the button preloads the palette and its index (intent, D-88; REVIEW-02 Note 3).
//  - Keys typed after ⌘K but before the palette is on screen are buffered (Backspace edits the buffer,
//    Esc cancels) and handed to the search field when it takes focus, so nothing typed is lost.
type SearchState = { buf: string; capturing: boolean; cancelled: boolean };
declare global { interface Window { __stajSearch?: SearchState } }
const st: SearchState = (window.__stajSearch = { buf: "", capturing: false, cancelled: false });
let mod: Promise<typeof import("./search-ui")> | null = null;
const load = () => (mod ??= import("./search-ui"));

function open(ev?: Event) {
  // The header button carries the palette strings; the opener that was used (header or the SSS rail button)
  // gets focus back on close. ⌘K returns focus to the header button.
  const btn = document.querySelector<HTMLElement>("[data-search-open][data-strings]");
  if (!btn) return;
  const opener = ((ev?.target as Element | null)?.closest?.("[data-search-open]") as HTMLElement | null) ?? btn;
  ev?.preventDefault();
  Object.assign(st, { buf: "", capturing: true, cancelled: false });
  // Hand-off in one synchronous step: the buffer becomes the field's value before any further key arrives.
  load().then((m) => { if (st.cancelled) { st.capturing = false; return; } const b = st.buf; Object.assign(st, { buf: "", capturing: false }); m.open(btn, opener, b); });
}
const preload = () => load().then((m) => m.preload()).catch(() => undefined);

document.addEventListener("click", (e) => { if ((e.target as Element).closest?.("[data-search-open]")) open(e); });
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") { open(e); return; }
  // Only real key presses (synthetic re-dispatched keys were once buffered twice, "cummartesi", REVIEW-01).
  if (!st.capturing || !e.isTrusted) return;
  if (e.key === "Escape") { Object.assign(st, { buf: "", capturing: false, cancelled: true }); return; }
  if (e.key === "Backspace") { st.buf = st.buf.slice(0, -1); e.preventDefault(); return; }
  if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { st.buf += e.key; e.preventDefault(); }
}, true);
// Text that arrives without a keydown (IME, on-screen keyboards, characters outside the layout) is buffered
// in the same order, so the hand-off keeps what was typed exactly (REVIEW-01).
document.addEventListener("beforeinput", (e) => {
  if (!st.capturing || !e.isTrusted || e.inputType !== "insertText" || !e.data) return;
  st.buf += e.data; e.preventDefault();
}, true);
for (const type of ["pointerover", "focusin"] as const) {
  document.addEventListener(type, (e) => { if ((e.target as Element).closest?.("[data-search-open]")) preload(); });
}
export {};
