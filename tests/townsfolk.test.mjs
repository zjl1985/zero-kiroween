import assert from "node:assert/strict";
import { test } from "node:test";
import { LANDMARK_DEFS, TOWNSFOLK_DEFS } from "../dist/defs/index.js";
import { landmarkActivityPoint } from "../dist/defs/landmark-activities.js";
import { TOWNSFOLK } from "../dist/defs/townsfolk/tuning.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys, t } from "../dist/content/i18n.js";
import { FIXED_DT } from "../dist/game/clock.js";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { waterAt } from "../dist/game/water.js";
import { clearWorldCache, landmarks, nearColliders } from "../dist/game/world-gen.js";
import { pointSegDist } from "../dist/game/collision.js";
import {
  clearTownsfolkCache, nearestTownsfolk, townsfolk, townsfolkNear, townsfolkPose, townsfolkSafeAt, townsfolkTip,
} from "../dist/game/townsfolk.js";
import { environmentCopy } from "../dist/ui/environment-copy.js";
import { TOWNSFOLK_ART } from "../dist/render/art-index.js";
import { townsfolkSprites } from "../dist/render/craft-townsfolk.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";

const SEEDS = [1, 7, 42, 2026, 20261116];
const json = (v) => JSON.parse(JSON.stringify(v));

test("three townsfolk register in order with matching art, real home kinds and both language packs", () => {
  assert.deepEqual(TOWNSFOLK_DEFS.ids(), ["lamplighter-mouse", "stargazer-owl", "ferry-frog"]);
  assert.deepEqual(TOWNSFOLK_ART.ids(), TOWNSFOLK_DEFS.ids(), "art follows def registration order");
  for (const def of TOWNSFOLK_DEFS.all()) {
    assert.ok(def.homes.length > 0);
    for (const home of def.homes) assert.ok(LANDMARK_DEFS.has(home), `${def.id} home ${home}`);
    assert.ok(def.wander.radius > 0 && def.wander.speed > 0 && def.wander.pause > 0 && def.talkRadius > 0 && def.tips > 0);
    const keys = [`townsfolk.${def.id}.name`, ...Array.from({ length: def.tips }, (_, i) => `townsfolk.${def.id}.tip.${i + 1}`)];
    for (const k of keys) assert.ok(MESSAGE_KEYS.includes(k), k);
    const art = TOWNSFOLK_ART.get(def.id);
    assert.equal(typeof art.paint, "function");
    assert.ok(art.bounds.t < 0 && art.bounds.l < 0 && art.bounds.r > 0 && art.foot > 0);
  }
  assert.ok(MESSAGE_KEYS.includes("townsfolk.say") && MESSAGE_KEYS.includes("gallery.section.townsfolk"));
  assert.deepEqual(missingKeys("en"), []);
  assert.deepEqual(missingKeys("zh"), []);
  for (const locale of ["en", "zh"])
    for (const def of TOWNSFOLK_DEFS.all())
      for (let i = 1; i <= def.tips; i++)
        assert.notEqual(t(locale, `townsfolk.${def.id}.tip.${i}`), `townsfolk.${def.id}.tip.${i}`);
});

test("placement is pure, seeded, capped and one resident per eligible landmark", () => {
  for (const seed of SEEDS) {
    const a = json(townsfolk(seed));
    clearTownsfolkCache();
    clearWorldCache();
    assert.deepEqual(json(townsfolk(seed)), a, `seed ${seed} rebuilds the same town`);
    assert.ok(a.length > 0 && a.length <= TOWNSFOLK.cap, `seed ${seed}: ${a.length}`);
    assert.equal(new Set(a.map((n) => n.landmark)).size, a.length, "at most one per landmark");
    for (const n of a) {
      const l = landmarks(seed).find((m) => m.id === n.landmark);
      assert.ok(TOWNSFOLK_DEFS.get(n.kind).homes.includes(l.kind), `${n.id} lives at a home kind`);
    }
  }
  assert.notDeepEqual(json(townsfolk(1)), json(townsfolk(7)), "different seeds, different towns");
});

/** Independent safety check: dry ground (bridge decks are dry), no collider, off every court circle. */
function safe(seed, x, y) {
  if (!["dry", "bridge"].includes(waterAt(seed, x, y))) return false;
  for (const c of nearColliders(seed, x, y)) if (pointSegDist(x, y, c.x1, c.y1, c.x2, c.y2) < c.radius + TOWNSFOLK.body) return false;
  for (const l of landmarks(seed)) {
    const activity = LANDMARK_DEFS.get(l.kind).activity;
    if (activity && Math.hypot(...Object.values(landmarkActivityPoint(l)).map((v, i) => v - [x, y][i])) < activity.radius) return false;
  }
  return true;
}

test("homes, routes and legs never touch water, colliders or court points", () => {
  for (const seed of SEEDS)
    for (const n of townsfolk(seed)) {
      const l = landmarks(seed).find((m) => m.id === n.landmark);
      for (let i = 0; i < n.route.length; i++) {
        const a = n.route[i], b = n.route[(i + 1) % n.route.length];
        for (let k = 0; k <= 10; k++) {
          const x = a.x + ((b.x - a.x) * k) / 10, y = a.y + ((b.y - a.y) * k) / 10;
          assert.ok(townsfolkSafeAt(seed, l, x, y), `${seed} ${n.id} leg ${i}`);
          assert.ok(safe(seed, x, y), `${seed} ${n.id} independent check`);
        }
      }
    }
});

test("poses are pure functions of time and stay within the wander radius, dry and clear", () => {
  for (const seed of SEEDS.slice(0, 3))
    for (const n of townsfolk(seed)) {
      const def = TOWNSFOLK_DEFS.get(n.kind);
      let moved = false;
      for (let time = 0; time < 160; time += 0.73) {
        const p = townsfolkPose(n, time);
        assert.deepEqual(townsfolkPose(n, time), p);
        assert.ok(Math.hypot(p.x - n.home.x, p.y - n.home.y) <= def.wander.radius + 1e-6, `${n.id} at ${time}`);
        assert.ok([0, 1].includes(p.frame) && [1, -1].includes(p.facing));
        assert.ok(safe(seed, p.x, p.y), `${n.id} pose ${time}`);
        moved ||= p.moving;
        const tip = townsfolkTip(n, time);
        assert.ok(tip >= 1 && tip <= def.tips);
      }
      if (n.route.length > 1) assert.ok(moved, `${n.id} strolls`);
    }
});

test("a sim run is identical with and without the townsfolk helpers and HUD copy", () => {
  const run = (probe) => {
    const s = createSim({ cat: "nicole", seed: 7 });
    for (let i = 0; i < 600; i++) {
      step(s, { ax: i % 200 < 100 ? 1 : 0, ay: 1, dash: i % 180 === 0 }, FIXED_DT);
      if (probe) {
        townsfolk(s.seed);
        townsfolkNear(s.seed, s.player.x, s.player.y, 900).forEach((n) => townsfolkPose(n, s.elapsed));
        nearestTownsfolk(s.seed, s.player.x, s.player.y, s.elapsed);
        environmentCopy("en", s);
      }
    }
    return snapshot(s);
  };
  clearTownsfolkCache();
  assert.deepEqual(run(true), run(false));
});

test("the tip shows only within talk radius and yields to fire, wet and court hints", () => {
  const s = createSim({ cat: "zero", seed: 7 });
  s.elapsed = 40;
  const courtNear = (x, y) => landmarks(s.seed).some((l) => {
    const activity = LANDMARK_DEFS.get(l.kind).activity, c = landmarkActivityPoint(l);
    return activity && Math.hypot(c.x - x, c.y - y) <= activity.radius + 46;
  });
  let n, spot;
  for (const npc of townsfolk(s.seed)) {
    const p = townsfolkPose(npc, s.elapsed), r = TOWNSFOLK_DEFS.get(npc.kind).talkRadius - 4;
    for (let a = 0; a < 8 && !spot; a++) {
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (!courtNear(x, y) && nearestTownsfolk(s.seed, x, y, s.elapsed)?.npc.id === npc.id) spot = { x, y };
    }
    if (spot) { n = npc; break; }
  }
  assert.ok(n, "a townsfolk stands away from every court");
  const say = (locale) => t(locale, "townsfolk.say", {
    name: t(locale, `townsfolk.${n.kind}.name`), tip: t(locale, `townsfolk.${n.kind}.tip.${townsfolkTip(n, s.elapsed)}`),
  });
  for (const locale of ["en", "zh"]) {
    Object.assign(s.player, { ...spot, burnTime: 0, wetTime: 0 });
    assert.equal(nearestTownsfolk(s.seed, s.player.x, s.player.y, s.elapsed)?.npc.id, n.id);
    assert.equal(environmentCopy(locale, s).hint, say(locale));
    s.player.burnTime = 2;
    assert.equal(environmentCopy(locale, s).hint, t(locale, "hint.burning"), "fire wins");
    s.player.burnTime = 0;
    s.player.wetTime = 1;
    assert.equal(environmentCopy(locale, s).hint, t(locale, "hint.wet"), "wet wins");
    s.player.wetTime = 0;
    // Outside the talk radius (and away from courts) routine copy returns.
    Object.assign(s.player, { x: 480, y: 420 });
    s.elapsed = 10;
    assert.equal(environmentCopy(locale, s).hint, t(locale, "hint.paper-world"));
    s.elapsed = 40;
  }
  // A court in reach of a townsfolk: the court's real action wins.
  let found = false;
  for (const seed of SEEDS) {
    for (const npc of townsfolk(seed)) {
      const l = landmarks(seed).find((m) => m.id === npc.landmark), activity = LANDMARK_DEFS.get(l.kind).activity;
      if (!activity) continue;
      const c = landmarkActivityPoint(l), p = townsfolkPose(npc, 40), d = Math.hypot(p.x - c.x, p.y - c.y),
        r = Math.min(d, activity.radius + 40), x = c.x + ((p.x - c.x) * r) / d, y = c.y + ((p.y - c.y) * r) / d;
      if (nearestTownsfolk(seed, x, y, 40)?.npc.id !== npc.id) continue;
      const sim = createSim({ cat: "zero", seed });
      sim.elapsed = 40;
      Object.assign(sim.player, { x, y });
      assert.equal(environmentCopy("en", sim).hint, t("en", `activity.${activity.notice}`));
      found = true;
      break;
    }
    if (found) break;
  }
  assert.ok(found, "some court sits within talk reach of its resident");
});

// Minimal recording canvas (static command contracts only, no pixels).
class Path {
  constructor() { this.ops = []; }
}
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(point) { return point; }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse", "addPath", "roundRect"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
function canvas() {
  const c = { width: 400, height: 300 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000" };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); },
    getTransform() { return Object.assign(new Matrix(), { a: 2, b: 0 }); },
    createPattern() { return { setTransform() {} }; },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createLinearGradient() { calls.push({ op: "gradient" }); return { addColorStop() {} }; },
    createRadialGradient() { calls.push({ op: "gradient" }); return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; if (key === "shadowBlur" && value > 0) calls.push({ op: "shadowBlur" }); return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(tc) {
  clearSpriteCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    tc.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  tc.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  tc.after(clearSpriteCache);
}
function allPaint(ctx, seen = new Set()) {
  if (seen.has(ctx)) return [];
  seen.add(ctx);
  return ctx.calls.flatMap((c) => c.op === "drawImage" ? [c, ...allPaint(c.args[0].getContext("2d"), seen)] : [c]);
}

test("townsfolk are drawn only in view, as flat paper with a talk tag, without touching SimState", (tc) => {
  environment(tc);
  const sim = createSim({ cat: "nicole", seed: 7 });
  sim.elapsed = 12;
  const n = townsfolk(sim.seed)[0], pose = townsfolkPose(n, sim.elapsed);
  Object.assign(sim.player, { x: pose.x + 30, y: pose.y });
  const before = JSON.stringify(snapshot(sim));
  const ctx = canvas().getContext("2d"), near = [], far = [];
  townsfolkSprites(ctx, sim, { x: pose.x, y: pose.y }, 1, (y, draw) => near.push({ y, draw }));
  townsfolkSprites(ctx, sim, { x: pose.x + 4000, y: pose.y + 3000 }, 1, (y, draw) => far.push({ y, draw }));
  assert.ok(near.some((s) => s.y === pose.y), "the townsfolk in view is depth-sorted by its feet");
  for (const s of far) assert.ok(Math.abs(s.y - (pose.y + 3000)) < 700, "only townsfolk near that view");
  for (const s of near) s.draw();
  const calls = allPaint(ctx), images = calls.filter((c) => c.op === "drawImage");
  assert.ok(images.length >= 2, "figure and talk tag come from cached sprites");
  assert.ok(!calls.some((c) => c.op === "gradient" || c.op === "shadowBlur" || c.op === "filter"), "flat paper ruleset");
  assert.equal(JSON.stringify(snapshot(sim)), before);
  // The figure cache is keyed by pose frame, never by time.
  const again = [];
  townsfolkSprites(ctx, sim, { x: pose.x, y: pose.y }, 37.5, (y, draw) => again.push({ y, draw }));
  const count = allPaint(ctx).length;
  for (const s of again) s.draw();
  const later = allPaint(ctx).slice(count).filter((c) => c.op === "drawImage");
  assert.ok(later.every((c) => images.some((i) => i.args[0] === c.args[0])), "same cached canvases at a later time");
});
