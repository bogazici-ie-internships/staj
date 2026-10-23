// Teslim — ONE submission in five client-side screens (DESIGN.md §6):
//   hazirlik → kimlik → belgeler → kontrol → makbuz   (+ closed)
// The network/analytics contract is frozen (src/lib/submission/contract.ts,
// golden-tested in tests/e2e/contract.spec.ts). Behaviour carried over from
// docs/assets/submit.js: phase re-checked every 30 s and at submit, requestId
// reused for a retry of the same submission and renewed after any change,
// contract cache in sessionStorage (10 min), 15 s / 180 s timeouts, receipt
// time and lateness from the server only, beforeunload only while sending.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Button, Checkbox, DropZone, FieldError, FileTrigger, Input, Label, Meter, ProgressBar, Text, TextField,
} from "react-aria-components";
import { ui, formatSize } from "../../i18n/ui";
import { longDateTime, trClock, trNumDate, type Lang } from "../../lib/dates";
import { md } from "../../lib/inline-md";
import { pagePath } from "../../lib/paths";
import { left, leftText, phaseAt, type Phase } from "../../lib/phase";
import { fail, track } from "../../lib/submission/analytics";
import {
  CONTRACT_CACHE_TTL_MS, CONTRACT_TIMEOUT_MS, MAX_MB, MAX_TOTAL_MB, MB, UPLOAD_TIMEOUT_MS,
  buildPayload, checkEmail, checkFile, checkName, checkSid, contractCacheKey, createRequestId, isNetworkError,
  DEDUP_SEC, requiredDocs, sameContract, serverCode, serverError, serverVars, titleCaseName,
  type Campaign, type ServerError, type ServerTextKey, type DocKey, type Flags, type SitFlag, type ValidationCode,
} from "../../lib/submission/contract";
import { portalFor, type Portal } from "../../lib/submission/portal";
import type { Preview } from "../../lib/pdf-preview";
import SAMPLE from "../../lib/submission/sample.json";

/** ?preview= screens for review (REVIEW-03 Note 3, D-136; the modes are listed in tests/states/states.ts):
 *  localhost in every build (tests, screenshots); on review builds (fake portal) also from a private LAN address,
 *  so the states open on a phone. On the live host: never. */
const LAN = /^(10\.\d+|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+$|\.local$/;
function previewParam(): string | null {
  const h = location.hostname;
  const ok = /^(localhost|127\.0\.0\.1)$/.test(h) || (import.meta.env.PUBLIC_PORTAL_MODE === "fake" && LAN.test(h));
  return ok ? new URLSearchParams(location.search).get("preview") : null;
}
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/set";
import { clearDraft, loadDraft, saveDraft, type Draft } from "../../lib/submission/draft";

// Document-type icons (D-44): always beside the document name, never instead of it.
const DOC_ICON: Record<DocKey, IconName> = { rapor: "book-open-text", sicil: "stamp", anketi: "clipboard-list", cumartesi: "calendar-days", dekont: "receipt", ek1: "shield-check" };

type L2 = string;
export interface TeslimText {
  docs: Record<DocKey, L2>;
  situations: Record<SitFlag, { label: L2; hint: L2; when: L2 }>;
  prep: { eyebrow: L2; title: L2; lead: L2; deadline: L2; lateRule: L2; required: L2; situational: L2; multiple: L2; limits: L2;
    exceptionsTitle: L2; exceptions: L2[]; ek1Note: L2; start: L2; forms: L2;
  };
  steps: L2[]; stepOf: L2; back: L2; next: L2;
  identity: Record<string, L2>;
  documents: Record<string, L2>;
  review: { title: L2; you: L2; situations: L2; none: L2; files: L2; change: L2; declaration: L2; submit: L2; captcha: L2 };
  receipt: { title: L2; reference: L2; referenceHint: L2; received: L2; term: L2; status: L2; onTime: L2; docs: L2;
    download: L2; downloadHint: L2; nextTitle: L2; next: L2[]; ek1: L2; print: L2; zone: L2; printFoot: L2 };
  recovery: { found: L2; restore: L2; discard: L2; notice: L2; discarded: L2 };
  serverErrors: Record<ServerTextKey, L2>;
}
interface Props {
  lang: Lang; text: TeslimText; campaign: Campaign; portalUrl: string; recaptchaSiteKey: string;
  termDisplay: string; deadlineMs: number | null; graceDays: number;
}

type Step = "hazirlik" | "kimlik" | "belgeler" | "kontrol" | "makbuz" | "closed";
type Contract = "checking" | "ready" | "failed";
interface Picked { file: File; preview?: Preview | null }
interface Receipt { submissionId: string; at: number | null; lateDays: number | null; keys: DocKey[]; files: Record<string, File | { name: string; size: number }> }
type Upload = { stage: "idle" } | { stage: "preparing"; n: number; total: number } | { stage: "sending"; total: number } | { stage: "error"; message: string; network: boolean; html?: string; waitUntil?: number };

const SIT_FLAGS: SitFlag[] = ["saturday", "reimbursement"];
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const Html = ({ html, as: As = "span", ...rest }: { html: string; as?: "span" | "p" | "li" | "div"; [k: string]: unknown }) =>
  <As {...rest} dangerouslySetInnerHTML={{ __html: html }} />;

function readB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Submission(props: Props) {
  const { lang, text, campaign, portalUrl, recaptchaSiteKey, termDisplay, deadlineMs, graceDays } = props;
  const F = ui[lang].flow;
  const M = (s: string, v: Record<string, string | number> = {}) => md(s, lang, v);
  // REVIEW-04 Note 1 (D-137): a known server refusal in the site's own words (teslim.yaml › serverErrors); the
  // duplicate-submission guard also locks "Tekrar dene" for DEDUP_SEC seconds (D-138).
  const serverFailure = (se: ServerError): Upload => {
    const vars = serverVars(se, se.doc ? text.docs[se.doc as DocKey] : undefined);
    const src = text.serverErrors[se.key];
    return { stage: "error", network: false, message: src, html: src.split(/\n\n+/).map((x) => `<p>${M(x, vars)}</p>`).join(""),
      waitUntil: se.key === "rate_limited" ? Date.now() + DEDUP_SEC * 1000 : undefined };
  };

  // --- clock / phase ----------------------------------------------------------
  const [now, setNow] = useState<number | null>(null);
  const phase: Phase | null = now == null ? null : phaseAt(now, deadlineMs, graceDays);
  const isLate = phase?.name === "late";
  const deadlineText = deadlineMs != null ? longDateTime(lang, deadlineMs) : "";
  const closesText = deadlineMs != null ? longDateTime(lang, deadlineMs + graceDays * 86_400_000) : "";
  // D-181 (RELEASE-CHECK R-08): the connection-error advice names the late window's end once the deadline has passed.
  const networkMsg = () => (phaseAt(Date.now(), deadlineMs, graceDays).name === "late" ? F.errNetworkLate(closesText) : F.errNetwork);

  // --- state ------------------------------------------------------------------
  const [step, setStepState] = useState<Step>("hazirlik");
  const [name, setName] = useState(""); const [sid, setSid] = useState(""); const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [flags, setFlags] = useState<Flags>({ saturday: false, reimbursement: false });
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [summary, setSummary] = useState<{ id: string; msg: string }[]>([]);
  const [picked, setPicked] = useState<Partial<Record<DocKey, Picked>>>({});
  const [slotErr, setSlotErr] = useState<Partial<Record<DocKey, { msg: string; fix?: string }>>>({});
  const [contract, setContract] = useState<Contract>("checking");
  const [gate, setGate] = useState<{ msg: string; retry: boolean } | null>(null);
  const [upload, setUpload] = useState<Upload>({ stage: "idle" });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [announce, setAnnounce] = useState("");
  // "Bu form size uygun mu?" (UPDATE-02 A3): optional answers that surface the e-mail routes.
  // UPDATE-03 §4.5: the server HTML must not look usable before React is attached. Until the first
  // effect runs, the flow is inert (no focus, no clicks) and its controls are drawn disabled (teslim.css).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Teslim kurtarma (UPDATE-06 Phase 2b, D-91): an unfinished flow saved on this device.
  const [draft, setDraft] = useState<Draft | null>(null);
  const previewMode = useRef(false);
  const formKey = useRef("");
  const portal = useRef<Portal | null>(null);
  const requestId = useRef(""); const dirty = useRef(false);
  const started = useRef(false); const closedTracked = useRef(false);
  const uploading = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const markChanged = () => { dirty.current = true; };

  const goto = useCallback((s: Step, push = true) => {
    setStepState(s);
    setSummary([]);
    if (push && typeof history !== "undefined") history.pushState({ sufStep: s }, "");
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      document.getElementById("sufForm")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }, []);

  // Back/forward buttons move between screens without changing the URL (no extra Umami pageviews).
  useEffect(() => {
    history.replaceState({ sufStep: "hazirlik" }, "");
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.sufStep as Step | undefined) ?? "hazirlik";
      if (uploading.current || receipt) return;
      if (["hazirlik", "kimlik", "belgeler", "kontrol"].includes(s)) goto(s, false);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [goto, receipt]);

  // Clock: now on mount, every 30 s (as submit.js), and when the tab comes back.
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    const vis = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => {
    if (phase?.name === "closed" && !uploading.current && step !== "makbuz" && step !== "closed") {
      setStepState("closed");
      if (!closedTracked.current) { closedTracked.current = true; fail("closed", "closed"); }
    }
  }, [phase?.name, step]);

  // Mirror the contract state on the wrapper (tests and CSS read it).
  useEffect(() => { const w = document.getElementById("sufForm"); if (w) w.dataset.contract = contract; }, [contract]);
  // The page header and the troubleshooting list step aside on the receipt (CSS reads data-step),
  // and the deadline strip stops counting at a student who has just submitted.
  useEffect(() => {
    const w = document.getElementById("sufForm"); if (w) w.dataset.step = step;
    if (step === "makbuz") document.dispatchEvent(new CustomEvent("staj:submitted"));
  }, [step]);
  // Elapsed seconds while the single upload request is on its way (honest, not a fake percentage).
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (upload.stage !== "sending") { setElapsed(0); return; }
    const t0 = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [upload.stage]);
  const sending = upload.stage === "preparing" || upload.stage === "sending";
  // Retry countdown after the duplicate-submission guard: "Tekrar dene (3)" → "Tekrar dene" (D-138).
  const waitUntil = upload.stage === "error" ? upload.waitUntil : undefined;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!waitUntil) return;
    const iv = setInterval(() => { setTick((t) => t + 1); if (Date.now() >= waitUntil) clearInterval(iv); }, 250);
    return () => clearInterval(iv);
  }, [waitUntil]);
  const waitLeft = waitUntil ? Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000)) : 0;

  // --- contract gate ------------------------------------------------------------
  const contractFailure = useCallback((msg: string, retry: boolean) => {
    fail("gate", msg === F.gateMismatch ? "mismatch" : msg === F.gateUnreachable ? "unreachable" : "unavailable");
    setContract("failed"); setGate({ msg, retry });
    try { sessionStorage.removeItem(contractCacheKey(campaign)); } catch { /* */ }
  }, [F, campaign]);

  const checking = useRef(false);
  const checkContract = useCallback(async () => {
    if (checking.current || !portal.current) return;
    checking.current = true;
    setGate(null);
    setContract((c) => (c === "ready" ? c : "checking"));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONTRACT_TIMEOUT_MS);
    try {
      const res = await portal.current.getContract(ctrl.signal);
      if (!res.ok) throw new Error(F.errServer(res.status));
      const remote = await res.json();
      clearTimeout(timer);
      if (!sameContract(remote, campaign)) { contractFailure(F.gateMismatch, true); return; }
      setContract("ready");
      try { sessionStorage.setItem(contractCacheKey(campaign), JSON.stringify({ checkedAt: Date.now(), response: remote })); } catch { /* */ }
    } catch {
      clearTimeout(timer);
      contractFailure(F.gateUnreachable, true);
    } finally { checking.current = false; }
  }, [F, campaign, contractFailure]);

  useEffect(() => {
    formKey.current = document.getElementById("sufForm")?.dataset.formKey || "";
    const closedNow = phaseAt(Date.now(), deadlineMs, graceDays).name === "closed";
    // Previews of later screens for review (tests/states/states.ts): localhost, or a LAN address on review builds.
    // Closed: only a receipt can still be on screen (as when the period ends after submitting); every other
    // step falls through to the closed screen, exactly as the live flow does.
    const preview = previewParam();
    if (preview) { if (!closedNow || preview === "done") runPreview(preview); return; }
    if (closedNow) return;
    if (!portalUrl || !formKey.current) { contractFailure(F.unavailable, false); return; }
    let cancelled = false;
    (async () => {
      portal.current = await portalFor(portalUrl, campaign);
      if (cancelled) return;
      try {
        const raw = sessionStorage.getItem(contractCacheKey(campaign));
        const cached = raw ? JSON.parse(raw) : null;
        if (cached && Date.now() - Number(cached.checkedAt) <= CONTRACT_CACHE_TTL_MS && sameContract(cached.response, campaign)) setContract("ready");
        else if (raw) sessionStorage.removeItem(contractCacheKey(campaign));
      } catch { /* */ }
      if (recaptchaSiteKey && !document.getElementById("suf-recaptcha-script")) {
        const s = document.createElement("script");
        s.id = "suf-recaptcha-script"; s.async = true; s.defer = true;
        s.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(recaptchaSiteKey);
        s.onerror = () => setUpload({ stage: "error", message: F.errCaptchaLoad, network: false });
        document.head.appendChild(s);
      }
      checkContract();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teslim kurtarma: offer an unfinished flow saved on this device (not in the local preview mode).
  useEffect(() => {
    previewMode.current = previewParam() !== null;
    if (previewMode.current || phaseAt(Date.now(), deadlineMs, graceDays).name === "closed") return;
    loadDraft(campaign.campaignId).then((d) => { if (d) setDraft(d); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ...and keep the current one while the student works (after "Başla", until the receipt).
  useEffect(() => {
    if (previewMode.current || receipt || !["kimlik", "belgeler", "kontrol"].includes(step)) return;
    const id = setTimeout(() => {
      const files = Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, v!.file]));
      saveDraft({ campaignId: campaign.campaignId, savedAt: Date.now(), name, sid, email, flags, files });
    }, 400);
    return () => clearTimeout(id);
  }, [name, sid, email, flags, picked, step, receipt, campaign.campaignId]);

  // Warn before leaving ONLY while files are on their way (duplicate-submission guard).
  useEffect(() => {
    const h = (ev: BeforeUnloadEvent) => { if (!uploading.current) return; ev.preventDefault(); ev.returnValue = ""; return ""; };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, []);

  // A file dropped next to a slot must not navigate the tab to the PDF.
  useEffect(() => {
    const h = (ev: DragEvent) => { if (!(ev.target as Element)?.closest?.("[data-slot]")) ev.preventDefault(); };
    document.addEventListener("dragover", h); document.addEventListener("drop", h);
    return () => { document.removeEventListener("dragover", h); document.removeEventListener("drop", h); };
  }, []);

  // --- derived ----------------------------------------------------------------
  const slots = useMemo(() => requiredDocs(flags), [flags]);
  const sentKeys = slots.map((s) => s.key).filter((k) => picked[k]);
  const totalBytes = sentKeys.reduce((a, k) => a + picked[k]!.file.size, 0);
  const totalMb = totalBytes / MB;

  // --- validation per screen ----------------------------------------------------
  function showProblems(list: { id: string; msg: string; code: ValidationCode }[]) {
    fail("validation", list[0].code);
    setSummary(list.map(({ id, msg }) => ({ id, msg })));
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function identityProblems(lateNow: boolean) {
    const out: { id: string; msg: string; code: ValidationCode }[] = [];
    const e: Record<string, string> = {};
    if (checkName(name)) { e.name = F.errName; out.push({ id: "suf-name", msg: F.errName, code: "required_fields" }); }
    const s = checkSid(sid);
    if (s) { const m = s === "required_fields" ? F.errSidRequired : F.errSid; e.sid = m; out.push({ id: "suf-sid", msg: m, code: s }); }
    const em = checkEmail(email);
    if (em) { const m = em === "required_fields" ? F.errEmailRequired : em === "email_invalid" ? F.errEmailInvalid : F.errEmailDomain; e.email = m; out.push({ id: "suf-email", msg: m, code: em }); }
    if (lateNow && !ack) { e.ack = F.errAck; out.push({ id: "suf-ack", msg: F.errAck, code: "late_ack" }); }
    setErrors(e);
    return out;
  }

  function nextFromIdentity() {
    const p = phaseAt(Date.now(), deadlineMs, graceDays); setNow(Date.now());
    const problems = identityProblems(p.name === "late");
    if (problems.length) return showProblems(problems);
    goto("belgeler");
  }

  function documentProblems() {
    const out: { id: string; msg: string; code: ValidationCode }[] = [];
    const se: Partial<Record<DocKey, { msg: string; fix?: string }>> = { ...slotErr };
    for (const s of slots) {
      if (!picked[s.key]) {
        se[s.key] = { msg: F.errFileMissing };
        out.push({ id: `suf-slot-${s.key}`, msg: `${text.docs[s.key]}: ${F.errFileMissing}`, code: s.situational ? "missing_situational" : "missing_required" });
      }
    }
    setSlotErr(se);
    return out;
  }
  function nextFromDocuments() {
    const problems = documentProblems();
    if (problems.length) return showProblems(problems);
    if (totalBytes > MAX_TOTAL_MB * MB) return showProblems([{ id: "suf-total", msg: F.errTotal(MAX_TOTAL_MB), code: "total_size" }]);
    goto("kontrol");
  }

  // --- recovery ---------------------------------------------------------------
  async function restoreDraft() {
    const d = draft; if (!d) return;
    setDraft(null);
    setName(d.name); setSid(d.sid); setEmail(d.email); setFlags(d.flags);
    goto("kimlik");
    // Files go through the normal checks again (PDF signature, size, preview).
    for (const [k, f] of Object.entries(d.files)) if (f) await choose(k as DocKey, f);
  }
  function discardDraft() {
    clearDraft();
    setDraft(null);
    setName(""); setSid(""); setEmail(""); setFlags({ saturday: false, reimbursement: false }); setPicked({}); setSlotErr({}); setErrors({});
    setAnnounce(text.recovery.discarded);
    if (step !== "hazirlik") goto("hazirlik");
  }

  // --- files ------------------------------------------------------------------
  async function choose(key: DocKey, file: File | undefined) {
    if (!file || uploading.current) return;
    const res = await checkFile(key, file);
    if (res !== "ok") {
      fail("file", res, key);
      setPicked((p) => { if (p[key]) markChanged(); const n = { ...p }; delete n[key]; return n; });
      setSlotErr((e) => ({ ...e, [key]: res === "not_pdf"
        ? { msg: F.errNotPdf(file.name), fix: F.fixNotPdf }
        : { msg: F.errTooLarge(file.name, MAX_MB[key]), fix: F.fixTooLarge } }));
      return;
    }
    if (!started.current) { started.current = true; track("submit_start", { term: campaign.term, late: phaseAt(Date.now(), deadlineMs, graceDays).name === "late" }); }
    markChanged();
    setPicked((p) => ({ ...p, [key]: { file } }));
    setSlotErr((e) => { const n = { ...e }; delete n[key]; return n; });
    setSummary((s) => s.filter((x) => x.id !== `suf-slot-${key}`));
    setAnnounce(F.added(text.docs[key]));
    import("../../lib/pdf-preview").then(({ previewPdf }) => previewPdf(file)).then((preview) =>
      setPicked((p) => (p[key]?.file === file ? { ...p, [key]: { file, preview } } : p)));
  }
  function removeFile(key: DocKey) {
    setPicked((p) => { if (p[key]) markChanged(); const n = { ...p }; delete n[key]; return n; });
    setAnnounce(F.removed(text.docs[key]));
  }
  function toggleFlag(f: SitFlag, on: boolean) {
    markChanged();
    setFlags((x) => ({ ...x, [f]: on }));
    // Un-ticking a situation drops its files from the submission (as submit.js clearKey).
    if (!on) setPicked((p) => { const n = { ...p }; for (const k of requiredDocs({ saturday: f === "saturday", reimbursement: f === "reimbursement" })) if (k.situational) delete n[k.key]; return n; });
  }

  // --- submit -----------------------------------------------------------------
  function getRecaptchaToken(): Promise<string> {
    if (!recaptchaSiteKey) return Promise.resolve("");
    const g = (window as unknown as { grecaptcha?: { ready: (f: () => void) => void; execute: (k: string, o: object) => Promise<string> } }).grecaptcha;
    if (!g || typeof g.execute !== "function") return Promise.reject(new Error(F.errCaptchaLoad));
    return new Promise((resolve, reject) => g.ready(() => g.execute(recaptchaSiteKey, { action: "submit" }).then(resolve, () => reject(new Error(F.errCaptcha)))));
  }

  async function submit() {
    if (uploading.current) return;   // no double submit
    const t0 = Date.now();
    const p = phaseAt(t0, deadlineMs, graceDays); setNow(t0);
    const block = (code: ValidationCode, message: string) => { fail("validation", code); setUpload({ stage: "error", message, network: false }); };
    if (p.name === "closed") { block("closed", F.errClosed); return; }
    if (p.name === "late" && !ack) { setErrors((e) => ({ ...e, ack: F.errAck })); showProblems([{ id: "suf-ack", msg: F.errAck, code: "late_ack" }]); return; }
    if (!portalUrl || !formKey.current) { block("unavailable", F.unavailable); return; }
    if (contract !== "ready") { block("not_verified", F.errNotVerified); return; }
    if (hp) { fail("validation", "honeypot"); return; }
    if (totalBytes > MAX_TOTAL_MB * MB) { block("total_size", F.errTotal(MAX_TOTAL_MB)); return; }
    if (!requestId.current || dirty.current) { requestId.current = createRequestId(); dirty.current = false; }
    if (!requestId.current) { block("request_id", F.errRequestId); return; }

    const keys = sentKeys.slice();
    uploading.current = true;
    setUpload({ stage: "preparing", n: 0, total: keys.length });
    track("submit_attempt", { files: keys.length, total_mb: Math.round(totalBytes / MB) });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const tokenP = getRecaptchaToken();
      const b64: string[] = [];
      for (let i = 0; i < keys.length; i++) {
        setUpload({ stage: "preparing", n: i + 1, total: keys.length });
        b64.push(await readB64(picked[keys[i]]!.file));
      }
      const recaptchaToken = await tokenP;
      const files: Partial<Record<DocKey, { filename: string; dataB64: string }>> = {};
      keys.forEach((k, i) => { files[k] = { filename: picked[k]!.file.name, dataB64: b64[i] }; });
      const payload = buildPayload({ formKey: formKey.current, campaign, requestId: requestId.current, recaptchaToken,
        name, studentId: sid, email, flags, hp, files });
      setUpload({ stage: "sending", total: keys.length });
      const res = await portal.current!.submit(JSON.stringify(payload), ctrl.signal);
      clearTimeout(timer);
      if (!res.ok) throw Object.assign(new Error(F.errServer(res.status)), { trackReason: `http_${res.status}` });
      let out: { ok?: boolean; error?: string; submissionId?: string; submittedAt?: string; lateDays?: number };
      try { out = (await res.json()) as typeof out; } catch { throw Object.assign(new Error(F.errUnexpected), { trackReason: "bad_json" }); }
      if (!out || out.ok !== true) {
        const sc = serverCode(out?.error);
        throw Object.assign(new Error(out?.error || F.errUnverified), { trackStage: "server", trackReason: sc.code, trackDoc: sc.doc, serverErr: serverError(out?.error) });
      }
      uploading.current = false;
      clearDraft(); // submitted: nothing is kept on this device any more
      track("submit_success", { seconds: Math.round((Date.now() - t0) / 1000), late_days: typeof out.lateDays === "number" ? out.lateDays : p.daysLate });
      const at = out.submittedAt ? Date.parse(out.submittedAt) : NaN;
      setReceipt({ submissionId: out.submissionId || "", at: isNaN(at) ? null : at, lateDays: typeof out.lateDays === "number" ? out.lateDays : null,
        keys, files: Object.fromEntries(keys.map((k) => [k, picked[k]!.file])) });
      setUpload({ stage: "idle" });
      goto("makbuz", false);
      history.replaceState({ sufStep: "makbuz" }, "");
    } catch (err) {
      clearTimeout(timer);
      uploading.current = false;
      const e = err as Error & { trackReason?: string; trackStage?: string; trackDoc?: string };
      const m = String(e?.message || e);
      const reason = e?.trackReason || (e?.name === "AbortError" ? "timeout" : m === F.errCaptcha || m === F.errCaptchaLoad ? "captcha" : isNetworkError(e) ? "network" : "other");
      fail((e?.trackStage as "server") || "upload", reason, e?.trackDoc);
      const network = isNetworkError(e);
      const se = (e as { serverErr?: ServerError | null })?.serverErr;
      setUpload(se ? serverFailure(se) : { stage: "error", message: network ? networkMsg() : F.errFailed(m), network });
      requestAnimationFrame(() => document.getElementById("suf-msg")?.focus());
    }
  }

  // --- previews (review screenshots, D-136): see PREVIEW_MODES ---------------------------------------
  function runPreview(mode: string) {
    setContract("ready");
    setName(SAMPLE.name); setSid(SAMPLE.sid); setEmail(SAMPLE.email);
    const fake = (n: string, kb: number) => new File([new Uint8Array(kb * 1024)], n, { type: "application/pdf" });
    const sample = { rapor: fake(SAMPLE.reportFile, 2400), sicil: fake("Staj_Sicil_Formu.pdf", 640), anketi: fake("Ogrenci_Staj_Anketi.pdf", 210), cumartesi: fake("Cumartesi_Yazisi.pdf", 120) };
    const lateNow = phaseAt(Date.now(), deadlineMs, graceDays).name === "late";
    if (lateNow) setAck(true);
    if (mode === "hazirlik") return;
    if (mode === "kurtarma") {
      setDraft({ campaignId: campaign.campaignId, savedAt: Date.now() - 2 * 3_600_000, name: SAMPLE.name, sid: SAMPLE.sid, email: SAMPLE.email, flags: { saturday: true, reimbursement: false }, files: sample });
      return;
    }
    if (mode === "kimlik") { setStepState("kimlik"); return; }
    if (mode === "kimlik-hata") {
      setName(""); setSid("2099"); setEmail(SAMPLE.emailOther);
      const list = [{ id: "suf-name", msg: F.errName }, { id: "suf-sid", msg: F.errSid }, { id: "suf-email", msg: F.errEmailDomain }];
      if (lateNow) { setAck(false); list.push({ id: "suf-ack", msg: F.errAck }); }
      setErrors(Object.fromEntries(list.map((x) => [x.id.replace("suf-", ""), x.msg])));
      setStepState("kimlik"); setSummary(list);
      return;
    }
    if (mode === "sozlesme") { setStepState("kimlik"); setContract("failed"); setGate({ msg: F.gateMismatch, retry: true }); return; }
    setFlags({ saturday: true, reimbursement: false });
    if (mode === "belgeler-bos") { setStepState("belgeler"); return; }
    if (mode === "belgeler") { setPicked({ rapor: { file: sample.rapor }, sicil: { file: sample.sicil } }); setSlotErr({ anketi: { msg: F.errNotPdf("anket.docx"), fix: F.fixNotPdf } }); setStepState("belgeler"); return; }
    if (mode === "belgeler-dosyalar") {
      import("../../lib/submission/sample-pdf").then(({ samplePdf }) => {
        const real = { rapor: samplePdf(SAMPLE.reportFile, "Staj Raporu", 2400, 18), sicil: samplePdf("Staj_Sicil_Formu.pdf", "Staj Sicil Formu", 640, 2),
          anketi: samplePdf("Ogrenci_Staj_Anketi.pdf", "Ogrenci Staj Anketi", 210, 1), cumartesi: samplePdf("Cumartesi_Yazisi.pdf", "Cumartesi Yazisi", 120, 1) };
        setPicked(Object.fromEntries(Object.entries(real).map(([k, f]) => [k, { file: f }])));
        for (const [k, f] of Object.entries(real)) import("../../lib/pdf-preview").then(({ previewPdf }) => previewPdf(f)).then((preview) =>
          setPicked((p) => (p[k as DocKey]?.file === f ? { ...p, [k]: { file: f, preview } } : p)));
        setStepState("belgeler");
      });
      return;
    }
    setPicked(Object.fromEntries(Object.entries(sample).map(([k, f]) => [k, { file: f }])));
    if (mode === "kontrol") { setStepState("kontrol"); return; }
    if (mode === "fail") { setStepState("kontrol"); setUpload({ stage: "error", message: networkMsg(), network: true }); return; }
    if (mode === "red") { setStepState("kontrol"); setUpload(serverFailure(serverError("Az önce bir gönderim aldık; birkaç saniye sonra tekrar deneyin.")!)); return; }
    if (mode === "sending") { setStepState("kontrol"); setUpload({ stage: "preparing", n: 2, total: 4 }); return; }
    if (mode === "done") {
      const late = Number(new URLSearchParams(location.search).get("late")) || (lateNow ? phaseAt(Date.now(), deadlineMs, graceDays).daysLate : 0);
      setReceipt({ submissionId: "3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f", at: Date.now(), lateDays: late, keys: Object.keys(sample) as DocKey[], files: sample });
      setStepState("makbuz");
    }
  }

  // --- render -----------------------------------------------------------------
  const stepIndex = { kimlik: 1, belgeler: 2, kontrol: 3 }[step as "kimlik"] ?? 0;

  const lateBanner = isLate && phase && (
    <div className="suf-late" id="suf-late" role="status">
      <p className="suf-late__head" id="suf-late-head"><Icon name="triangle-alert" size={18} />{F.lateHead(phase.daysLate)}</p>
      <p id="suf-late-text">{F.lateText(deadlineText, phase.daysLate, closesText)}</p>
      <Checkbox className="suf-check" isSelected={ack} onChange={(v) => { setAck(v); if (v) setErrors((e) => ({ ...e, ack: undefined })); }} isInvalid={!!errors.ack} inputRef={(el) => { if (el) el.id = "suf-ack"; }}>
        <span className="suf-check__box" aria-hidden="true" />
        <span>{F.lateAck}{errors.ack && <span className="suf-inline-err"> {errors.ack}</span>}</span>
      </Checkbox>
    </div>
  );

  const errorSummary = summary.length > 0 && (
    <div className="suf-summary" ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby="suf-summary-title">
      <h3 id="suf-summary-title"><Icon name="circle-alert" size={20} />{F.summaryTitle}</h3>
      <p>{F.summaryCount(summary.length)}</p>
      <ul>{summary.map((s) => (
        <li key={s.id}><a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(s.id); el?.focus(); el?.scrollIntoView({ block: "center" }); }}>{s.msg}</a></li>
      ))}</ul>
    </div>
  );

  const gateBanner = gate && (
    <div className="suf-gate" id="suf-gate" role="alert">
      <Icon name="triangle-alert" size={20} /><span id="suf-gate-text">{gate.msg}</span>
      {gate.retry && <Button className="btn btn--secondary" id="suf-retry" onPress={checkContract}>{F.retryCheck}</Button>}
    </div>
  );

  const stepper = stepIndex > 0 && (
    <nav className="suf-steps" aria-label={text.stepOf.replace("{n}", String(stepIndex)).replace("{total}", "3")}>
      <ol>{text.steps.map((s, i) => (
        <li key={s} aria-current={i + 1 === stepIndex ? "step" : undefined} data-done={i + 1 < stepIndex || undefined}>
          <span className="suf-steps__bar" aria-hidden="true" /><span>{s}</span>
        </li>
      ))}</ol>
      <span className="suf-steps__count mono">{text.stepOf.replace("{n}", String(stepIndex)).replace("{total}", "3")}</span>
    </nav>
  );

  const back = (to: Step) => (
    <Button className="btn btn--tertiary suf-back" id="suf-back" onPress={() => history.back()} isDisabled={uploading.current}
      aria-label={`${text.back}: ${to === "hazirlik" ? text.prep.title : text.steps[{ kimlik: 0, belgeler: 1, kontrol: 2 }[to as "kimlik"]]}`}>
      <Icon name="arrow-right" size={18} className="icon--flip" />{text.back}
    </Button>
  );

  const countdown = phase && phase.name === "open" && deadlineMs != null ? leftText(lang, left(now!, deadlineMs)) : isLate && phase ? F.late(phase.daysLate) : "";

  return (
    <div className={`suf suf--${step}`} data-step={step} data-hydrated={hydrated ? "" : undefined} inert={!hydrated} aria-busy={!hydrated || undefined}>
      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {/* On Hazırlık the server-check banner sits by the Start button, so a late failure never pushes the page. */}
      {step !== "closed" && step !== "makbuz" && step !== "hazirlik" && gateBanner}

      {step === "closed" && (
        <div className="suf-closed" id="suf-closed" role="alert">
          <h2 className="suf-h" ref={headingRef} tabIndex={-1}>{F.closedTitle}</h2>
          <Html as="p" html={M(F.closedBody)} />
        </div>
      )}

      {step === "hazirlik" && (
        <section className="suf-prep" aria-label={text.prep.title}>{/* no h2 repeating the page h1 (REVIEW-02 Note 4) */}
          {draft && (
            <div className="suf-recovery" role="status" data-recovery>
              <p>{text.recovery.found.replace("{date}", longDateTime(lang, draft.savedAt))}</p>
              <div className="suf-actions">
                <Button className="btn btn--primary" onPress={restoreDraft} data-recovery-restore>{text.recovery.restore}</Button>
                <Button className="btn btn--tertiary" onPress={discardDraft} data-recovery-discard>{text.recovery.discard}</Button>
              </div>
            </div>
          )}
          {/* REVIEW-01 Note 3 (D-113): a plain note instead of the yes/no check — the cases this form is not for,
              and what to do instead, shown directly. */}
          <aside className="suf-exceptions" aria-labelledby="suf-exc">
            <p className="suf-exceptions__title" id="suf-exc"><Icon name="mail" size={18} />{text.prep.exceptionsTitle}</p>
            <ul>{text.prep.exceptions.map((x, i) => <Html as="li" key={i} html={M(x)} />)}</ul>
          </aside>
          <div className="suf-deadline">
            <div className={`suf-deadline__top${isLate ? " is-late" : ""}`}>
              <span className="suf-deadline__label mono">{text.prep.deadline}</span>
              <span className="suf-deadline__date mono">{deadlineText}</span>
              <span className="suf-deadline__left mono" id="suf-countdown">{countdown}</span>
            </div>
            {graceDays > 0 && <Html as="p" className="suf-deadline__rule" html={M(text.prep.lateRule, { closes: closesText })} />}
          </div>
          {/* REVIEW-05 Addition (H-01): one submission per internship; framed like the EK-1 note (REVIEW-06 Note 3).
              Both notes sit above the document lists, so they are read before the documents are prepared (D-186). */}
          <p className="suf-callout suf-multiple" id="suf-multiple">{text.prep.multiple}</p>
          <Html as="p" className="suf-callout suf-callout__ek1" html={M(text.prep.ek1Note)} />
          <div className="suf-docs">{/* shown on phones too (REVIEW-01 Note 3; was a collapsed toggle) */}
            <div className="suf-prep__cols" id="suf-docs-body">
            <section aria-labelledby="suf-req">
              <h2 id="suf-req" className="suf-sub">{text.prep.required}</h2>
              <ul className="suf-doclist">{(["rapor", "sicil", "anketi"] as DocKey[]).map((k) => (
                <li key={k}><span className="suf-doc"><Icon name={DOC_ICON[k]} size={18} />{text.docs[k]}</span><span className="mono suf-limit">{text.documents.limit.replace("{mb}", String(MAX_MB[k]))}</span></li>
              ))}</ul>
            </section>
            <section aria-labelledby="suf-sit">
              <h2 id="suf-sit" className="suf-sub">{text.prep.situational}</h2>
              <ul className="suf-doclist">
                {SIT_FLAGS.map((f) => (
                  <li key={f} className="suf-doclist__group"><span className="suf-doclist__when">{text.situations[f].when}</span>
                    {requiredDocs({ saturday: f === "saturday", reimbursement: f === "reimbursement" }).filter((d) => d.situational).map((d) => (
                      <span key={d.key} className="suf-doclist__row"><span className="suf-doc"><Icon name={DOC_ICON[d.key]} size={18} />{text.docs[d.key]}</span><span className="mono suf-limit">{text.documents.limit.replace("{mb}", String(MAX_MB[d.key]))}</span></span>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="suf-note">{text.prep.limits.replace("{total}", String(MAX_TOTAL_MB))}</p>
            </section>
            </div>
          </div>
          {gateBanner}
          <div className="suf-actions">
            <Button className="btn btn--primary" id="suf-start" onPress={() => goto("kimlik")}>{text.prep.start}</Button>
            <a className="btn btn--tertiary" href={pagePath(lang, "formlar")}>{text.prep.forms}</a>
          </div>
        </section>
      )}

      {step === "kimlik" && (
        <section className="suf-step" aria-labelledby="suf-h-kimlik">
          {stepper}
          <h2 className="suf-h" id="suf-h-kimlik" ref={headingRef} tabIndex={-1}>{text.identity.title}</h2>
          {errorSummary}
          <p className="suf-note suf-recovery__note">{text.recovery.notice}{" "}
            <Button className="btn btn--tertiary suf-recovery__discard" onPress={discardDraft} data-recovery-discard>{text.recovery.discard}</Button></p>
          {lateBanner}
          <form noValidate onSubmit={(e) => { e.preventDefault(); nextFromIdentity(); }} className="suf-fields">
            <TextField className="suf-field" value={name} onChange={(v) => { setName(v); markChanged(); if (!checkName(v)) setErrors((e) => ({ ...e, name: undefined })); }} isInvalid={!!errors.name} autoComplete="name" maxLength={80} isRequired>
              <Label>{text.identity.name}</Label>
              <Text slot="description">{text.identity.nameHint}</Text>
              <FieldError>{errors.name}</FieldError>
              <Input id="suf-name" />
            </TextField>
            <TextField className="suf-field suf-field--short" value={sid} onChange={(v) => { setSid(v); markChanged(); if (!checkSid(v)) setErrors((e) => ({ ...e, sid: undefined })); }}
              onBlur={() => { const r = checkSid(sid); if (sid.trim() && r) setErrors((e) => ({ ...e, sid: F.errSid })); }}
              isInvalid={!!errors.sid} inputMode="numeric" maxLength={10} autoComplete="off" isRequired>
              <Label>{text.identity.sid}</Label>
              <Text slot="description">{text.identity.sidHint}</Text>
              <FieldError>{errors.sid}</FieldError>
              <Input id="suf-sid" className="react-aria-Input mono" />
            </TextField>
            <TextField className="suf-field" type="email" value={email} onChange={(v) => { setEmail(v); markChanged(); if (!checkEmail(v)) setErrors((e) => ({ ...e, email: undefined })); }}
              onBlur={() => { const r = checkEmail(email); if (email.trim() && r) setErrors((e) => ({ ...e, email: r === "email_invalid" ? F.errEmailInvalid : F.errEmailDomain })); }}
              isInvalid={!!errors.email} autoComplete="email" isRequired>
              <Label>{text.identity.email}</Label>
              <Text slot="description">{text.identity.emailHint}</Text>
              <FieldError>{errors.email}</FieldError>
              <Input id="suf-email" spellCheck={false} />
            </TextField>
            <input className="suf-hp" id="suf-hp" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} placeholder={text.identity.honeypot} />
            <fieldset className="suf-sits">
              <legend>{text.identity.situationsTitle}</legend>
              <p className="suf-hint">{text.identity.situationsHint}</p>
              {SIT_FLAGS.map((f) => (
                <div key={f} data-flag={f}>
                  <Checkbox className="suf-sit" isSelected={flags[f]} onChange={(v) => toggleFlag(f, v)}>
                    <span className="suf-check__box" aria-hidden="true" />
                    <span className="suf-sit__text"><b>{text.situations[f].label}</b><span>{text.situations[f].hint}</span></span>
                  </Checkbox>
                </div>
              ))}
            </fieldset>
            <div className="suf-actions">
              <Button type="submit" className="btn btn--primary" id="suf-next">{text.next}</Button>
              {back("hazirlik")}
            </div>
          </form>
        </section>
      )}

      {step === "belgeler" && (
        <section className="suf-step" aria-labelledby="suf-h-belgeler">
          {stepper}
          <h2 className="suf-h" id="suf-h-belgeler" ref={headingRef} tabIndex={-1}>{text.documents.title}</h2>
          <p className="suf-lead">{text.documents.lead}</p>
          {errorSummary}
          <div className="suf-slots">
            {slots.map((s, i) => (
              <Slot key={s.key} k={s.key} name={text.docs[s.key]} situational={s.situational && (i === 0 || !slots[i - 1].situational)} text={text} lang={lang}
                picked={picked[s.key]} error={slotErr[s.key]} onChoose={(f) => choose(s.key, f)} onRemove={() => removeFile(s.key)} disabled={uploading.current} />
            ))}
          </div>
          <div id="suf-total" tabIndex={-1} className="suf-meter-wrap"><Meter className={`suf-meter${totalMb > MAX_TOTAL_MB ? " is-over" : ""}`} value={Math.min(totalMb, MAX_TOTAL_MB)} maxValue={MAX_TOTAL_MB}
            valueLabel={`${formatSize(lang, totalBytes)} / ${MAX_TOTAL_MB} MB`}>
            {({ percentage, valueText }) => (<>
              <div className="suf-meter__row"><Label>{text.documents.total}</Label><span className="mono">{valueText}</span></div>
              <div className="suf-meter__track"><div className="suf-meter__fill" style={{ ["--p" as string]: String((percentage ?? 0) / 100) }} /></div>
            </>)}
          </Meter></div>
          <div className="suf-actions">
            <Button className="btn btn--primary" id="suf-next" onPress={nextFromDocuments}>{text.next}</Button>
            {back("kimlik")}
          </div>
        </section>
      )}

      {step === "kontrol" && (
        <section className="suf-step" aria-labelledby="suf-h-kontrol">
          {stepper}
          <h2 className="suf-h" id="suf-h-kontrol" ref={headingRef} tabIndex={-1}>{text.review.title}</h2>
          {errorSummary}
          {lateBanner}
          <dl className="suf-review">
            <ReviewRow disabled={sending} k={text.identity.name} v={titleCaseName(name)} change={text.review.change} onChange={() => { goto("kimlik"); setTimeout(() => document.getElementById("suf-name")?.focus(), 60); }} />
            <ReviewRow disabled={sending} k={text.identity.sid} v={sid.trim()} mono change={text.review.change} onChange={() => { goto("kimlik"); setTimeout(() => document.getElementById("suf-sid")?.focus(), 60); }} />
            <ReviewRow disabled={sending} k={text.identity.email} v={email.trim()} change={text.review.change} onChange={() => { goto("kimlik"); setTimeout(() => document.getElementById("suf-email")?.focus(), 60); }} />
            <ReviewRow disabled={sending} k={text.review.situations} v={SIT_FLAGS.filter((f) => flags[f]).map((f) => text.situations[f].label).join(" · ") || text.review.none} change={text.review.change} onChange={() => goto("kimlik")} />
            {sentKeys.map((k) => (
              <ReviewRow disabled={sending} key={k} k={text.docs[k]} v={<><span className="mono">{picked[k]!.file.name}</span> <span className="mono suf-size">{formatSize(lang, picked[k]!.file.size)}</span></>}
                change={text.review.change} onChange={() => goto("belgeler")} />
            ))}
          </dl>
          <p className="suf-summaryline mono">{F.summaryLine(sentKeys.length, formatSize(lang, totalBytes))}</p>
          <p className="suf-declaration">{text.review.declaration}</p>
          {recaptchaSiteKey && <Html as="p" className="suf-note" html={M(text.review.captcha)} />}
          {(upload.stage === "preparing" || upload.stage === "sending") && (
            <ProgressBar className="suf-progress" value={upload.stage === "preparing" ? upload.n : upload.total + 1} maxValue={(upload.stage === "preparing" ? upload.total : upload.total) + 2}
              valueLabel={upload.stage === "preparing" ? F.preparing(upload.n, upload.total) : `${F.sending} · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}>
              {({ percentage, valueText }) => (<>
                <div className="suf-meter__row"><Label>{valueText}</Label><span className="mono">{Math.round(percentage ?? 0)}%</span></div>
                <div className="suf-meter__track"><div className="suf-meter__fill" style={{ ["--p" as string]: String((percentage ?? 0) / 100) }} /></div>
                <p className="suf-note">{F.doNotClose}</p>
              </>)}
            </ProgressBar>
          )}
          <div className="suf-msg" id="suf-msg" tabIndex={-1} role="alert">
            {upload.stage === "error" && <><p className="suf-msg__title"><Icon name="circle-alert" size={18} />{F.notSent}</p>
              {upload.html ? <Html as="div" className="suf-msg__body" html={upload.html} /> : <p>{upload.message}</p>}</>}
          </div>
          <div className="suf-actions">
            <Button className="btn btn--primary" id="suf-submit" onPress={submit}
              isDisabled={upload.stage === "preparing" || upload.stage === "sending" || contract !== "ready" || waitLeft > 0}>
              {upload.stage === "preparing" ? F.preparing(upload.n, upload.total) + "…" : upload.stage === "sending" ? F.sending + "…" : contract === "checking" ? F.checking
                : upload.stage === "error" ? (waitLeft > 0 ? `${F.retry} (${waitLeft})` : F.retry) : text.review.submit}
            </Button>
            {back("belgeler")}
          </div>
        </section>
      )}

      {step === "makbuz" && receipt && (
        <section className="suf-receipt" id="suf-done" aria-labelledby="suf-done-title">
          {/* REVIEW-03 Note 2 (D-134): a calm confirmation head instead of the "ALINDI" stamp. */}
          <div className="suf-receipt__head">
            <div className="suf-receipt__title">
              <h2 id="suf-done-title" className="suf-done__title" ref={headingRef} tabIndex={-1}><Icon name="check" size={28} className="suf-receipt__check" />{text.receipt.title}</h2>
              {(receipt.at != null || receipt.submissionId) && (
                <p className="mono suf-receipt__line" id="suf-done-line">
                  {[receipt.at != null ? `${trNumDate(receipt.at)} ${trClock(receipt.at)} ${text.receipt.zone}` : "", receipt.submissionId ?? ""].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="suf-actions suf-noprint suf-receipt__save">
              <Button className="btn btn--primary" onPress={() => print()}><Icon name="printer" size={20} />{text.receipt.print}</Button>
            </div>
          </div>
          <dl className="suf-receipt__facts">
            {receipt.submissionId && <div className="suf-receipt__ref"><dt>{text.receipt.reference}</dt><dd className="mono" id="suf-ref">{receipt.submissionId}</dd><dd className="suf-note">{text.receipt.referenceHint}</dd></div>}
            <div><dt>{text.identity.name}</dt><dd>{titleCaseName(name)} · <span className="mono">{sid.trim()}</span></dd></div>
            <div><dt>{text.receipt.term}</dt><dd>{termDisplay}</dd></div>
            {receipt.at != null && (
              <div className="suf-done__when"><dt>{text.receipt.received}</dt><dd><span className="mono">{longDateTime(lang, receipt.at)}</span>
                {receipt.lateDays != null && <> · {receipt.lateDays > 0 ? <span className="chip chip--signal">{F.late(receipt.lateDays)}</span> : <span className="chip chip--success">{text.receipt.onTime}</span>}</>}
              </dd></div>
            )}
          </dl>
          <h3 className="suf-sub">{text.receipt.docs.replace("{n}", String(receipt.keys.length))}</h3>
          <ul className="suf-receipt__docs">{receipt.keys.map((k) => {
            const f = receipt.files[k] as File;
            const href = f instanceof Blob ? URL.createObjectURL(f) : undefined;
            return (
              <li key={k}><b>{text.docs[k]}</b><span className="mono">{f.name}</span>
                {href && <a className="suf-done__dl" data-download={k} href={href} download={f.name} aria-label={F.downloadLabel(text.docs[k])}>{text.receipt.download}</a>}</li>
            );
          })}</ul>
          <p className="suf-note suf-noprint">{text.receipt.downloadHint}</p>
          <h3 className="suf-sub">{text.receipt.nextTitle}</h3>
          <ol className="suf-next">{text.receipt.next.map((x, i) => <Html as="li" key={i} html={M(x)} />)}</ol>
          <Html as="p" className="suf-note" html={M(text.receipt.ek1)} />
        </section>
      )}
    </div>
  );
}

function ReviewRow({ k, v, mono, change, onChange, disabled }: { k: string; v: ReactNode; mono?: boolean; change: string; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="suf-review__row">
      <dt>{k}</dt>
      <dd className={mono ? "mono" : undefined}>{v}</dd>
      <dd className="suf-review__change"><Button className="btn btn--tertiary" onPress={onChange} isDisabled={disabled}>{change}<span className="visually-hidden"> — {k}</span></Button></dd>
    </div>
  );
}

function Slot({ k, name, situational, text, lang, picked, error, onChoose, onRemove, disabled }: {
  k: DocKey; name: string; situational: boolean; text: TeslimText; lang: Lang; picked?: Picked; error?: { msg: string; fix?: string };
  onChoose: (f: File | undefined) => void; onRemove: () => void; disabled: boolean;
}) {
  const state = error ? "error" : picked ? "added" : "waiting";
  const limit = text.documents.limit.replace("{mb}", String(MAX_MB[k]));
  return (
    <>
      {situational && <h3 className="suf-sub">{text.documents.situational}</h3>}
      <DropZone className={({ isDropTarget }) => `suf-slot is-${state}${isDropTarget ? " is-drop" : ""}`} data-slot={k} data-state={state}
        aria-label={`${name}, ${limit}`}
        getDropOperation={(types) => (types.has("application/pdf") || types.has("Files") ? "copy" : "cancel")}
        onDrop={async (e) => {
          const item = e.items.find((i) => i.kind === "file");
          if (item && item.kind === "file") onChoose(await item.getFile());
        }}>
        <div className="suf-slot__meta" id={`suf-slot-${k}`} tabIndex={-1}>
          <span className="suf-slot__name"><Icon name={DOC_ICON[k]} size={22} className="suf-slot__icon" />{name}</span>
          <span className="mono suf-limit">{limit}</span>
          <span className={`suf-slot__state suf-slot__state--${state}`}>
            {state === "added" && <Icon name="check" size={16} />}
            {state === "error" && <Icon name="circle-alert" size={16} />}
            {state === "waiting" ? text.documents.waiting : state === "added" ? text.documents.added : error!.msg}
          </span>
          {error?.fix && <span className="suf-slot__fix">{error.fix}</span>}
        </div>
        {picked && (
          <div className="suf-slot__file">
            {picked.preview ? <img src={picked.preview.url} alt={text.documents.preview.replace("{name}", picked.file.name)} width={64} /> : <span className="suf-slot__thumb" aria-hidden="true" />}
            <span className="suf-slot__fname"><span className="mono">{picked.file.name}</span>
              <span className="mono suf-size">{formatSize(lang, picked.file.size)}{picked.preview ? ` · ${text.documents.pages.replace("{n}", String(picked.preview.pages))}` : ""}</span>
              {picked.preview && <span className="suf-note">{text.documents.previewHint}</span>}
            </span>
          </div>
        )}
        <div className="suf-slot__actions">
          <FileTrigger acceptedFileTypes={[".pdf", "application/pdf"]} onSelect={(list) => onChoose(list ? Array.from(list)[0] : undefined)}>
            <Button className="btn btn--secondary suf-slot__pick" isDisabled={disabled} aria-label={`${picked ? text.documents.change : text.documents.choose}: ${name}`}>
              {picked ? text.documents.change : text.documents.choose}
            </Button>
          </FileTrigger>
          {picked && <Button className="btn btn--tertiary" onPress={onRemove} isDisabled={disabled} aria-label={`${text.documents.remove}: ${name}`}>{text.documents.remove}</Button>}
          <span className="suf-slot__drop" aria-hidden="true">{text.documents.drop}</span>
        </div>
      </DropZone>
    </>
  );
}
