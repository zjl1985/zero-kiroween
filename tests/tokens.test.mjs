import assert from "node:assert/strict";
import { test } from "node:test";
import { composeCat, parseGrid } from "../dist/cats/compose.js";
import { CAT_GRID } from "../dist/cats/grid.js";
import { getCat } from "../dist/cats/catalog.js";
import { isPixelToken, tokenColor } from "../dist/cats/tokens.js";
import { GRID_SIZE } from "../dist/cats/types.js";

test("CAT_GRID is a 32×32 token field", () => {
  assert.equal(GRID_SIZE, 32);
  assert.equal(CAT_GRID.length, 32);
  for (const [i, row] of CAT_GRID.entries()) {
    assert.equal(row.length, 32, `row ${i}`);
    for (const ch of row) {
      assert.ok(ch === "." || isPixelToken(ch), `bad token ${ch} on row ${i}`);
    }
  }
  assert.ok(parseGrid(CAT_GRID).length === 32);
});

test("tokenColor maps palette tokens, with M falling back to headDark", () => {
  const zero = getCat("zero").palette;
  const nicole = getCat("nicole").palette;
  assert.equal(tokenColor("H", zero), "#E3B686");
  assert.equal(tokenColor("M", zero), "#F0C341");
  assert.equal(tokenColor("H", nicole), "#E8C7AA");
  assert.equal(tokenColor("R", nicole), "#D98890");
  const noMark = { ...nicole };
  delete noMark.mark;
  assert.equal(tokenColor("M", noMark), nicole.headDark);
});

test("Zero and Nicole compose with their locked identifiers", () => {
  const zero = composeCat(getCat("zero"));
  const nicole = composeCat(getCat("nicole"));

  const count = (grid, token, xs, ys) => {
    let n = 0;
    for (let y = ys[0]; y <= ys[1]; y += 1) {
      for (let x = xs[0]; x <= xs[1]; x += 1) {
        if (grid[y][x] === token) n += 1;
      }
    }
    return n;
  };

  assert.ok(count(zero.cells, "M", [8, 22], [7, 12]) >= 16, "Zero gold hair");
  assert.ok(count(zero.cells, "D", [6, 25], [24, 26]) >= 10, "Zero black shirt");
  assert.ok(count(zero.accessory, "K", [7, 25], [15, 17]) >= 16, "Zero sunglasses");
  assert.ok(count(zero.accessory, "M", [10, 22], [24, 26]) >= 4, "Zero gold chain");

  assert.ok(count(nicole.cells, "D", [20, 30], [8, 26]) >= 20, "Nicole long hair on the right");
  assert.ok(count(nicole.cells, "W", [8, 16], [24, 26]) >= 4, "Nicole white collar");
  assert.ok(count(nicole.accessory, "K", [7, 24], [15, 17]) >= 8, "Nicole glasses");
  // Glasses stay hollow so an eye token remains visible in the lens box.
  const lens = nicole.cells[16][9];
  const frame = nicole.accessory[16][7];
  assert.equal(frame, "K");
  assert.ok(lens === "K" || lens === "W" || lens === "H");
});
