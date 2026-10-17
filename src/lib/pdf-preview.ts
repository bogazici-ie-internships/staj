// "Doğru dosya mı?" — first-page thumbnail + page count for a chosen PDF.
// pdf.js (Apache-2.0) is loaded only when the first file is picked on Teslim,
// as its own chunk + worker; nothing else on the site pays for it.
// Rendering happens locally; the file never leaves the browser here.
export interface Preview { url: string; pages: number }

let lib: Promise<typeof import("pdfjs-dist")> | null = null;
async function load() {
  lib ??= (async () => {
    const pdfjs = await import("pdfjs-dist");
    const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    return pdfjs;
  })();
  return lib;
}

export async function previewPdf(file: File, width = 160): Promise<Preview | null> {
  try {
    const pdfjs = await load();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), enableXfa: false });
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const v1 = page.getViewport({ scale: 1 });
    const scale = (width * (window.devicePixelRatio || 1)) / v1.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    await page.render({ canvas, viewport: vp }).promise;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    const pages = doc.numPages;
    await task.destroy();
    return blob ? { url: URL.createObjectURL(blob), pages } : null;
  } catch (e) {
    console.warn("[staj] PDF preview unavailable:", e);
    return null;   // a PDF pdf.js can't draw is not an error: the server decides validity
  }
}
