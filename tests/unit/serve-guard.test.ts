// UPDATE-07 (D-150): a review server (`serve.mjs --review`, implied by `--host`) serves only a fake-portal build —
// it refuses to start on any other folder, and answers 503 once its folder is overwritten by another build.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

const real = "dist-guardtest-real", fake = "dist-guardtest-fake";
function build(dir: string, fakePortal: boolean) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(`${dir}/_astro`, { recursive: true });
  writeFileSync(`${dir}/index.html`, "<!doctype html><title>t</title>");
  writeFileSync(`${dir}/404.html`, "404");
  writeFileSync(`${dir}/_astro/Submission.abc.js`, "export const x = 1;");
  if (fakePortal) writeFileSync(`${dir}/_astro/fake-portal.abc.js`, 'console.info("[staj-fake-portal] review build");');
}
afterAll(() => { for (const d of [real, fake]) rmSync(d, { recursive: true, force: true }); });

describe("review servers serve only fake-portal builds", () => {
  it("refuse to start on a production/test build (--review and --host)", () => {
    build(real, false);
    for (const flag of ["--review", "--host"]) {
      const r = spawnSync("node", ["scripts/serve.mjs", flag, "--port", "4491", "--dir", real], { encoding: "utf8", timeout: 5000 });
      expect(r.status, flag).toBe(1);
      expect(r.stderr).toContain("not a fake-portal build");
    }
  });
  it("serve a fake-portal build, and stop serving it (503) once it is replaced", async () => {
    build(fake, true);
    const p = spawn("node", ["scripts/serve.mjs", "--review", "--port", "4492", "--dir", fake]);
    try {
      await new Promise<void>((ok, bad) => { p.stdout.on("data", () => ok()); p.on("exit", (c) => bad(new Error(`exited ${c}`))); });
      expect((await fetch("http://localhost:4492/staj/")).status).toBe(200);
      rmSync(`${fake}/_astro/fake-portal.abc.js`);          // e.g. a test build written into the same folder
      await new Promise((r) => setTimeout(r, 2100));          // the check is cached for 2 s
      expect((await fetch("http://localhost:4492/staj/")).status).toBe(503);
    } finally { p.kill(); }
  });
});
