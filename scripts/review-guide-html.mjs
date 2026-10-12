// REVIEW-GUIDE.md → review-guide.html (same content; notes fields, checkboxes, host toggle). Review tooling only.
//   node scripts/review-guide-html.mjs design/reviews/REVIEW-GUIDE.md design/reviews/review-guide.html
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
const md = readFileSync(src, "utf8").split("\n");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const inline = (s) => {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => `<a href="${h}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, p, u) => `${p}<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
};
let html = [], i = 0, item = 0, lastTitle = "", section = "";
const listStack = [];
const closeLists = (depth = -1) => { while (listStack.length && listStack.at(-1) > depth) { html.push("</li></ul>"); listStack.pop(); } };
while (i < md.length) {
  const line = md[i];
  if (/^```/.test(line)) { closeLists(); const buf = []; i++; while (i < md.length && !/^```/.test(md[i])) buf.push(md[i++]); i++; html.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`); continue; }
  if (/^\|/.test(line)) {
    closeLists(); const rows = []; while (i < md.length && /^\|/.test(md[i])) rows.push(md[i++]);
    const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    html.push(`<div class="tbl"><table><thead><tr>${cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    continue;
  }
  const h = line.match(/^(#{1,3}) (.*)$/);
  if (h) { closeLists(); const lvl = h[1].length; if (lvl === 2) section = h[2]; const id = "s" + html.length; html.push(`<h${lvl} id="${id}">${inline(h[2])}</h${lvl}>`); i++; continue; }
  const li = line.match(/^(\s*)- (.*)$/);
  if (li) {
    const depth = li[1].length / 2;
    if (!listStack.length || listStack.at(-1) < depth) { html.push("<ul>"); listStack.push(depth); }
    else { closeLists(depth); html.push("</li>"); }
    let text = li[2];
    if (/^Notlar:\s*$/.test(text)) {
      html.push(`<li class="notes"><label>Notlar<textarea data-note="${item}" data-title="${esc(lastTitle)}" data-section="${esc(section)}" rows="2" placeholder="Notunuzu yazınız…"></textarea></label>`);
    } else if (text.startsWith("[ ] ")) {
      item++; text = text.slice(4); lastTitle = text.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "").slice(0, 120);
      html.push(`<li class="task"><input type="checkbox" data-check="${item}" aria-label="Bakıldı"> <span>${inline(text)}</span>`);
    } else html.push(`<li>${inline(text)}`);
    i++; continue;
  }
  if (!line.trim()) { closeLists(); i++; continue; }
  closeLists();
  const buf = [line]; i++;
  while (i < md.length && md[i].trim() && !/^(#|\||```|\s*- )/.test(md[i])) buf.push(md[i++]);
  html.push(`<p>${inline(buf.join(" "))}</p>`);
}
closeLists();
const page = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>İnceleme Rehberi</title>
<style>
:root{--bg:#f6f4ee;--fg:#14171f;--muted:#555b66;--card:#fff;--rule:#d6d2c6;--accent:#16407a;--mark:#e9eef7}
@media (prefers-color-scheme:dark){:root{--bg:#0b1020;--fg:#e9ecf3;--muted:#a7aec0;--card:#121a2e;--rule:#2a3350;--accent:#9cc0ff;--mark:#17223d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,sans-serif}
main{max-width:58rem;margin:0 auto;padding:16px 16px 80px}
h1{font-size:clamp(26px,5vw,38px);line-height:1.1;margin:24px 0 12px}h2{margin:40px 0 10px;padding-top:12px;border-top:2px solid var(--fg);font-size:24px}h3{margin:24px 0 8px;font-size:19px}
a{color:var(--accent);font-weight:600;overflow-wrap:anywhere}code{font:0.9em ui-monospace,monospace;background:var(--mark);padding:1px 4px;border-radius:3px;overflow-wrap:anywhere}
pre{background:var(--card);border:1px solid var(--rule);padding:12px;overflow-x:auto}pre code{background:none;padding:0}
.tbl{overflow-x:auto;background:var(--card);border:1px solid var(--rule)}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--rule);vertical-align:top}
ul{padding-left:1.3em}li{margin:4px 0}li.task{list-style:none;margin-left:-1.3em;margin-top:14px;padding:10px 12px;background:var(--card);border:1px solid var(--rule)}
li.task>input{width:20px;height:20px;vertical-align:-4px;margin-right:6px}li.task:has(>input:checked){opacity:.75}
li.notes{list-style:none;margin-left:-1.3em}li.notes label{display:grid;gap:4px;font-size:14px;color:var(--muted);font-weight:600}
textarea{width:100%;font:inherit;font-size:15px;padding:8px;border:1px solid var(--rule);background:var(--bg);color:var(--fg);resize:vertical}
.bar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 16px;background:var(--bg);border-bottom:1px solid var(--rule)}
.bar button{font:inherit;font-size:14px;min-height:40px;padding:0 12px;border:2px solid var(--fg);background:var(--card);color:var(--fg);cursor:pointer}.bar button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
#status{font-size:14px;color:var(--muted)}
</style></head><body>
<div class="bar" role="toolbar" aria-label="Rehber araçları">
  <button type="button" data-host="localhost" aria-pressed="true">Masaüstü bağlantıları</button>
  <button type="button" data-host="192.168.1.4" aria-pressed="false">Telefon bağlantıları (192.168.1.4)</button>
  <button type="button" id="copy">Notları Markdown olarak kopyala</button>
  <span id="status" role="status"></span>
</div>
<main>
${html.join("\n")}
</main>
<script>
(function(){
  var KEY="staj-review-guide-v2", st={}; try{st=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
  var save=function(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
  document.querySelectorAll("textarea[data-note]").forEach(function(t){t.value=(st.n||{})[t.dataset.note]||"";t.addEventListener("input",function(){(st.n=st.n||{})[t.dataset.note]=t.value;save()})});
  document.querySelectorAll("input[data-check]").forEach(function(c){c.checked=!!(st.c||{})[c.dataset.check];c.addEventListener("change",function(){(st.c=st.c||{})[c.dataset.check]=c.checked;save()})});
  var links=[].slice.call(document.querySelectorAll('a[href^="http://localhost:432"]'));
  links.forEach(function(a){a.dataset.local=a.getAttribute("href")});
  function host(h){links.forEach(function(a){var u=a.dataset.local.replace("localhost",h);a.href=u;if(a.textContent.indexOf("http://")===0)a.textContent=u});
    document.querySelectorAll("[data-host]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.host===h))});st.h=h;save()}
  document.querySelectorAll("[data-host]").forEach(function(b){b.addEventListener("click",function(){host(b.dataset.host)})});
  if(st.h)host(st.h);
  document.getElementById("copy").addEventListener("click",function(){
    var out=["# İnceleme notları",""],last="";
    document.querySelectorAll("textarea[data-note]").forEach(function(t){if(!t.value.trim())return;
      if(t.dataset.section!==last){out.push("","## "+t.dataset.section);last=t.dataset.section}
      out.push("- **"+t.dataset.title+"**","  - Notlar: "+t.value.trim().replace(/\\n/g,"\\n    "))});
    var md=out.join("\\n"),s=document.getElementById("status");
    (navigator.clipboard?navigator.clipboard.writeText(md):Promise.reject()).then(function(){s.textContent="Kopyalandı."},function(){window.prompt("Kopyalayınız:",md)});
  });
})();
</script>
</body></html>`;
writeFileSync(out, page);
console.log("ok", html.length);
