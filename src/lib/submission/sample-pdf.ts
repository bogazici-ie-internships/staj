// REVIEW-03 Note 3 (D-136): a small valid PDF for the ?preview= screens, so the "files chosen" state shows real
// first-page thumbnails and page counts. One or more A4 pages with a title line; padded to roughly `kb` with an
// unreferenced stream so the shown size looks like a real document. Previews only; never sent anywhere.
export function samplePdf(name: string, title: string, kb: number, pages = 1): File {
  const objs: string[] = [];
  const kids = Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ");
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let i = 0; i < pages; i++) {
    const text = `BT /F1 22 Tf 72 760 Td (${title.replace(/[()\\]/g, "")}) Tj /F1 11 Tf 0 -28 Td (${i + 1} / ${pages}) Tj ET\n`
      + Array.from({ length: 30 }, (_, l) => `0.85 g 72 ${690 - l * 18} 451 8 re f`).join("\n");
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  const pad = Math.max(0, kb * 1024 - 2000);
  objs.push(`<< /Length ${pad} >>\nstream\n${" ".repeat(pad)}\nendstream`);
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new File([out], name, { type: "application/pdf" });
}
