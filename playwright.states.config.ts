// REVIEW-03 Note 3: design/reviews/teslim-states.html from the running review servers (see tests/states/).
import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "tests/states", testMatch: /\.spec\.ts$/, workers: 1, retries: 0, reporter: "line" });
