"""mkdocs-macros module — GEOMETRY of the timeline on the homepage.

Why Python? The strip used to be a fixed calendar year (January–December) and
the positions were computed with inline Jinja in index.md and index.en.md —
the same ~35 lines duplicated across both files. Once the strip needed to
open to an arbitrary date range (partial first month, variable month count,
day-precise label positions) that Jinja became unreadable, and the TURKISH
month names kept silently being "load-bearing" on the English page too.

Now there is a single source here: the `serit()` macro returns ready-made
percentages for both pages. Date texts still come from settings.yml (single
source preserved).

The list shows ONLY real periods and deadlines. It deliberately does not open
a row for the "internship possible" windows in between — that would double
the list and drown out the real information; that information already lives
in the strip as the background color.

Test: python3 main.py   → self-verifies.
"""

from datetime import date, timedelta

AY_NO = {
    "Ocak": 1, "Şubat": 2, "Mart": 3, "Nisan": 4, "Mayıs": 5, "Haziran": 6,
    "Temmuz": 7, "Ağustos": 8, "Eylül": 9, "Ekim": 10, "Kasım": 11, "Aralık": 12,
}
AY_KISA_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu",
              "Eyl", "Eki", "Kas", "Ara"]
AY_KISA_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
              "Sep", "Oct", "Nov", "Dec"]
AY_TAM_EN = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"]

# A month label is NOT PRINTED if it is narrower than this width: on partial
# months the labels used to overlap and become unreadable.
MIN_ETIKET_GENISLIK = 2.2


def ayristir(metin):
    """'21 Eylül 2026' -> date(2026, 9, 21). None for an unrecognized format."""
    parcalar = str(metin or "").split()
    if len(parcalar) != 3:
        return None
    gun, ay, yil = parcalar
    no = AY_NO.get(ay)
    if no is None or not gun.isdigit() or not yil.isdigit():
        return None
    try:
        return date(int(yil), no, int(gun))
    except ValueError:
        return None


def _ay_sonu(d):
    return date(d.year + (d.month == 12), (d.month % 12) + 1, 1) - timedelta(days=1)


def _tr_tarih(d):
    ters = {v: k for k, v in AY_NO.items()}
    return f"{d.day} {ters[d.month]} {d.year}"


def _en_tarih(d):
    return f"{AY_TAM_EN[d.month - 1]} {d.day}, {d.year}"


def teslim_kilidi(metin):
    """'2026-10-12 10:00' (donem.teslim_kilit) -> (date(2026, 10, 12), '10:00').
    None when empty/unrecognized: the lock is optional ("" = disabled)."""
    parcalar = str(metin or "").split()
    if len(parcalar) != 2:
        return None
    try:
        y, a, g = (int(x) for x in parcalar[0].split("-"))
        return date(y, a, g), parcalar[1]
    except ValueError:
        return None


def son_teslim_metni(kilit, ingilizce=False):
    """The deadline as the homepage and the calendar row print it — date AND
    hour, from teslim_kilit only (the same value the Submission page uses)."""
    if not kilit:
        return ""
    gun, saat = kilit
    return f"{_en_tarih(gun) if ingilizce else _tr_tarih(gun)}, {saat}"


def _serit_geometrisi(takvim, bas, bit, ingilizce=False, kilit=None):
    """Computes all visual parts of the strip, in percentages.

    Positions are derived from the Turkish date fields in BOTH languages;
    the English versions are only the DISPLAYED texts (single source
    preserved).
    """
    toplam = (bit - bas).days + 1
    if toplam <= 0:
        raise ValueError("serit_bitis, serit_baslangic'tan sonra olmalı")

    def sol(d):     # start of day
        return max(0.0, min(100.0, (d - bas).days / toplam * 100))

    def sag(d):     # END of day (end date inclusive)
        return max(0.0, min(100.0, ((d - bas).days + 1) / toplam * 100))

    # --- month labels (day-precise; partial months are clipped) ---
    aylar = []
    imlec = date(bas.year, bas.month, 1)
    while imlec <= bit:
        gorunur_bas = max(imlec, bas)
        gorunur_bit = min(_ay_sonu(imlec), bit)
        if gorunur_bas <= gorunur_bit:
            L, R = sol(gorunur_bas), sag(gorunur_bit)
            if R - L >= MIN_ETIKET_GENISLIK:
                kisa = AY_KISA_EN if ingilizce else AY_KISA_TR
                aylar.append({"etiket": kisa[imlec.month - 1],
                              "orta": round((L + R) / 2, 2)})
        imlec = date(imlec.year + (imlec.month == 12), (imlec.month % 12) + 1, 1)

    METIN = {
        False: {"v_kosullu": "Koşullu", "v_kapali": "Yapılamaz",
                "v_teslim": "Son teslim"},
        True: {"v_kosullu": "Conditional", "v_kapali": "Not possible",
               "v_teslim": "Deadline"},
    }[bool(ingilizce)]

    bloklar, isaretler, dolu, teslimler, belirsiz = [], [], [], [], []
    for e in takvim:
        ad = e.get("baslik_en" if ingilizce else "baslik") or e.get("baslik") or ""

        if e.get("staj_durum"):
            b = ayristir(e.get("baslangic") or e.get("tarih"))
            s = ayristir(e.get("bitis") or e.get("tarih"))
            if not b or not s:
                # Period whose date has NOT YET BEEN ANNOUNCED (e.g. "To be
                # updated"). Not drawn on the strip and does NOT ENTER
                # SEGMENTATION: rather than fabricate a range and miscolor
                # those days, it stays as a dateless info row at the end of
                # the list.
                belirsiz.append(e)
                continue
            if s < bas or b > bit:
                continue        # range entirely outside → don't draw
            L, R = sol(max(b, bas)), sag(min(s, bit))
            if R <= L:
                continue
            kat = "cond" if e["staj_durum"] == "kosullu" else "block"
            if ingilizce:
                aralik = f"{e.get('baslangic_en', '')} – {e.get('bitis_en', '')}"
            else:
                aralik = f"{e.get('baslangic', '')} – {e.get('bitis', '')}"
            bloklar.append({"anahtar": ad, "kategori": kat, "sol": round(L, 2),
                            "genislik": round(R - L, 2), "aralik": aralik})
            dolu.append((b, s, e["staj_durum"], e))

        elif e.get("kategori") == "teslim":
            t = ayristir(e.get("tarih") or e.get("baslangic"))
            # ONE deadline: the calendar row and donem.teslim_kilit (which
            # the Submission page and the portal lock use) may not drift apart.
            # The homepage used to print the calendar date with no hour while
            # the Submission page printed "10:00" from the lock.
            if t and kilit and t != kilit[0]:
                raise ValueError(
                    f"takvim teslim tarihi ({e.get('tarih')}) donem.teslim_kilit "
                    f"({kilit[0].isoformat()}) ile uyuşmuyor — ikisini aynı güne getirin")
            if not t or t < bas or t > bit:
                continue
            if ingilizce:
                etiket = f"{AY_TAM_EN[t.month - 1]} {t.day}"
                aralik = e.get("tarih_en") or e.get("baslangic_en") or ""
            else:
                ters = {v: k for k, v in AY_NO.items()}
                etiket = f"{t.day} {ters[t.month]}"
                aralik = e.get("tarih") or e.get("baslangic") or ""
            if kilit and t == kilit[0]:
                aralik = son_teslim_metni(kilit, ingilizce)
            isaretler.append({"anahtar": ad, "sol": round(sol(t), 2),
                              "aralik": aralik, "etiket": etiket})
            teslimler.append((t, ad, aralik))

    # --- Date list -----------------------------------------------------
    # ONLY real periods + deadlines. The "internship possible" gaps are
    # deliberately NOT LISTED: opening a separate row for every gap would
    # double the list and drown out the real information (periods and the
    # final deadline). The gaps are already visible on the strip — as the
    # background color + the "Possible" key in the legend.
    liste = []
    for b_, s_, tur, kayit in dolu:
        liste.append({
            "tur": "kosullu" if tur == "kosullu" else "kapali",
            "ad": (kayit.get("baslik_en") if ingilizce else kayit.get("baslik")) or "",
            "hukum": METIN["v_kosullu"] if tur == "kosullu" else METIN["v_kapali"],
            "anahtar": (kayit.get("baslik_en") if ingilizce else kayit.get("baslik")) or "",
            "notu": (kayit.get("notu_en") if ingilizce else kayit.get("notu")) or "",
            "aralik": (f"{kayit.get('baslangic_en','')} – {kayit.get('bitis_en','')}" if ingilizce
                       else f"{kayit.get('baslangic','')} – {kayit.get('bitis','')}"),
            "sirala": b_,
        })
    for t, ad, aralik in teslimler:
        liste.append({"tur": "teslim", "ad": ad, "hukum": METIN["v_teslim"],
                      "anahtar": ad, "notu": "", "aralik": aralik, "sirala": t})
    liste.sort(key=lambda x: x["sirala"])
    for x in liste:
        del x["sirala"]

    # Periods with an unspecified date can't be sorted chronologically → to the END of the list.
    for e in belirsiz:
        liste.append({
            "tur": "kosullu" if e["staj_durum"] == "kosullu" else "kapali",
            "ad": (e.get("baslik_en") if ingilizce else e.get("baslik")) or "",
            "hukum": METIN["v_kosullu"] if e["staj_durum"] == "kosullu" else METIN["v_kapali"],
            "anahtar": "",   # has no counterpart on the strip → must not enter highlight matching
            "notu": (e.get("notu_en") if ingilizce else e.get("notu")) or "",
            "aralik": (e.get("tarih_en") if ingilizce else e.get("tarih")) or "",
        })

    return {"aylar": aylar, "bloklar": bloklar, "isaretler": isaretler,
            "liste": liste,
            "bas_yil": bas.year, "bit_yil": bit.year,
            # yearbar.js places the "today" tick from these (the build is static).
            "bas_iso": bas.isoformat(), "bit_iso": bit.isoformat()}


def define_env(env):
    # Umami (overrides/main.html): the theme template can't see settings.yml
    # variables, so hand it the campaign fields via config.extra. Single source
    # stays settings.yml; `phase` is computed in the browser (track.js), since
    # the site is only rebuilt on push.
    donem = env.variables.get("donem") or {}
    env.conf["extra"]["umami_campaign"] = {
        "id": str(donem.get("campaign_id") or ""),
        "deadline": str(donem.get("teslim_kilit") or ""),
        "grace_days": int(donem.get("gec_teslim_gun") or 0),
    }

    @env.macro
    def serit(ingilizce=False):
        v = env.variables
        bas = ayristir(v.get("serit_baslangic"))
        bit = ayristir(v.get("serit_bitis"))
        if not bas or not bit:
            raise ValueError(
                "serit_baslangic / serit_bitis okunamadı — biçim: '15 Mayıs 2026'")
        kilit = teslim_kilidi((v.get("donem") or {}).get("teslim_kilit"))
        return _serit_geometrisi(v.get("takvim") or [], bas, bit, ingilizce, kilit)

    @env.macro
    def son_teslim(ingilizce=False):
        return son_teslim_metni(teslim_kilidi((env.variables.get("donem") or {}).get("teslim_kilit")), ingilizce)


# --------------------------------------------------------------------------
if __name__ == "__main__":
    bas, bit = ayristir("15 Mayıs 2026"), ayristir("31 Ağustos 2027")
    assert bas and bit
    takvim = [
        {"baslangic": "24 Haziran 2026", "bitis": "12 Ağustos 2026",
         "baslik": "Yaz Okulu", "baslik_en": "Summer School",
         "baslangic_en": "June 24, 2026", "bitis_en": "August 12, 2026",
         "kategori": "akademik", "staj_durum": "kosullu"},
        {"baslangic": "21 Eylül 2026", "bitis": "22 Aralık 2026",
         "baslik": "Güz Dönemi", "baslik_en": "Fall Semester",
         "baslangic_en": "September 21, 2026", "bitis_en": "December 22, 2026",
         "kategori": "akademik", "staj_durum": "kapali"},
        {"tarih": "12 Ekim 2026", "tarih_en": "October 12, 2026",
         "baslik": "Teslim", "baslik_en": "Deadline", "kategori": "teslim"},
        {"baslangic": "9 Şubat 2026", "bitis": "1 Mayıs 2026",
         "baslik": "ARALIK DIŞI", "baslik_en": "OUT OF RANGE",
         "kategori": "akademik", "staj_durum": "kapali"},
        {"baslangic": "9 Şubat 2026", "bitis": "15 Mayıs 2026",
         "baslik": "SINIRDA", "baslik_en": "ON BOUNDARY",
         "kategori": "akademik", "staj_durum": "kapali"},
    ]
    g = _serit_geometrisi(takvim, bas, bit)
    toplam = (bit - bas).days + 1
    assert toplam == 474, toplam
    # Summer School 2026 start: June 24, 2026, 40 days after the strip start
    yaz = [b for b in g["bloklar"] if b["anahtar"] == "Yaz Okulu"][0]
    assert abs(yaz["sol"] - 40 / toplam * 100) < 0.01, yaz
    assert yaz["kategori"] == "cond"
    # Fall end Dec 22, 2026 -> end of day inclusive
    guz = [b for b in g["bloklar"] if b["anahtar"] == "Güz Dönemi"][0]
    assert abs((guz["sol"] + guz["genislik"]) - (date(2026, 12, 23) - bas).days / toplam * 100) < 0.01
    # A row that ends BEFORE the strip start is NEVER drawn
    assert not [b for b in g["bloklar"] if b["anahtar"] == "ARALIK DIŞI"], "aralık dışı çizildi"
    # A row whose end lands exactly on the strip start draws a ONE-DAY slice —
    # May 15 is still a term day, clipping must not silently swallow it.
    sinir = [b for b in g["bloklar"] if b["anahtar"] == "SINIRDA"]
    assert len(sinir) == 1 and sinir[0]["sol"] == 0.0, sinir
    assert abs(sinir[0]["genislik"] - 1 / toplam * 100) < 0.01, sinir
    # Partial first month (May 15–31) has a label; month labels in ascending order
    assert g["aylar"][0]["etiket"] == "May"
    assert all(a["orta"] < b["orta"] for a, b in zip(g["aylar"], g["aylar"][1:]))
    assert len(g["isaretler"]) == 1 and g["isaretler"][0]["etiket"] == "12 Ekim"

    # The list carries only real periods + deadlines; a derived
    # "internship possible" row must NOT exist.
    g_liste = g["liste"]
    assert all(x["tur"] in ("kapali", "kosullu", "teslim") for x in g_liste), g_liste
    # SINIRDA is also a real period (a 1-day slice landing on the strip
    # start); ARALIK DIŞI stays entirely before the range, so it must NOT
    # be in the list.
    assert [x["ad"] for x in g_liste] == ["SINIRDA", "Yaz Okulu", "Güz Dönemi", "Teslim"], g_liste
    assert not [x for x in g_liste if x["ad"] == "ARALIK DIŞI"]

    # teslim_kilit drives the deadline text; a calendar row on another day is a build error.
    kilit = teslim_kilidi("2026-10-12 10:00")
    assert kilit == (date(2026, 10, 12), "10:00"), kilit
    assert son_teslim_metni(kilit) == "12 Ekim 2026, 10:00"
    assert son_teslim_metni(kilit, True) == "October 12, 2026, 10:00"
    assert teslim_kilidi("") is None and son_teslim_metni(None) == ""
    g_k = _serit_geometrisi(takvim, bas, bit, kilit=kilit)
    assert [x["aralik"] for x in g_k["liste"] if x["tur"] == "teslim"] == ["12 Ekim 2026, 10:00"]
    try:
        _serit_geometrisi(takvim, bas, bit, kilit=teslim_kilidi("2026-10-13 10:00"))
        raise AssertionError("uyuşmayan teslim tarihi sessizce geçti")
    except ValueError:
        pass

    print(f"main.py testleri GEÇTİ — {toplam} gün, {len(g['aylar'])} ay etiketi, "
          f"{len(g['bloklar'])} blok, {len(g['isaretler'])} işaret, "
          f"{len(g_liste)} liste satırı")
    print("  aylar:", " ".join(a["etiket"] for a in g["aylar"]))
    print("  liste:", " | ".join(f"{x['ad']} ({x['hukum']})" for x in g_liste))
