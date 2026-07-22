---
hide:
  - navigation
  - toc
---

# İletişim

Sorularınızın büyük çoğunluğunun yanıtı bu sitede yer alır; yazmadan önce ilgili sayfaları — özellikle [Sık Sorulan Sorular](sss.md) — gözden geçirmenizi öneririz.

!!! note "İletişim sırası"
    Sitede yanıtını bulamadığınız sorular için **staj asistanlarına** genel e-posta üzerinden yazabilirsiniz; yönlendirilmediğiniz sürece muhatabınız onlardır. **Yanıtı sitede zaten bulunan sorular yanıtsız kalabilir**, bu nedenle lütfen yazmadan önce siteyi kontrol edin.

<!-- Bu sayfadaki kişi/birim bilgileri settings.yml dosyasından gelir.
     Değişiklikte SADECE settings.yml → iletisim bölümünü güncelleyin. -->

<div class="staj-contact" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">İlk iletişim</span>
<p class="staj-contact__name">Staj asistanları — genel</p>
<span class="staj-contact__note">Çoğu sorunun en hızlı yanıtı</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }
</div>

<div class="staj-contact__card" markdown>
<span class="staj-contact__role">Staj sorumlusu</span>
<p class="staj-contact__name">{{ iletisim.staj_sorumlusu.ad }}</p>
<span class="staj-contact__note">EK-1 / sigorta · staj türü ve onayında son söz</span>

[{{ iletisim.staj_sorumlusu.eposta }}](mailto:{{ iletisim.staj_sorumlusu.eposta }}){ .staj-contact__mail }
</div>

</div>

## Asistan Ekibi

<ul class="staj-people">
{%- for a in iletisim.staj_asistanlari %}
<li class="staj-person"><span class="staj-person__name">{{ a.ad }}</span><a class="staj-person__mail" href="mailto:{{ a.eposta }}">{{ a.eposta }}</a></li>
{%- endfor %}
</ul>
