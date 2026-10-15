// Browser tests against the BUILT site (dist/), served from disk under /staj/
// by tests/e2e/helpers.ts — no server, the Apps Script portal and reCAPTCHA are
// faked by request interception, nothing leaves the machine.
//   npm run build:test && npx playwright test
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  snapshotPathTemplate: "tests/e2e/__screenshots__/{arg}{ext}",
  use: {
    channel: process.env.PW_CHANNEL || undefined,
    timezoneId: "Europe/Istanbul",
    acceptDownloads: true,
    baseURL: "http://localhost:9999/staj/",
  },
});
