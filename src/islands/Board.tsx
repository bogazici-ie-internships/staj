// Departure board (DESIGN.md §3.2): DD/HH/MM countdown + Tarih · Olay · Durum rows.
// Server render shows placeholders ("––") and the absolute dates; the live
// state starts in an effect, so static HTML never freezes "now" at build time.
// Digits roll with NumberFlow (respects prefers-reduced-motion).
import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import { left, phaseAt, type PhaseName } from "../lib/phase";
import { Flap, flapsEnabled, markFlapsPlayed } from "./Flap";

export interface BoardRow { date: string; dateTime?: string; event: string; kind: "deadline" | "lateClose" | "info"; info?: string; detail?: string }
export interface BoardText {
  caption: string; captionLate: string; closed: string; unlocked: string; zone: string; label: string;
  units: { d: string; h: string; m: string }; cols: { date: string; event: string; status: string };
  status: { open: string; passed: string; late: string; closed: string };
}
// `part` (REVIEW-01 answer 4, D-121): on phones the hero keeps only the head (countdown + deadline line) and a
// second instance with part="rows" shows the dated rows and their details right below the hero (CSS, ≤ 600 px).
// `notes` (REVIEW-06 Note 3): the hero renders the row details itself, after "Belgeleri gönder", so the button stays on
// the first screen at 1440 × 900; the phone rows instance keeps them.
interface Props { deadlineMs: number | null; graceDays: number; rows: BoardRow[]; text: BoardText; part?: "all" | "rows"; deadlineLine?: string; notes?: boolean }

export default function Board({ deadlineMs, graceDays, rows, text, part = "all", deadlineLine, notes = true }: Props) {
  const [now, setNow] = useState<number | null>(null);
  // Split-flap entrance: decided once at hydration; rows stagger 90 ms apart, all settled < 900 ms.
  const [flip, setFlip] = useState(false);
  const [digitsLive, setDigitsLive] = useState(false);
  useEffect(() => {
    const on = flapsEnabled();
    markFlapsPlayed();
    setFlip(on);
    const t = setTimeout(() => setDigitsLive(true), on ? 520 : 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    setNow(Date.now());
    let iv: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => { setNow(Date.now()); iv = setInterval(() => setNow(Date.now()), 60_000); }, 60_000 - (Date.now() % 60_000) + 50);
    const vis = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(align); if (iv) clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const phase: PhaseName | "unknown" = now == null ? "unknown" : phaseAt(now, deadlineMs, graceDays).name;
  const p = now == null ? null : phaseAt(now, deadlineMs, graceDays);
  const target = p?.name === "open" ? p.deadlineMs : p?.name === "late" ? p.closesMs : null;
  const l = now != null && target != null ? left(now, target) : null;
  const caption = phase === "late" ? text.captionLate : text.caption;

  const rowStatus = (r: BoardRow) => {
    if (r.kind === "deadline") {
      if (phase === "open") return { cls: "chip chip--signal", label: text.status.open, live: true };
      if (phase === "late" || phase === "closed") return { cls: "chip chip--quiet", label: text.status.passed, live: false };
    }
    if (r.kind === "lateClose") {
      if (phase === "late") return { cls: "chip chip--signal", label: text.status.late, live: true };
      if (phase === "closed") return { cls: "chip chip--quiet", label: text.status.closed, live: false };
    }
    return { cls: "chip chip--quiet", label: r.info ?? "", live: false };
  };

  const digit = (v: number | undefined, unit: string, signal = false) => (
    <div className="board__unit">
      <span className={`board__num${signal ? " board__num--signal" : ""}`}>
        {v == null ? "––" : digitsLive ? <NumberFlow value={v} format={{ minimumIntegerDigits: 2 }} willChange trend={-1} />
          : <Flap text={String(v).padStart(2, "0")} run={flip} duration={480} />}
      </span>
      <span className="board__unit-label">{unit}</span>
    </div>
  );

  return (
    <div className={`board${part === "rows" ? " board--rows" : ""}`} data-phase={phase}>
      {part === "all" && (<>
      <div className="board__head">
          <div className="board__caption"><span>{phase === "closed" ? text.closed : deadlineMs == null ? text.unlocked : caption}</span><span>{text.zone}</span></div>
          {phase !== "closed" && deadlineMs != null && (
            // The live digits are visual; the accessible truth is the dated rows below
            // and the strip. aria-hidden keeps screen readers from a ticking number.
            <div className="board__digits" aria-hidden="true">
              {digit(l?.d, text.units.d, true)}
              {digit(l?.h, text.units.h)}
              {digit(l?.m, text.units.m)}
            </div>
          )}
          {deadlineLine && <p className="board__when">{deadlineLine}</p>}
        </div>
      </>)}
      <div className="board__rows">
      <table className="board__table">
        <caption className="visually-hidden">{text.label}</caption>
        <thead><tr><th scope="col">{text.cols.date}</th><th scope="col">{text.cols.event}</th><th scope="col">{text.cols.status}</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const s = rowStatus(r);
            const d = 60 + i * 70;
            return (
              <tr key={r.event} className={s.live ? "is-live" : undefined}>
                <td className="board__date">{r.dateTime ? <time dateTime={r.dateTime}><Flap text={r.date} run={flip} delay={d} /></time> : <Flap text={r.date} run={flip} delay={d} />}</td>
                <th scope="row" className="board__event">
                  <Flap text={r.event} run={flip} delay={d + 30} duration={440} />
                </th>
                <td>{s.label ? <span className={s.cls}><Flap text={s.label} run={flip && phase !== "unknown"} delay={d + 80} duration={300} /></span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* REVIEW-01 Note 3 (D-113): the row details are shown directly (they were popovers behind each event). */}
      {notes && <dl className="board__notes">
        {rows.filter((r) => r.detail).map((r) => <div key={r.event}><dt>{r.event}</dt><dd>{r.detail}</dd></div>)}
      </dl>}
      </div>
    </div>
  );
}
