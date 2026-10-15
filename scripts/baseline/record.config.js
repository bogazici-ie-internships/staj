// HISTORICAL (UPDATE-07, D-145): needs the MkDocs site and tests/legacy, which were removed with MkDocs. Run it
// from the pre-redesign tree (`git worktree add ../staj-old pre-redesign`); its output is frozen in tests/baseline/.
// Playwright config for the one-off golden recording (see record-contract.spec.js).
const base = require("../../tests/legacy/playwright.config.js");
module.exports = { ...base, testDir: __dirname, testMatch: /record-contract\.spec\.js$/, fullyParallel: false, workers: 1, retries: 0 };
