// Search palette (REVIEW-02 Note 3, D-126): a native <dialog> with a combobox input and a grouped listbox,
// no framework. Loaded on first open (or on hover/focus of the search button); it fetches the language's index
// (/staj/search/<lang>.json) and builds it in the browser. Keys typed before it was on screen are handed over by
// src/scripts/search.ts (D-89, D-110).
// Keyboard: ↑/↓ move through results (aria-activedescendant), Enter opens, Esc closes; focus returns to the opener.
import { createIndex, search, snippet, type Hit, type Index } from "../lib/search/engine";

interface Strings {
  searchTitle: string; searchPlaceholder: string; searchHint: string; searchLoading: string; searchEmpty: string; searchError: string;
  searchClose: string; searchLabel: string; searchSuggest: string; searchResults: string; searchCount: string; searchNoneHelp: string;
  suggestions: string[];
}
const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
const lang = document.documentElement.lang === "en" ? "en" : "tr";
let indexP: Promise<Index> | null = null;
const loadIndex = () => (indexP ??= fetch(`${base}search/${lang}.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
  .then((j) => createIndex(j.docs)));
export const preload = () => { loadIndex().catch(() => { indexP = null; }); };

let ui: ReturnType<typeof build> | null = null;
let returnTo: HTMLElement | null = null;

function build(s: Strings) {
  const dlg = document.createElement("dialog");
  dlg.className = "srch-dlg";
  dlg.setAttribute("aria-labelledby", "srch-title");
  dlg.innerHTML = `
    <div class="srch">
      <h2 id="srch-title" class="visually-hidden"></h2>
      <div class="srch__field">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <label for="srch-input" class="visually-hidden"></label>
        <input id="srch-input" class="srch__input" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-controls="srch-list" aria-describedby="srch-hint" autocomplete="off" spellcheck="false" lang="${lang}" />
        <button type="button" class="srch__close"></button>
      </div>
      <p id="srch-hint" class="srch__hint" aria-live="polite"></p>
      <div class="srch__results" tabindex="0" role="region" aria-labelledby="srch-title">
        <div class="srch__suggest"><p class="srch__label"></p><div class="srch__chips"></div></div>
        <div id="srch-list" class="srch__list" role="listbox"></div>
        <p class="srch__none" hidden></p>
      </div>
    </div>`;
  const $ = <T extends Element>(sel: string) => dlg.querySelector<T>(sel)!;
  $("#srch-title").textContent = s.searchTitle;
  $("label").textContent = s.searchLabel;
  const input = $<HTMLInputElement>("#srch-input");
  input.placeholder = s.searchPlaceholder;
  $(".srch__close").textContent = s.searchClose;
  $(".srch__label").textContent = s.searchSuggest;
  const list = $<HTMLElement>("#srch-list");
  list.setAttribute("aria-label", s.searchResults);
  const hint = $<HTMLElement>("#srch-hint");
  const suggest = $<HTMLElement>(".srch__suggest");
  const none = $<HTMLElement>(".srch__none");
  // The help text is trusted site copy with one link (page:sss) and the address, already rendered at build time.
  none.innerHTML = s.searchNoneHelp;
  for (const q of s.suggestions) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "srch__chip"; b.textContent = q;
    b.addEventListener("click", () => { input.value = q; run(); input.focus(); });
    $(".srch__chips").append(b);
  }
  document.body.append(dlg);

  let hits: Hit[] = [];
  let active = -1;
  let ready = false;
  const opts = () => [...list.querySelectorAll<HTMLElement>("[role=option]")];
  const setActive = (i: number) => {
    const o = opts();
    if (!o.length) { active = -1; input.removeAttribute("aria-activedescendant"); return; }
    active = (i + o.length) % o.length;
    o.forEach((el, k) => el.setAttribute("aria-selected", String(k === active)));
    input.setAttribute("aria-activedescendant", o[active].id);
    o[active].scrollIntoView({ block: "nearest" });
  };
  const go = (url: string) => {
    const u = new URL(url, location.href);
    if (u.pathname === location.pathname) { dlg.close(); if (u.hash) { location.hash = u.hash; if (u.hash === location.hash) window.dispatchEvent(new HashChangeEvent("hashchange")); } }
    else location.href = u.href;
  };
  const render = (q: string) => {
    list.textContent = "";
    const empty = !q.trim();
    suggest.hidden = !empty;
    none.hidden = empty || hits.length > 0;
    input.setAttribute("aria-expanded", String(hits.length > 0));
    hint.textContent = !ready ? s.searchLoading : empty ? s.searchHint : hits.length ? s.searchCount.replace("{n}", String(hits.length)) : s.searchEmpty;
    // Grouped by page, pages in the order of their best result.
    const groups = new Map<string, Hit[]>();
    for (const h of hits) (groups.get(h.doc.p) ?? groups.set(h.doc.p, []).get(h.doc.p)!).push(h);
    let n = 0, g = 0;
    for (const [page, hs] of groups) {
      const grp = document.createElement("div");
      grp.setAttribute("role", "group"); grp.setAttribute("aria-labelledby", `srch-g${g}`);
      const head = document.createElement("div");
      head.className = "srch__group"; head.id = `srch-g${g++}`; head.setAttribute("role", "presentation"); head.textContent = page;
      grp.append(head);
      for (const h of hs) {
        const o = document.createElement("div");
        o.setAttribute("role", "option"); o.id = `srch-o${n}`; o.className = "srch__item"; o.dataset.url = h.doc.u; o.setAttribute("aria-selected", "false");
        const i = n++;
        const title = h.doc.d ?? h.doc.t;
        o.innerHTML = `<span class="srch__page"></span><span class="srch__title"></span><span class="srch__excerpt">${snippet(h.doc.b || h.doc.t, h.terms)}</span>`;
        (o.querySelector(".srch__page") as HTMLElement).textContent = h.doc.h && h.doc.h !== page ? h.doc.h : "";
        (o.querySelector(".srch__title") as HTMLElement).textContent = title;
        o.addEventListener("click", () => go(h.doc.u));
        o.addEventListener("pointermove", () => { if (active !== i) setActive(i); });
        grp.append(o);
      }
      list.append(grp);
    }
    active = -1; input.removeAttribute("aria-activedescendant");
  };
  let seq = 0;
  const run = () => {
    const q = input.value, mine = ++seq;
    if (!q.trim()) { hits = []; render(q); return; }
    loadIndex().then((idx) => { if (mine !== seq) return; ready = true; hits = search(idx, q, 12); render(q); })
      .catch(() => { hint.textContent = s.searchError; });
  };
  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { const o = opts()[active >= 0 ? active : 0]; if (o) { e.preventDefault(); go(o.dataset.url!); } }
    // A search field would only clear itself on Esc; the palette closes instead.
    else if (e.key === "Escape") { e.preventDefault(); dlg.close(); }
  });
  $(".srch__close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // backdrop
  dlg.addEventListener("close", () => { returnTo?.focus(); });
  loadIndex().then(() => { ready = true; if (dlg.open) run(); }).catch(() => { hint.textContent = s.searchError; });
  return { dlg, input, run };
}

/** Opens the palette. `strings` from the header button; `buffered`: what was typed before it was on screen. */
export function open(trigger: HTMLElement, opener: HTMLElement, buffered: string) {
  ui ??= build(JSON.parse(trigger.dataset.strings || "{}") as Strings);
  returnTo = opener;
  if (!ui.dlg.open) ui.dlg.showModal();
  ui.input.value = buffered;
  ui.input.focus();
  ui.input.setSelectionRange(ui.input.value.length, ui.input.value.length);
  ui.run();
}
