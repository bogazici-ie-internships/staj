---
hide:
  - navigation
  - toc
---

# İletişim

Sorularınızın büyük çoğunluğunun yanıtı bu sitede yer alır; yazmadan önce ilgili sayfaları — özellikle [Sık Sorulan Sorular](sss.md) — gözden geçirmenizi öneririz.

!!! note "İletişim sırası"
    Aradığınızı sitede bulamazsanız **staj asistanlarına** genel e-posta üzerinden yazabilirsiniz; yönlendirilmediğiniz sürece muhatabınız onlardır. Yazmadan önce siteye bakmanız çoğu zaman en hızlı yol olur.

<!-- Bu sayfadaki kişi/birim bilgileri settings.yml dosyasından gelir.
     Değişiklikte SADECE settings.yml → iletisim bölümünü güncelleyin. -->

<div class="staj-contact staj-contact--stack" markdown>

<div class="staj-contact__card staj-contact__card--primary" markdown>
<span class="staj-contact__role">İlk iletişim</span>
<p class="staj-contact__name">Staj asistanları — genel</p>
<span class="staj-contact__note">Çoğu sorunun en hızlı yanıtı</span>

[{{ iletisim.genel_eposta }}](mailto:{{ iletisim.genel_eposta }}){ .staj-contact__mail }

<ul class="staj-people">
{%- for a in iletisim.staj_asistanlari %}
<li class="staj-person"><span class="staj-person__name">{{ a.ad }}</span><a class="staj-person__mail" href="mailto:{{ a.eposta }}">{{ a.eposta }}</a></li>
{%- endfor %}
</ul>
</div>

<p class="staj-contact__secondary">
<span class="staj-contact__role">Staj danışmanı</span>
<span class="staj-contact__secondary-name">{{ iletisim.staj_sorumlusu.ad }}</span>
<a class="staj-contact__mail" href="mailto:{{ iletisim.staj_sorumlusu.eposta }}">{{ iletisim.staj_sorumlusu.eposta }}</a>
<span class="staj-contact__secondary-note">EK-1 formunuzu bu adrese gönderiniz; diğer konularda yalnızca staj asistanları yönlendirdiğinde ulaşınız.</span>
</p>

</div>
