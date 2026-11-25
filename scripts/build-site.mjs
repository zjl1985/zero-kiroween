import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "src");
const compiled = join(root, "dist");
const output = join(root, "site");

// Fallback allowlist copy for isolated fixtures without main.js / esbuild.
function publishModules(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      publishModules(path);
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      const module = relative(source, path).replace(/\.ts$/, ".js");
      const target = join(output, "dist", module);
      const js = readFileSync(join(compiled, module), "utf8");
      mkdirSync(dirname(target), { recursive: true });
      // Development maps remain in dist/; production has no dangling map URLs.
      writeFileSync(target, js.replace(/^\/\/# sourceMappingURL=.*(?:\r?\n|$)/gm, ""));
    }
  }
}

async function bundleSite() {
  const mainEntry = join(compiled, "main.js");
  if (!existsSync(mainEntry)) {
    publishModules(source);
    return;
  }
  const { build } = await import("esbuild");
  const entryPoints = [mainEntry];
  const workerEntry = join(compiled, "render", "terrain-worker.js");
  if (existsSync(workerEntry)) entryPoints.push(workerEntry);
  await build({
    entryPoints,
    outdir: join(output, "dist"),
    outbase: compiled,
    bundle: true,
    splitting: true,
    format: "esm",
    target: "es2022",
    platform: "browser",
    sourcemap: false,
    legalComments: "none",
    chunkNames: "chunks/[name]-[hash]",
  });
}

// site/ is generated output, never a source directory.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of ["index.html", "styles.css"]) copyFileSync(join(root, file), join(output, file));
// Ship the licensed fonts and the game-ready art.
mkdirSync(join(output, "assets/fonts"), { recursive: true });
for (const file of ["AlloVariableFriendly.woff2", "Allo-Oblique.woff2", "OFL.txt", "SOURCE.txt"])
  copyFileSync(join(root, "assets/fonts", file), join(output, "assets/fonts", file));
mkdirSync(join(output, "assets/village"), { recursive: true });
copyFileSync(join(root, "assets/village/SOURCE.txt"), join(output, "assets/village/SOURCE.txt"));
for (const art of [
  "assets/characters/render/cat-reference-atlas.png",
  "assets/enemies/render/enemy-reference-atlas.png",
  "assets/upgrades/render/upgrade-card-atlas.png",
]) {
  mkdirSync(dirname(join(output, art)), { recursive: true });
  copyFileSync(join(root, art), join(output, art));
}
await bundleSite();
console.log("Static site built in site/ (HTML, CSS, JavaScript, game art and licensed fonts).");
