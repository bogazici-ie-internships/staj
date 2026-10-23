// Strings produced by code at run time (deadline strip, board, submission
// flow states, validation and server errors). Page copy lives in
// src/content/**/*.yaml; these are the messages a component composes.
// `satisfies Record<Lang, Ui>` makes a missing English (or Turkish) key a type error.
import type { Lang } from "../lib/dates";

export interface Ui {
  strip: { open: string; late: string; closed: string; unlocked: string; deadline: string; deadlineShort: string; closes: string; zone: string };
  flow: {
    checking: string; gateMismatch: string; gateUnreachable: string; unavailable: string; retryCheck: string;
    closedTitle: string; closedBody: string;
    lateHead: (days: number) => string; lateText: (deadline: string, days: number, closesAt: string) => string;
    lateAck: string;
    summaryTitle: string; summaryCount: (n: number) => string;
    errName: string; errSidRequired: string; errSid: string; errEmailRequired: string; errEmailInvalid: string; errEmailDomain: string;
    errAck: string; errFileMissing: string; errNotPdf: (name: string) => string; errTooLarge: (name: string, mb: number) => string;
    fixNotPdf: string; fixTooLarge: string;
    errTotal: (mb: number) => string; errClosed: string; errNotVerified: string; errRequestId: string;
    errCaptcha: string; errCaptchaLoad: string; errServer: (status: number) => string; errUnexpected: string; errUnverified: string;
    errNetwork: string; errNetworkLate: (closes: string) => string; errFailed: (m: string) => string; retry: string; notSent: string; submitted: string;
    preparing: (n: number, total: number) => string; sending: string; confirmed: string; doNotClose: string;
    summaryLine: (files: number, size: string) => string;
    late: (days: number) => string; previewUnavailable: string; removed: (doc: string) => string; added: (doc: string) => string;
    downloadLabel: (doc: string) => string;
  };
}

const mbFmt = (lang: Lang, mb: number) => mb.toLocaleString(lang === "en" ? "en-GB" : "tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const formatMb = mbFmt;
/** A file or total size with its unit (D-181, RELEASE-CHECK R-07): below 0.1 MB in KB, so a small file never reads "0,0 MB". */
export function formatSize(lang: Lang, bytes: number): string {
  const MiB = 1024 * 1024;
  if (bytes < 0.1 * MiB) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(lang === "en" ? "en-GB" : "tr-TR")} KB`;
  return `${mbFmt(lang, bytes / MiB)} MB`;
}

export const ui = {
  tr: {
    strip: { open: "Teslim açık", late: "Geç teslim açık", closed: "Teslim kapandı", unlocked: "Son teslim tarihi duyurulacaktır", deadline: "Son teslim", deadlineShort: "Son:", closes: "Kapanış", zone: "TSİ" },
    flow: {
      checking: "Sunucu bağlantısı kontrol ediliyor…",
      gateMismatch: "Teslim dönemi yapılandırması doğrulanamadı. Güvenlik nedeniyle gönderim devre dışı bırakılmıştır; yeniden kontrol ediniz veya staj asistanlarına başvurunuz.",
      gateUnreachable: "Teslim sunucusuna ulaşılamadı. Bilgileriniz ve seçtiğiniz dosyalar bu sayfada korunur; bağlantınızı kontrol ederek yeniden deneyiniz.",
      unavailable: "Teslim formu şu anda kullanılamıyor. Staj asistanlarıyla iletişime geçiniz.",
      retryCheck: "Yeniden kontrol et",
      closedTitle: "Bu Dönemin Teslim Süresi Sona Erdi",
      closedBody: "Teslim yapmanız gerekiyorsa belgelerinizi **zip dosyası** olarak, durumunuzu açıklayan bir e-posta ile [staj asistanlarına](page:iletisim) iletiniz.",
      lateHead: (d) => `${d} gün geç teslim`,
      lateText: (dl, d, c) => `Son teslim tarihi ${dl} idi. Tesliminiz ${d} gün gecikmiştir; her geç gün için toplam staj süresinden 1 iş günü düşülür. Online teslim en geç ${c} tarihinde kapanır.`,
      lateAck: "Geç teslim ettiğimi ve her geç gün için toplam staj süremden 1 iş günü düşüleceğini kabul ederim.",
      summaryTitle: "Düzeltilmesi Gereken Alanlar",
      summaryCount: (n) => `Devam etmeden önce ${n} alanı düzeltiniz.`,
      errName: "Adınızı ve soyadınızı giriniz.",
      errSidRequired: "Öğrenci numaranızı giriniz.",
      errSid: "Öğrenci numarası 20 ile başlayan 10 haneden oluşmalıdır.",
      errEmailRequired: "Öğrenci e-posta adresinizi giriniz.",
      errEmailInvalid: "Geçerli bir e-posta adresi giriniz; ör. ornek.ogrenci@std.bogazici.edu.tr",
      errEmailDomain: "@std.bogazici.edu.tr uzantılı öğrenci e-posta adresinizi kullanınız.",
      errAck: "Devam etmek için geç teslim beyanını onaylayınız.",
      errFileMissing: "Bu belge için bir dosya seçiniz.",
      errNotPdf: (n) => `${n} geçerli bir PDF dosyası değil veya dosya bozuk.`,
      errTooLarge: (n, mb) => `${n} dosyası çok büyük; en fazla ${mb} MB olmalıdır.`,
      fixNotPdf: "Belgeyi Word'de veya tarayıcınızda “PDF olarak kaydet” seçeneğiyle yeniden dışa aktararak seçiniz.",
      fixTooLarge: "PDF dosyasını sıkıştırınız veya belgeyi daha düşük çözünürlükte tarayarak yeniden seçiniz.",
      errTotal: (mb) => `Dosyaların toplam boyutu ${mb} MB'tan küçük olmalıdır.`,
      errClosed: "Teslim süresi sona ermiştir. Online teslim kapanmıştır.",
      errNotVerified: "Teslim sunucusu henüz doğrulanmadı. Kontrolün tamamlanmasını bekleyiniz veya yeniden deneyiniz.",
      errRequestId: "Tarayıcı güvenli bir gönderim kimliği oluşturamadı. Sayfayı yenileyerek yeniden deneyiniz.",
      errCaptcha: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyerek yeniden deneyiniz.",
      errCaptchaLoad: "Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyerek yeniden deneyiniz.",
      errServer: (s) => `Sunucu hatası (${s})`,
      errUnexpected: "Sunucudan beklenmeyen bir yanıt alındı; gönderim doğrulanamadı.",
      errUnverified: "Gönderim doğrulanamadı.",
      errNetwork: "Bağlantı kurulamadı. Bilgileriniz ve seçtiğiniz dosyalar korunur: bağlantınızı kontrol ederek Tekrar dene düğmesine basınız. Sayfa yenilense bile bilgileriniz ve dosyalarınız bu cihazda 24 saat saklanır. Sorun devam ederse belgelerinizi son teslim tarihinden önce e-posta ile staj asistanlarına iletiniz.",
      // D-181 (RELEASE-CHECK R-08): during the late window the deadline has passed.
      errNetworkLate: (closes) => `Bağlantı kurulamadı. Bilgileriniz ve seçtiğiniz dosyalar korunur: bağlantınızı kontrol ederek Tekrar dene düğmesine basınız. Sayfa yenilense bile bilgileriniz ve dosyalarınız bu cihazda 24 saat saklanır. Sorun devam ederse belgelerinizi geç teslim süresi sona ermeden önce e-posta ile staj asistanlarına iletiniz. Geç teslim süresi ${closes} tarihinde sona erer.`,
      errFailed: (m) => `Gönderim başarısız oldu: ${m} Yeniden deneyiniz veya staj asistanlarına başvurunuz.`,
      retry: "Tekrar dene",
      notSent: "Gönderilemedi",
      submitted: "Teslim edildi",
      preparing: (n, t) => `Dosya hazırlanıyor ${n}/${t}`,
      sending: "Gönderiliyor",
      confirmed: "Onaylandı",
      doNotClose: "Onay ekranı görüntülenene kadar sayfayı kapatmayınız. Büyük dosyalarda bu işlem 1–2 dakika sürebilir.",
      summaryLine: (f, size) => `${f} dosya · ${size}`,
      late: (d) => `${d} gün geç`,
      previewUnavailable: "Önizleme gösterilemiyor; dosya yine de kontrol edilmiştir.",
      removed: (d) => `${d} kaldırıldı.`,
      added: (d) => `${d} eklendi.`,
      downloadLabel: (d) => `${d} dosyasını indir`,
    },
  },
  en: {
    strip: { open: "Submission open", late: "Late submission open", closed: "Submission closed", unlocked: "Deadline to be announced", deadline: "Deadline", deadlineShort: "Due:", closes: "Closes", zone: "GMT+3" },
    flow: {
      checking: "Checking the server connection…",
      gateMismatch: "The submission-term configuration could not be verified. Submission has been disabled for security reasons; check again or contact the internship assistants.",
      gateUnreachable: "The submission server could not be reached. Your details and selected files remain on this page; check your connection and try again.",
      unavailable: "The submission form is currently unavailable. Contact the internship assistants.",
      retryCheck: "Check again",
      closedTitle: "The Submission Period for This Term Has Ended",
      closedBody: "If you still need to submit, email your documents as a **zip file** to the [internship assistants](page:iletisim) with an explanation of your circumstances.",
      lateHead: (d) => `${d} ${d === 1 ? "day" : "days"} late`,
      lateText: (dl, d, c) => `The deadline was ${dl}. Your submission is ${d} ${d === 1 ? "day" : "days"} late; 1 workday is deducted from the total internship period for each late day. Online submission closes on ${c}.`,
      lateAck: "I acknowledge that I am submitting late and that 1 workday will be deducted from my total internship period for each late day.",
      summaryTitle: "Fields That Need Correction",
      summaryCount: (n) => `Correct ${n} ${n === 1 ? "field" : "fields"} before continuing.`,
      errName: "Enter your full name.",
      errSidRequired: "Enter your student ID number.",
      errSid: "The student ID number must consist of 10 digits beginning with 20.",
      errEmailRequired: "Enter your student email address.",
      errEmailInvalid: "Enter a valid email address, e.g. ornek.ogrenci@std.bogazici.edu.tr",
      errEmailDomain: "Use your student email address ending in @std.bogazici.edu.tr.",
      errAck: "Confirm the late-submission statement to continue.",
      errFileMissing: "Choose a file for this document.",
      errNotPdf: (n) => `${n} is not a valid PDF file, or the file is damaged.`,
      errTooLarge: (n, mb) => `${n} is too large; the maximum size is ${mb} MB.`,
      fixNotPdf: "Export the document again using “Save as PDF” in Word or your browser, and choose the new file.",
      fixTooLarge: "Compress the PDF or scan the document at a lower resolution, then choose it again.",
      errTotal: (mb) => `The total file size must be less than ${mb} MB.`,
      errClosed: "The submission period has ended. Online submission is closed.",
      errNotVerified: "The submission server has not been verified yet. Wait for the check to complete or try again.",
      errRequestId: "The browser could not create a secure submission ID. Refresh the page and try again.",
      errCaptcha: "The security verification could not be completed. Refresh the page and try again.",
      errCaptchaLoad: "The security verification could not be loaded. Refresh the page and try again.",
      errServer: (s) => `Server error (${s})`,
      errUnexpected: "An unexpected response was received from the server; the submission could not be verified.",
      errUnverified: "The submission could not be verified.",
      errNetwork: "The connection could not be established. Your details and selected files are kept: check your connection and select Try again. Even if the page is refreshed, your details and files are kept on this device for 24 hours. If the problem persists, email your documents to the internship assistants before the deadline.",
      errNetworkLate: (closes) => `The connection could not be established. Your details and selected files are kept: check your connection and select Try again. Even if the page is refreshed, your details and files are kept on this device for 24 hours. If the problem persists, email your documents to the internship assistants before the late-submission window closes. The late-submission window closes on ${closes}.`,
      errFailed: (m) => `The submission failed: ${m} Try again or contact the internship assistants.`,
      retry: "Try again",
      notSent: "Not sent",
      submitted: "Submitted",
      preparing: (n, t) => `Preparing file ${n}/${t}`,
      sending: "Sending",
      confirmed: "Confirmed",
      doNotClose: "Do not close this page until the confirmation screen appears. With large files this may take 1–2 minutes.",
      summaryLine: (f, size) => `${f} ${f === 1 ? "file" : "files"} · ${size}`,
      late: (d) => `${d} ${d === 1 ? "day" : "days"} late`,
      previewUnavailable: "A preview cannot be shown; the file has nevertheless been checked.",
      removed: (d) => `${d} removed.`,
      added: (d) => `${d} added.`,
      downloadLabel: (d) => `Download ${d}`,
    },
  },
} satisfies Record<Lang, Ui>;
