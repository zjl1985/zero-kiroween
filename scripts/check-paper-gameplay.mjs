// Compare full serializable sim state under identical inputs, without a browser.
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const [basePath, nextPath] = process.argv.slice(2);
if (!basePath || !nextPath) throw new Error("Usage: node scripts/check-paper-gameplay.mjs <baseline/dist> <prototype/dist>");
const load = (directory) => import(pathToFileURL(join(resolve(directory), "game/sim.js")).href);
const [baseline, prototype] = await Promise.all([load(basePath), load(nextPath)]);
const serialize = (value) => JSON.parse(JSON.stringify(value));
let compared = 0;
for (const cat of ["zero", "nicole"]) for (const seed of [7, 45]) {
  const a = baseline.createSim({ cat, seed }), b = prototype.createSim({ cat, seed });
  for (let frame = 0; frame < 1800; frame++) {
    const side = Math.floor(frame / 450) % 4;
    const input = { ax: [1, 0, -1, 0][side], ay: [0, 1, 0, -1][side], dash: frame % 240 === 0 };
    if (a.pendingChoice) baseline.chooseUpgrade(a, 0);
    if (b.pendingChoice) prototype.chooseUpgrade(b, 0);
    baseline.step(a, input, 1 / 60);
    prototype.step(b, input, 1 / 60);
    if (frame % 120 === 0 || frame === 1799) {
      assert.deepEqual(serialize(b), serialize(a), `${cat}, seed ${seed}, frame ${frame}: simulation changed`);
      compared++;
    }
  }
}
console.log(`Gameplay A/B: ${compared} full-state comparisons passed (2 cats × 2 seeds × 1800 fixed input steps). Not a full-run playtest.`);
