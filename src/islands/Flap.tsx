// Split-flap cell (UPDATE-02 B1): on the first render after hydration the text
// cycles through random characters and settles left to right, like a station
// board. Plays once per page load; reduced motion → final text immediately.
// No layout shift: the real text keeps its box (transparent while the overlay
// flips) and stays in the accessibility tree; the overlay is aria-hidden.
import { useEffect, useState } from "react";

const POOL = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789";
let played = false;                       // once per page load, shared by all cells
export const flapsEnabled = () =>
  typeof window !== "undefined" && !played && !matchMedia("(prefers-reduced-motion: reduce)").matches;
export const markFlapsPlayed = () => { played = true; };

export function Flap({ text, delay = 0, duration = 420, run }: { text: string; delay?: number; duration?: number; run: boolean }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!run) return;
    const start = performance.now() + delay;
    let raf = 0;
    const step = (now: number) => {
      const t = (now - start) / duration;
      if (t < 0) { setShown(scramble(text, 0)); raf = requestAnimationFrame(step); return; }
      if (t >= 1) { setShown(null); return; }
      setShown(scramble(text, Math.floor(t * text.length)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, text, delay, duration]);
  if (shown == null) return <>{text}</>;
  return (
    <span className="flap">
      <span className="flap__real">{text}</span>
      <span className="flap__fx" aria-hidden="true">{shown}</span>
    </span>
  );
}

function scramble(text: string, settled: number) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += i < settled || /[\s.:·—–\-/()]/.test(c) ? c : POOL[(Math.random() * POOL.length) | 0];
  }
  return out;
}
