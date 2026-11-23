import assert from "node:assert/strict";
import { test } from "node:test";
import { ISO_MATRIX, groundPass, isoEllipse, isoGround, isoPath, isoRect, projectPath } from "../dist/render/iso/ground.js";
import { toScreen } from "../dist/render/iso/projection.js";
import { BOSS } from "../dist/defs/enemies/eraser-boss/def.js";
import { inSweep } from "../dist/defs/enemies/eraser-boss/attacks.js";
import { ENEMIES } from "../dist/game/enemies.js";
import { ENEMY_ART } from "../dist/render/art-index.js";
import { drawWarningGround, drawWarningEdges } from "../dist/render/craft-enemies.js";
import { drawFireGround } from "../dist/render/craft-props.js";
import { FIRE } from "../dist/defs/fire.js";
import { createSim } from "../dist/game/sim.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";

// Geometry contracts in projected space; the iso ground was not viewed in a browser.
class Matrix {
  constructor(m = [1, 0, 0, 1, 0, 0]) { [this.a, this.b, this.c, this.d, this.e, this.f] = m; }
  scale() { return this; }
  inverse() { return this; }
  transformPoint(p) { return p; }
}
/** A Path2D stand-in whose addPath really applies the matrix to recorded vertices. */
class Path {
  constructor() { this.ops = []; }
  addPath(src, m = new Matrix()) {
    const map = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    for (const [op, ...a] of src.ops) {
      if (op === "moveTo" || op === "lineTo") this.ops.push([op, ...map(a[0], a[1])]);
      else if (op === "closePath") this.ops.push([op]);
      else this.ops.push(["unmapped", op, ...a]);
    }
  }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse", "roundRect"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
function canvas() {
  const c = { width: 64, height: 64 }, calls = [], stack = [];
  let state = { globalAlpha: 1, fillStyle: "#000", strokeStyle: "#000", lineWidth: 1 };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(clearSpriteCache);
}
const vertices = (path) => path.ops.filter(([op]) => op === "moveTo" || op === "lineTo").map(([, x, y]) => ({ x, y }));
const close = (a, b, msg) => assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, `${msg}: ${JSON.stringify([a, b])}`);

test("isoPath, isoRect and isoEllipse trace projected vertices", (t) => {
  environment(t);
  const p = new Path();
  isoRect(p, 100, 60, FIRE.cell, FIRE.cell);
  const half = FIRE.cell / 2, d = vertices(p);
  [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([u, v], i) => close(d[i], toScreen(100 + u, 60 + v), "corner"));
  // An axis-aligned square cell is a 2:1 diamond: top, right, bottom, left.
  assert.equal(d[0].x, toScreen(100, 60).x);
  assert.equal(d[1].y, d[3].y);
  assert.equal(d[1].x - d[3].x, 2 * (d[2].y - d[0].y));
  const q = new Path();
  isoPath(q, [[0, 0], { x: 10, y: 0 }]);
  close(vertices(q)[1], toScreen(10, 0), "mixed point forms");
  const e = new Path();
  isoEllipse(e, 40, 20, 30);
  const [, cx, cy, rx, ry, rot] = e.ops[0];
  close({ x: cx, y: cy }, toScreen(40, 20), "centre");
  assert.equal(rot, 0);
  assert.ok(Math.abs(rx - 2 * ry) < 1e-9, "2:1 ellipse");
  // Every world circle point lands on that ellipse.
  for (let a = 0; a < Math.PI * 2; a += 0.7) {
    const s = toScreen(40 + Math.cos(a) * 30, 20 + Math.sin(a) * 30);
    assert.ok(Math.abs(((s.x - cx) / rx) ** 2 + ((s.y - cy) / ry) ** 2 - 1) < 1e-9);
  }
});

test("isoGround projects fillRect cells, batches rows and keeps images upright", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d"), g = isoGround(ctx);
  g.fillStyle = "#123456";
  g.fillRect(0, 0, 24, 24);
  g.fillRect(0, 24, 24, 24);
  g.fillStyle = "#654321";
  const image = canvas();
  g.translate(50, 30);
  g.drawImage(image, -8, -8, 16, 16);
  g.flush();
  const fills = ctx.calls.filter((c) => c.op === "fill");
  assert.equal(fills.length, 1, "two rows of one colour make one path fill");
  assert.equal(fills[0].fillStyle, "#123456");
  const pts = vertices(fills[0].args[0]);
  close(pts[0], toScreen(0, 0), "row 1");
  close(pts[2], toScreen(24, 24), "row 1 far corner");
  close(pts[4], toScreen(0, 24), "row 2");
  assert.ok(!ctx.calls.some((c) => c.op === "fillRect"), "no unprojected rectangles");
  const draw = ctx.calls.find((c) => c.op === "drawImage");
  assert.deepEqual(draw.args.slice(1), [-8, -8, 16, 16]);
  const moves = ctx.calls.filter((c) => c.op === "translate");
  const at = toScreen(50, 30);
  assert.deepEqual(moves.at(-1).args, [Math.floor(at.x + 0.5), Math.floor(at.y + 0.5)], "image centred on its projected point");
  assert.ok(!ctx.calls.some((c) => c.op === "transform" || c.op === "setTransform" || c.op === "rotate"), "no skew on pixel images");
});

test("projectPath re-expresses a world Path2D through the projection matrix", (t) => {
  environment(t);
  const src = new Path();
  src.moveTo(10, 0); src.lineTo(10, 40); src.closePath();
  const out = projectPath(src);
  assert.equal(projectPath(src), out, "untransformed paths are memoised for fill and edge");
  close(vertices(out)[0], toScreen(10, 0), "first");
  close(vertices(out)[1], toScreen(10, 40), "second");
  assert.deepEqual([...ISO_MATRIX], [1, 0.5, -1, 0.5, 0, 0]);
});

test("the Eraser sweep warning's corners are the projected corners of the sim rectangle", (t) => {
  environment(t);
  const art = ENEMY_ART.get("eraser-boss"), R = ENEMIES["eraser-boss"].radius, half = BOSS.sweep.width / 2;
  for (const [dx, dy] of [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2], [-0.6, 0.8]]) {
    const act = { kind: "sweep", t: BOSS.sweep.telegraph / 2, x: 1500, y: 900, dx, dy };
    const e = { id: 1, kind: "eraser-boss", x: act.x, y: act.y, hp: 10, alive: true, spawnTime: 0, act };
    const warning = art.warning(e);
    // The simulation's rectangle (attacks.ts inSweep): along -R .. length, across +-width/2.
    const nx = -dy, ny = dx, a0 = { x: act.x - dx * R, y: act.y - dy * R },
      a1 = { x: act.x + dx * BOSS.sweep.length, y: act.y + dy * BOSS.sweep.length };
    const corners = [
      { x: a0.x + nx * half, y: a0.y + ny * half }, { x: a1.x + nx * half, y: a1.y + ny * half },
      { x: a1.x - nx * half, y: a1.y - ny * half }, { x: a0.x - nx * half, y: a0.y - ny * half },
    ];
    for (const c of corners) {
      const inward = { x: c.x + (act.x + dx * 100 - c.x) * 1e-3, y: c.y + (act.y + dy * 100 - c.y) * 1e-3 };
      assert.ok(inSweep(act, inward.x, inward.y), "corner of the damaging rectangle");
    }
    for (const paint of [drawWarningGround, drawWarningEdges]) {
      const ctx = canvas().getContext("2d");
      groundPass(ctx, (g) => paint(g, [warning]));
      const shape = ctx.calls.find((c) => (c.op === "fill" || c.op === "stroke") && c.args[0]?.ops?.length);
      const pts = vertices(shape.args[0]);
      assert.equal(pts.length, 4);
      corners.forEach((c, i) => close(pts[i], toScreen(c.x, c.y), `${paint.name} corner ${i}`));
    }
  }
});

test("fire cells reach the canvas as projected 24-unit diamonds", (t) => {
  environment(t);
  const sim = createSim({ cat: "zero", seed: 7 });
  const x = FIRE.cell * 20 + FIRE.cell / 2, y = FIRE.cell * 15 + FIRE.cell / 2;
  sim.fire.cells = { [`20,15`]: FIRE.burnTime };
  sim.fire.ash = {};
  const ctx = canvas().getContext("2d");
  groundPass(ctx, (g) => drawFireGround(g, sim, { x, y, width: 400, height: 400 }));
  assert.ok(!ctx.calls.some((c) => c.op === "fillRect"));
  const all = ctx.calls.filter((c) => c.op === "fill").flatMap((c) => vertices(c.args[0]));
  const top = toScreen(x - FIRE.cell / 2, y - FIRE.cell / 2), bottom = toScreen(x + FIRE.cell / 2, y + FIRE.cell / 2);
  assert.ok(all.some((p) => Math.abs(p.x - top.x) < 1e-9 && Math.abs(p.y - top.y) < 1e-9), "top corner of the cell diamond");
  assert.ok(all.some((p) => Math.abs(p.x - bottom.x) < 1e-9 && Math.abs(p.y - bottom.y) < 1e-9), "bottom corner of the cell diamond");
});
