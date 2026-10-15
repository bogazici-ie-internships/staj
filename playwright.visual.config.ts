import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "tests/visual",
  // Linux (Docker/CI) and local macOS baselines never mix.
  snapshotPathTemplate: `tests/visual/__screenshots__/${process.env.VISUAL_PLATFORM || "local"}/{arg}{ext}`,
  use: { ...base.use },
});
