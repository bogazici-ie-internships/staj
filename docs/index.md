---
hide:
  - navigation
  - toc
---

{# Açılış: header'ın marka satırını TEKRARLAMAZ. Eski hero'daki "Boğaziçi
   Üniversitesi · Endüstri Mühendisliği" eyebrow'u header'da zaten yazıyordu. #}
{% set _teslim = (takvim | selectattr('kategori', 'equalto', 'teslim') | list | first) %}
<div class="staj-lede" markdown>

# Zorunlu Staj Kılavuzu

<p class="staj-lede__sub">Zorunlu stajın tüm süreci: ne zaman, hangi belgeyle, nereye.</p>
{% if _teslim and _teslim.tarih %}<p class="staj-lede__meta"><span class="staj-lede__meta-label">Rapor teslim son günü</span><strong class="staj-lede__meta-value">{{ _teslim.tarih }}</strong></p>{% endif %}

[Staj Kayıt Formu :material-arrow-right:]({{ baglantilar.kayit_formu }}){ .md-button .md-button--primary }

</div>

<p class="staj-kicker">Takvim</p>

## Önemli Tarihler {: .staj-section }

{# Şerit + tarih listesi. GEOMETRİ main.py içinde hesaplanır (test: python3 main.py).
   Konum hesabı eskiden bu dosyada VE ikizinde AYRI AYRI duruyordu; şerit sabit
   takvim yılından keyfi tarih aralığına açılınca (kısmi ay, değişken ay sayısı,
   gün hassas etiket) satır içi Jinja sürdürülemez hâle geldi.
   Liste YALNIZ ders dönemlerini ve teslim işaretini satırlar; "staj yapılabilir"
   pencereleri bilerek satır açmaz (gerekçe: main.py başlığı). Şerit mobilde
   gizli olduğu için o bilgiyi aşağıdaki .staj-takvim__lead cümlesi taşır —
   telefonda tek "Yapılabilir" ifadesi odur, silmeyin. #}
{% set S = serit() %}
<p class="staj-takvim__lead">Aşağıda listelenen <strong>ders dönemlerinin dışında kalan</strong> tarihlerde staj yapabilirsiniz; yaz okulunda ders almıyorsanız o dönem de uygundur.</p>
<div class="staj-yearbar" role="img" aria-label="{{ S.bas_yil }}–{{ S.bit_yil }} arasında staj yapılabilen dönemler; kesin tarihler aşağıdaki listede">
<div class="staj-yearbar__axis">{%- for a in S.aylar %}<span class="staj-yearbar__month" style="left:{{ a.orta }}%">{{ a.etiket }}</span>{%- endfor %}</div>
<div class="staj-yearbar__track">
{%- for b in S.bloklar %}<span class="staj-yearbar__seg staj-yearbar__seg--{{ b.kategori }}" style="left:{{ b.sol }}%;width:{{ b.genislik }}%" data-key="{{ b.anahtar }}" data-cat="{{ b.kategori }}" data-range="{{ b.aralik }}"></span>{%- endfor %}
{%- for m in S.isaretler %}<span class="staj-yearbar__mark" style="left:{{ m.sol }}%" data-key="{{ m.anahtar }}" data-cat="mark" data-range="{{ m.aralik }}"></span>{%- endfor %}
</div>
<div class="staj-yearbar__labels">
{%- for m in S.isaretler %}<span class="staj-yearbar__marklabel" style="left:{{ m.sol }}%">{{ m.etiket }}</span>{%- endfor %}
</div>
<div class="staj-yearbar__legend">
<span data-cat="ok"><i class="staj-yearbar__sw staj-yearbar__sw--ok"></i>Yapılabilir</span>
<span data-cat="block"><i class="staj-yearbar__sw staj-yearbar__sw--block"></i>Ders dönemi</span>
<span data-cat="cond"><i class="staj-yearbar__sw staj-yearbar__sw--cond"></i>Koşullu</span>
<span data-cat="mark"><i class="staj-yearbar__sw staj-yearbar__sw--mark"></i>Teslim</span>
</div>
</div>

<ol class="staj-takvim">
{%- for e in S.liste %}
<li class="staj-takvim__item staj-takvim__item--{{ e.tur }}"{% if e.anahtar %} data-key="{{ e.anahtar }}"{% endif %}><span class="staj-takvim__label">{{ e.ad }}</span><span class="staj-takvim__date">{{ e.aralik }}</span><span class="staj-takvim__verdict">{{ e.hukum }}</span>{% if e.notu %}<span class="staj-takvim__note">{{ e.notu }}</span>{% endif %}</li>
{%- endfor %}
</ol>

<p class="staj-kicker">3 Adımda</p>

## Staj Süreci {: .staj-section }

<div class="staj-steps" markdown>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">1</span>
<span class="staj-step__pill">Stajdan Önce</span>

- Kayıt formunu doldurarak duyuru listesine girmeniz gerekir.
- (Şirket istiyorsa) **Staj Zorunluluk Belgesi**'ni şirkete vermeniz gerekir.
- **Sigorta:** EK-1 formunu doldurup şirkete imzalatın ve staj danışmanına iletin — stajdan **en erken 1 hafta, en geç 2 gün önce.**

[Stajdan Önce — tüm adımlar →](surec/index.md#oncesi){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">2</span>
<span class="staj-step__pill">Staj Sırasında</span>

- Her iş günü için **çizelge (timetable)** tutun; sonradan toplu doldurmak çok daha zordur.
- Yaptığınız işleri **EM bakış açısıyla** not edin — raporun ana bölümü buradan çıkar.
- **Cumartesi çalıştıysanız** şirketten imzalı/kaşeli yazı alın; yoksa o günler sayılmaz.

[Staj Sırasında — tüm adımlar →](surec/index.md#sirasinda){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">3</span>
<span class="staj-step__pill">Stajdan Sonra</span>

- Şu belgeleri hazırlayın: **Staj Sicil Formu**, Öğrenci Staj Anketi, Staj Raporu ve (varsa) Cumartesi Yazısı, Ödeme Dekontu.
- Bu belgeleri yukarıda yazan tarihe kadar **online yüklemeniz gerekir**.
- Sigortanız EK-1 ile açıldıysa, şirketinizden alacağınız **tamamlama belgesini** ayrıca doğrudan **Hesap İşleri'ne** iletmeniz gerekir.
- Sonuçlar için duyuruları ve [sonuç sayfasını](sonuclar.md) takip edebilirsiniz.

[Stajdan Sonra — tüm adımlar →](surec/index.md#sonrasi){ .staj-step__more }
</div>

</div>

<p class="staj-kicker">Destek</p>

## İletişim {: .staj-section }

<p class="staj-contact__lead">Çoğu sorunun yanıtı sitededir; yazmadan önce bakarsanız çok daha hızlı sonuç alırsınız. Bulamadığınız sorular için <strong>staj asistanlarına</strong> (genel e-posta) yazabilirsiniz — yönlendirilmediğiniz sürece muhatabınız onlardır.</p>

<div class="staj-contact staj-contact--stack" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">Staj asistanları</span>
<p class="staj-contact__name">Genel sorular</p>
<span class="staj-contact__note">Önce buraya yazabilirsiniz · genel iletişim</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<p class="staj-contact__secondary">
<span class="staj-contact__role">Staj danışmanı</span>
<span class="staj-contact__secondary-name">{{ iletisim.staj_sorumlusu.ad }}</span>
<a class="staj-contact__mail" href="mailto:{{ iletisim.staj_sorumlusu.eposta }}">{{ iletisim.staj_sorumlusu.eposta }}</a>
<span class="staj-contact__secondary-note">EK-1 formunuzu bu adrese gönderiniz; diğer konularda yalnızca staj asistanları yönlendirdiğinde ulaşınız.</span>
</p>

</div>
