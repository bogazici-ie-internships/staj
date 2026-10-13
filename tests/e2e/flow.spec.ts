// Port of tests/legacy/form.spec.js onto the five-screen flow. Every legacy
// assertion is kept; where a selector or wording changed on purpose the
// mapping is in tests/MIGRATION.md (old → new).
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DEDUP_SEC } from "../../src/lib/submission/contract";
import { CONTRACT, DAY, DEADLINE, GRACE_DAYS, HOUR, SAMPLE, events, flow, open, pdf, umamiStub } from "./helpers";

test.describe("teslim formu", () => {
  test("sunucu kontrolünden sonra açılıyor (TR ve EN)", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page);
    await expect(page.locator("#suf-gate")).toBeHidden();
    await flow.toReview(page);
    await expect(page.locator("#suf-submit")).toHaveText("Onaylıyorum ve gönder");
    await expect(page.locator("#suf-submit")).toBeEnabled();

    await page.goto("en/teslim/");
    await flow.ready(page);
    await flow.toReview(page);
    await expect(page.locator("#suf-submit")).toHaveText("Confirm and submit");
  });

  test("sözleşme uyuşmazsa gönderim kilitli kalır", async ({ page }) => {
    const net = await open(page, "teslim/", { contract: { ok: true, open: true, contract: { ...CONTRACT, campaignId: "baska-donem" } } });
    await expect(page.locator("#suf-gate")).toBeVisible();
    await expect(page.locator("#suf-retry")).toBeVisible();
    await flow.toReview(page);
    await expect(page.locator("#suf-submit")).toBeDisabled();
    expect(net.posts).toHaveLength(0);
  });

  test("boş gönderimde her sorun yerinde işaretlenir, odak hata özetine gider", async ({ page }) => {
    const net = await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page);
    await flow.next(page);
    await expect(page.locator(".suf-field input[aria-invalid=true]")).toHaveCount(3);
    await expect(page.locator(".suf-summary")).toContainText("3 alanı düzeltin");
    await expect(page.locator(".suf-summary")).toBeFocused();
    await expect(page.locator("#suf-name")).toHaveAttribute("aria-invalid", "true");
    // The summary links to the field (GOV.UK pattern).
    await page.locator(".suf-summary a").first().click();
    await expect(page.locator("#suf-name")).toBeFocused();
    await expect(page.locator("#suf-hint")).toBeHidden();

    await flow.identity(page); await flow.next(page);
    await flow.next(page);                                         // Belgeler, nothing chosen
    await expect(page.locator('[data-slot][data-state="error"]')).toHaveCount(3);
    await expect(page.locator(".suf-summary li")).toHaveCount(3);
    expect(net.posts).toHaveLength(0);
  });

  test("yanlış e-posta alan adı ve öğrenci no biçimi reddedilir", async ({ page }) => {
    const net = await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page);
    await flow.identity(page, { email: SAMPLE.emailOther, sid: "1099402001" });
    await flow.next(page);
    await expect(page.locator("#suf-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#suf-sid")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".suf-field").filter({ has: page.locator("#suf-email") })).toContainText("@std.bogazici.edu.tr");
    await expect(page.locator(".suf-field").filter({ has: page.locator("#suf-sid") })).toContainText("20 ile başlayan 10 hane");
    await expect(page.locator(".suf-summary")).toBeFocused();
    expect(net.posts).toHaveLength(0);
  });

  test("dosya kuralları: PDF olmayan, 1 MB üstü EK-1, 10 MB üstü rapor, imzasız PDF", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page); await flow.identity(page);
    await flow.situation(page, "reimbursement");
    await flow.next(page);
    const rapor = page.locator('[data-slot="rapor"]');
    await flow.attach(page, "rapor", { name: "rapor.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
    await expect(rapor).toHaveAttribute("data-state", "error");
    await expect(rapor).toContainText("geçerli bir PDF dosyası değil");

    await flow.attach(page, "rapor", pdf("buyuk.pdf", 10.5 * 1024));
    await expect(rapor).toContainText("10 MB");

    // New: a renamed non-PDF is caught before upload (same check as Code.gs).
    await flow.attach(page, "rapor", { name: "rapor.pdf", mimeType: "application/pdf", buffer: Buffer.from("PK\u0003\u0004 not a pdf") });
    await expect(rapor).toContainText("geçerli bir PDF dosyası değil");

    await expect(page.locator('[data-slot="ek1"]')).toBeVisible();
    await flow.attach(page, "ek1", pdf("ek1.pdf", 1.2 * 1024));
    await expect(page.locator('[data-slot="ek1"]')).toHaveAttribute("data-state", "error");
    await expect(page.locator('[data-slot="ek1"]')).toContainText("1 MB");

    await flow.attach(page, "ek1", pdf("ek1.pdf", 900));
    await expect(page.locator('[data-slot="ek1"]')).toHaveAttribute("data-state", "added");
  });

  test("seçilen duruma ait belge zorunlu olur", async ({ page }) => {
    const net = await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page); await flow.identity(page);
    await flow.situation(page, "saturday");
    await flow.next(page);
    for (const k of ["rapor", "sicil", "anketi"]) await flow.attach(page, k, pdf(`${k}.pdf`, 20));
    await flow.next(page);
    await expect(page.locator('[data-slot="cumartesi"]')).toHaveAttribute("data-state", "error");
    expect(net.posts).toHaveLength(0);
  });

  test("sürükle-bırak dosyayı aynı kurallarla seçer", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page); await flow.identity(page); await flow.next(page);
    const file = pdf("surukle.pdf", 30);
    const dt = await page.evaluateHandle(({ b64, name }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const d = new DataTransfer();
      d.items.add(new File([bytes], name, { type: "application/pdf" }));
      return d;
    }, { b64: file.buffer.toString("base64"), name: file.name });
    // A real OS drag exposes a FileSystemEntry per item; a scripted DataTransfer
    // does not, and React Aria skips entry-less items. Give it the entry a drag would.
    await page.evaluate(() => { (DataTransferItem.prototype as any).webkitGetAsEntry = () => ({ isFile: true, isDirectory: false }); });
    const zone = '[data-slot="anketi"]';
    for (const type of ["dragenter", "dragover", "drop"]) await page.dispatchEvent(zone, type, { dataTransfer: dt });
    await expect(page.locator(zone)).toHaveAttribute("data-state", "added");
    await expect(page.locator(zone)).toContainText("surukle.pdf");
  });

  test("dosya seçilince ilk sayfa önizlemesi ve sayfa sayısı görünür", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page);
    await flow.start(page); await flow.identity(page); await flow.next(page);
    const real = { name: "gercek.pdf", mimeType: "application/pdf", buffer: readFileSync("public/belgeler/Trainee-Evaluation-Form.pdf") };
    await flow.attach(page, "sicil", real);
    await expect(page.locator('[data-slot="sicil"] img')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="sicil"]')).toContainText(/\d+ sayfa/);
  });
});

test.describe("son teslim saati", () => {
  test("geri sayım: gün+saat, sonra saat+dakika, sonra dakika", async ({ page }) => {
    await open(page, "teslim/", { at: DEADLINE - 3 * DAY });
    await expect(page.locator("#suf-countdown")).toHaveText("3 gün 0 sa kaldı");
    await page.clock.setSystemTime(new Date(DEADLINE - 2 * HOUR));
    await page.clock.runFor(31_000);
    await expect(page.locator("#suf-countdown")).toHaveText(/^1 sa 59 dk kaldı$|^2 sa 0 dk kaldı$/);
    await page.clock.setSystemTime(new Date(DEADLINE - 45 * 60e3));
    await page.clock.runFor(31_000);
    await expect(page.locator("#suf-countdown")).toContainText("dakika kaldı");
  });

  test("sayfa açıkken son teslim geçerse geç teslim onayı zorunlu olur", async ({ page }) => {
    const net = await open(page, "teslim/", { at: DEADLINE - 60e3 });
    await flow.ready(page);
    await flow.toReview(page);
    await expect(page.locator("#suf-late")).toBeHidden();
    await page.clock.runFor(3 * 60e3);
    await expect(page.locator("#suf-late")).toBeVisible();
    await expect(page.locator("#suf-late-head")).toHaveText("1 gün geç teslim");

    await flow.submit(page);
    await expect(page.locator(".suf-summary")).toContainText("geç teslim beyanını");
    expect(net.posts).toHaveLength(0);

    await page.locator("#suf-ack").check({ force: true });
    await flow.submit(page);
    await expect(page.locator("#suf-done")).toBeVisible();
    expect(net.posts).toHaveLength(1);
  });

  test("son teslim, 30 sn'lik yenilemeden önce geçse bile Gönder anında yakalanır", async ({ page }) => {
    const net = await open(page, "teslim/", { at: DEADLINE - 10e3 });
    await flow.ready(page);
    await flow.toReview(page);
    // Past the deadline WITHOUT firing timers: only the submit handler's own re-check can notice.
    await page.clock.setSystemTime(new Date(DEADLINE + 5e3));
    await flow.submit(page);
    await expect(page.locator("#suf-late")).toBeVisible();
    await expect(page.locator(".suf-summary")).toContainText("geç teslim beyanını");
    expect(net.posts).toHaveLength(0);
  });

  test("geç teslim süresi bitince form kapanır", async ({ page }) => {
    await open(page, "teslim/", { at: DEADLINE + GRACE_DAYS * DAY + HOUR });
    await expect(page.locator("#suf-closed")).toBeVisible();
    await expect(page.locator("#suf-start")).toHaveCount(0);
  });
});

test.describe("gönderim ve makbuz", () => {
  test("başarılı gönderim: veri, makbuz, odak ve indirilen dosyalar", async ({ page }) => {
    const at = DEADLINE - 2 * HOUR;
    const net = await open(page, "teslim/", { at,
      reply: () => ({ ok: true, submissionId: "3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f", submittedAt: new Date(at).toISOString(), lateDays: 0 }) });
    await flow.ready(page);
    const files = await flow.toReview(page, { flags: ["saturday"], files: { cumartesi: pdf("cumartesi.pdf", 15) } });
    await expect(page.locator(".suf-summaryline")).toContainText("4 dosya");
    await flow.submit(page);
    await expect(page.locator("#suf-done")).toBeVisible();

    const sent = net.posts[0];
    expect(sent.name).toBe(SAMPLE.name);
    expect(sent.studentId).toBe(SAMPLE.sid);
    expect(sent.campaignId).toBe(CONTRACT.campaignId);
    expect(sent.contractVersion).toBe(CONTRACT.contractVersion);
    expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent.flags).toEqual({ saturday: true, reimbursement: false });
    expect(Object.keys(sent.files).sort()).toEqual(["anketi", "cumartesi", "rapor", "sicil"]);

    await expect(page.locator(".suf-done__title")).toBeFocused();
    await expect(page.locator(".suf-done__when")).toContainText("Zamanında");
    await expect(page.locator("#suf-ref")).toHaveText("3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f");
    await expect(page.locator("#suf-submit")).toHaveCount(0);

    const links = page.locator("#suf-done a.suf-done__dl");
    await expect(links).toHaveCount(4);
    const order = ["rapor", "sicil", "anketi", "cumartesi"];
    for (let i = 0; i < order.length; i++) {
      const [dl] = await Promise.all([page.waitForEvent("download"), links.nth(i).click()]);
      expect(dl.suggestedFilename()).toBe(files[order[i]].name);
      expect(readFileSync(await dl.path()).equals(files[order[i]].buffer)).toBe(true);
    }
  });

  // REVIEW-03 Note 2 (D-134): a confirmation head, no stamp; the printed receipt is a one-page proof of submission.
  for (const late of [0, 1]) test(`makbuz başı ve yazdırma (${late ? "1 gün gecikmeli" : "zamanında"})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, `teslim/?preview=done${late ? "&late=1" : ""}`, { at: DEADLINE - 2 * DAY - 18 * HOUR });
    const head = page.locator(".suf-receipt__head");
    await expect(head.getByRole("heading", { level: 2 })).toHaveText("Belgeleriniz Alındı");
    await expect(page.locator("#suf-done-line")).toHaveText(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2} TSİ · [0-9a-f-]{36}$/);
    await expect(page.locator(".suf-stamp")).toHaveCount(0);
    await expect(page.locator("#suf-done")).not.toContainText(/ALINDI|RECEIVED/);
    const rot = await head.evaluate((el) => [el, ...el.querySelectorAll("*")].map((e) => getComputedStyle(e).transform).filter((t) => t !== "none"));
    expect(rot).toEqual([]);
    // Success colour only on the check icon: the head has no coloured background.
    expect(await head.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    // Print button beside the title on desktop.
    const [t, b] = await Promise.all([page.locator(".suf-receipt__title").boundingBox(), page.locator(".suf-receipt__save").boundingBox()]);
    expect(b!.x).toBeGreaterThan(t!.x + t!.width - 1);
    // Printed: the facts a proof of submission needs, on one page.
    await page.emulateMedia({ media: "print" });
    const receipt = page.locator("#suf-done");
    for (const want of [SAMPLE.name, SAMPLE.sid, "2026 Yaz", "Alındı", "Referans numarası", "Staj Raporu", "İmzalı ve Kaşeli Staj Sicil Formu", "Öğrenci Staj Anketi", late ? "1 gün geç" : "Zamanında"])
      await expect(receipt).toContainText(want);
    await expect(page.locator(".suf-receipt__save")).toBeHidden();
    // REVIEW-04 Note 2 (D-140): nothing that makes no sense on paper; where to write instead.
    await expect(page.locator("#suf-done a.suf-done__dl").first()).toBeHidden();
    await expect(page.locator("#suf-done").getByText("Gönderdiğiniz dosyaları indirerek")).toBeHidden();
    for (const sel of [".hdr", ".ftr", ".strip", ".duyuru"]) await expect(page.locator(sel).first()).toBeHidden();
    expect(await page.locator("#suf-done .suf-next a").first().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("none");
    await expect(page.locator(".teslim__printfoot")).toBeVisible();
    await expect(page.locator(".teslim__printfoot")).toContainText("ie.boun.internships@gmail.com");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
    const pdfBytes = (await page.pdf({ format: "A4", printBackground: true })).toString("latin1");
    expect(pdfBytes.match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(1);
  });
  test("yazdırma satırı ekranda görünmez", async ({ page }) => {
    await open(page, "teslim/?preview=done");
    await expect(page.locator("#suf-done")).toBeVisible();
    await expect(page.locator(".teslim__printfoot")).toBeHidden();
  });
  test("makbuz başı telefonda: yazdır düğmesi başlığın altında", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await open(page, "teslim/?preview=done");
    const [t, b] = await Promise.all([page.locator(".suf-receipt__title").boundingBox(), page.locator(".suf-receipt__save").boundingBox()]);
    expect(b!.y).toBeGreaterThanOrEqual(t!.y + t!.height - 1);
  });

  test("makbuz kapanış verir: başlık ve yardım çekilir, şerit 'Teslim edildi' der", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page); await flow.toReview(page);
    await expect(page.locator(".hdr__cta")).toHaveCount(0);          // no second "Belgeleri gönder" inside the flow
    await flow.submit(page);
    await expect(page.locator("#suf-done")).toBeVisible();
    await expect(page.locator(".teslim__head")).toBeHidden();
    await expect(page.locator(".teslim__help")).toBeHidden();
    await expect(page.locator("[data-deadline-strip] [data-status]")).toHaveText("Teslim edildi · 2026 Yaz");
    await expect(page.locator(".strip__chip")).toBeHidden();
    await expect(page.locator("[data-deadline-strip]")).toHaveAttribute("data-phase", "submitted");
  });

  test("gönderirken çift tıklama ikinci istek göndermez; çıkış uyarısı yalnız gönderirken", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const net = await open(page, "teslim/", {});
    await page.route("https://script.google.com/**", async (route) => {
      if (route.request().method() === "POST") await gate;
      return route.fallback();
    });
    await flow.ready(page); await flow.toReview(page);
    await flow.submit(page);
    await expect(page.locator("#suf-submit")).toBeDisabled();
    await expect(page.locator(".suf-progress")).toContainText(/Gönderiliyor · \d:\d{2}/);
    await expect(page.getByRole("button", { name: /Değiştir — Ad Soyad/ })).toBeDisabled();
    release();
    await expect(page.locator("#suf-done")).toBeVisible();
    expect(net.posts).toHaveLength(1);
  });

  test("geç gönderimde makbuz gecikmeyi sunucudan gösterir (EN)", async ({ page }) => {
    const at = DEADLINE + 2 * HOUR;
    await open(page, "en/teslim/", { at, reply: () => ({ ok: true, submissionId: "x", submittedAt: new Date(at).toISOString(), lateDays: 1 }) });
    await flow.ready(page);
    await flow.toReview(page, { ack: true });
    await flow.submit(page);
    await expect(page.locator(".suf-done__when")).toContainText("1 day late");
  });

  test("eski yanıt (zaman bilgisi yok) hatasız işlenir, satır gizlenir", async ({ page }) => {
    await open(page, "teslim/", { reply: () => ({ ok: true, submissionId: "x" }) });
    await flow.ready(page); await flow.toReview(page);
    await flow.submit(page);
    await expect(page.locator("#suf-done")).toBeVisible();
    await expect(page.locator(".suf-done__when")).toHaveCount(0);
  });

  test("İngilizce sayfada sunucu hatası sitenin metniyle gösterilir, bilgiler korunur", async ({ page }) => {
    await open(page, "en/teslim/", { reply: () => ({ ok: false, error: "Geçersiz e-posta." }) });
    await flow.ready(page); await flow.toReview(page);
    await flow.submit(page);
    await expect(page.locator("#suf-msg")).toContainText("The email address is not valid. Check it in the Student Information step.");
    await expect(page.locator("#suf-msg")).not.toContainText("Geçersiz");
    await expect(page.locator(".suf-review")).toContainText(SAMPLE.name);
    await expect(page.locator("#suf-submit")).toBeEnabled();
    await expect(page.locator("#suf-submit")).toHaveText("Try again");
  });

  test("Umami: sunucu reddi submit_error'a kodla düşer, mesaj gönderilmez", async ({ page }) => {
    await umamiStub(page);
    await open(page, "teslim/", { reply: () => ({ ok: false, error: "rapor.pdf geçerli bir PDF değil." }) });
    await flow.ready(page); await flow.toReview(page);
    await flow.submit(page);
    // REVIEW-04 Note 1 (D-137): the site's text, with the site's document name and the server's file name.
    await expect(page.locator("#suf-msg")).toContainText("Staj Raporu (rapor.pdf) geçerli bir PDF dosyası değil. Dosyayı PDF olarak kaydedip Belgeler adımında yeniden seçiniz.");
    await expect(page.locator("#suf-msg")).not.toContainText("Gönderim başarısız oldu");
    const ev = await events(page);
    expect(ev.map((e) => e[0])).toEqual(["submit_start", "submit_attempt", "submit_error"]);
    expect(ev[2][1]).toEqual({ stage: "server", code: "not_pdf", doc: "rapor" });
  });
});

// REVIEW-04 Note 1 (D-137, D-138): duplicate-submission guard — the wait, the countdown, then the cached receipt.
test.describe("çift gönderim koruması (rate_limited)", () => {
  for (const lang of ["tr", "en"] as const) test(`mesaj ve ${DEDUP_SEC} saniyelik geri sayım (${lang})`, async ({ page }) => {
    let n = 0;
    await open(page, `${lang === "en" ? "en/" : ""}teslim/`, { reply: () => (n++ === 0 ? { ok: false, error: "Az önce bir gönderim aldık; birkaç saniye sonra tekrar deneyin." }
      : { ok: true, submissionId: "3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f", submittedAt: new Date(DEADLINE - 3 * DAY).toISOString(), lateDays: 0 }) });
    await flow.ready(page); await flow.toReview(page);
    await page.clock.pauseAt(new Date(DEADLINE - 3 * DAY + 60_000));
    await flow.submit(page);
    const msg = page.locator("#suf-msg"), btn = page.locator("#suf-submit");
    await expect(msg).toContainText(lang === "tr" ? `en az ${DEDUP_SEC} saniye geçmeden` : `at least ${DEDUP_SEC} seconds have passed`);
    await expect(msg).toContainText(lang === "tr" ? "başka bir sekmeden veya cihazdan" : "another tab or device");
    await expect(msg.getByRole("link")).toHaveAttribute("href", lang === "tr" ? "/staj/iletisim/" : "/staj/en/iletisim/");
    const retry = lang === "tr" ? "Tekrar dene" : "Try again";
    await expect(btn).toHaveText(`${retry} (${DEDUP_SEC})`);
    await expect(btn).toBeDisabled();
    await page.clock.runFor(1000);
    await expect(btn).toHaveText(`${retry} (${DEDUP_SEC - 1})`);
    await page.clock.runFor(DEDUP_SEC * 1000);
    await expect(btn).toHaveText(retry);
    await expect(btn).toBeEnabled();
    await page.clock.resume();
    await flow.submit(page);
    await expect(page.locator("#suf-ref")).toHaveText("3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f");
  });
});

test.describe("Hazırlık: bu formun kullanılmadığı durumlar (REVIEW-01 Not 3)", () => {
  test("soru yok: durumlar ve yapılacaklar doğrudan bir not olarak görünür; Başla her zaman birincil", async ({ page }) => {
    await open(page, "teslim/");
    await flow.ready(page);
    await expect(page.locator("[data-fit], .suf-fit, .suf-route")).toHaveCount(0);
    const note = page.locator(".suf-exceptions");
    await expect(note).toContainText("Aşağıdaki durumlarda bu form kullanılmamalıdır");
    await expect(note.locator("li")).toHaveCount(2);
    await expect(note).toContainText("3 hafta");
    await expect(page.locator("#suf-start")).toHaveText("Başla");
    await expect(page.locator("#suf-start")).toHaveClass(/btn--primary/);
  });
  test("telefonda da belge listesi açık; aç/kapa düğmesi yok", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "teslim/");
    await expect(page.locator("#suf-docs-body")).toBeVisible();
    await expect(page.locator(".suf-docs__toggle")).toHaveCount(0);
  });
});

test("UPDATE-03 §4.5: Teslim hydration öncesi devre dışı görünür ve tıklanamaz; hydration sonrası çalışır", async ({ browser, page }) => {
  // No island script: the server HTML alone must not look or act usable.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const bare = await ctx.newPage();
  await open(bare, "teslim/");
  const pre = bare.locator(".suf");
  await expect(pre).toHaveAttribute("inert", "");
  await expect(pre).not.toHaveAttribute("data-hydrated", /.*/);
  expect(Number(await pre.locator(".btn--primary").first().evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.6);
  await ctx.close();
  // With the island: inert is lifted and the controls are drawn normally.
  await open(page, "teslim/");
  await flow.ready(page);
  const root = page.locator(".suf");
  await expect(root).toHaveAttribute("data-hydrated", "");
  await expect(root).not.toHaveAttribute("inert", /.*/);
  expect(Number(await root.locator(".btn--primary").first().evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
});
