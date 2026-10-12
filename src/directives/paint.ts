// client:paint — hydrate an island only after the browser has reported its first
// contentful paint, then when idle. The server-rendered HTML is complete and
// readable, so nothing visible waits on this JS; it simply stays off the
// critical rendering path instead of racing the first paint. Fallback: 2 s.
// client:paint="eager" (Teslim, UPDATE-03 §4.5): start right after the first paint, without
// waiting for idle, so the flow is live within a frame or two of being visible.
import type { ClientDirective } from "astro";

const paint: ClientDirective = (load, opts) => {
  const eager = opts.value === "eager";
  let started = false;
  const go = () => {
    if (started) return; started = true;
    const run = async () => { const hydrate = await load(); await hydrate(); };
    if (eager) void run();
    else if ("requestIdleCallback" in window) requestIdleCallback(() => void run(), { timeout: 800 });
    else setTimeout(() => void run(), 30);
  };
  try {
    const po = new PerformanceObserver((list) => {
      if (list.getEntries().some((e) => e.name === "first-contentful-paint")) { po.disconnect(); go(); }
    });
    po.observe({ type: "paint", buffered: true });
  } catch { /* no PerformanceObserver: fall through to the timer */ }
  setTimeout(go, 2000);
};
export default paint;
