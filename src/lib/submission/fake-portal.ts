// FAKE_PORTAL_MARKER — must never appear in a production build (CI greps dist/).
// In-browser stand-in for the Apps Script portal, for local review on a laptop
// or a phone (`npm run dev -- --host`, `npm run build:review`). Nothing leaves
// the browser. Scenarios via the page URL: ?fake=network | error | mismatch | slow | late1 | dup
import { type PortalResponse, type Portal } from "./portal";

const reply = (body: unknown, status = 200): PortalResponse => ({ ok: status < 400, status, json: async () => body });
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("aborted", "AbortError")); });
});

export function fakePortal(campaign: unknown): Portal {
  const scenario = new URLSearchParams(location.search).get("fake") || "";
  let posts = 0;
  console.info("[staj-fake-portal] active — nothing is sent anywhere. scenario:", scenario || "ok");
  return {
    async getContract(signal) {
      await wait(600, signal);
      const c = campaign as Record<string, unknown>;
      return reply({ ok: true, open: true, contract: scenario === "mismatch" ? { ...c, campaignId: "baska-donem" } : c });
    },
    async submit(body, signal) {
      posts++;
      await wait(scenario === "slow" ? 6000 : 1500, signal);
      if (scenario === "network" && posts === 1) throw new TypeError("Failed to fetch");
      if (scenario === "error" && posts === 1) return reply({ ok: false, error: "rapor.pdf geçerli bir PDF değil." });
      // REVIEW-04 Note 1: Code.gs's duplicate-submission guard, word for word; the retry (same request ID) succeeds.
      if (scenario === "dup" && posts === 1) return reply({ ok: false, error: "Az önce bir gönderim aldık; birkaç saniye sonra tekrar deneyin." });
      JSON.parse(body);
      return reply({ ok: true, submissionId: crypto.randomUUID(), submittedAt: new Date().toISOString(),
        lateDays: scenario === "late1" ? 1 : 0 });
    },
  };
}
