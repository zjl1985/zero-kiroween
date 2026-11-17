import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const site = new URL("site/", root);
const json = (name) => JSON.parse(readFileSync(new URL(name, root), "utf8"));
function files(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory() ? files(new URL(`${entry.name}/`, directory), `${path}/`) : [path];
  }).sort();
}

test("Vercel builds the isolated static site without a catch-all HTML rewrite", () => {
  const config = json("vercel.json"), pkg = json("package.json");
  assert.equal(config.framework, null);
  assert.equal(config.installCommand, "npm ci");
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "site");
  assert.equal(config.rewrites, undefined, "missing modules must remain 404s, not HTML");
  assert.ok(pkg.scripts.start.endsWith("--directory site"), "local preview serves the deployment artifact");
  const headers = config.headers.find((rule) => rule.source === "/(.*)").headers;
  assert.ok(headers.some((h) => h.key === "Cache-Control" && h.value.includes("must-revalidate")), "unhashed assets must revalidate");
  assert.equal(json("package-lock.json").packages[""].engines.node, pkg.engines.node);
});

test("the published site contains only entry files and current compiled modules", () => {
  const modules = files(new URL("src/", root)).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"));
  const expected = ["index.html", "styles.css", ...modules.map((f) => `dist/${f.replace(/\.ts$/, ".js")}`)].sort();
  assert.deepEqual(files(site), expected);
  for (const file of ["index.html", "styles.css"])
    assert.equal(readFileSync(new URL(file, site), "utf8"), readFileSync(new URL(file, root), "utf8"));
});

test("the production entry and every ES module dependency resolve inside the published site", () => {
  const published = new Set(files(site));
  const html = readFileSync(new URL("index.html", site), "utf8");
  const assets = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map((m) => m[1]).filter((url) => !url.startsWith("data:"));
  assert.ok(assets.includes("./dist/main.js"));
  assert.ok(assets.includes("./styles.css"));
  for (const asset of assets) assert.ok(published.has(asset.replace(/^\.\//, "")), `entry asset: ${asset}`);
  let imports = 0;
  for (const file of published) {
    if (!file.endsWith(".js")) continue;
    const module = new URL(file, site), js = readFileSync(module, "utf8");
    assert.doesNotMatch(js, /sourceMappingURL=/, `${file}: no dangling development source map`);
    for (const { fileName: specifier } of ts.preProcessFile(js, true, true).importedFiles) {
      imports++;
      assert.match(specifier, /^\.\.?\//, `${file}: browser import must be relative`);
      const target = new URL(specifier, module);
      assert.ok(target.href.startsWith(site.href), `${file}: import stays within site/`);
      assert.ok(published.has(decodeURIComponent(target.href.slice(site.href.length))), `${file}: missing ${specifier}`);
    }
  }
  assert.ok(imports > 0, "checked the module graph, not just the entry file");
});

test("packaging removes old site output and excludes stale modules, maps and private files", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "midnight-meow-deploy-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const put = (path, text) => {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    writeFileSync(join(fixture, path), text);
  };
  put("src/nested/live.ts", "export const value: number = 7;\n");
  put("dist/nested/live.js", "export const value = 7;\n//# sourceMappingURL=live.js.map\n");
  put("dist/nested/live.js.map", "{}");
  put("dist/removed.js", "stale module");
  put("src/types.d.ts", "export type Value = number;");
  put("site/stale.js", "previous deployment");
  put(".agents/private.md", "private task state");
  put("index.html", '<script type="module" src="./dist/nested/live.js"></script>');
  put("styles.css", "body { margin: 0; }");
  mkdirSync(join(fixture, "scripts"));
  copyFileSync(new URL("scripts/build-site.mjs", root), join(fixture, "scripts/build-site.mjs"));
  execFileSync(process.execPath, [join(fixture, "scripts/build-site.mjs")], { cwd: tmpdir(), timeout: 10000 });
  assert.deepEqual(readdirSync(join(fixture, "site")).sort(), ["dist", "index.html", "styles.css"]);
  assert.deepEqual(readdirSync(join(fixture, "site/dist")), ["nested"]);
  assert.deepEqual(readdirSync(join(fixture, "site/dist/nested")), ["live.js"]);
  assert.equal(readFileSync(join(fixture, "site/dist/nested/live.js"), "utf8"), "export const value = 7;\n");
  assert.equal(readFileSync(join(fixture, "dist/removed.js"), "utf8"), "stale module", "packaging does not delete development files");
  assert.equal(readFileSync(join(fixture, ".agents/private.md"), "utf8"), "private task state");
});
