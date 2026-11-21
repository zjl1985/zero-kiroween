import assert from "node:assert/strict";
import { test } from "node:test";
import { paperLantern } from "../dist/render/paper-lantern-kit.js";
import { PAPER_LANTERNS_ART } from "../dist/defs/props/paper-lanterns/art.js";

// Canvas commands only: no raster/art approval is inferred from these tests.
class RecordedPath {
  constructor() { this.ops = []; }
}
for (const op of ["moveTo", "lineTo", "quadraticCurveTo", "closePath", "ellipse", "rect", "arc"])
  RecordedPath.prototype[op] = function (...args) { this.ops.push([op, ...args]); };
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(p) { return p; }
}
function recorder(t) {
  const calls = [];
  const createCanvas = () => {
    const canvas = { width: 160, height: 160 }, stack = [];
    let state = { globalAlpha: 0.7, globalCompositeOperation: "source-over", fillStyle: "#123456", strokeStyle: "#654321", lineWidth: 2, transform: [1, 0, 0, 1, 0, 0], clipDepth: 0 };
    const methods = {
      save() { stack.push(structuredClone(state)); },
      restore() { assert.ok(stack.length, "restore must have a matching save"); state = stack.pop(); },
      getTransform() { return new Matrix(); },
      translate(x, y) { state.transform[4] += x; state.transform[5] += y; },
      scale(x, y) { state.transform[0] *= x; state.transform[3] *= y; },
      clip(p) { calls.push({ op: "clip", path: p.ops }); state.clipDepth++; },
      fill(p) { calls.push({ op: "fill", path: p?.ops, color: state.fillStyle }); },
      stroke(p) { calls.push({ op: "stroke", path: p?.ops, color: state.strokeStyle }); },
      createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
      createPattern() { return { setTransform() {} }; },
    };
    const ctx = new Proxy({}, {
      get(_, key) {
        if (key === "canvas") return canvas;
        if (key === "state") return state;
        if (key === "depth") return stack.length;
        return key in state ? state[key] : methods[key] ?? ((...args) => {
          calls.push({ op: key, args });
          if (String(key).includes("Gradient")) assert.fail("paper lantern must not paint gradients");
        });
      },
      set(_, key, value) {
        if (key === "globalCompositeOperation") assert.ok(["source-over", "multiply"].includes(value), `no canvas erasure/additive light: ${value}`);
        if (key === "shadowBlur") assert.equal(value, 0);
        if (key === "filter") assert.ok(!/blur/.test(value));
        state[key] = value;
        return true;
      },
    });
    canvas.getContext = () => ctx;
    return canvas;
  };
  for (const [key, value] of Object.entries({ Path2D: RecordedPath, DOMMatrix: Matrix, document: { createElement: createCanvas } })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("lantern must not consume random state"));
  return { calls, ctx: createCanvas().getContext("2d") };
}

test("all lantern conditions restore caller state without gloss or canvas erasure", t => {
  const { ctx } = recorder(t), before = structuredClone(ctx.state);
  for (const condition of ["intact", "torn", "charred", "collapsed"]) {
    paperLantern(ctx, 16, 28, 0.88, "#e9a457", condition, 3);
    assert.deepEqual(ctx.state, before, condition);
    assert.equal(ctx.depth, 0, condition);
  }
  for (const phase of ["intact", "damaged", "scraps"]) for (const burnt of [false, true]) {
    PAPER_LANTERNS_ART.paint(ctx, 16, 28, 0.88, 2, phase, burnt);
    assert.deepEqual(ctx.state, before, `${phase}/${burnt}`);
    assert.equal(ctx.depth, 0);
  }
});

function polygons(ops) {
  const out = []; let points;
  for (const [op, ...args] of ops) {
    if (op === "moveTo") { points = [args]; out.push(points); }
    else if (op === "lineTo") points.push(args);
  }
  return out;
}
function area(p) {
  return p.reduce((sum, [x, y], i) => {
    const [nx, ny] = p[(i + 1) % p.length];
    return sum + x * ny - nx * y;
  }, 0) / 2;
}

test("damage keeps the intact envelope and cuts opposite-winding holes in its own path", t => {
  const { ctx, calls } = recorder(t);
  const shape = condition => {
    calls.length = 0;
    paperLantern(ctx, 0, 0, 1, "#e9a457", condition);
    return calls.find(c => c.op === "fill" && c.path)?.path;
  };
  const intact = shape("intact"), torn = shape("torn"), charred = shape("charred"), collapsed = shape("collapsed");
  assert.deepEqual(polygons(torn)[0], polygons(intact)[0]);
  assert.deepEqual(polygons(charred)[0], polygons(intact)[0]);
  const [envelope, tear] = polygons(torn);
  assert.ok(area(envelope) > 0 && area(tear) < 0, "tear removes paper with nonzero winding");
  assert.equal(charred.find(op => op[0] === "ellipse")?.at(-1), true, "burn hole is counterclockwise");
  assert.ok(Math.abs(area(polygons(collapsed)[0]) / area(envelope) - 0.28) < 1e-9, "scraps retain the original scored envelope, compressed in depth");
});

test("hanging lantern cords start on the actual intact or damaged quadratic cable", t => {
  const { ctx, calls } = recorder(t);
  for (const phase of ["intact", "damaged"]) {
    calls.length = 0;
    PAPER_LANTERNS_ART.paint(ctx, 0, 0, 1, 0, phase, false);
    const cable = calls.find(c => c.op === "stroke" && c.color === "#2e2228").path;
    const [, startX, startY] = cable[0], [, controlX, controlY, endX, endY] = cable[1];
    const hangers = calls.filter(c => c.op === "stroke" && c.color === "#362b2d");
    assert.equal(hangers.length, phase === "damaged" ? 3 : 4);
    for (const { path } of hangers) {
      const [, x, y] = path[0], t = (x - startX) / (endX - startX), u = 1 - t;
      assert.ok(Math.abs(x - (startX * u * u + 2 * controlX * u * t + endX * t * t)) < 1e-9);
      assert.ok(Math.abs(y - (startY * u * u + 2 * controlY * u * t + endY * t * t)) < 1e-9);
      assert.ok(path[1][2] > y, "hanger extends down to the lantern collar");
    }
  }
});
