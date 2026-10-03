// Submission form (/teslim/): the flows a student depends on around the deadline.
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const { CONTRACT, DEADLINE, GRACE_DAYS, HOUR, DAY, open, pdf, waitReady, fillValid } = require("./helpers");

test.describe("teslim formu", () => {
  test("sunucu kontrolünden sonra açılıyor (TR ve EN)", async ({ page }) => {
    await open(page, "teslim/");
    await waitReady(page);
    await expect(page.locator("#suf-submit")).toHaveText("Gönder");
    await expect(page.locator("#suf-gate")).toBeHidden();

    await page.goto("en/teslim/");
    await waitReady(page);
    await expect(page.locator("#suf-submit")).toHaveText("Submit");
  });

  test("sözleşme uyuşmazsa gönderim kilitli kalır", async ({ page }) => {
    const net = await open(page, "teslim/", {
      contract: { ok: true, open: true, contract: { ...CONTRACT, campaignId: "baska-donem" } },
    });
    await expect(page.locator("#suf-gate")).toBeVisible();
    await expect(page.locator("#suf-retry")).toBeVisible();
    await expect(page.locator("#suf-submit")).toBeDisabled();
    expect(net.posts).toHaveLength(0);
  });

  test("boş gönderimde her sorun yerinde işaretlenir, odak ilk hataya gider", async ({ page }) => {
    const net = await open(page, "teslim/");
    await waitReady(page);
    await page.click("#suf-submit");
    await expect(page.locator(".suf-field input.bad")).toHaveCount(3);
    await expect(page.locator(".suf-req-row .suf-drop.bad")).toHaveCount(3);
    await expect(page.locator("#suf-msg")).toContainText("Gönderilmedi: 6 alan");
    await expect(page.locator("#suf-name")).toBeFocused();
    await expect(page.locator("#suf-name")).toHaveAttribute("aria-invalid", "true");
    // The old "Eksik: …" list under the button was removed on purpose.
    await expect(page.locator("#suf-hint")).toBeHidden();
    expect(net.posts).toHaveLength(0);
  });

  test("yanlış e-posta alan adı ve öğrenci no biçimi reddedilir", async ({ page }) => {
    const net = await open(page, "teslim/");
    await waitReady(page);
    await fillValid(page);
    await page.fill("#suf-email", "ayse@gmail.com");
    await page.fill("#suf-sid", "1921405123");
    await page.click("#suf-submit");
    await expect(page.locator("#suf-email-warn")).toBeVisible();
    await expect(page.locator("#suf-sid-warn")).toBeVisible();
    await expect(page.locator("#suf-sid")).toBeFocused();
    expect(net.posts).toHaveLength(0);
  });

  test("dosya kuralları: PDF olmayan, 1 MB üstü EK-1, 10 MB üstü rapor", async ({ page }) => {
    await open(page, "teslim/");
    await waitReady(page);
    await page.setInputFiles('.suf-drop[data-key="rapor"] input', { name: "rapor.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
    await expect(page.locator('.suf-drop[data-key="rapor"]')).toHaveClass(/bad/);
    await expect(page.locator('.suf-drop[data-key="rapor"] .m span')).toContainText("PDF değil");

    await page.setInputFiles('.suf-drop[data-key="rapor"] input', pdf("buyuk.pdf", 10.5 * 1024));
    await expect(page.locator('.suf-drop[data-key="rapor"] .m span')).toContainText("10 MB");

    await page.click("#suf-sit-pay");
    await expect(page.locator("#suf-sit-pay")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#suf-rev-pay")).toBeVisible();
    await page.setInputFiles('.suf-drop[data-key="ek1"] input', pdf("ek1.pdf", 1.2 * 1024));
    await expect(page.locator('.suf-drop[data-key="ek1"]')).toHaveClass(/bad/);
    await expect(page.locator('.suf-drop[data-key="ek1"] .m span')).toContainText("1 MB");

    await page.setInputFiles('.suf-drop[data-key="ek1"] input', pdf("ek1.pdf", 900));
    await expect(page.locator('.suf-drop[data-key="ek1"]')).toHaveClass(/ok/);
  });

  test("seçilen duruma ait belge zorunlu olur", async ({ page }) => {
    const net = await open(page, "teslim/");
    await waitReady(page);
    await fillValid(page);
    await page.click("#suf-sit-sat");
    await page.click("#suf-submit");
    await expect(page.locator('.suf-drop[data-key="cumartesi"]')).toHaveClass(/bad/);
    expect(net.posts).toHaveLength(0);
  });

  test("sürükle-bırak dosyayı aynı kurallarla seçer", async ({ page }) => {
    await open(page, "teslim/");
    await waitReady(page);
    const file = pdf("surukle.pdf", 30);
    const dt = await page.evaluateHandle(({ b64, name }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const d = new DataTransfer();
      d.items.add(new File([bytes], name, { type: "application/pdf" }));
      return d;
    }, { b64: file.buffer.toString("base64"), name: file.name });
    await page.dispatchEvent('.suf-drop[data-key="anketi"]', "drop", { dataTransfer: dt });
    await expect(page.locator('.suf-drop[data-key="anketi"]')).toHaveClass(/ok/);
    await expect(page.locator('.suf-drop[data-key="anketi"] .m span')).toContainText("surukle.pdf");
  });
});

test.describe("son teslim saati", () => {
  test("geri sayım: gün, sonra saat ve dakika", async ({ page }) => {
    await open(page, "teslim/", { at: DEADLINE - 3 * DAY });
    await expect(page.locator("#suf-countdown")).toHaveText("3 gün kaldı");
    await page.clock.setSystemTime(new Date(DEADLINE - 2 * HOUR));
    await page.clock.runFor(31_000);
    await expect(page.locator("#suf-countdown")).toHaveText("2 saat kaldı");
    await page.clock.setSystemTime(new Date(DEADLINE - 45 * 60e3));
    await page.clock.runFor(31_000);
    await expect(page.locator("#suf-countdown")).toContainText("dakika kaldı");
  });

  test("sayfa açıkken son teslim geçerse geç teslim onayı zorunlu olur", async ({ page }) => {
    const net = await open(page, "teslim/", { at: DEADLINE - 60e3 });
    await waitReady(page);
    await expect(page.locator("#suf-late")).toBeHidden();
    await fillValid(page);
    await page.clock.runFor(3 * 60e3);
    await expect(page.locator("#suf-late")).toBeVisible();
    await expect(page.locator("#suf-late-head")).toHaveText("1 gün geç teslim");

    await page.click("#suf-submit");
    await expect(page.locator("#suf-msg")).toContainText("geç teslim onayını");
    expect(net.posts).toHaveLength(0);

    await page.check("#suf-ack");
    await page.click("#suf-submit");
    await expect(page.locator("#suf-done")).toBeVisible();
    expect(net.posts).toHaveLength(1);
  });

  test("son teslim, 30 sn'lik yenilemeden önce geçse bile Gönder anında yakalanır", async ({ page }) => {
    const net = await open(page, "teslim/", { at: DEADLINE - 10e3 });
    await waitReady(page);
    await fillValid(page);
    // Move the clock past the deadline WITHOUT firing timers: only the
    // submit handler's own re-check can notice.
    await page.clock.setSystemTime(new Date(DEADLINE + 5e3));
    await page.click("#suf-submit");
    await expect(page.locator("#suf-late")).toBeVisible();
    await expect(page.locator("#suf-msg")).toContainText("geç teslim onayını");
    expect(net.posts).toHaveLength(0);
  });

  test("geç teslim süresi bitince form kapanır", async ({ page }) => {
    await open(page, "teslim/", { at: DEADLINE + GRACE_DAYS * DAY + HOUR });
    await expect(page.locator("#suf-closed")).toBeVisible();
    await expect(page.locator("#sufForm")).toBeHidden();
  });
});

test.describe("gönderim ve onay ekranı", () => {
  test("başarılı gönderim: veri, onay ekranı, odak ve indirilen dosyalar", async ({ page }) => {
    const at = DEADLINE - 2 * HOUR;
    const net = await open(page, "teslim/", {
      at,
      reply: () => ({ ok: true, submissionId: "3f9c2a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f",
        submittedAt: new Date(at).toISOString(), lateDays: 0 }),
    });
    await waitReady(page);
    const files = await fillValid(page);
    await page.click("#suf-sit-sat");
    files.cumartesi = pdf("cumartesi.pdf", 15);
    await page.setInputFiles('.suf-drop[data-key="cumartesi"] input', files.cumartesi);
    await page.click("#suf-submit");
    await expect(page.locator("#suf-done")).toBeVisible();

    const sent = net.posts[0];
    expect(sent.name).toBe("Ayşe Yılmaz");
    expect(sent.studentId).toBe("2021405123");
    expect(sent.campaignId).toBe(CONTRACT.campaignId);
    expect(sent.contractVersion).toBe(CONTRACT.contractVersion);
    expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent.flags).toEqual({ saturday: true, reimbursement: false });
    expect(Object.keys(sent.files).sort()).toEqual(["anketi", "cumartesi", "rapor", "sicil"]);

    await expect(page.locator(".suf-done__title")).toBeFocused();
    await expect(page.locator(".suf-done__when")).toContainText("Zamanında");
    await expect(page.locator("#sufForm")).toBeHidden();

    const links = page.locator("#suf-done a.suf-done__dl");
    await expect(links).toHaveCount(4);
    const order = ["rapor", "sicil", "anketi", "cumartesi"];
    for (let i = 0; i < order.length; i++) {
      const [dl] = await Promise.all([page.waitForEvent("download"), links.nth(i).click()]);
      expect(dl.suggestedFilename()).toBe(files[order[i]].name);
      expect(fs.readFileSync(await dl.path()).equals(files[order[i]].buffer)).toBe(true);
    }
  });

  test("geç gönderimde onay ekranı gecikmeyi sunucudan gösterir (EN)", async ({ page }) => {
    const at = DEADLINE + 2 * HOUR;
    await open(page, "en/teslim/", {
      at, reply: () => ({ ok: true, submissionId: "x", submittedAt: new Date(at).toISOString(), lateDays: 1 }),
    });
    await waitReady(page);
    await fillValid(page);
    await page.check("#suf-ack");
    await page.click("#suf-submit");
    await expect(page.locator(".suf-done__when")).toContainText("1 day late");
  });

  test("eski yanıt (zaman bilgisi yok) hatasız işlenir, satır gizlenir", async ({ page }) => {
    await open(page, "teslim/", { reply: () => ({ ok: true, submissionId: "x" }) });
    await waitReady(page);
    await fillValid(page);
    await page.click("#suf-submit");
    await expect(page.locator("#suf-done")).toBeVisible();
    await expect(page.locator(".suf-done__when")).toHaveCount(0);
  });

  test("İngilizce sayfada Türkçe sunucu hatası çevrilir", async ({ page }) => {
    await open(page, "en/teslim/", { reply: () => ({ ok: false, error: "Geçersiz e-posta." }) });
    await waitReady(page);
    await fillValid(page);
    await page.click("#suf-submit");
    await expect(page.locator("#suf-msg")).toContainText("Invalid email address.");
    await expect(page.locator("#suf-msg")).not.toContainText("Geçersiz");
    // The form stays filled so the student can simply try again.
    await expect(page.locator("#suf-name")).toHaveValue("ayşe yılmaz");
    await expect(page.locator("#suf-submit")).toBeEnabled();
  });
});
