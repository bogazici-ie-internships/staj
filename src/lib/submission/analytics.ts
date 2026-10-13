// Umami events — names, properties and codes are frozen (README → "Custom events").
// Categorical data only: never a name, ID, e-mail or file name.
// window.stajTrack is defined by src/scripts/track.ts (loaded on every page).
declare global { interface Window { stajTrack?: (name: string, data?: Record<string, unknown>) => void } }

export function track(name: "submit_start" | "submit_attempt" | "submit_success" | "submit_error", data: Record<string, unknown>) {
  try { if (typeof window.stajTrack === "function") window.stajTrack(name, data); } catch { /* analytics never breaks the form */ }
}
/** Every way a submission can fail lands in ONE event: submit_error → stage + code (+ doc). */
export function fail(stage: "closed" | "gate" | "validation" | "file" | "upload" | "server", code: string, doc?: string) {
  const data: Record<string, unknown> = { stage, code };
  if (doc) data.doc = doc;
  track("submit_error", data);
}
