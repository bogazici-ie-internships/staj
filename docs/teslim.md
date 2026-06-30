---
hide:
  - navigation
  - toc
---

{% set _AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'] %}
{% if donem.teslim_kilit %}{% set _p = donem.teslim_kilit.split(' ') %}{% set _d = _p[0].split('-') %}{% set teslim_tr = (_d[2]|int) ~ ' ' ~ _AYLAR[(_d[1]|int)-1] ~ ' ' ~ _d[0] ~ ' ' ~ _p[1] %}{% else %}{% set teslim_tr = '' %}{% endif %}

# Teslim

<div class="staj-deadline" markdown>
<span class="staj-deadline__label">Rapor &amp; belge son teslim</span>
<span class="staj-deadline__date">{{ teslim_tr or "duyurulacak" }}</span>
<span class="staj-deadline__note">Geçici tarih; akademik takvim açıklanınca kesinleşir.</span>
<span class="staj-deadline__countdown" id="suf-countdown" aria-live="polite"></span>

Son teslim anından sonra yükleme **otomatik kapanır.** Geç kalırsanız belgeleri **e-posta ile**
[staj asistanlarına](iletisim.md) gönderebilirsiniz; her gecikme günü staj sürenizden **bir gün düşülür.**

Bu form yalnızca **online belge teslimi** içindir. Sigortanız **EK-1** ile yapıldıysa,
**tamamlama belgesini** ayrıca
[Hesap İşleri'ne](surec/index.md#sonrasi) iletmeniz gerekir.
</div>

{% if not baglantilar.portal_url or not baglantilar.portal_token %}
!!! warning "Portal henüz bağlanmadı"
    Form çalışması için `settings.yml` → `baglantilar.portal_url` ve `portal_token`
    doldurulmalı. Doldurulunca bu uyarı kendiliğinden kalkar.
{% endif %}

<style>
  .suf *{box-sizing:border-box}
  /* Teslim sayfasını rahat okunur, hizalı tek sütuna sabitle — geniş ekranda
     deadline kutusu + form aynı genişlikte hizalansın (yalnız bu sayfada). */
  .md-content__inner{max-width:54rem;margin-inline:auto;padding-inline:.8rem}
  .suf-gate,.suf-closed,.suf-done{max-width:680px;margin:1.2rem 0}
  .suf{max-width:none;margin:1.2rem auto}
  .suf{border:1px solid var(--md-default-fg-color--lightest);border-radius:8px;overflow:hidden}
  .suf-gate{padding:14px 16px;border:1px dashed var(--md-default-fg-color--lighter);border-radius:8px;color:var(--md-default-fg-color--light);font-size:.9rem}
  .suf-closed{padding:18px 20px;border:1px solid #f0a0a0;background:rgba(226,75,74,.10);border-radius:8px;color:#a32d2d;font-size:.92rem;line-height:1.55}
  .suf-done{padding:18px 20px;border:1px solid #9fe1cb;background:rgba(93,202,165,.12);border-radius:8px;color:#0f6e56;font-size:.92rem;line-height:1.6}
  .suf-bar{background:#1D4F91;border-bottom:3px solid #7CCBEE;color:#fff;padding:13px 18px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
  .suf-bar b{font-size:1rem}
  .suf-bar .dl{font-size:.72rem;color:#cfe5f5}
  .suf-body{padding:16px 18px 20px}
  .suf-sec{margin-bottom:16px}
  .suf-sec h2{font-size:.74rem;font-weight:700;color:#16335c;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .6rem;line-height:1.3;display:flex;align-items:center;gap:8px;border:0;padding:0}
  .suf-sec h2::after{display:none}   /* genel H2 altı degrade çizgisini bu mini-etiketlerde gizle */
  [data-md-color-scheme="slate"] .suf-sec h2{color:#9bc3ec}
  .suf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:10px 14px}
  .suf-cols{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}
  .suf-cols>*{min-width:0}
  @media(max-width:720px){.suf-cols{grid-template-columns:1fr;gap:0}}
  .suf-field{display:flex;flex-direction:column;gap:4px}
  .suf-field.full{grid-column:1/-1}
  .suf-field label{font-size:.78rem;color:var(--md-default-fg-color--light);font-weight:600}
  .suf-field input[type=text],.suf-field input[type=email]{height:38px;border:1px solid var(--md-default-fg-color--lighter);border-radius:6px;padding:0 10px;font:inherit;font-size:.85rem;background:var(--md-default-bg-color);color:var(--md-default-fg-color)}
  .suf-field input:focus{outline:none;border-color:#1D4F91;box-shadow:0 0 0 3px rgba(29,79,145,.14)}
  .suf-field input.bad{border-color:#e2614a}
  .suf-warn{font-size:.72rem;color:#a32d2d;margin-top:3px;display:none}
  .suf-warn.show{display:block}
  .suf-drop{position:relative;display:flex;align-items:center;gap:12px;border:1.5px dashed var(--md-default-fg-color--lighter);border-radius:8px;padding:11px 14px;margin-bottom:9px;background:var(--md-default-bg-color)}
  /* Dosya input'u görünmez ama KLAVYEYLE ODAKLANABİLİR (display:none DEĞİL); odakta .suf-drop:focus-within halkası yanar. */
  .suf-drop input[type=file]{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
  .suf-drop .m{flex:1;min-width:0}
  .suf-drop .m b{font-size:.85rem;color:var(--md-default-fg-color);display:block}
  .suf-drop .m span{font-size:.72rem;color:var(--md-default-fg-color--light);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .suf-drop .pick{font-size:.78rem;font-weight:600;color:#1D4F91;border:1px solid #1D4F91;border-radius:6px;padding:10px 14px;background:transparent;cursor:pointer;white-space:nowrap}
  .suf-drop.ok{border-style:solid;border-color:#5dcaa5;background:rgba(93,202,165,.08)}
  .suf-kvkk{display:flex;gap:9px;align-items:flex-start;font-size:.78rem;color:var(--md-default-fg-color--light);margin:4px 0 14px}
  .suf-kvkk input{margin-top:3px}
  .suf-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .suf-submit{width:100%;background:#1D4F91;color:#fff;font-size:.95rem;font-weight:700;border:none;border-radius:8px;padding:13px;cursor:pointer}
  .suf-submit:disabled{opacity:.6;cursor:not-allowed}
  .suf-msg{margin-top:12px;padding:11px 14px;border-radius:8px;font-size:.84rem;display:none}
  .suf-msg.show{display:block}
  .suf-msg.ok{background:rgba(93,202,165,.14);color:#0f6e56;border:1px solid #9fe1cb}
  .suf-msg.err{background:rgba(226,75,74,.12);color:#a32d2d;border:1px solid #f0a0a0}
  @media(max-width:720px){.suf-grid{grid-template-columns:1fr}}

  /* Koyu mod (slate): sabit hex durum/uyarı ögeleri okunur kontrasta çekilir */
  [data-md-color-scheme="slate"] .suf-closed,[data-md-color-scheme="slate"] .suf-msg.err{background:rgba(226,75,74,.18);color:#f3b0b0;border-color:rgba(240,160,160,.5)}
  [data-md-color-scheme="slate"] .suf-done,[data-md-color-scheme="slate"] .suf-msg.ok{background:rgba(93,202,165,.18);color:#86e0c3;border-color:rgba(134,224,195,.5)}
  [data-md-color-scheme="slate"] .suf-warn{color:#f3a3a3}
  [data-md-color-scheme="slate"] .suf-drop .pick{color:#7CCBEE;border-color:#7CCBEE}
  [data-md-color-scheme="slate"] .suf-field input:focus{border-color:#7CCBEE;box-shadow:0 0 0 3px rgba(124,203,238,.18)}

  /* a11y: klavye odağı görünür (dosya-seç label'ı + Gönder); 44px dokunma hedefi */
  .suf-drop .pick{min-height:44px;display:inline-flex;align-items:center;justify-content:center}
  .suf-drop:focus-within{border-style:solid;border-color:#1D4F91;box-shadow:0 0 0 3px rgba(29,79,145,.18)}
  .suf-submit:focus-visible{outline:2px solid #1D4F91;outline-offset:2px}
  [data-md-color-scheme="slate"] .suf-drop:focus-within{border-color:#7CCBEE;box-shadow:0 0 0 3px rgba(124,203,238,.22)}
  [data-md-color-scheme="slate"] .suf-submit:focus-visible{outline-color:#7CCBEE}
  @media (forced-colors:active){.suf-field input:focus,.suf-drop:focus-within{outline:2px solid Highlight}.suf-submit:focus-visible{outline:2px solid Highlight}}
</style>

<div class="suf-gate" id="suf-gate">Form yükleniyor…</div>
<div class="suf-closed" id="suf-closed" role="alert" style="display:none"></div>
<div class="suf-done" id="suf-done" role="status" aria-live="polite" style="display:none"></div>

<form class="suf" id="sufForm" novalidate style="display:none">
  <div class="suf-bar"><b>Staj Belgeleri Yükleme</b><span class="dl" id="suf-dl"></span></div>
  <div class="suf-body">

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
      <label class="suf-drop" data-key="sicil"><span class="m"><b>Staj Sicil Formu (imzalı + kaşeli)</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      <label class="suf-drop" data-key="anketi"><span class="m"><b>Öğrenci Staj Anketi</b><span>PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
    </div>

    <div class="suf-sec">
      <h2>Opsiyonel Belgeler</h2>
      <label class="suf-drop" data-key="cumartesi"><span class="m"><b>Cumartesi Yazısı</b><span>Hafta sonu çalıştıysanız · PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
      <label class="suf-drop" data-key="dekont"><span class="m"><b>Ödeme Dekontu</b><span>Şirket iade talep ediyorsa · PDF · en fazla 5 MB</span></span><span class="pick">Dosya seç</span><input type="file" accept=".pdf,application/pdf"></label>
    </div>

    </div>

    <button type="submit" class="suf-submit" id="suf-submit">Gönder</button>
    <div class="suf-msg" id="suf-msg" role="alert" aria-live="assertive"></div>
  </div>
</form>

<script>
(function () {
  var WEB_APP_URL  = "{{ baglantilar.portal_url }}";
  var SECRET_TOKEN = "{{ baglantilar.portal_token }}";
  var DEADLINE     = "{{ donem.teslim_kilit }}";
  var DEADLINE_TR  = "{{ teslim_tr }}";
  var MAX_MB = { rapor: 10, sicil: 5, anketi: 5, cumartesi: 5, dekont: 5 };  // belge başına MB; varsayılan 10
  var MAX_TOTAL_MB = 45;

  var form = document.getElementById('sufForm');
  var gate = document.getElementById('suf-gate');
  var closed = document.getElementById('suf-closed');
  if (!form) return;

  function deadlineMs(s) {
    if (!s) return null;
    var t = Date.parse(s.trim().replace(' ', 'T') + ':00+03:00');
    return isNaN(t) ? null : t;
  }
  var dlMs = deadlineMs(DEADLINE);
  var isClosed = dlMs && Date.now() > dlMs;

  gate.style.display = 'none';
  if (isClosed) {
    form.style.display = 'none';
    closed.style.display = 'block';
    closed.innerHTML = '<b>Teslim süresi doldu.</b><br>Son teslim: ' + DEADLINE_TR +
      '. Online yükleme kapanmıştır; geç teslim için lütfen ' +
      '<a href="../iletisim/">staj asistanlarıyla</a> iletişime geçin.';
    return;
  }
  form.style.display = '';
  if (dlMs) document.getElementById('suf-dl').textContent = 'Son teslim: ' + DEADLINE_TR;

  // Teslime kalan gün — sade bilgilendirici (rozet/animasyon yok).
  var cd = document.getElementById('suf-countdown');
  if (cd && dlMs) {
    var days = Math.ceil((dlMs - Date.now()) / 86400000);
    if (days >= 0) {
      cd.innerHTML = (days === 0 ? '<b>Bugün</b> son gün' : '<b>' + days + '</b> gün kaldı');
      cd.className = 'staj-deadline__countdown' + (days < 7 ? ' staj-deadline__countdown--urgent' : '');
    }
  }

  var msg = document.getElementById('suf-msg');
  var btn = document.getElementById('suf-submit');
  var picked = {};
  function showMsg(text, kind) { msg.textContent = text; msg.className = 'suf-msg show ' + kind; }
  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function syncSubmit() { btn.disabled = !['rapor', 'sicil', 'anketi'].every(function (k) { return picked[k]; }); }
  syncSubmit();

  form.querySelectorAll('.suf-drop').forEach(function (drop) {
    var input = drop.querySelector('input[type=file]');
    var key = drop.getAttribute('data-key');
    var hintEl = drop.querySelector('.m span');
    var pickEl = drop.querySelector('.pick');
    var baseHint = hintEl.textContent;   // belge açıklaması — seçim iptal/geçersiz olunca geri yüklenir
    function clearSlot() {
      delete picked[key];
      drop.classList.remove('ok');
      hintEl.textContent = baseHint;
      pickEl.textContent = 'Dosya seç';
      syncSubmit();
    }
    input.addEventListener('change', function () {
      var f = input.files[0];
      if (!f) { clearSlot(); return; }
      var isPdf = (f.type === 'application/pdf') || /\.pdf$/i.test(f.name);
      // Geçersiz dosya: önceki geçerli seçimi de TEMİZLE (yanlış dosyanın sessizce kalmasını önler).
      if (!isPdf) { showMsg(f.name + ' bir PDF değil. Yalnızca PDF dosyaları yüklenebilir.', 'err'); input.value = ''; clearSlot(); return; }
      var lim = MAX_MB[key] || 10;
      if (f.size > lim * 1024 * 1024) { showMsg(f.name + ' çok büyük (>' + lim + ' MB).', 'err'); input.value = ''; clearSlot(); return; }
      picked[key] = f;
      drop.classList.add('ok');
      hintEl.textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB';
      pickEl.textContent = 'Değiştir';
      msg.classList.remove('show');   // geçerli seçimde önceki hata mesajını gizle
      syncSubmit();
    });
  });

  var emailEl = document.getElementById('suf-email');
  var emailWarn = document.getElementById('suf-email-warn');
  emailEl.addEventListener('input', function () {
    var v = emailEl.value.trim();
    var dom = (v.split('@')[1] || '');
    var ok = !v || (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && /^std\.bogazici\.edu\.tr$/i.test(dom));
    emailWarn.textContent = ok ? '' : '@std.bogazici.edu.tr uzantılı öğrenci e-postanızı kullanmanız gerekir.';
    emailWarn.classList.toggle('show', !ok);
    emailEl.classList.toggle('bad', !ok);
  });

  var sidEl = document.getElementById('suf-sid');
  var sidWarn = document.getElementById('suf-sid-warn');
  sidEl.addEventListener('input', function () {
    var v = sidEl.value.trim();
    var ok = !v || /^20\d{8}$/.test(v);
    sidWarn.textContent = ok ? '' : 'Öğrenci no 20 ile başlayan 10 hane olmalı.';
    sidWarn.classList.toggle('show', !ok);
    sidEl.classList.toggle('bad', !ok);
  });

  function readB64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1]); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (dlMs && Date.now() > dlMs) { showMsg('Teslim süresi doldu. Yükleme kapandı.', 'err'); return; }
    if (!WEB_APP_URL || !SECRET_TOKEN) { showMsg('Portal henüz yapılandırılmadı. Lütfen staj asistanlarıyla iletişime geçin.', 'err'); return; }
    if (document.getElementById('suf-hp').value) { return; }

    var name = document.getElementById('suf-name').value.trim();
    var sid = document.getElementById('suf-sid').value.trim();
    var email = document.getElementById('suf-email').value.trim();
    if (!name || !sid || !email) { showMsg('Ad Soyad, Öğrenci No ve E-posta zorunludur.', 'err'); return; }
    if (!/^20\d{8}$/.test(sid)) { showMsg('Öğrenci numarası 20 ile başlayan 10 hane olmalı.', 'err'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showMsg('Geçerli bir e-posta girin.', 'err'); return; }
    if (!/^std\.bogazici\.edu\.tr$/i.test((email.split('@')[1] || ''))) { showMsg('Lütfen @std.bogazici.edu.tr uzantılı öğrenci e-postanızı kullanın.', 'err'); return; }
    var req = ['rapor', 'sicil', 'anketi'];
    for (var i = 0; i < req.length; i++) { if (!picked[req[i]]) { showMsg('Tüm zorunlu belgeleri yüklemeniz gerekir.', 'err'); return; } }

    var total = 0; Object.keys(picked).forEach(function (k) { total += picked[k].size; });
    if (total > MAX_TOTAL_MB * 1024 * 1024) { showMsg('Toplam boyut çok büyük (>' + MAX_TOTAL_MB + ' MB).', 'err'); return; }

    btn.disabled = true; btn.textContent = 'Gönderiliyor…'; showMsg('Belgeler yükleniyor, lütfen bekleyin…', 'ok');

    var keys = Object.keys(picked);
    // Sessizce takılan (yanıt da hata da dönmeyen) yüklemeye karşı emniyet: 180 sn sonra iptal et,
    // böylece buton "Gönderiliyor…"de sonsuza kadar kilitli kalmaz. Cömert süre → ilerleyen büyük
    // yüklemeleri kesmez, yalnız gerçek askıda kalmaları yakalar.
    var ctrl = new AbortController();
    var uploadTimer = setTimeout(function () { ctrl.abort(); }, 180000);
    Promise.all(keys.map(function (k) { return readB64(picked[k]); })).then(function (b64s) {
      var files = {};
      keys.forEach(function (k, i) { files[k] = { filename: picked[k].name, mimeType: 'application/pdf', dataB64: b64s[i] }; });
      var payload = { token: SECRET_TOKEN, name: name, studentId: sid, email: email,
        hp: document.getElementById('suf-hp').value, files: files };
      return fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal });
    }).then(function (res) {
      clearTimeout(uploadTimer);
      if (!res.ok) { throw new Error('Sunucu hatası (' + res.status + ')'); }
      return res.json().catch(function () { throw new Error('Sunucudan beklenmeyen yanıt — gönderim doğrulanamadı.'); });
    }).then(function (out) {
      if (!out || out.ok !== true) { throw new Error((out && out.error) || 'Gönderim doğrulanamadı.'); }
      var items = keys.map(function (k) { return escHtml(picked[k].name); });
      var done = document.getElementById('suf-done');
      done.innerHTML = '<b>Teslim alındı.</b><br>' + escHtml(name) + ' — ' + escHtml(sid) +
        '<br><br><b>Alınan belgeler (' + items.length + '):</b><br>• ' + items.join('<br>• ') +
        '<br><br>Bu ekran <b>teslim onayınızdır</b> — ekran görüntüsü almanız önerilir. ' +
        'Eksik belge olursa staj asistanları sizinle iletişime geçer.';
      form.style.display = 'none';
      done.style.display = 'block';
      done.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }).catch(function (err) {
      clearTimeout(uploadTimer);
      var m = String(err && err.message || err);
      if ((err && err.name === 'AbortError') || /fetch|load failed|network|networkerror/i.test(m)) {
        showMsg('Bağlantı kurulamadı. Sayfayı sert yenileyin (Cmd/Ctrl+Shift+R), bağlantınızı kontrol edip tekrar Gönder\'e basın. Sürerse son teslim anından önce belgeleri e-posta ile staj asistanlarına iletin.', 'err');
      } else {
        showMsg('Gönderim başarısız: ' + m + ' — Lütfen tekrar deneyin veya staj asistanlarıyla iletişime geçin.', 'err');
      }
      btn.disabled = false; btn.textContent = 'Gönder';
    });
  });
})();
</script>

## Sorun mu yaşıyorsunuz?

??? question "Gönderemiyorum / hata alıyorum"
    - Sayfayı **sert yenileyin** (Cmd/Ctrl + Shift + R) — en sık çözüm budur.
    - Tüm belgeler **PDF** olmalı; staj raporu **en fazla 10 MB**, diğer belgeler **en fazla 5 MB**, toplam **45 MB altında** olmalıdır.
    - E-posta **@std.bogazici.edu.tr** uzantılı öğrenci e-postanız olmalıdır.
    - İnternet/VPN bağlantınızı kontrol edip tekrar **Gönder**'e basın.
    - Hâlâ yükleyemiyorsanız belgeleri **son teslim anından önce** e-posta ile
      [staj asistanlarına](iletisim.md) iletin.
