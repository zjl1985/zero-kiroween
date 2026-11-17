import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "src");
const compiled = join(root, "dist");
const output = join(root, "site");

// Use current source files as the allowlist, so stale tsc outputs cannot ship.
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

// site/ is generated output, never a source directory.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of ["index.html", "styles.css"]) copyFileSync(join(root, file), join(output, file));
// Explicit font/license allowlist; no arbitrary media or downloaded archives ship.
mkdirSync(join(output, "assets/fonts"), { recursive: true });
for (const file of ["AlloVariableFriendly.woff2", "Allo-Oblique.woff2", "OFL.txt", "SOURCE.txt"])
  copyFileSync(join(root, "assets/fonts", file), join(output, "assets/fonts", file));
publishModules(source);
console.log("Static site built in site/ (HTML, CSS, JavaScript and licensed fonts).");
