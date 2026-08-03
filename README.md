# Boğaziçi EM — Zorunlu Staj Kılavuzu

Boğaziçi Üniversitesi Endüstri Mühendisliği Bölümü zorunlu staj sitesinin
kaynağı. Türkçe ve İngilizce yayınlanır; staj belgelerinin online teslimi de
bu site üzerinden yapılır.

**Yayında:** <https://bogazici-ie-internships.github.io/staj/>

---

## Nasıl yayınlanıyor

`main` dalına push → GitHub Actions build eder → GitHub Pages'e yayınlanır.
Elle bir adım yok; yayın 1-2 dakika sürer.

Bir sayfayı düzeltmek için GitHub arayüzünden ilgili `.md` dosyasını düzenleyip
commit'lemek yeterlidir.

> **Dönem devri, form anahtarı rotasyonu ve sonuç klasörü izinleri farklıdır.**
> Bunlar Apps Script teslim portalıyla eşgüdüm ister ve yanlış yapılırsa teslim
> formunu kapatır. Bu işlemlerden birini yapacaksanız önce
> **[DEPLOYMENT.md](DEPLOYMENT.md)** okuyun.

---

## Dosya haritası

```
docs/                 Sayfa içerikleri (Markdown)
  *.md                Türkçe  — varsayılan dil
  *.en.md             İngilizce ikizi; İKİSİ BİRLİKTE güncellenir
  surec/              Staj Süreci (çok bölümlü sayfa)
  belgeler/           İndirilebilir form ve kılavuzlar (PDF / DOCX)
  assets/
    extra.css         Sitenin tüm özel stili
    submit.js         Teslim formunun TÜM mantığı (TR + EN ortak)
    yearbar.js        Anasayfadaki yıl şeridi etkileşimi
    fonts/            Self-host Inter + Newsreader (dış istek yok)

overrides/            Material teması şablon değişiklikleri
settings.yml          Dönem, tarihler, iletişim, bağlantılar — TEK KAYNAK
mkdocs.yml            Site yapılandırması, navigasyon, eklentiler
scripts/              Yayın öncesi doğrulayıcılar
Code.gs               Apps Script teslim portalı — COMMIT EDİLMEZ (bkz. aşağı)
```

### `settings.yml` neden önemli

Düzenli değişen her şey (dönem etiketi, staj tarihleri, son teslim, akademik
takvim, e-posta adresleri, form bağlantıları) burada durur ve sayfalara makro
olarak basılır. Aynı tarihi iki yerde güncellemeye gerek yoktur — **tarihi
sayfa metnine elle yazmayın**, `settings.yml`'den gelsin.

### `Code.gs` neden repoda yok

Teslim portalının sunucu tarafıdır ve Google Drive klasör kimliğini içerir.
`.gitignore` ile dışarıda tutulur; gerçek kopyası Apps Script editöründedir.
Yerelde bir kopyası durur çünkü yayın öncesi doğrulama ona bakar.

---

## Yerelde çalıştırma

```bash
pip install -r requirements.txt
mkdocs serve
```

<http://127.0.0.1:8000> adresinde açılır; dosyaları kaydettikçe yenilenir.

Yayına gitmeden önce CI'nin çalıştırdığı kontrolün aynısı:

```bash
mkdocs build --strict
```

`--strict`, kırık iç bağlantıları ve eksik dosyaları **hata** sayar. Yerelde
geçmeyen bir şey CI'da da geçmez.

### Sözleşme doğrulaması (dönem değiştirdiyseniz)

CI bu kontrolü `Code.gs` olmadan çalıştırır, yani **site ↔ portal uyumunu
doğrulamaz**. Dönemle ilgili bir şeye dokunduysanız yerelde şunu çalıştırın:

```bash
python3 scripts/validate_campaign_contract.py --settings settings.yml --code Code.gs
```

`campaign contract valid: ...` görmüyorsanız **push etmeyin** — canlı formu
kapatırsınız. Ayrıntı: [DEPLOYMENT.md](DEPLOYMENT.md) bölüm 2-3.

---

## İki dilli içerik

Her sayfanın Türkçe (`sayfa.md`) ve İngilizce (`sayfa.en.md`) sürümü vardır ve
`mkdocs-static-i18n` bunları `/` ve `/en/` altında yayınlar.

- İçerik değişikliğinde **iki dosyayı da** güncelleyin.
- Türkçe başlıklara İngilizce tarafta bağlantı veriliyorsa çapa (`{: #… }`)
  eşleşmelidir — örneğin `sss.en.md` içindeki `{: #uygunluk-zamanlama }` bunun
  içindir.
- Navigasyon başlıklarının çevirisi `mkdocs.yml` → `nav_translations`
  altındadır.

**Teslim formunun mantığı iki dilde ortaktır** (`docs/assets/submit.js`).
Doğrulama kuralı veya akış değişikliği tek yerde yapılır; sayfalarda yalnızca
görünen etiketler ve `data-*` yapılandırması durur.

---

## Erişilebilirlik ve performans notları

Bozmamaya dikkat edilecek, bilinçli tercihler:

- Fontlar self-host; Google Fonts'a dış istek **yok**.
- Renk kontrastı açık ve koyu modda WCAG AA üzerinde tutulur; ikincil metin
  token'ları (`--md-default-fg-color--light`) her iki şemada da elle
  ayarlanmıştır.
- Dosya seçme alanları `display:none` ile değil, görsel-gizleme kalıbıyla
  saklanır — klavyeyle odaklanabilir kalmaları için.
- `prefers-reduced-motion` ve `forced-colors` desteklenir.
- `assets/*.css` / `*.js` değiştirdiyseniz `mkdocs.yml` içindeki `?v=`
  numarasını artırın.
