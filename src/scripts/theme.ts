// Theme toggle (System → Light → Dark). The choice persists per browser;
// "System" removes it so the OS (prefers-color-scheme) decides again.
const KEY = "staj-theme";
const order = ["system", "light", "dark"] as const;
type Mode = (typeof order)[number];

function current(): Mode {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}
function apply(mode: Mode) {
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  try { if (mode === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch { /* private mode */ }
  sync();
}
function sync() {
  const mode = current();
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((b) => {
    b.dataset.mode = mode;
    const label = b.dataset[`label${mode[0].toUpperCase()}${mode.slice(1)}` as "labelSystem"] || mode;
    const out = b.querySelector("[data-theme-label]");
    if (out) out.textContent = label;
    b.setAttribute("aria-label", `${b.dataset.prefix}: ${label}`);
  });
}
document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((b) =>
  b.addEventListener("click", () => apply(order[(order.indexOf(current()) + 1) % order.length])));
sync();
