#!/usr/bin/env python3
"""Builds the self-hosted web fonts in public/fonts/ (committed; re-run only
when a font or the axis ranges below change).

Source: the pinned @fontsource-variable/* npm packages (all SIL OFL 1.1, no
Reserved Font Names). Each family is cut to the variable-axis ranges DESIGN.md
actually uses and split into a "latin" file plus a small "tr" file carrying
Latin Extended-A (ğ Ğ ş Ş İ …), so Turkish text never falls back.

    npm ci && python3 scripts/build_fonts.py      # needs fonttools + brotli
"""
import io
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

NM = Path("node_modules/@fontsource-variable")
OUT = Path("public/fonts")

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2715"
TR = "U+0100-017F,U+0300-0308,U+0327"

# (out name, package, file stem, axis limits)
FONTS = [
    ("display", "bricolage-grotesque", "bricolage-grotesque-{s}-standard-normal",
     {"wdth": (75, 85), "wght": (700, 800), "opsz": 72}),
    # Newsreader is cut at ONE optical size (opsz 18, the running-text size) since UPDATE-03 §4.6 /
    # D-61: 52 KB instead of 124 KB for latin+tr, which Kurallar's h1 needs before its LCP.
    ("editorial", "newsreader", "newsreader-{s}-opsz-normal", {"wght": (400, 700), "opsz": 18}),
    ("editorial-italic", "newsreader", "newsreader-{s}-opsz-italic", {"wght": (400, 500), "opsz": 18}),
    ("ui", "schibsted-grotesk", "schibsted-grotesk-{s}-wght-normal", {"wght": (400, 800)}),
    ("mono", "jetbrains-mono", "jetbrains-mono-{s}-wght-normal", {"wght": (400, 700)}),
]


def parse_ranges(spec):
    out = []
    for part in spec.split(","):
        a, _, b = part.removeprefix("U+").partition("-")
        out.extend(range(int(a, 16), int(b or a, 16) + 1))
    return out


def build(name, pkg, stem, axes):
    for src_subset, out_subset, ranges in (("latin", "latin", LATIN), ("latin-ext", "tr", TR)):
        src = NM / pkg / "files" / (stem.format(s=src_subset) + ".woff2")
        font = TTFont(src)
        font = instancer.instantiateVariableFont(font, axes)
        buf = io.BytesIO()          # round-trip: the subsetter trips over lazily
        font.save(buf)              # loaded tables left behind by the instancer
        buf.seek(0)
        font = TTFont(buf)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        s = subset.Subsetter(opts)
        s.populate(unicodes=parse_ranges(ranges))
        s.subset(font)
        dest = OUT / f"{name}-{out_subset}.woff2"
        font.flavor = "woff2"
        font.save(dest)
        print(f"{dest}  {dest.stat().st_size / 1024:.1f} KB")


OUT.mkdir(parents=True, exist_ok=True)
for args in FONTS:
    build(*args)
for pkg in sorted({f[1] for f in FONTS}):
    (OUT / f"LICENSE-{pkg}.txt").write_text((NM / pkg / "LICENSE").read_text(encoding="utf-8"), encoding="utf-8")
