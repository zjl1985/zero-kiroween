import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SCENERY_PALETTE, SCENERY_SOURCE_HASH, SCENERY_SPRITES } from "../dist/render/iso/gen/scenery-pixels.js";
import { clearGenSprites, decodeRuns, drawGen, genBounds, genCanvas, genGlows, genSpriteCacheSize, GEN_SPRITES } from "../dist/render/iso/gen-sprites.js";
import { decorSprite, folkDirection, folkSprite, lampSprite, pieceSprite, propSprite, rotorSprite, yardPropSprite } from "../dist/render/iso/scenery.js";
import { ROTOR_FRAMES } from "../dist/render/iso/gen/landmarks-pixels.js";
import { PROP_PHASES } from "../dist/defs/types.js";
import { ISO_COLOUR_CAP, isoPaletteColours } from "../dist/render/iso/palette.js";
import { snap, toScreen } from "../dist/render/iso/projection.js";
import { YARD_PROPS, LAMPS } from "../dist/render/scene.js";
import { BIOME_DEFS, PROP_DEFS, TOWNSFOLK_DEFS } from "../dist/defs/registries.js";
import { BIOME_ART, LANDMARK_ART } from "../dist/render/art-index.js";

// Data contracts of the baked voxel scenery (scripts/iso-art/build.py). The art was looked at offline
// (contact sheets and frame-shot PNGs), not in a browser.
const encode = (indices) => {
  let out = "";
  for (let i = 0; i < indices.length; ) {
    let j = i + 1;
    while (j < indices.length && indices[j] === indices[i] && j - i < 255) j++;
    out += String.fromCharCode(0x100 + indices[i]);
    if (j - i > 1) out += String.fromCharCode(0x500 + j - i);
    i = j;
  }
  return out;
};

test("the run decoder round-trips the build script's encoding", () => {
  let s = 12345;
  const rand = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let n = 0; n < 20; n++) {
    const len = 1 + Math.floor(rand() * 2000), idx = [];
    for (let i = 0; i < len; i++) idx.push(rand() < 0.7 && i ? idx[i - 1] : Math.floor(rand() * 1024));
    assert.deepEqual([...decodeRuns(encode(idx), len)], idx);
  }
});

test("every sprite decodes to exactly its size with palette indices only", () => {
  const ids = Object.keys(SCENERY_SPRITES);
  assert.ok(ids.length >= 70, `${ids.length} sprites`);
  for (const id of ids) {
    const s = SCENERY_SPRITES[id];
    let total = 0;
    for (let i = 0; i < s.data.length; i++) {
      const c = s.data.charCodeAt(i);
      if (c >= 0x500) { total += c - 0x500 - 1; continue; }
      assert.ok(c >= 0x100 && c - 0x100 < SCENERY_PALETTE.length, `${id}: index in palette`);
      total++;
    }
    assert.equal(total, s.w * s.h, `${id}: runs cover the sprite exactly`);
    const idx = decodeRuns(s.data, s.w * s.h);
    assert.ok(idx.some((v) => v > 0), `${id} is not empty`);
    // Opaque pixels touch every edge of the cropped box (tight bounds).
    const col = (x) => { for (let y = 0; y < s.h; y++) if (idx[y * s.w + x]) return true; return false; };
    const row = (y) => idx.subarray(y * s.w, (y + 1) * s.w).some((v) => v > 0);
    assert.ok(col(0) && col(s.w - 1) && row(0) && row(s.h - 1), `${id}: tight crop`);
    // The foot lies inside (or on the bottom edge of) the sprite box.
    assert.ok(s.ax >= 0 && s.ax <= s.w && s.ay >= 0 && s.ay <= s.h + 1, `${id}: foot inside`);
    if (s.shadow) assert.equal(decodeRuns(s.shadow.data, s.shadow.w * s.shadow.h).every((v) => v === 0 || v === 1), true, `${id}: binary shadow mask`);
    for (const l of s.lights) {
      assert.ok(["window", "lamp", "lantern", "candle", "pumpkin"].includes(l.kind), `${id}: light kind`);
      const x = l.x + s.ax, y = l.y + s.ay;
      assert.ok(x >= 0 && x < s.w && y >= 0 && y < s.h, `${id}: emissive anchor inside the sprite`);
    }
  }
});

test("one binary-alpha palette that stays inside the colour cap together with the terrain", () => {
  assert.equal(SCENERY_PALETTE[0], "", "index 0 is transparent");
  for (const c of SCENERY_PALETTE.slice(1)) assert.match(c, /^#[0-9a-f]{6}$/, "opaque #rrggbb only");
  assert.equal(new Set(SCENERY_PALETTE).size, SCENERY_PALETTE.length, "no duplicates");
  const union = new Set([...isoPaletteColours(), ...SCENERY_PALETTE.slice(1)]);
  assert.ok(union.size <= ISO_COLOUR_CAP, `${union.size} colours with the terrain`);
});

test("the generated module matches the committed bake sources", () => {
  const h = createHash("sha256");
  for (const f of ["build.py", "voxel.py", "models.py", "world_models.py", "puppet.py", "roster.py", "reference_cats.py", "costumes.py", "enemies.py", "inputs.json"]) {
    h.update(readFileSync(new URL(`../scripts/iso-art/${f}`, import.meta.url)));
  }
  h.update(readFileSync(new URL("../assets/characters/generated/raw/zero-nicole-model-sheet.png", import.meta.url)));
  assert.equal(SCENERY_SOURCE_HASH, h.digest("hex"), "re-run scripts/iso-art/build.py after editing the models");
});

test("lights, windows and lamps carry emissive anchors; plain props do not", () => {
  const kinds = (id) => SCENERY_SPRITES[id].lights.map((l) => l.kind);
  assert.ok(kinds("yard-barn").filter((k) => k === "window").length >= 4);
  assert.ok(kinds("yard-cottage").includes("window") && kinds("yard-west-cottage").includes("window"));
  for (const id of ["lamp-iron-0", "lamp-iron-1"]) assert.ok(kinds(id).includes("lamp"), id);
  assert.ok(kinds("lamp-lantern").includes("lantern"));
  assert.ok(kinds("candles").includes("candle"));
  assert.ok(kinds("pumpkin-2").includes("pumpkin"), "the carved pumpkin glows");
  for (const id of ["rock-1", "tree-oak-1", "yard-rail", "bush-green-0"]) assert.equal(kinds(id).length, 0, id);
  const out = [];
  genGlows("yard-barn", 100, 200, out);
  assert.ok(out.every((g) => g.x === 100 && g.y === 200 && g.lift > 0));
});

test("every decor kind, district pool, yard prop and lamp resolves to a baked sprite", () => {
  for (const b of BIOME_DEFS.all()) {
    const pools = BIOME_ART.get(b.id).scenery;
    assert.ok(pools, `${b.id} dresses its decor`);
    for (const kind of ["tree", "bush", "stone", "fence", "lamp", "candles", "pumpkin", "cottage", "flowers", "tuft"])
      for (let seed = 0; seed < 12; seed++)
        for (const s of [0.5, 0.85, 1, 1.3]) {
          const id = decorSprite({ kind, s, seed }, b.id);
          assert.ok(id && SCENERY_SPRITES[id], `${b.id} ${kind} ${seed} ${s} -> ${id}`);
        }
  }
  assert.equal(decorSprite({ kind: "clock-tower", s: 1, seed: 1 }, "old-town"), null, "landmark pieces keep their own art");
  let fence = 0;
  for (const p of YARD_PROPS) assert.ok(SCENERY_SPRITES[yardPropSprite(p, p.kind === "fence" ? fence++ : 0)], p.kind);
  for (const l of LAMPS) assert.ok(SCENERY_SPRITES[lampSprite(l.s)]);
});

test("every prop phase, landmark piece, rotor frame and townsfolk pose resolves to a baked sprite", () => {
  for (const def of PROP_DEFS.all()) {
    for (const phase of PROP_PHASES) assert.ok(GEN_SPRITES[propSprite(def.id, phase, false)], `${def.id} ${phase}`);
    assert.match(propSprite(def.id, "scraps", true), /-ash$/, `${def.id} burnt scraps are ash`);
  }
  for (const art of LANDMARK_ART.all())
    for (const piece of art.pieces ?? [])
      for (let seed = 0; seed < 4; seed++)
        assert.ok(decorSprite({ kind: piece.kind, s: 1, seed }) ?? pieceSprite({ kind: piece.kind, seed }), `${art.id} ${piece.kind}`);
  const live = LANDMARK_ART.all().flatMap((a) => a.pieces ?? []).filter((p) => p.live);
  assert.ok(live.length > 0);
  for (const p of live) {
    const frames = new Set();
    for (let i = 0; i < 64; i++) frames.add(rotorSprite(p.kind, i * 0.05));
    assert.equal(frames.size, ROTOR_FRAMES, `${p.kind} cycles its finite rotor frames`);
    assert.equal(rotorSprite(p.kind, 0), rotorSprite(p.kind, Math.PI / 2), "quarter-turn symmetry");
  }
  for (const def of TOWNSFOLK_DEFS.all())
    for (const dir of ["se", "sw", "nw", "ne"]) for (const frame of [0, 1]) assert.ok(folkSprite(def.id, dir, frame), `${def.id} ${dir} ${frame}`);
  assert.equal(folkDirection(1, 0, true, 1), "se");
  assert.equal(folkDirection(0, 1, true, 1), "sw");
  assert.equal(folkDirection(-1, 0, true, 1), "nw");
  assert.equal(folkDirection(0, -1, true, 1), "ne");
  assert.equal(folkDirection(0, 0, false, -1), "sw");
});

test("baked sprites draw 1:1 at the snapped projected foot and cache one canvas per id", (t) => {
  clearGenSprites();
  const made = [];
  const fake = () => {
    const c = { width: 0, height: 0, calls: [] };
    c.getContext = () => new Proxy({}, { get: (_, k) => (k in c ? c[k] : (...a) => c.calls.push([k, ...a])), set: (_, k, v) => ((c[k] = v), true) });
    made.push(c);
    return c;
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: { createElement: fake } });
  t.after(() => { old ? Object.defineProperty(globalThis, "document", old) : delete globalThis.document; clearGenSprites(); });
  const calls = [], ctx = { drawImage: (...a) => calls.push(a), save() {}, restore() {}, globalAlpha: 1 };
  drawGen(ctx, "tree-oak-1", 300, 200);
  drawGen(ctx, "tree-oak-1", 340, 180);
  const s = SCENERY_SPRITES["tree-oak-1"], p = toScreen(300, 200);
  assert.deepEqual(calls[0].slice(1), [snap(p.x) - s.ax, snap(p.y) - s.ay]);
  assert.equal(calls[0][0], calls[1][0], "same cached canvas");
  assert.equal(genCanvas("tree-oak-1"), calls[0][0]);
  assert.equal(genSpriteCacheSize(), 1);
  const b = genBounds("tree-oak-1");
  assert.deepEqual([b.r - b.l, b.b - b.t], [s.w, s.h]);
  // The canvas is painted from palette runs, never pixel reads or images.
  const ops = new Set(made.flatMap((c) => c.calls.map((x) => x[0])));
  assert.ok([...ops].every((op) => op === "fillRect"), [...ops].join(","));
});

test("runtime and bake sources use no unseeded randomness or cat ids", () => {
  for (const f of ["src/render/iso/gen-sprites.ts", "src/render/iso/scenery.ts", "scripts/iso-art/models.py", "scripts/iso-art/voxel.py"]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /Math\.random|random\.random\(|time\.time/, f);
    assert.doesNotMatch(src, /\b(zero|nicole)\b/i, f);
  }
});
