---
hide:
  - navigation
  - toc
---

{% set _teslim = (takvim | selectattr('kategori', 'equalto', 'teslim') | list | first) %}
<div class="staj-hero" markdown>
<div class="staj-hero__art" aria-hidden="true">
<svg viewBox="0 0 200 200" fill="none" stroke="#bfe3f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="56" y="34" width="90" height="120" rx="8" stroke-opacity=".9"/><line x1="72" y1="62" x2="130" y2="62" stroke-opacity=".55"/><line x1="72" y1="80" x2="130" y2="80" stroke-opacity=".55"/><line x1="72" y1="98" x2="112" y2="98" stroke-opacity=".55"/><circle cx="148" cy="150" r="26" fill="#17457F" stroke="#7CCBEE" stroke-width="3.4"/><path d="M137 150 l8 8 l14 -17" stroke="#9bd9f2" stroke-width="3.6"/></svg>
</div>
<div class="staj-hero__inner" markdown>
<p class="staj-hero__eyebrow">Boğaziçi Üniversitesi · Endüstri Mühendisliği</p>
# Zorunlu Staj Kılavuzu
<p class="staj-hero__sub">Sigorta girişinden rapor yazımına ve belge teslimine kadar zorunlu staj sürecinin tüm adımları — tek sayfada, sırasıyla.</p>
{% if _teslim and _teslim.tarih %}<p class="staj-hero__deadline"><svg class="staj-hero__deadline-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7v10H5V9h14z"/></svg><span>Rapor teslim son günü</span> <strong>{{ _teslim.tarih }}</strong></p>{% endif %}
[Staj Kayıt Formu :material-arrow-right:]({{ baglantilar.kayit_formu }}){ .md-button .md-button--primary }
</div>
</div>

<p class="staj-kicker">Takvim</p>

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
{%- if R > L -%}<span class="staj-yearbar__seg staj-yearbar__seg--{{ 'cond' if x.staj_durum == 'kosullu' else 'block' }}" style="left:{{ L|round(2) }}%;width:{{ (R-L)|round(2) }}%" data-key="{{ x.baslik }}" data-cat="{{ 'cond' if x.staj_durum == 'kosullu' else 'block' }}" data-range="{{ x.baslangic }} – {{ x.bitis }}"></span>{%- endif -%}
{%- endif -%}
{%- endfor -%}
{%- for x in takvim if x.kategori == 'teslim' -%}
{%- set pt = (x.tarih or x.baslangic or '').split(' ') -%}
{%- if pt|length == 3 and _AN.get(pt[1]) and (pt[2]|int) == YIL -%}<span class="staj-yearbar__mark" style="left:{{ ((cum.v[_AN[pt[1]]-1] + (pt[0]|int) - 1) / YD * 100)|round(2) }}%" data-key="{{ x.baslik }}" data-cat="mark" data-range="{{ x.tarih or x.baslangic }}"></span>{%- endif -%}
{%- endfor -%}
</div>
<div class="staj-yearbar__labels">
{%- for x in takvim if x.kategori == 'teslim' -%}
{%- set pt = (x.tarih or x.baslangic or '').split(' ') -%}
{%- if pt|length == 3 and _AN.get(pt[1]) and (pt[2]|int) == YIL -%}<span class="staj-yearbar__marklabel" style="left:{{ ((cum.v[_AN[pt[1]]-1] + (pt[0]|int) - 1) / YD * 100)|round(2) }}%">{{ pt[0] }} {{ pt[1] }}</span>{%- endif -%}
{%- endfor -%}
</div>
<div class="staj-yearbar__legend">
<span data-cat="ok"><i class="staj-yearbar__sw staj-yearbar__sw--ok"></i>Yapılabilir</span>
<span data-cat="block"><i class="staj-yearbar__sw staj-yearbar__sw--block"></i>Ders dönemi</span>
<span data-cat="cond"><i class="staj-yearbar__sw staj-yearbar__sw--cond"></i>Yaz okulu</span>
<span data-cat="mark"><i class="staj-yearbar__sw staj-yearbar__sw--mark"></i>Teslim</span>
</div>
</div>

<ol class="staj-takvim">
{%- for e in takvim %}
<li class="staj-takvim__item staj-takvim__item--{{ e.kategori | default('akademik') }}{% if e.staj_durum %} staj-takvim__item--{{ e.staj_durum }}{% endif %}" data-key="{{ e.baslik }}"><span class="staj-takvim__label">{{ e.baslik }}</span><span class="staj-takvim__date">{% if e.tarih %}{{ e.tarih }}{% else %}{{ e.baslangic }} – {{ e.bitis }}{% endif %}</span>{% if e.notu %}<span class="staj-takvim__note">{{ e.notu }}</span>{% endif %}</li>
{%- endfor %}
</ol>

<p class="staj-dates-note">Ders aldığınız tarihlerde staj yapamazsınız.</p>

<p class="staj-kicker">3 Adımda</p>

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

<p class="staj-kicker">Destek</p>

## İletişim {: .staj-section }

<p class="staj-contact__lead">Çoğu sorunun yanıtı sitededir. Bulamadığınız sorular için <strong>staj asistanlarına</strong> (genel e-posta) yazabilirsiniz; yönlendirilmediğiniz sürece muhatabınız onlardır. Yanıtı sitede bulunan sorular yanıtsız kalabilir, bu yüzden önce siteye göz atmanız işinizi hızlandırır.</p>

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
