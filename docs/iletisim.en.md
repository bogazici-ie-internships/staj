---
hide:
  - navigation
  - toc
---

# Contact

Most questions are answered on this site. Before emailing, review the relevant
pages, especially the [Frequently Asked Questions](sss.md).

!!! note "Contact order"
    If you cannot find what you need on the site, email the **internship
    assistants** at the general address; they are your first point of contact
    unless you are directed elsewhere. Checking the site first is usually the
    fastest route.

<!-- Names and addresses on this page come from settings.yml. -->

<div class="staj-contact" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">First point of contact</span>
<p class="staj-contact__name">Internship assistants — general</p>
<span class="staj-contact__note">The fastest answer to most questions</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<div class="staj-contact__card" markdown>
<span class="staj-contact__role">Internship supervisor</span>
<p class="staj-contact__name">{{ iletisim.staj_sorumlusu.ad }}</p>
<span class="staj-contact__note">EK-1 and insurance · final approval of internship type</span>

[{{ iletisim.staj_sorumlusu.eposta }}](mailto:{{ iletisim.staj_sorumlusu.eposta }}){ .staj-contact__mail }
</div>

</div>

## Assistant Team

<ul class="staj-people">
{%- for a in iletisim.staj_asistanlari %}
<li class="staj-person"><span class="staj-person__name">{{ a.ad }}</span><a class="staj-person__mail" href="mailto:{{ a.eposta }}">{{ a.eposta }}</a></li>
{%- endfor %}
</ul>
