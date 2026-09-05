---
hide:
  - navigation
  - toc
---

{# Opening: does not repeat the header's brand line. The old hero eyebrow
   ("Boğaziçi University · Industrial Engineering") was already in the header. #}
{% set _deadline = (takvim | selectattr('kategori', 'equalto', 'teslim') | list | first) %}
<div class="staj-lede" markdown>

# Compulsory Internship Guide

<p class="staj-lede__sub">The whole compulsory internship process: when, which documents, and where they go.</p>
{% if _deadline and _deadline.tarih_en %}<p class="staj-lede__meta"><span class="staj-lede__meta-label">Internship report deadline</span><strong class="staj-lede__meta-value">{{ _deadline.tarih_en }}</strong></p>{% endif %}

[Internship Registration Form :material-arrow-right:]({{ baglantilar.kayit_formu }}){ .md-button .md-button--primary }

</div>

<p class="staj-kicker">Calendar</p>

## Important Dates {: .staj-section }

{# Şerit + tarih listesi. GEOMETRİ main.py içinde hesaplanır (test: python3 main.py).
   Konum hesabı eskiden bu dosyada VE ikizinde AYRI AYRI duruyordu; şerit sabit
   takvim yılından keyfi tarih aralığına açılınca (kısmi ay, değişken ay sayısı,
   gün hassas etiket) satır içi Jinja sürdürülemez hâle geldi.
   Liste YALNIZ ders dönemlerini ve teslim işaretini satırlar; "staj yapılabilir"
   pencereleri bilerek satır açmaz (gerekçe: main.py başlığı). Şerit mobilde
   gizli olduğu için o bilgiyi aşağıdaki .staj-takvim__lead cümlesi taşır —
   telefonda tek "yapılabilir" ifadesi odur, silmeyin. #}
{% set S = serit(true) %}
<p class="staj-takvim__lead">You may complete an internship on any date <strong>outside the academic terms listed below</strong>; Summer School is also available if you are not enrolled in courses.</p>
<div class="staj-yearbar" role="img" aria-label="Periods when internships may be completed between {{ S.bas_yil }} and {{ S.bit_yil }}; exact dates are listed below">
<div class="staj-yearbar__axis">{%- for a in S.aylar %}<span class="staj-yearbar__month" style="left:{{ a.orta }}%">{{ a.etiket }}</span>{%- endfor %}</div>
<div class="staj-yearbar__track">
{%- for b in S.bloklar %}<span class="staj-yearbar__seg staj-yearbar__seg--{{ b.kategori }}" style="left:{{ b.sol }}%;width:{{ b.genislik }}%" data-key="{{ b.anahtar }}" data-cat="{{ b.kategori }}" data-range="{{ b.aralik }}"></span>{%- endfor %}
{%- for m in S.isaretler %}<span class="staj-yearbar__mark" style="left:{{ m.sol }}%" data-key="{{ m.anahtar }}" data-cat="mark" data-range="{{ m.aralik }}"></span>{%- endfor %}
</div>
<div class="staj-yearbar__labels">
{%- for m in S.isaretler %}<span class="staj-yearbar__marklabel" style="left:{{ m.sol }}%">{{ m.etiket }}</span>{%- endfor %}
</div>
<div class="staj-yearbar__legend">
<span data-cat="ok"><i class="staj-yearbar__sw staj-yearbar__sw--ok"></i>Possible</span>
<span data-cat="block"><i class="staj-yearbar__sw staj-yearbar__sw--block"></i>Academic term</span>
<span data-cat="cond"><i class="staj-yearbar__sw staj-yearbar__sw--cond"></i>Conditional</span>
<span data-cat="mark"><i class="staj-yearbar__sw staj-yearbar__sw--mark"></i>Deadline</span>
</div>
</div>

<ol class="staj-takvim">
{%- for e in S.liste %}
<li class="staj-takvim__item staj-takvim__item--{{ e.tur }}"{% if e.anahtar %} data-key="{{ e.anahtar }}"{% endif %}><span class="staj-takvim__label">{{ e.ad }}</span><span class="staj-takvim__date">{{ e.aralik }}</span><span class="staj-takvim__verdict">{{ e.hukum }}</span>{% if e.notu %}<span class="staj-takvim__note">{{ e.notu }}</span>{% endif %}</li>
{%- endfor %}
</ol>

<p class="staj-kicker">In 3 Steps</p>

## Internship Process {: .staj-section }

<div class="staj-steps" markdown>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">1</span>
<span class="staj-step__pill">Before the Internship</span>

- Complete the registration form to join the announcement list.
- If the company requests it, give the company a **Compulsory Internship Letter**.
- **Insurance:** Complete the EK-1, have the company sign it, and send it to the Internship advisor — no earlier than **one week** and no later than **two days** before the internship begins.

[Before the Internship — full steps →](surec/index.md#oncesi){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">2</span>
<span class="staj-step__pill">During the Internship</span>

- Fill in the **timetable** for each workday; reconstructing it later is far harder.
- Note your work from an **industrial engineering perspective** — Section 6 grows out of these notes.
- If you **work on a Saturday**, get a signed or stamped letter; without it those days do not count.

[During the Internship — full steps →](surec/index.md#sirasinda){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">3</span>
<span class="staj-step__pill">After the Internship</span>

- Prepare the **Trainee Evaluation Form**, Student Internship Survey, Internship Report and, if applicable, a Saturday Work Letter and payment receipt.
- Upload these documents online by the deadline shown above.
- If the University insured you through the EK-1, you must also send the **completion document** from your company directly to the **Department of Accounting Affairs**.
- Follow the announcements and the [results page](sonuclar.md) for your result.

[After the Internship — full steps →](surec/index.md#sonrasi){ .staj-step__more }
</div>

</div>

<p class="staj-kicker">Support</p>

## Contact {: .staj-section }

<p class="staj-contact__lead">Most questions are answered on this site, and checking first is usually the fastest route. If you cannot find an answer, email the <strong>internship assistants</strong> at the general address — they are your first point of contact unless you are directed elsewhere.</p>

<div class="staj-contact staj-contact--stack" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">Internship assistants</span>
<p class="staj-contact__name">General questions</p>
<span class="staj-contact__note">Your first point of contact</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<p class="staj-contact__secondary">
<span class="staj-contact__role">Internship advisor</span>
<span class="staj-contact__secondary-name">{{ iletisim.staj_sorumlusu.ad }}</span>
<a class="staj-contact__mail" href="mailto:{{ iletisim.staj_sorumlusu.eposta }}">{{ iletisim.staj_sorumlusu.eposta }}</a>
<span class="staj-contact__secondary-note">Send your EK-1 form to this address; otherwise write only when the internship assistants direct you here.</span>
</p>

</div>
