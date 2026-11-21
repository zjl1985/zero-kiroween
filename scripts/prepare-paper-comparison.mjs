// Build separate playable A/B sites. No browser, server or publication is started.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseline = "6d1eab6609026c8332260776d5140e9f83e1d5c7";
const output = join(root, "output/paper-comparison");
const temp = mkdtempSync(join(tmpdir(), "meow-paper-baseline-"));
const checkout = join(temp, "checkout");
const run = (cmd, args, cwd = root, extra = {}) => execFileSync(cmd, args, { cwd, stdio: "inherit", ...extra });
const gitText = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const revision = gitText("rev-parse", "--short", "HEAD").trim() + (gitText("status", "--porcelain").trim() ? "-workspace" : "");
let registered = false;
try {
  run("git", ["worktree", "add", "--detach", checkout, baseline]);
  registered = true;
  // Apply identical CPU capture hooks to the frozen art baseline. These two
  // files contain only instrumentation changes relative to the baseline.
  const hooks = gitText("diff", baseline, "--", "src/main.ts", "src/render/world.ts");
  if (hooks.trim()) run("git", ["apply", "--whitespace=error", "-"], checkout, { input: hooks, stdio: ["pipe", "inherit", "inherit"] });
  for (const name of ["frame-profile.ts", "frame-review.ts"])
    cpSync(join(root, "src/render", name), join(checkout, "src/render", name));
  run("npm", ["ci", "--ignore-scripts"], checkout);
  run("npm", ["run", "build"], checkout);
  run("npm", ["run", "build"]);
  run("node", ["scripts/check-paper-gameplay.mjs", join(checkout, "dist"), join(root, "dist")]);
  // This directory contains only this script's generated artifacts.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  cpSync(join(checkout, "site"), join(output, "baseline"), { recursive: true });
  cpSync(join(root, "site"), join(output, "prototype"), { recursive: true });
  writeFileSync(join(output, "manifest.json"), JSON.stringify({ baseline, prototype: revision,
    instrumentation: "identical main/world CPU hooks and bounded frame profiler", measurements: "not collected" }, null, 2));
  const link = (folder, version, text) => `<a href="./${folder}/?start=1&amp;seed=7&amp;profile=1&amp;reviewVersion=${version}">${text}</a>`;
  writeFileSync(join(output, "index.html"), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper prototype A/B</title>
<style>body{font:18px system-ui;background:#eee4ce;color:#292336;max-width:42rem;margin:2rem auto;padding:1rem}a{display:block;padding:1rem;margin:1rem 0;border:2px solid;color:inherit}p{line-height:1.5}</style>
<h1>Playable paper A/B</h1><p>Same seed 7. Use the same character, costume, upgrades, input route and viewport. Capture each scenario separately; alternate baseline/prototype for at least three runs. No device results have been collected.</p>
${link("baseline", baseline.slice(0, 7), "A — frozen baseline 6d1eab6")}
${link("prototype", revision, "B — paper prototype")}
<p>Use the developer Frame capture panel to select a scenario, start, stop and export JSON. Pause, rotation or motion-preference changes stop a capture. Device captures and visual approval remain required.</p>`);
  console.log(`Playable A/B built: ${output}\nServe: python3 -m http.server 4174 --directory output/paper-comparison`);
} finally {
  if (registered) run("git", ["worktree", "remove", "--force", checkout]);
  rmSync(temp, { recursive: true, force: true });
}
