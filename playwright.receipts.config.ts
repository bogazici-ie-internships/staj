// REVIEW-04 Note 2: sample receipt PDFs (tests/receipts/). Built by `npm run receipts`.
import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "tests/receipts", testMatch: /\.spec\.ts$/, workers: 1, retries: 0, reporter: "line",
  use: { timezoneId: "Europe/Istanbul", baseURL: "http://localhost:9999/staj/" } });
