import assert from "node:assert/strict";
import test from "node:test";
import { WEAPON_DEFS } from "../dist/defs/registries.js";
import { createClock, FIXED_DT } from "../dist/game/clock.js";
import { chooseUpgrade, createSim, snapshot, step } from "../dist/game/sim.js";
import {
  ISO_IMPACT_FX, ISO_WEAPON_FX, paintFire, paintFlight, paintImpact, paintLoot, paintOrbit,
} from "../dist/render/iso/fx-paint.js";
import { beginIsoFx, ISO_FX_LIMIT } from "../dist/render/iso/fx-frame.js";
import { Painter, createFrame } from "../dist/render/pixelfx/index.js";
import { HIT_STOP, hitStopCause, presentationHitShake, presentationSteps } from "../dist/render/timeline.js";

function pixels(paint) {
  const f = createFrame(160, 112, -80, -56);
  paint(new Painter(f));
  return f;
}

test("every defined weapon has a pixel effect and all impact recipes expire", () => {
  assert.deepEqual(Object.keys(ISO_WEAPON_FX).sort(), WEAPON_DEFS.ids().sort());
  assert.ok(ISO_FX_LIMIT.impacts > 0 && ISO_FX_LIMIT.impacts < 100);
  for (const [kind, { life }] of Object.entries(ISO_IMPACT_FX)) {
    const effect = { kind, life: life * .65, x: 3, y: 5, amount: 4, seed: 79 };
    for (const reduced of [false, true]) {
      const mid = pixels((p) => paintImpact(p, effect, reduced));
      assert.ok(mid.color.some(Boolean), kind);
      assert.deepEqual(mid, pixels((p) => paintImpact(p, effect, reduced)), kind);
      const end = pixels((p) => paintImpact(p, { ...effect, life: 0 }, reduced));
      assert.ok(!end.color.some(Boolean) && !end.light.some(Boolean), kind);
    }
  }
});

test("effect particles repeat for an impact seed and vary across seeds", (t) => {
  t.mock.method(Math, "random", () => assert.fail("visuals use seeded randomness"));
  const mark = { kind: "dissolve", life: .6, x: 0, y: 0, seed: 781 };
  const a = pixels((p) => paintImpact(p, mark, false));
  assert.deepEqual(a, pixels((p) => paintImpact(p, mark, false)));
  assert.notDeepEqual(a.color, pixels((p) => paintImpact(p, { ...mark, seed: 782 }, false)).color);
});

test("pixel weapons, pick-ups and fire have distinct visible silhouettes and fixed reduced poses", () => {
  const shot = { id: 7, x: 0, y: 0, vx: 40, vy: -40, life: .5, alive: true };
  const visuals = [
    (p, t) => paintFlight(p, shot, t, true),
    (p, t) => paintFlight(p, { ...shot, echo: true }, t, true),
    (p, t) => paintFlight(p, { ...shot, weapon: "crane" }, t, true),
    (p, t) => paintFlight(p, { ...shot, weapon: "seed" }, t, true),
    (p, t) => paintOrbit(p, 0, t, true, false),
    (p, t) => paintOrbit(p, 0, t, true, true),
    (p, t) => paintLoot(p, "shard", 1, t, true, false),
    (p, t) => paintLoot(p, "treat", 1, t, true, false),
    (p, t) => paintLoot(p, "chest", 1, t, true, true),
    (p, t) => paintFire(p, t, 73, true),
  ];
  const keys = new Set();
  for (const visual of visuals) {
    const f = pixels((p) => visual(p, 0));
    assert.ok(f.color.some(Boolean));
    assert.deepEqual(f, pixels((p) => visual(p, .52)));
    keys.add(Buffer.from(f.color.buffer).toString("base64"));
  }
  assert.equal(keys.size, visuals.length);
});

test("fractional portrait view dimensions reuse one integer FX buffer", () => {
  const projection = { width: 221.8, height: 270, x: 100, y: 125, zoom: 1 };
  const a = beginIsoFx(projection, 0, false);
  assert.equal(a.width, 222);
  assert.equal(a.height, 270);
  assert.equal(a, beginIsoFx(projection, 1, true));
});

test("native frame keeps the newest visible impacts and expires them on the presentation clock", (t) => {
  class Canvas {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext() {
      return {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: ({ data }) => { this.pixels = Uint8ClampedArray.from(data); },
      };
    }
  }
  const old = Object.getOwnPropertyDescriptor(globalThis, "OffscreenCanvas");
  Object.defineProperty(globalThis, "OffscreenCanvas", { configurable: true, value: Canvas });
  t.after(() => old ? Object.defineProperty(globalThis, "OffscreenCanvas", old) : delete globalThis.OffscreenCanvas);
  const sim = createSim({ cat: "zero", seed: 777 });
  const projection = { width: 240, height: 100, x: 100, y: 50, zoom: 1 };
  const frames = [], ctx = {
    save() {}, restore() {}, scale() {}, translate() {},
    drawImage: (canvas) => frames.push(canvas.pixels),
  };
  const impact = { kind: "collect", life: .24, x: 0, y: 0, seed: 5 };
  sim.impacts = [{ ...impact, x: -80, y: 80 }, ...Array.from({ length: ISO_FX_LIMIT.impacts }, () => ({ ...impact }))];
  const before = structuredClone(sim.impacts);
  beginIsoFx(projection, 0, false).front(ctx, sim, []);
  const first = frames.at(-1), at = (x, y) => first[(y * projection.width + x) * 4 + 3];
  assert.ok(first.some(Boolean), "the recent impacts painted");
  for (let y = 0; y < projection.height; y++)
    for (let x = 0; x < 36; x++)
      assert.equal(at(x, y), 0, "the oldest impact was skipped");
  beginIsoFx(projection, 1, false).front(ctx, sim, []);
  assert.equal(frames.length, 1, "the display aged without advancing the sim");
  assert.deepEqual(sim.impacts, before);
});

test("hit-stop is triggered by reward counters or boss damage and consumes only presentation time", () => {
  const none = { elites: 0, chests: 0 };
  assert.equal(hitStopCause(none, none), undefined);
  assert.equal(hitStopCause(none, { ...none, elites: 1 }), "reward");
  assert.equal(hitStopCause(none, { ...none, chests: 1 }), "reward");
  assert.equal(hitStopCause(none, { ...none, bossHp: 30 }), undefined);
  assert.equal(hitStopCause({ ...none, bossHp: 30 }, { ...none, bossHp: 28 }), "boss");
  assert.equal(hitStopCause({ ...none, bossHp: 28 }, { ...none, bossHp: 0 }), "boss");
  assert.deepEqual(presentationHitShake(HIT_STOP.seconds, .1, true), { x: 0, y: 0 });
  assert.notDeepEqual(presentationHitShake(HIT_STOP.seconds, .1, false), { x: 0, y: 0 });

  const clock = createClock();
  assert.equal(presentationSteps(clock, .1, 1, HIT_STOP.seconds), 0);
  assert.equal(presentationSteps(clock, .042, 1, .03), 0);
  assert.equal(presentationSteps(clock, .01, 1), 1, "fraction after the hold still accumulates");

  function run(held) {
    const state = createSim({ cat: "zero", seed: 777 });
    const clock = createClock();
    let elapsed = 0, renderFrames = 0, gameSteps = 0, hold = 0;
    while (gameSteps < 400) {
      if (held && renderFrames % 48 === 12) hold = HIT_STOP.seconds;
      const count = presentationSteps(clock, FIXED_DT, 1, hold);
      hold = Math.max(0, hold - FIXED_DT);
      for (let i = 0; i < count && gameSteps < 400; i++, gameSteps++) {
        step(state, { ax: Math.cos(gameSteps / 37), ay: Math.sin(gameSteps / 37) }, FIXED_DT);
        if (state.pendingChoice) chooseUpgrade(state, 0);
      }
      renderFrames++;
      elapsed += FIXED_DT;
    }
    return { snapshot: snapshot(state), elapsed };
  }
  const normal = run(false), held = run(true);
  assert.ok(held.elapsed > normal.elapsed);
  assert.deepEqual(held.snapshot, normal.snapshot);
});
