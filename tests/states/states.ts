// REVIEW-03 Note 3 (D-136): every Teslim step and state, in the order design/reviews/teslim-states.html shows them.
// One table drives the page generator (tests/states/teslim-states.spec.ts), its captions, and the e2e check that
// every ?preview= mode renders (tests/e2e/teslim-states.spec.ts).
// Builds = the review servers (REVIEW-GUIDE.md): main 4321 (deadline 12.10.2026 10:00), late 4322 (deadline
// 08.10.2026 10:00), closed 4323 (deadline 20.09.2026, late window ended 30.09.2026).

export type Build = "main" | "late" | "closed";
export const PORT: Record<Build, number> = { main: 4321, late: 4322, closed: 4323 };
export const BUILD_DIR: Record<Build, string> = { main: "dist-review-main", late: "dist-review-gec-teslim", closed: "dist-review-kapali" };
/** The moment each build is photographed at (TSİ): open with 2 d 18 h left; 6 h into the late window (1 late day). */
export const CLOCK: Record<Build, string> = { main: "2026-10-09T16:00:00+03:00", late: "2026-10-08T16:00:00+03:00", closed: "2026-10-11T12:00:00+03:00" };

export interface State {
  id: string; group: string; title: string; caption: string; build: Build;
  /** Path under /staj/ (TR; EN adds en/). */ rel: string;
  /** A selector that must be visible once the state is on screen. */ ready: string;
  print?: boolean;
}

export const GROUPS = [
  { id: "g1", title: "1. Teslim açılmadan önce" },
  { id: "g2", title: "2. Teslim açık, zamanında" },
  { id: "g3", title: "3. Geç teslim süresi" },
  { id: "g4", title: "4. Teslim kapalı" },
  { id: "g5", title: "5. Makbuzun yazdırılmış / PDF hâli" },
];

/** State 1 has no screen: the site has no "before it opens" phase (src/lib/phase.ts: unlocked, open, late, closed). */
export const NO_PREOPEN = "Sitede böyle bir aşama yok. Form, dönem başından son teslim tarihine kadar açıktır (src/lib/phase.ts: open → late → closed). settings.yml'de son teslim boş bırakılırsa form süresiz açık kalır (\"unlocked\"); Teslim ekranı \"Açık\" durumuyla aynıdır.";

export const STATES: State[] = [
  { id: "hazirlik", group: "g2", build: "main", rel: "teslim/?preview=hazirlik", ready: ".suf-prep", title: "Hazırlık", caption: "İlk ekran: bu formun kullanılmadığı durumlar ve hazırlanacak belgeler." },
  { id: "kimlik", group: "g2", build: "main", rel: "teslim/?preview=kimlik", ready: "#suf-name", title: "Kimlik", caption: "Öğrenci Bilgileri; örnek değerler dolu (Örnek Öğrenci, 2099402001)." },
  { id: "kimlik-hata", group: "g2", build: "main", rel: "teslim/?preview=kimlik-hata", ready: ".suf-summary", title: "Kimlik hata özeti", caption: "\"İleri\" sonrası: üstte hata özeti (bağlantılı), alanlarda satır içi hatalar." },
  { id: "belgeler-bos", group: "g2", build: "main", rel: "teslim/?preview=belgeler-bos", ready: "[data-slot=rapor]", title: "Belgeler (boş)", caption: "Hiç dosya seçilmemiş; cumartesi seçili olduğu için dört alan." },
  { id: "belgeler-dosyalar", group: "g2", build: "main", rel: "teslim/?preview=belgeler-dosyalar", ready: "[data-slot=rapor] img", title: "Belgeler (dosyalar seçili)", caption: "Dört PDF seçili; ilk sayfa önizlemesi, sayfa sayısı ve boyut." },
  { id: "belgeler-hata", group: "g2", build: "main", rel: "teslim/?preview=belgeler", ready: "[data-slot=anketi]", title: "Belgeler dosya hatası", caption: "İki dosya seçili; ankete PDF olmayan bir dosya seçilmiş (hata ve çözüm)." },
  { id: "kontrol", group: "g2", build: "main", rel: "teslim/?preview=kontrol", ready: "#suf-submit", title: "Kontrol", caption: "Bilgilerin Kontrolü: her satırda Değiştir, beyan ve gönder düğmesi." },
  { id: "sending", group: "g2", build: "main", rel: "teslim/?preview=sending", ready: ".suf-progress", title: "Gönderiliyor", caption: "Dosyalar hazırlanırken / gönderilirken; düğmeler kilitli." },
  { id: "fail", group: "g2", build: "main", rel: "teslim/?preview=fail", ready: "#suf-msg", title: "Hata (bağlantı)", caption: "Ağ hatası: bilgiler ve dosyalar korunur, \"Tekrar dene\"." },
  { id: "red", group: "g2", build: "main", rel: "teslim/?preview=red", ready: "#suf-msg", title: "Hata (sunucu reddi)", caption: "Sunucu gönderimi reddetti; sunucunun metni değil sitenin kendi metni gösterilir (REVIEW-04 Not 1). Örnek: çift gönderim koruması; \"Tekrar dene\" 3 saniyelik geri sayımla kilitli. Tüm kodlar ve metinler: review04-review.md." },
  { id: "sozlesme", group: "g2", build: "main", rel: "teslim/?preview=sozlesme", ready: ".suf-gate", title: "Sözleşme uyuşmazlığı", caption: "Portalın dönem bilgisi siteyle uyuşmuyor: gönderim kapalı, uyarı bandı." },
  { id: "done", group: "g2", build: "main", rel: "teslim/?preview=done", ready: "#suf-done", title: "Makbuz (zamanında)", caption: "Yeni onay başlığı (REVIEW-03 Not 2): tarih/saat · referans; Zamanında." },
  { id: "kurtarma", group: "g2", build: "main", rel: "teslim/?preview=kurtarma", ready: "[data-recovery]", title: "Kurtarma bandı", caption: "Bu cihazda yarım kalmış bir teslim var: Devam et / Sil." },
  { id: "late-hazirlik", group: "g3", build: "late", rel: "teslim/?preview=hazirlik", ready: ".suf-prep", title: "Hazırlık (geç teslim)", caption: "Geç teslim süresi: gecikme ve gün düşümü uyarısı." },
  { id: "late-kontrol", group: "g3", build: "late", rel: "teslim/?preview=kontrol", ready: "#suf-late", title: "Kontrol (geç teslim)", caption: "Geç teslim uyarısı ve onay kutusu (işaretli) gönder düğmesinin üstünde." },
  { id: "late-done", group: "g3", build: "late", rel: "teslim/?preview=done", ready: "#suf-done", title: "Makbuz (1 gün geç)", caption: "Gecikmeli makbuz: \"1 gün geç\" etiketi." },
  { id: "late-home", group: "g3", build: "late", rel: "", ready: "main", title: "Ana sayfa (geç teslim)", caption: "Pano geç teslim durumunda: geç teslim sonuna kalan süre." },
  { id: "closed", group: "g4", build: "closed", rel: "teslim/", ready: "#suf-closed", title: "Teslim kapalı", caption: "Geç teslim süresi bitti: form yerine kapalı ekranı. Bu derlemede ?preview= adımları da bu ekranı gösterir; yalnızca ?preview=done makbuzu açık tutar (süre makbuzdan sonra biterse olduğu gibi)." },
  { id: "closed-home", group: "g4", build: "closed", rel: "", ready: "main", title: "Ana sayfa (kapalı)", caption: "Pano kapalı durumunda." },
  { id: "print", group: "g5", build: "main", rel: "teslim/?preview=done", ready: "#suf-done", print: true, title: "Makbuz yazdırma (zamanında)", caption: "Yazdırma görünümü (print CSS): tek sayfa; ad, numara, dönem, alınma zamanı, referans, belge listesi. Tek sayfa olduğu e2e'de PDF ile doğrulanır." },
  { id: "print-late", group: "g5", build: "late", rel: "teslim/?preview=done", ready: "#suf-done", print: true, title: "Makbuz yazdırma (1 gün geç)", caption: "Gecikmeli makbuzun yazdırma görünümü." },
];
