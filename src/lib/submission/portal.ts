// How the island reaches the Apps Script portal. The real adapter is the only
// one in production and in the e2e suite (Playwright intercepts it).
//
// CORS: Apps Script does not answer preflight (OPTIONS) requests, so both
// calls must stay "simple": no custom headers, no JSON content type (a string
// body goes as text/plain), no upload-progress listeners. Do not change.
export interface PortalResponse { ok: boolean; status: number; json(): Promise<unknown> }
export interface Portal {
  getContract(signal: AbortSignal): Promise<PortalResponse>;
  submit(body: string, signal: AbortSignal): Promise<PortalResponse>;
}

export function realPortal(url: string): Portal {
  return {
    getContract: (signal) => fetch(url, { method: "GET", cache: "no-store", signal }),
    submit: (body, signal) => fetch(url, { method: "POST", body, signal }),
  };
}

/** Local review builds only (import.meta.env.PUBLIC_PORTAL_MODE === "fake"); tree-shaken otherwise. */
export async function portalFor(url: string, campaign: unknown): Promise<Portal> {
  if (import.meta.env.PUBLIC_PORTAL_MODE === "fake") {
    const { fakePortal } = await import("./fake-portal");
    return fakePortal(campaign);
  }
  return realPortal(url);
}
