# Yayın ve Bakım Rehberi

Bu dosya **riskli işlemler** içindir: dönem devri, form anahtarı rotasyonu,
sonuç klasörü izinleri. Gündelik içerik düzenlemesi için [README.md](README.md)
yeterlidir.

> Sitenin kendisi ile Apps Script teslim portalı **birbirine bağlıdır**. İkisi
> arasındaki en küçük uyuşmazlık teslim formunu **kapatır**. Bu dosyanın büyük
> kısmı bu yüzden var.

---

## 1. Yayın nasıl çalışıyor

`main` dalına her push, `.github/workflows/deploy.yml` üzerinden şu adımları
çalıştırır:

1. `validate_workflow_actions.py` — workflow'daki action sürümlerini doğrular.
2. `pip install -r requirements.txt` (Python 3.12).
3. **Yapılandırma hazırlama:** `FORM_KEY` reposu sırrı `settings.yml`
   içindeki `form_key` alanına yazılır; `mkdocs.yml` içindeki footer
   "Son güncelleme" tarihi Türkiye saatiyle güncellenir.
4. `validate_campaign_contract.py --settings settings.yml`
5. `mkdocs build --strict`
6. GitHub Pages'e yayın.

Yayın adresi: <https://bogazici-ie-internships.github.io/staj/>

### Bilinmesi gereken üç davranış

- **`FORM_KEY` sırrı tanımlı değilse build durur.** Repo ayarlarından
  silmeyin. Sır adı geçiş sürecinde eski `PORTAL_TOKEN` adına da düşer
  (`secrets.FORM_KEY || secrets.PORTAL_TOKEN`); ikisinden **en az biri**
  tanımlı olmalıdır.
- **`settings.yml` içinde `form_key` alanı bulunamazsa build durur.** Alanı
  yeniden adlandırırsanız `deploy.yml` içindeki regex'i de güncelleyin —
  aksi halde build orada durur (sessizce boş anahtarla yayına çıkmaz).
- **Footer tarihi otomatiktir.** `mkdocs.yml` içindeki `Son güncelleme: ...`
  desenini elle silmeyin; workflow o deseni arar ve bulamazsa build
  `footer 'Son guncelleme' deseni bulunamadi` diyerek durur.
- **CI, sözleşme doğrulamasını `--code` olmadan çalıştırır.** Yani
  `settings.yml` ↔ `Code.gs` karşılaştırması CI'da **yapılmaz** (`Code.gs`
  gitignore'da olduğu için runner'da yoktur). Bu karşılaştırma **yerelde,
  elle** yapılır — bkz. bölüm 3.

---

## 2. Sözleşme (contract) nedir

Site ile Apps Script arasında **9 alan** birebir eşleşmek zorundadır. Tarayıcı
her Teslim sayfası açılışında portala bir `GET` atar ve dönen değerleri
sayfaya gömülü değerlerle karşılaştırır (`sameContract()`). Uyuşmazsa form
kapatılır ve öğrenciye "Teslim dönemi yapılandırması doğrulanamadı" denir.

| `settings.yml` → `donem.` | `Code.gs` → `CONFIG.` | Örnek |
|---|---|---|
| `contract_version` | `CONTRACT_VERSION` | `1` |
| `campaign_id` | `CAMPAIGN_ID` | `2026-summer` |
| `etiket` | `CURRENT_TERM` | `2026 Yaz` |
| `year_done` | `YEAR_DONE` | `2026` |
| `semester` | `SEMESTER` | `Summer` |
| `staj_baslangic` | `INTERNSHIP_START` | `2026-06-16` |
| `staj_bitis` | `INTERNSHIP_END` | `2026-09-12` |
| `teslim_kilit` | `DEADLINE` | `2026-10-12 10:00` |
| `gec_teslim_gun` | `LATE_GRACE_DAYS` | `10` |

**Sözleşmeye DAHİL OLMAYAN alanlar** (serbestçe değiştirilebilir):
`etiket_en` yalnızca ekranda görünen İngilizce dönem adıdır; sunucudaki hiçbir
değerle eşleşmek zorunda değildir. `takvim`, `iletisim`, `baglantilar` da
sözleşme dışıdır.

### Doğrulayıcının dayattığı biçim kuralları

`scripts/validate_campaign_contract.py` şunları reddeder:

- `contract_version` **1 değilse**. Bunu yükseltmek isterseniz doğrulayıcının
  74. satırındaki sabiti de güncellemeniz gerekir.
- `campaign_id` küçük harf + rakam + tire kalıbına uymuyorsa (`2026-summer` ✓).
- `semester` `Summer` veya `Winter` değilse.
- `staj_baslangic` / `staj_bitis` `YYYY-AA-GG` değilse.
- `teslim_kilit` `YYYY-AA-GG SS:DD` değilse (saat dilimi her iki tarafta da
  sabit **+03:00**'tür).
- `gec_teslim_gun` negatifse.

---

## 3. Dönem devri (EN RİSKLİ İŞLEM)

Yeni döneme geçerken site ve Apps Script **birlikte** güncellenmelidir. Arada
kalan sürede form kapalı kalır — bu tasarım gereğidir (hatalı veri almaktansa
kapanır), ama süreyi kısa tutmak sizin elinizde.

### Önce: zamanlama

Devri **önceki dönemin geç teslim penceresi tamamen kapandıktan sonra** yapın.
Erken yaparsanız hâlâ geç teslim hakkı olan öğrencileri kesersiniz.
Pencerenin bittiği an: `teslim_kilit` + `gec_teslim_gun` gün.

### Adımlar

1. **`settings.yml` içinde `donem:` bloğunu güncelleyin** — 9 sözleşme alanı +
   `etiket_en`. Henüz push etmeyin.

2. **`takvim:` bloğunu yeni akademik takvime göre güncelleyin** ve
   `takvim_yil` değerini yeni yıla alın.

3. **Apps Script tarafında `Code.gs` içindeki `CONFIG` bloğunu** aynı
   değerlerle güncelleyin.

4. **Yerelde sözleşmeyi doğrulayın** — CI bunu yapmaz, bu adım atlanamaz:

   ```bash
   python3 scripts/validate_campaign_contract.py --settings settings.yml --code Code.gs
   ```

   Beklenen çıktı: `campaign contract valid: v1 <campaign_id>`
   Uyuşmazlık varsa hangi alanın tutmadığını tek tek söyler ve `1` döner.

5. **Apps Script'i YENİ SÜRÜM olarak dağıtın.** Editörde kaydetmek `/exec`
   adresini güncellemez. `Dağıt → Dağıtımları yönet → Düzenle → Sürüm: Yeni
   sürüm`. Dağıtım **URL'si değişmemelidir**; değişirse `settings.yml`
   içindeki `portal_url` da güncellenmelidir.

6. **`settings.yml` değişikliğini push edin.** Build + yayın ~1-2 dakika.

7. **Doğrulayın:** Teslim sayfasını açın (sert yenileyin — `Cmd/Ctrl+Shift+R`).
   - Gönder butonu "Sunucu kontrol ediliyor…" → "Gönder" olmalı.
   - Üstte kırmızı uyarı bandı **çıkmamalı**.
   - Geri sayım yeni son teslim tarihine göre olmalı.
   - Aynı kontrolü `/en/teslim/` için de yapın.

### Devir sonrası otomatik olanlar

Bunlar için elle iş yapmanıza gerek yok:

- **Yeni Drive klasörü:** portal, teslimleri `CURRENT_TERM` adlı alt klasöre
  yazar; yoksa oluşturur. Eski dönemin klasörü dokunulmadan kalır.
- **Yeni takip tablosu:** `Teslim Listesi — <CURRENT_TERM>` adıyla o klasörde
  oluşturulur.
- **Tarayıcı önbelleği:** sözleşme önbelleğinin anahtarı `campaign_id`
  içerdiği için, dönem değişince eski önbellek kendiliğinden geçersizleşir.

---

## 4. Form anahtarı (`form_key` / `FORM_KEY`)

**Bu değer gizli değildir.** Yayınlanan HTML'in içinde açıkça görünür; Teslim
sayfasında "Kaynağı görüntüle" diyen herkes okuyabilir. Kimlik doğrulama
*değildir* — yalnızca portal adresine gelen kaba trafiği elemek için konmuş,
istendiğinde değiştirilebilir bir sürtünme katmanıdır.

Gerçek korumalar sunucu tarafındadır ve `Code.gs` içinde çalışır: öğrenci
e-postası alan kontrolü (`@std.bogazici.edu.tr`), öğrenci no biçimi, PDF imza
baytı doğrulaması, dosya/toplam boyut sınırları ve hız sınırlama.

> Repo sırrı olarak tutulmasının tek sebebi, commit atmadan
> değiştirilebilmesidir. "Sır" adlandırması yanıltıcıdır; buna güvenerek
> sunucu tarafındaki hiçbir kontrolü gevşetmeyin.

### Değiştirmek gerekirse

1. `Code.gs` içindeki `CONFIG.FORM_KEY` değerini değiştirin, **yeni sürüm
   olarak dağıtın**.
2. GitHub → repo → Settings → Secrets and variables → Actions →
   `FORM_KEY` sırrını aynı değerle güncelleyin. (Sır hâlâ eski `PORTAL_TOKEN`
   adıyla duruyorsa onu güncellemek de çalışır; workflow ikisini de kabul
   eder. Fırsat varken `FORM_KEY` adına geçirin ve `deploy.yml` içindeki
   `|| secrets.PORTAL_TOKEN` yedeğini silin.)
3. `main`'e boş bir commit atın veya workflow'u `workflow_dispatch` ile elle
   çalıştırın; site yeni anahtarla yeniden yayınlansın.

İkisi arasında kalan sürede gönderimler "Geçersiz form anahtarı." hatası alır,
o yüzden bu işlemi yoğun olmayan bir saatte yapın.

---

## 5. Sonuç klasörü izinleri

`settings.yml` → `baglantilar.sonuclar_klasoru` bir Google Drive klasörüne
işaret eder ve Sonuçlar sayfasından **doğrudan bağlanır**.

Bu klasörde öğrenci adları, numaraları ve değerlendirme sonuçları bulunur.
Paylaşım ayarı **kısıtlı** olmalıdır (yetkili kişiler / ilgili öğrenciler);
**"bağlantıya sahip herkes" OLMAMALIDIR.**

Her dönem devrinde bu ayarı elle kontrol edin — repodan doğrulanamaz.

---

## 6. Düşük riskli değişiklikler

Bunlar için özel bir sıraya gerek yok; `settings.yml` düzenleyip push etmek
yeterlidir:

- **İletişim bilgileri:** `iletisim:` bloğu. Asistan listesini alfabetik tutun.
- **Bağlantılar:** `baglantilar.kayit_formu`, `bolum_sitesi`.
- **Takvim satırları:** `takvim:` — tek gün için `tarih:`, aralık için
  `baslangic:` / `bitis:`. İngilizce karşılıkları (`*_en`) da yazın.
- **Sayfa metinleri:** `docs/*.md`. Türkçe ve İngilizce ikizleri (`*.en.md`)
  **birlikte** güncelleyin.

### Stil / script değiştirdiyseniz

`mkdocs.yml` içindeki sürüm numarasını artırın, yoksa öğrencilerin
tarayıcısında eski dosya kalır:

```yaml
extra_css:
  - assets/extra.css?v=104      # ← artırın
extra_javascript:
  - assets/submit.js?v=2        # ← artırın
```

---

## 7. Sorun giderme

**"Teslim dönemi yapılandırması doğrulanamadı"**
Site ile `Code.gs` arasında sözleşme uyuşmazlığı var. Bölüm 3, adım 4'teki
doğrulamayı yerelde çalıştırın; hangi alanın tutmadığını söyleyecektir. En sık
sebep: `Code.gs` düzenlendi ama **yeni sürüm olarak dağıtılmadı**.

**"Teslim sunucusuna ulaşılamadı"**
Portal `GET` isteğine yanıt vermiyor. Apps Script → Dağıtımlar'dan `/exec`
adresinin canlı olduğunu ve `settings.yml` içindeki `portal_url` ile
eşleştiğini doğrulayın.

**"[Staj Portalı] Yüksek gönderim hacmi" uyarı e-postası geldi**
Bu bir **engelleme değildir**. Hız sınırları bilinçli olarak kaldırıldı; hiçbir
öğrenci yoğunluk sebebiyle geri çevrilmez. E-posta yalnızca son bir saatte
`ALERT_THRESHOLD_HOUR` (varsayılan 400) eşiğinin aşıldığını bildirir ve saatte
en fazla bir kez gönderilir.

Son teslim günüyse normaldir, bir şey yapmanıza gerek yok. Beklenmedik bir
zamandaysa Drive klasörünü ve takip listesini kontrol edin, Apps Script →
Yürütmeler panelinden trafiğe bakın; kötüye kullanım varsa `FORM_KEY` değerini
değiştirip yeni sürüm dağıtın (bölüm 4).

> **Not:** Geriye kalan tek engelleyici kontrol `DEDUP_SEC`'tir (aynı
> e-postadan 3 saniye içinde ikinci gönderim). Bu, çift tıklamayı önler;
> öğrenciyi kilitlemez. Hız sınırı olmadığı için portalın üst sınırı artık
> Google'ın kendi Apps Script kotalarıdır — bunlar `CONFIG`'den yükseltilemez.

**Drive'da klasörü veya takip tablosunu elle taşıdım/sildim**
Portal, dönem klasörünün ve takip tablosunun kimliklerini `ScriptProperties`
içinde saklar (her teslimde isimle aramamak için — hız optimizasyonu).
Kimlik geçersizleşirse kod bunu yakalar, kaydı siler ve aramaya geri döner;
yani kendini onarır. Yine de bir tuhaflık görürseniz Apps Script → Proje
ayarları → Script özellikleri'nden `folderId:<campaign_id>` ve
`sheetId:<campaign_id>` satırlarını silmek yeterlidir; bir sonraki teslimde
yeniden bulunur.

**Takip tablosunun başlığını elle değiştirdim**
Başlık doğrulaması artık her teslimde değil, tablo başına saatte bir yapılır
(`HEADER_CHECK_SEC`). Elle bozulan bir başlık en geç bir saat içinde yakalanır;
hemen görmek isterseniz yukarıdaki script özelliklerini silin. Zaten başlıkları
elle değiştirmemek gerekir (bkz. bölüm 8).

**Gönderim yapamayan öğrenci**
Teslim sayfasındaki "Gönderemiyorsanız" bölümü ilk basamaktır. Çözülmezse
belgeler son teslim anından önce e-posta ile alınabilir — geç teslim
kurallarının işlemesini önlemek için gelen zamanı kayıt altına alın.

---

## 8. Yapılmaması gerekenler

- `Code.gs`'i **commit etmeyin.** `.gitignore` engelliyor; gerçek değerler
  yalnızca Apps Script editöründe ve yerelde durmalı.
- `settings.yml` içindeki `form_key` alanını **elle doldurup push etmeyin.**
  Boş kalmalı; CI dolduruyor.
- `contract_version` değerini doğrulayıcıyı güncellemeden **yükseltmeyin.**
- Takip tablosunun (`Teslim Listesi — …`) **sütun başlıklarını
  değiştirmeyin.** Portal, veri içeren bir tabloda başlık uyuşmazlığı görürse
  yazmayı reddeder ve teslim başarısız olur.
- Dönem devrini **geç teslim penceresi açıkken yapmayın.**
