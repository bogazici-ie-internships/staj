// Browser tests for the BUILT site. Run from this folder after `mkdocs build`:
//   npm ci && npx playwright install chromium && npx playwright test
// Locally with an installed Chrome instead of the bundled browser:
//   PW_CHANNEL=chrome npx playwright test
// SITE_DIR overrides the build folder (default: ../../site).
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.js$/,
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    channel: process.env.PW_CHANNEL || undefined,
    timezoneId: "Europe/Istanbul",
    acceptDownloads: true,
    baseURL: "http://localhost:9999/staj/",
  },
});
