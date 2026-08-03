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

{# Positions are calculated from the canonical Turkish date fields in settings.yml. #}
{% set YEAR = (takvim_yil | default(2026)) | int %}
{% set _MONTH_NO = {'Ocak':1,'Şubat':2,'Mart':3,'Nisan':4,'Mayıs':5,'Haziran':6,'Temmuz':7,'Ağustos':8,'Eylül':9,'Ekim':10,'Kasım':11,'Aralık':12} %}
{% set _MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] %}
{% set _MONTH_EN = {'Ocak':'January','Şubat':'February','Mart':'March','Nisan':'April','Mayıs':'May','Haziran':'June','Temmuz':'July','Ağustos':'August','Eylül':'September','Ekim':'October','Kasım':'November','Aralık':'December'} %}
{% set _leap = (YEAR % 4 == 0 and (YEAR % 100 != 0 or YEAR % 400 == 0)) %}
{% set _len = [31, 29 if _leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] %}
{% set cum = namespace(v=[0]) %}
{% for L in _len %}{% set cum.v = cum.v + [ cum.v[loop.index0] + L ] %}{% endfor %}
{% set YD = cum.v[12] %}
<div class="staj-yearbar" role="img" aria-label="Periods when internships may be completed in {{ YEAR }}; exact dates are listed below">
<div class="staj-yearbar__axis">{% for i in range(12) %}<span class="staj-yearbar__month">{{ _MONTH_SHORT[i] }}</span>{% endfor %}</div>
<div class="staj-yearbar__track">
{%- for x in takvim if x.staj_durum -%}
{%- set pb = (x.baslangic or x.tarih or '').split(' ') -%}{%- set pe = (x.bitis or x.tarih or '').split(' ') -%}
{%- if pb|length == 3 and _MONTH_NO.get(pb[1]) -%}
{%- set ys = pb[2]|int -%}{%- set L = 0 if ys < YEAR else (100 if ys > YEAR else ((cum.v[_MONTH_NO[pb[1]]-1] + (pb[0]|int) - 1) / YD * 100)) -%}
{%- if pe|length == 3 and _MONTH_NO.get(pe[1]) -%}{%- set ye = pe[2]|int -%}{%- set R = 0 if ye < YEAR else (100 if ye > YEAR else ((cum.v[_MONTH_NO[pe[1]]-1] + (pe[0]|int)) / YD * 100)) -%}{%- else -%}{%- set R = L -%}{%- endif -%}
{%- if R > L -%}<span class="staj-yearbar__seg staj-yearbar__seg--{{ 'cond' if x.staj_durum == 'kosullu' else 'block' }}" style="left:{{ L|round(2) }}%;width:{{ (R-L)|round(2) }}%" data-key="{{ x.baslik_en }}" data-cat="{{ 'cond' if x.staj_durum == 'kosullu' else 'block' }}" data-range="{{ x.baslangic_en }} – {{ x.bitis_en }}"></span>{%- endif -%}
{%- endif -%}
{%- endfor -%}
{%- for x in takvim if x.kategori == 'teslim' -%}
{%- set pt = (x.tarih or x.baslangic or '').split(' ') -%}
{%- if pt|length == 3 and _MONTH_NO.get(pt[1]) and (pt[2]|int) == YEAR -%}<span class="staj-yearbar__mark" style="left:{{ ((cum.v[_MONTH_NO[pt[1]]-1] + (pt[0]|int) - 1) / YD * 100)|round(2) }}%" data-key="{{ x.baslik_en }}" data-cat="mark" data-range="{{ x.tarih_en }}"></span>{%- endif -%}
{%- endfor -%}
</div>
<div class="staj-yearbar__labels">
{%- for x in takvim if x.kategori == 'teslim' -%}
{%- set pt = (x.tarih or x.baslangic or '').split(' ') -%}
{%- if pt|length == 3 and _MONTH_NO.get(pt[1]) and (pt[2]|int) == YEAR -%}<span class="staj-yearbar__marklabel" style="left:{{ ((cum.v[_MONTH_NO[pt[1]]-1] + (pt[0]|int) - 1) / YD * 100)|round(2) }}%">{{ _MONTH_EN[pt[1]] }} {{ pt[0] }}</span>{%- endif -%}
{%- endfor -%}
</div>
<div class="staj-yearbar__legend">
<span data-cat="ok"><i class="staj-yearbar__sw staj-yearbar__sw--ok"></i>Available</span>
<span data-cat="block"><i class="staj-yearbar__sw staj-yearbar__sw--block"></i>Academic term</span>
<span data-cat="cond"><i class="staj-yearbar__sw staj-yearbar__sw--cond"></i>Summer School</span>
<span data-cat="mark"><i class="staj-yearbar__sw staj-yearbar__sw--mark"></i>Deadline</span>
</div>
</div>

<ol class="staj-takvim">
{%- for e in takvim %}
<li class="staj-takvim__item staj-takvim__item--{{ e.kategori | default('akademik') }}{% if e.staj_durum %} staj-takvim__item--{{ e.staj_durum }}{% endif %}" data-key="{{ e.baslik_en }}"><span class="staj-takvim__label">{{ e.baslik_en }}</span><span class="staj-takvim__date">{% if e.tarih_en %}{{ e.tarih_en }}{% else %}{{ e.baslangic_en }} – {{ e.bitis_en }}{% endif %}</span>{% if e.notu_en %}<span class="staj-takvim__note">{{ e.notu_en }}</span>{% endif %}</li>
{%- endfor %}
</ol>

<p class="staj-dates-note">You cannot complete an internship on dates when you are taking courses.</p>

<p class="staj-kicker">In 3 Steps</p>

## Internship Process {: .staj-section }

<div class="staj-steps" markdown>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">1</span>
<span class="staj-step__pill">Before the Internship</span>

- Complete the registration form to join the announcement list.
- If the company requests it, give the company a **Compulsory Internship Letter**.
- **Insurance:** Complete the EK-1, have the company sign it, and send it to the internship supervisor — no earlier than **one week** and no later than **two days** before the internship begins.

[Details →](surec/index.md#oncesi){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">2</span>
<span class="staj-step__pill">During the Internship</span>

- Fill in the **timetable** for each workday; reconstructing it later is far harder.
- Note your work from an **industrial engineering perspective** — Section 6 grows out of these notes.
- If you **work on a Saturday**, get a signed or stamped letter; without it those days do not count.

[Details →](surec/index.md#sirasinda){ .staj-step__more }
</div>

<div class="staj-step" markdown>
<span class="staj-step__num" aria-hidden="true">3</span>
<span class="staj-step__pill">After the Internship</span>

- Prepare the **Trainee Evaluation Form**, Student Internship Survey, Internship Report and, if applicable, a Saturday Work Letter and payment receipt.
- Upload these documents online by the deadline shown above.
- Follow the announcements and the [results page](sonuclar.md) for your result.

[Details →](surec/index.md#sonrasi){ .staj-step__more }
</div>

</div>

<p class="staj-kicker">Support</p>

## Contact {: .staj-section }

<p class="staj-contact__lead">Most questions are answered on this site, and checking first is usually the fastest route. If you cannot find an answer, email the <strong>internship assistants</strong> at the general address — they are your first point of contact unless you are directed elsewhere.</p>

<div class="staj-contact" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">Internship assistants</span>
<p class="staj-contact__name">General questions</p>
<span class="staj-contact__note">Your first point of contact</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<div class="staj-contact__card" markdown>
<span class="staj-contact__role">Internship supervisor</span>
<p class="staj-contact__name">{{ iletisim.staj_sorumlusu.ad }}</p>
<span class="staj-contact__note">EK-1 and final approvals</span>

[{{ iletisim.staj_sorumlusu.eposta }}](mailto:{{ iletisim.staj_sorumlusu.eposta }}){ .staj-contact__mail }
</div>

</div>
