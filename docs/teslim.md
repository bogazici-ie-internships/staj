---
hide:
  - navigation
  - toc
---

{% set _AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'] %}
{% if donem.teslim_kilit %}{% set _p = donem.teslim_kilit.split(' ') %}{% set _d = _p[0].split('-') %}{% set teslim_tr = (_d[2]|int) ~ ' ' ~ _AYLAR[(_d[1]|int)-1] ~ ' ' ~ _d[0] ~ ' ' ~ _p[1] %}{% else %}{% set teslim_tr = '' %}{% endif %}

# Teslim

{# TEK teslim durumu bloğu. Önce üç ayrı görsel sistem vardı (gold künye +
   renkli faz şeridi + işaretli satırlar); üçü de "önemli" diye bağırıp
   birbirine bağlanmıyordu. Artık tek blok, tek aksan (gold = teslim
   semantiği), hiyerarşi iç ayraçlarla.
   .staj-deadline__countdown ve #suf-countdown KORUNUR — assets/submit.js
   bu sınıfa --urgent/--late yazıyor. #}
<div class="staj-status">
  <div class="staj-status__head">
    <span class="staj-status__label">Rapor &amp; belge son teslim</span>
    <span class="staj-status__date">{{ teslim_tr or "duyurulacak" }}</span>
    <span class="staj-deadline__countdown" id="suf-countdown" aria-live="polite"></span>
  </div>

  <p class="staj-status__rule">Son teslimden sonra <strong>{{ (donem.gec_teslim_gun | default(0)) | int }} gün</strong> daha yükleme açık kalır; bu sürede <strong>her geç gün staj sürenizden bir iş günü düşer.</strong> Sürenin sonunda online yükleme kapanır.</p>

  <ul class="staj-status__exceptions">
    <li><span class="staj-status__if">Ders dönemi içinde staj yaptıysanız (ör. Erasmus/değişim)</span> <span class="staj-status__then"><strong>bu formu kullanmayın</strong> — staj bitiminden en geç 3 hafta içinde <a href="../iletisim/">e-posta ile</a> gönderin (<a href="../sss/#uygunluk-zamanlama">SSS: Uygunluk &amp; Zamanlama</a>).</span></li>
    <li><span class="staj-status__if">Sigortanız EK-1 ile yapıldıysa</span> <span class="staj-status__then">bu forma ek olarak tamamlama belgesini <a href="../surec/#sonrasi">Hesap İşleri'ne</a> iletin — <strong>göndermezseniz sonraki stajınızın sigortası açılamaz.</strong></span></li>
  </ul>
</div>

<style>
  /* Bu sayfaya özgü TEK kural: form fazla genişlemesin. margin-inline:auto
     KALDIRILDI — sayfayı ortalayınca metin 196px'ten başlıyordu, sitedeki
     diğer sekiz sayfa 126'dan. Artık hepsi aynı sol kenardan. */
  .md-content__inner{max-width:54rem}
</style>

<!-- Üst banner: yalnızca doğrulama HATASI/başarısızlığında görünür. Kontrol durumu Gönder butonunda gösterilir. -->
<div class="suf-gate" id="suf-gate" role="status" aria-live="polite" style="display:none">
  <span id="suf-gate-text"></span>
  <button class="suf-retry" id="suf-retry" type="button" style="display:none">Tekrar kontrol et</button>
</div>
<div class="suf-closed" id="suf-closed" role="alert" style="display:none"></div>
<div class="suf-done" id="suf-done" role="status" aria-live="polite" style="display:none"></div>

{# Form mantığı assets/submit.js içinde — TEK kaynak, TR ve EN ortak kullanır.
   Dönem/kampanya değerleri aşağıdaki data-* öznitelikleriyle oraya geçer.
   data-term SÖZLEŞME karşılaştırması içindir ve ÇEVRİLMEZ: Code.gs'teki
   CURRENT_TERM ile birebir eşleşmeli. Ekranda görünen dönem adı için
   İngilizce sayfa ayrıca data-term-display kullanır. #}
<form class="suf" id="sufForm" novalidate
  data-locale="tr"
  data-portal-url="{{ baglantilar.portal_url }}"
  data-form-key="{{ baglantilar.form_key }}"
  data-deadline="{{ donem.teslim_kilit }}"
  data-deadline-display="{{ teslim_tr }}"
  data-term="{{ donem.etiket }}"
  data-contract-version="{{ donem.contract_version | int }}"
  data-campaign-id="{{ donem.campaign_id }}"
  data-year-done="{{ donem.year_done | int }}"
  data-semester="{{ donem.semester }}"
  data-internship-start="{{ donem.staj_baslangic }}"
  data-internship-end="{{ donem.staj_bitis }}"
  data-grace-days="{{ (donem.gec_teslim_gun | default(0)) | int }}">
  <div class="suf-bar"><b>Staj Belgeleri Yükleme</b><span class="suf-term">{{ donem.etiket }}</span></div>
  <div class="suf-body">

    <div class="suf-late" id="suf-late" role="alert" style="display:none">
      <b id="suf-late-head"></b>
      <p id="suf-late-text"></p>
      <label class="suf-ack"><input type="checkbox" id="suf-ack">
        <span>Geç teslim ettiğimi ve her geç gün için staj süremden 1 iş günü düşüleceğini anladım.</span></label>
    </div>

    <div class="suf-sec">
      <h2>Öğrenci Bilgileri</h2>
      <div class="suf-grid">
        <div class="suf-field"><label for="suf-name">Ad Soyad *</label><input type="text" id="suf-name" placeholder="Ad Soyad" required aria-required="true"></div>
        <div class="suf-field"><label for="suf-sid">Öğrenci No *</label><input type="text" id="suf-sid" placeholder="20xxxxxxxx" inputmode="numeric" required aria-required="true" aria-describedby="suf-sid-warn"><small class="suf-warn" id="suf-sid-warn" aria-live="polite"></small></div>
        <div class="suf-field"><label for="suf-email">E-posta *</label><input type="email" id="suf-email" placeholder="ornek@std.bogazici.edu.tr" required aria-required="true" aria-describedby="suf-email-warn"><small class="suf-warn" id="suf-email-warn" aria-live="polite"></small></div>
      </div>
      <input type="text" class="suf-hp" id="suf-hp" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="Bu alanı boş bırakın">
    </div>

    <div class="suf-cols">
    <div class="suf-sec">
      <h2>Zorunlu Belgeler</h2>
      <label class="suf-drop" data-key="rapor"><span class="m"><b>Staj Raporu</b><span>PDF · en fazla 10 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      <label class="suf-drop" data-key="sicil"><span class="m"><b>İmzalı ve kaşeli Staj Sicil Formu</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      <label class="suf-drop" data-key="anketi"><span class="m"><b>Öğrenci Staj Anketi</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
    </div>

    <div class="suf-sec">
      <h2>Opsiyonel Belgeler</h2>
      <label class="suf-drop" data-key="cumartesi"><span class="m"><b>Cumartesi Yazısı</b><span>Hafta sonu çalıştıysanız · PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      <label class="suf-drop" data-key="dekont"><span class="m"><b>Ödeme Dekontu</b><span>Şirket iade talep ediyorsa · PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
    </div>

    </div>

    <button type="submit" class="suf-submit" id="suf-submit" disabled>Sunucu kontrol ediliyor…</button>
    <p class="suf-hint" id="suf-hint" hidden></p>
    <div class="suf-msg" id="suf-msg" role="alert" aria-live="assertive"></div>
  </div>
</form>

## Gönderemiyorsanız

- Sayfayı **sert yenileyin** (Cmd/Ctrl + Shift + R) — en sık çözüm budur.
- Tüm belgeler **PDF** olmalı; staj raporu **en fazla 10 MB**, diğer belgeler **en fazla 5 MB**, toplam **45 MB altında** olmalıdır.
- E-posta **@std.bogazici.edu.tr** uzantılı öğrenci e-postanız olmalıdır.
- İnternet/VPN bağlantınızı kontrol edip tekrar **Gönder**'e basın.
- Hâlâ yükleyemiyorsanız belgeleri **son teslim anından önce** e-posta ile
  [staj asistanlarına](iletisim.md) iletin.
