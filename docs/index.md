---
hide:
  - navigation
  - toc
---

<div class="staj-hero" markdown>
<p class="staj-hero__eyebrow">Boğaziçi Üniversitesi · Endüstri Mühendisliği</p>
# Zorunlu Staj Kılavuzu
<p class="staj-hero__sub">Sigorta girişinden rapor yazımına ve belge teslimine kadar zorunlu staj sürecinin tüm adımları — tek sayfada, sırasıyla.</p>
[Staj Kayıt Formu :material-arrow-right:]({{ baglantilar.kayit_formu }}){ .md-button .md-button--primary }
[Formlar & Belgeler](formlar.md){ .md-button }
</div>

**Durumunuza göre başlayın:**

<div class="staj-router">
<a class="staj-router__card" href="surec/#oncesi"><span class="staj-router__icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 19l-6-2.11V5l6 2.11M20.5 3h-.16L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5z"/></svg></span><span class="staj-router__txt"><span class="staj-router__role">İlk kez mi?</span><span class="staj-router__go">Staj sürecine git <span aria-hidden="true">→</span></span></span></a>
<a class="staj-router__card" href="teslim/"><span class="staj-router__icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 16v-6H5l7-7 7 7h-4v6H9m-4 4v-2h14v2H5z"/></svg></span><span class="staj-router__txt"><span class="staj-router__role">Teslim edeceğim</span><span class="staj-router__go">Teslim sayfası <span aria-hidden="true">→</span></span></span></a>
<a class="staj-router__card" href="sonuclar/"><span class="staj-router__icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9m-1-6h-3.18C13.4 1.84 12.3 1 11 1 9.7 1 8.6 1.84 8.18 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg></span><span class="staj-router__txt"><span class="staj-router__role">Sonuç bekliyorum</span><span class="staj-router__go">Sonuçlar <span aria-hidden="true">→</span></span></span></a>
</div>

## Önemli Tarihler {: .staj-section }

{# Yıl şeridi (≥720px) — SABİT Ocak–Aralık (takvim_yil). Gün-hassas konumlama:
   ders dönemleri (staj_durum:kapali) gri = staj yok; Yaz Okulu (kosullu) taralı
   yeşil = koşullu; aralar otomatik düz yeşil = staj yapılabilir. Gold yalnız teslim.
   Tarihler settings.yml metinlerinden ayrıştırılır → tek kaynak korunur. #}
{% set YIL = (takvim_yil | default(2026)) | int %}
{% set _AN = {'Ocak':1,'Şubat':2,'Mart':3,'Nisan':4,'Mayıs':5,'Haziran':6,'Temmuz':7,'Ağustos':8,'Eylül':9,'Ekim':10,'Kasım':11,'Aralık':12} %}
{% set _AK = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'] %}
{% set _leap = (YIL % 4 == 0 and (YIL % 100 != 0 or YIL % 400 == 0)) %}
{% set _len = [31, 29 if _leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] %}
{% set cum = namespace(v=[0]) %}
{% for L in _len %}{% set cum.v = cum.v + [ cum.v[loop.index0] + L ] %}{% endfor %}
{% set YD = cum.v[12] %}
<div class="staj-yearbar" role="img" aria-label="{{ YIL }} yılı staj yapılabilen dönemler; kesin tarihler aşağıdaki listede">
<div class="staj-yearbar__axis">{% for i in range(12) %}<span class="staj-yearbar__month">{{ _AK[i] }}</span>{% endfor %}</div>
<div class="staj-yearbar__track">
{%- for x in takvim if x.staj_durum -%}
{%- set pb = (x.baslangic or x.tarih or '').split(' ') -%}{%- set pe = (x.bitis or x.tarih or '').split(' ') -%}
{%- if pb|length == 3 and _AN.get(pb[1]) -%}
{%- set ys = pb[2]|int -%}{%- set L = 0 if ys < YIL else (100 if ys > YIL else ((cum.v[_AN[pb[1]]-1] + (pb[0]|int) - 1) / YD * 100)) -%}
{%- if pe|length == 3 and _AN.get(pe[1]) -%}{%- set ye = pe[2]|int -%}{%- set R = 0 if ye < YIL else (100 if ye > YIL else ((cum.v[_AN[pe[1]]-1] + (pe[0]|int)) / YD * 100)) -%}{%- else -%}{%- set R = L -%}{%- endif -%}
{%- if R > L -%}<span class="staj-yearbar__seg staj-yearbar__seg--{{ 'cond' if x.staj_durum == 'kosullu' else 'block' }}" style="left:{{ L|round(2) }}%;width:{{ (R-L)|round(2) }}%" title="{{ x.baslik }}"></span>{%- endif -%}
{%- endif -%}
{%- endfor -%}
{%- for x in takvim if x.kategori == 'teslim' -%}
{%- set pt = (x.tarih or x.baslangic or '').split(' ') -%}
{%- if pt|length == 3 and _AN.get(pt[1]) and (pt[2]|int) == YIL -%}<span class="staj-yearbar__mark" style="left:{{ ((cum.v[_AN[pt[1]]-1] + (pt[0]|int) - 1) / YD * 100)|round(2) }}%" title="{{ x.baslik }}"></span>{%- endif -%}
{%- endfor -%}
</div>
<div class="staj-yearbar__legend">
<span><i class="staj-yearbar__sw staj-yearbar__sw--ok"></i>Yapılabilir</span>
<span><i class="staj-yearbar__sw staj-yearbar__sw--block"></i>Ders dönemi</span>
<span><i class="staj-yearbar__sw staj-yearbar__sw--cond"></i>Yaz okulu</span>
<span><i class="staj-yearbar__sw staj-yearbar__sw--mark"></i>Teslim</span>
</div>
</div>

<ol class="staj-takvim">
{%- for e in takvim %}
<li class="staj-takvim__item staj-takvim__item--{{ e.kategori | default('akademik') }}{% if e.staj_durum %} staj-takvim__item--{{ e.staj_durum }}{% endif %}"><span class="staj-takvim__label">{{ e.baslik }}</span><span class="staj-takvim__date">{% if e.tarih %}{{ e.tarih }}{% else %}{{ e.baslangic }} – {{ e.bitis }}{% endif %}</span>{% if e.notu %}<span class="staj-takvim__note">{{ e.notu }}</span>{% endif %}</li>
{%- endfor %}
</ol>

<p class="staj-dates-note">Ders aldığınız dönemlerde staj yapamazsınız.</p>

## Staj Süreci {: .staj-section }

<div class="staj-steps" markdown>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">1</span>
<span class="staj-step__pill">Stajdan Önce</span>

- Kayıt formunu doldurarak duyuru listesine girmeniz gerekir.
- (Şirket istiyorsa) **Staj Zorunluluk Belgesi**'ni şirkete vermeniz gerekir.
- **Sigorta:** Formu doldurup işveren firmaya imzalattıktan sonra Prof. Dr. Refik Güllü'ye iletmeniz gerekir. Gönderim penceresi: stajdan **en erken 1 hafta, en geç 2 gün önce.** Şirket isterse aynı form devlet katkısını da kapsar.

[Detay →](surec/index.md#oncesi){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">2</span>
<span class="staj-step__pill">Staj Sırasında</span>

- Her gün için çizelge tutmanız gerekir.
- EM bakış açısıyla yaptığınız işleri not etmeniz beklenir.

[Detay →](surec/index.md#sirasinda){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">3</span>
<span class="staj-step__pill">Stajdan Sonra</span>

- Şu belgeleri hazır bulundurmanız gerekir: Staj Sicil Formu, Öğrenci Staj Anketi, Staj Raporu, (varsa) Cumartesi Yazısı ve Ödeme Dekontu.
- Bu belgeleri yukarıda yazan tarihe kadar **online yüklemeniz gerekir**.
- Sonuçlar için duyuruları ve [sonuç sayfasını](sonuclar.md) takip edebilirsiniz.

[Detay →](surec/index.md#sonrasi){ .staj-step__more }
</div>

</div>

## İletişim {: .staj-section }

<div class="staj-contact" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">Staj asistanları</span>
<p class="staj-contact__name">Genel sorular</p>
<span class="staj-contact__note">Önce buraya yazabilirsiniz · genel iletişim</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<div class="staj-contact__card" markdown>
<span class="staj-contact__role">Staj sorumlusu</span>
<p class="staj-contact__name">{{ iletisim.staj_sorumlusu.ad }}</p>
<span class="staj-contact__note">EK-1 / nihai onay mercii</span>

[{{ iletisim.staj_sorumlusu.eposta }}](mailto:{{ iletisim.staj_sorumlusu.eposta }}){ .staj-contact__mail }
</div>

</div>
