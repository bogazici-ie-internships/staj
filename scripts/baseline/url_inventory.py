#!/usr/bin/env python3
"""HISTORICAL (UPDATE-07, D-145): needs the MkDocs build, removed with MkDocs; run it from the pre-redesign
tree. tests/baseline/url-inventory.json is its frozen output.

Snapshot of the OLD MkDocs build (site/): every page URL, its anchors and
its head metadata. tests/e2e/parity.spec.ts reads the JSON this writes, so
the Astro rebuild is checked against what was actually live — not a guess.

Run once against the MkDocs build at the last pre-redesign commit:
    mkdocs build --strict && python3 scripts/baseline/url_inventory.py
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
OUT = Path("tests/baseline/url-inventory.json")


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.meta, self.alternates = [], {}, {}
        self.canonical = None
        self._in_title = False
        self.title = ""
        self.lang = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "title":
            self._in_title = True
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key and key in {"description", "og:title", "og:description", "og:image",
                               "og:url", "og:locale", "twitter:card"}:
                self.meta[key] = a.get("content", "")
        if tag == "link":
            if a.get("rel") == "canonical":
                self.canonical = a.get("href")
            if a.get("rel") == "alternate" and a.get("hreflang"):
                self.alternates[a["hreflang"]] = a.get("href")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


pages = {}
for f in sorted(SITE.rglob("index.html")):
    rel = f.relative_to(SITE).parent.as_posix()
    if rel.startswith("search") or rel.startswith("assets"):
        continue
    url = "" if rel == "." else rel + "/"
    p = Head()
    p.feed(f.read_text(encoding="utf-8"))
    # Theme chrome ids (Material's __drawer, __search …) are not content anchors.
    ids = sorted({i for i in p.ids if not i.startswith("__") and not i.startswith("md-")})
    pages[url] = {"lang": p.lang, "title": p.title.strip(), "canonical": p.canonical,
                  "alternates": p.alternates, "meta": p.meta, "ids": ids}

sitemap = re.findall(r"<loc>([^<]+)</loc>", (SITE / "sitemap.xml").read_text(encoding="utf-8"))
files = sorted(p.relative_to(SITE).as_posix() for p in (SITE / "belgeler").iterdir())
assets = sorted(p.relative_to(SITE).as_posix() for p in (SITE / "assets").glob("*")
                if p.is_file() and p.suffix in {".png", ".svg"})
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"pages": pages, "sitemap": sitemap, "documents": files,
                           "public_assets": assets}, ensure_ascii=False, indent=1) + "\n",
               encoding="utf-8")
print(f"{len(pages)} pages, {len(sitemap)} sitemap urls, {len(files)} documents → {OUT}")
