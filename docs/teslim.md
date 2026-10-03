---
description: "Staj raporu ve belgelerin online teslimi: son teslim tarihi ve saati, geç teslim kuralı, yükleme formu ve gönderemezseniz ne yapmalı."
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

  <p class="staj-status__rule">Son teslimden sonra <strong>{{ (donem.gec_teslim_gun | default(0)) | int }} gün</strong> daha yükleme açıktır. Bu sürede <strong>her geç gün için staj sürenizden 1 iş günü düşülür</strong>; süre bitince <strong>online yükleme kapanır</strong>.</p>

  <ul class="staj-status__exceptions">
    <li><span class="staj-status__if">Ders dönemi içinde staj yaptıysanız (ör. Erasmus/değişim)</span> <span class="staj-status__then"><strong>bu formu kullanmayın.</strong> Belgeleri staj bitiminden <strong>en geç 3 hafta içinde</strong> <a href="../iletisim/">e-posta ile</a> gönderin (<a href="../sss/#uygunluk-zamanlama">SSS: Uygunluk &amp; Zamanlama</a>).</span></li>
    <li><span class="staj-status__if">Mezuniyet için yalnızca stajınız kaldıysa</span> <span class="staj-status__then"><strong>bu formu kullanmayın.</strong> Belgeleri <a href="../iletisim/">genel staj e-postasına</a> gönderin.</span></li>
    <li><span class="staj-status__if">Sigortanız EK-1 ile açıldıysa</span> <span class="staj-status__then">bu form <strong>yetmez</strong>: şirketinizden aldığınız tamamlama belgesini ayrıca <a href="../surec/#sonrasi">Hesap İşleri'ne</a> iletin. <strong>Göndermezseniz sigorta kapanmaz; başka zorunlu staj yapamazsınız.</strong></span></li>
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
  data-recaptcha-site-key="{{ baglantilar.recaptcha_site_key }}"
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
        <div class="suf-field"><label for="suf-name">Ad Soyad *</label><input type="text" id="suf-name" placeholder="ör. Ayşe Yılmaz" autocomplete="name" maxlength="80" required aria-required="true" aria-describedby="suf-name-warn"><small class="suf-warn" id="suf-name-warn" aria-live="polite"></small></div>
        <div class="suf-field"><label for="suf-sid">Öğrenci No *</label><input type="text" id="suf-sid" placeholder="20xxxxxxxx" inputmode="numeric" maxlength="10" autocomplete="off" required aria-required="true" aria-describedby="suf-sid-warn"><small class="suf-warn" id="suf-sid-warn" aria-live="polite"></small></div>
        <div class="suf-field"><label for="suf-email">E-posta *</label><input type="email" id="suf-email" placeholder="ornek@std.bogazici.edu.tr" autocomplete="email" spellcheck="false" required aria-required="true" aria-describedby="suf-email-warn"><small class="suf-warn" id="suf-email-warn" aria-live="polite"></small></div>
      </div>
      <input type="text" class="suf-hp" id="suf-hp" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="Bu alanı boş bırakın">
    </div>

    <div class="suf-sec">
      <h2>Zorunlu belgeler</h2>
      <div class="suf-req-row">
        <label class="suf-drop" data-key="rapor"><span class="m"><b>Staj Raporu</b><span>PDF · en fazla 10 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
        <label class="suf-drop" data-key="sicil"><span class="m"><b>İmzalı ve Kaşeli Staj Sicil Formu</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
        <label class="suf-drop" data-key="anketi"><span class="m"><b>Öğrenci Staj Anketi</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      </div>
    </div>

    <div class="suf-sec suf-sit">
      <p class="suf-sit__sub">Size uyan durumları seçin. Seçtikleriniz için aşağıdaki PDF’ler zorunlu olur. Hiçbiri size uymuyorsa bu bölümü boş bırakın.</p>
      <div class="suf-sit-grid">
        <button type="button" class="suf-sit-card" id="suf-sit-sat" aria-pressed="false" aria-controls="suf-rev-sat" data-reveal="suf-rev-sat" data-flag="saturday">
          <span class="suf-sit-card__mark" aria-hidden="true"></span>
          <span class="suf-sit-card__tag">Cumartesi</span>
          <span class="suf-sit-card__title">Hafta sonu çalıştım</span>
          <span class="suf-sit-card__desc">Şirketin imzalı veya kaşeli Cumartesi Yazısı’nı yüklemeniz gerekir.</span>
        </button>
        <button type="button" class="suf-sit-card" id="suf-sit-pay" aria-pressed="false" aria-controls="suf-rev-pay" data-reveal="suf-rev-pay" data-flag="reimbursement">
          <span class="suf-sit-card__mark" aria-hidden="true"></span>
          <span class="suf-sit-card__tag">Devlet katkısı</span>
          <span class="suf-sit-card__title">Şirket staj ücretime devlet katkısı talep ediyor</span>
          <span class="suf-sit-card__desc">Ödeme dekontu veya bordro ile staj başında kullanılan aynı EK-1 gerekir.</span>
        </button>
      </div>

      <div class="suf-sit-reveal" id="suf-rev-sat" hidden>
        <h3 class="suf-sit-reveal__h">Cumartesi için yükleyin</h3>
        <div class="suf-reveal-row suf-reveal-row--one">
          <label class="suf-drop suf-drop--req" data-key="cumartesi"><span class="m"><b>Cumartesi Yazısı *</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
        </div>
      </div>

      <div class="suf-sit-reveal" id="suf-rev-pay" hidden>
        <h3 class="suf-sit-reveal__h">Devlet katkısı için yükleyin</h3>
        <p class="suf-sit-reveal__note">Yüklemeden önce EK-1’in eksiksiz doldurulduğundan emin olun.</p>
        <div class="suf-reveal-row">
          <label class="suf-drop suf-drop--req" data-key="dekont"><span class="m"><b>Ödeme Dekontu veya Bordro *</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
          <label class="suf-drop suf-drop--req" data-key="ek1"><span class="m"><b>EK-1 Formu *</b><span>PDF · en fazla 1 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
        </div>
      </div>
    </div>

    <p class="suf-captcha-note" id="suf-captcha-note" hidden>
      Bu form reCAPTCHA ile korunur.
      Google <a href="https://policies.google.com/privacy" rel="noopener">Gizlilik Politikası</a>
      ve <a href="https://policies.google.com/terms" rel="noopener">Hizmet Şartları</a> geçerlidir.
    </p>
    <button type="submit" class="suf-submit" id="suf-submit" disabled>Sunucu kontrol ediliyor…</button>
    <div class="suf-msg" id="suf-msg" role="alert" aria-live="assertive"></div>
  </div>
</form>
<noscript><p class="suf-noscript">Teslim formu tarayıcınızda <b>JavaScript açıkken</b> çalışır. Açamıyorsanız belgeleri son teslim anından önce e-posta ile <a href="../iletisim/">staj asistanlarına</a> iletin.</p></noscript>

## Gönderemiyorsanız

- Tüm belgeler **PDF** olmalı; staj raporu **en fazla 10 MB**, EK-1 **en fazla 1 MB**, diğer belgeler **en fazla 5 MB**, toplam **45 MB altında** olmalıdır.
- E-posta **@std.bogazici.edu.tr** uzantılı öğrenci e-postanız olmalıdır.
- İnternet/VPN bağlantınızı kontrol edip aynı **Gönder** düğmesine yeniden basın. Bilgileriniz ve
  seçtiğiniz dosyalar sayfada kalır; bu yüzden önce yenilemeyin.
- Düğme "Sunucu kontrol ediliyor…" yazısında takılı kalıyorsa sayfayı **sert yenileyin**
  (Cmd/Ctrl + Shift + R). Yenileme seçtiğiniz dosyaları temizler; dosyaları yeniden seçmeniz gerekir.
- Hâlâ yükleyemiyorsanız belgeleri **son teslim anından önce** e-posta ile
  [staj asistanlarına](iletisim.md) iletin.
