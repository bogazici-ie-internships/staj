// Teslim kurtarma (UPDATE-06 Phase 2b): the flow's fields and chosen files are kept in IndexedDB on
// this device while the student works, so a reload or a closed tab does not lose them. Nothing is
// sent anywhere; the record is deleted on a successful submission or when the student chooses
// "Vazgeç", and ignored (and deleted) when it belongs to another campaign or is older than 24 hours (D-100).
// The submission payload and the portal contract are unchanged.
import type { DocKey } from "./contract";

export interface Draft {
  campaignId: string; savedAt: number;
  name: string; sid: string; email: string; flags: { saturday: boolean; reimbursement: boolean };
  files: Partial<Record<DocKey, File>>;
}
const DB = "staj-teslim", STORE = "draft", KEY = "current", MAX_AGE = 24 * 3_600_000;

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    // Resolve on the transaction's completion, not the request's success: only then is a write durable
    // (a reload right after "Vazgeç" must not find the record again).
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { resolve(req.result); d.close(); };
    t.onerror = t.onabort = () => { reject(t.error ?? req.error); d.close(); };
  });
}

export async function saveDraft(d: Draft): Promise<void> {
  try { await tx("readwrite", (s) => s.put(d, KEY)); } catch { /* private mode / quota: recovery is best-effort */ }
}
export async function loadDraft(campaignId: string, now = Date.now()): Promise<Draft | null> {
  try {
    const d = await tx<Draft | undefined>("readonly", (s) => s.get(KEY));
    if (!d || d.campaignId !== campaignId || now - d.savedAt > MAX_AGE) { if (d) await clearDraft(); return null; }
    return d;
  } catch { return null; }
}
export async function clearDraft(): Promise<void> {
  try { await tx("readwrite", (s) => s.delete(KEY)); } catch { /* nothing to clear */ }
}
