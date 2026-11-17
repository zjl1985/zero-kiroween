import assert from "node:assert/strict";
import { test } from "node:test";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { STATS } from "../dist/game/types.js";
import {
  CHUNK,
  LANDMARK,
  LANDMARK_KINDS,
  SCREEN,
  WORLD,
  chunkContent,
  chunkOf,
  clearWorldCache,
  insideWorld,
  landmarks,
  landmarkParts,
  nearColliders,
  roads,
  viewCentre,
} from "../dist/game/world-gen.js";
import { clampCamera, followCamera, viewRect } from "../dist/render/camera.js";

/** No spawns, no waves, no Boss: just the cat and the town. */
function quiet(seed = 5, cat = "zero") {
  const s = createSim({ cat, seed, sessionSeconds: 900 });
  s.enemies = [];
  s.spawnTimer = 1e9;
  s.wavesDone = 99;
  s.boss.spawned = true;
  s.treatTimer = 1e9;
  return s;
}
function hold(s, ax, ay, frames) {
  for (let i = 0; i < frames; i++) {
    s.player.hp = s.player.maxHp;
    step(s, { ax, ay, dash: false }, DT);
  }
}
/** A y (or x) whose straight line to the edge crosses no collider. */
function openLane(seed, fixed, from, to, horizontal) {
  for (let k = 0; k < 400; k++) {
    const lane = fixed + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 9;
    let blocked = false;
    for (let t = from; Math.abs(t - to) > 1 && !blocked; t += Math.sign(to - from) * 40) {
      const x = horizontal ? t : lane,
        y = horizontal ? lane : t;
      blocked = nearColliders(seed, x, y).some(
        (o) =>
          Math.hypot(
            x - Math.max(Math.min(o.x1, o.x2), Math.min(Math.max(o.x1, o.x2), x)),
            y - Math.max(Math.min(o.y1, o.y2), Math.min(Math.max(o.y1, o.y2), y)),
          ) < o.radius + 40,
      );
    }
    if (!blocked) return lane;
  }
  throw new Error("no open lane");
}

test("the world is 10 x 10 screens and chunks tile it exactly", () => {
  assert.equal(WORLD.screensX, 10);
  assert.equal(WORLD.screensY, 10);
  assert.equal(WORLD.width, 9600);
  assert.equal(WORLD.height, 5400);
  assert.equal(WORLD.maxX - WORLD.minX, WORLD.width);
  assert.equal(WORLD.maxY - WORLD.minY, WORLD.height);
  assert.equal(WORLD.width, 10 * SCREEN.width);
  assert.equal((CHUNK.maxCx - CHUNK.minCx + 1) * CHUNK.width, WORLD.width);
  assert.equal((CHUNK.maxCy - CHUNK.minCy + 1) * CHUNK.height, WORLD.height);
  // The start yard keeps its original coordinates inside the bounds.
  assert.ok(WORLD.minX < 0 && WORLD.maxX > SCREEN.width && WORLD.minY === 0);
});

test("chunk content is a pure function of seed and chunk coords", () => {
  const a = JSON.stringify(chunkContent(3, 4, 5));
  clearWorldCache();
  assert.equal(JSON.stringify(chunkContent(3, 4, 5)), a);
  let differs = 0;
  for (let cx = -5; cx < 5; cx++)
    if (JSON.stringify(chunkContent(3, cx, 6).decor) !== JSON.stringify(chunkContent(4, cx, 6).decor)) differs++;
  assert.ok(differs >= 8, `only ${differs} chunks differ across seeds`);
  // Outside the bounds there is nothing.
  for (const [cx, cy] of [
    [CHUNK.minCx - 1, 3],
    [CHUNK.maxCx + 1, 3],
    [0, -1],
    [0, CHUNK.maxCy + 1],
  ]) {
    const c = chunkContent(3, cx, cy);
    assert.equal(c.decor.length + c.colliders.length + c.spots.length, 0);
    assert.equal(c.landmark, null);
  }
  // Every generated chunk decorates its ground.
  assert.ok(chunkContent(3, 4, 5).decor.length > 5);
});

test("landmarks lie inside the bounds, are spaced, cover every kind and avoid the start yard", () => {
  for (const seed of [1, 2, 3, 99, 20261116]) {
    const ls = landmarks(seed);
    assert.ok(ls.length >= LANDMARK_KINDS.length);
    for (const kind of LANDMARK_KINDS) assert.ok(ls.some((l) => l.kind === kind), `${seed} lacks ${kind}`);
    for (const l of ls) {
      assert.ok(insideWorld(l.x, l.y, l.radius), `${l.id} outside`);
      // Clear of the start yard rectangle.
      const dx = Math.max(0 - l.x, 0, l.x - SCREEN.width),
        dy = Math.max(0 - l.y, 0, l.y - SCREEN.height);
      assert.ok(Math.hypot(dx, dy) > l.radius, `${l.id} overlaps the yard`);
      for (const m of ls)
        if (m !== l) assert.ok(Math.hypot(l.x - m.x, l.y - m.y) >= 2 * LANDMARK.margin - 1);
      // Each landmark lives in exactly one chunk.
      const c = chunkOf(l.x, l.y);
      assert.equal(chunkContent(seed, c.cx, c.cy).landmark?.id, l.id);
    }
    assert.equal(new Set(ls.map((l) => l.id)).size, ls.length);
    assert.ok(roads(seed).length === ls.length + 1);
  }
});

test("the start chunks hold the yard pumpkins and the moon-lantern", () => {
  const spots = [...chunkContent(1, 0, 0).spots, ...chunkContent(1, 1, 0).spots];
  assert.equal(spots.filter((s) => s.kind === "pumpkin").length, 3);
  assert.equal(spots.filter((s) => s.kind === "lantern").length, 1);
  assert.ok(chunkContent(1, 0, 0).start && chunkContent(1, 1, 0).start);
});

test("the cat explores far beyond one screen along the road", () => {
  const s = quiet(5);
  const spine = roads(5)[0].points;
  const roadX = (y) => {
    for (let i = 0; i < spine.length - 1; i++)
      if (y <= spine[i + 1].y)
        return spine[i].x + ((spine[i + 1].x - spine[i].x) * (y - spine[i].y)) / (spine[i + 1].y - spine[i].y);
    return spine[spine.length - 1].x;
  };
  s.player.x = roadX(560);
  s.player.y = 560;
  for (let i = 0; i < 60 * 30; i++) {
    s.player.hp = s.player.maxHp;
    const ax = Math.max(-1, Math.min(1, (roadX(s.player.y + 20) - s.player.x) / 20));
    step(s, { ax, ay: 1, dash: false }, DT);
  }
  assert.ok(s.player.y > 3 * SCREEN.height, `stopped at y ${s.player.y}`);
  assert.ok(s.stats.distance > 2 * SCREEN.height);
  // Chunks near the cat are loaded; the yard's idle pumpkins were dropped.
  const here = chunkOf(s.player.x, s.player.y);
  assert.ok(s.loadedChunks.includes(`${here.cx},${here.cy}`));
  assert.ok(!s.loadedChunks.includes("0,0"));
  assert.ok(!s.interactables.some((o) => o.kind === "pumpkin" && o.y < SCREEN.height));
});

test("holding a direction for a long time stops at the world edge", () => {
  const seed = 5,
    r = STATS.playerRadius;
  const cases = [
    { ax: 1, ay: 0, at: () => ({ x: WORLD.maxX - 400, y: openLane(seed, 2700, WORLD.maxX - 400, WORLD.maxX, true) }), check: (p) => p.x, want: WORLD.maxX - WORLD.edge - r },
    { ax: -1, ay: 0, at: () => ({ x: WORLD.minX + 400, y: openLane(seed, 2700, WORLD.minX + 400, WORLD.minX, true) }), check: (p) => p.x, want: WORLD.minX + WORLD.edge + r },
    { ax: 0, ay: 1, at: () => ({ x: openLane(seed, 2600, WORLD.maxY - 400, WORLD.maxY, false), y: WORLD.maxY - 400 }), check: (p) => p.y, want: WORLD.maxY - WORLD.edge - r },
    { ax: 0, ay: -1, at: () => ({ x: 480, y: 420 }), check: (p) => p.y, want: WORLD.minY + WORLD.playTop + r },
  ];
  for (const c of cases) {
    const s = quiet(seed);
    Object.assign(s.player, c.at());
    hold(s, c.ax, c.ay, 60 * 12);
    assert.ok(Math.abs(c.check(s.player) - c.want) < 0.01, `${c.ax},${c.ay}: ${c.check(s.player)} vs ${c.want}`);
    // A dash into the edge cannot break out either.
    s.player.dashCooldown = 0;
    step(s, { ax: c.ax, ay: c.ay, dash: true }, DT);
    hold(s, c.ax, c.ay, 30);
    assert.ok(insideWorld(s.player.x, s.player.y, r));
  }
});

test("enemies spawn outside the camera view but inside the world", () => {
  for (const start of [
    { x: 300, y: 2700 },
    { x: WORLD.minX + 200, y: WORLD.maxY - 200 },
    { x: 500, y: 380 },
  ]) {
    const s = createSim({ seed: 11, sessionSeconds: 120 });
    s.enemies = [];
    Object.assign(s.player, start);
    let seen = s.nextEnemyId,
      checked = 0;
    for (let i = 0; i < 60 * 90 && s.ended === "playing"; i++) {
      s.player.hp = s.player.maxHp;
      if (s.pendingChoice) s.pendingChoice = null;
      step(s, { ax: Math.sin(i / 60) * 0.5, ay: Math.cos(i / 80) * 0.5, dash: false }, DT);
      const c = viewCentre(s.player.x, s.player.y);
      for (const e of s.enemies) {
        if (e.id < seen || e.spawnTime < 0.6 - DT * 1.5) continue;
        const inside =
          Math.abs(e.x - c.x) < SCREEN.width / 2 && Math.abs(e.y - c.y) < SCREEN.height / 2;
        assert.ok(!inside, `enemy ${e.id} spawned in view at ${e.x},${e.y}`);
        assert.ok(insideWorld(e.x, e.y));
        checked++;
      }
      seen = s.nextEnemyId;
    }
    assert.ok(checked > 5, `only ${checked} spawns checked`);
  }
});

test("far ink is leashed back to the view ring", () => {
  const s = quiet(5);
  s.player.x = 500;
  s.player.y = 2700;
  s.enemies.push({ id: 900, kind: "ink-blob", x: 500, y: 5000, hp: 3, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0 });
  step(s, { ax: 0, ay: 0, dash: false }, DT);
  const e = s.enemies.find((x) => x.id === 900);
  assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) < 900);
  assert.ok(insideWorld(e.x, e.y));
});

test("walking up to a landmark discovers it once, with a notice", () => {
  const s = quiet(5);
  const l = landmarks(5)[0];
  s.player.x = l.x + LANDMARK.discoverRadius - 20;
  s.player.y = l.y;
  step(s, { ax: 0, ay: 0, dash: false }, DT);
  assert.deepEqual(s.landmarksFound, [l.id]);
  assert.equal(s.notice.kind, `found-${l.kind}`);
  step(s, { ax: 0, ay: 0, dash: false }, DT);
  assert.equal(s.landmarksFound.length, 1);
});

test("same seed and inputs give the same snapshot while exploring", () => {
  const run = () => {
    const s = createSim({ cat: "zero", seed: 31, sessionSeconds: 300 });
    for (let i = 0; i < 60 * 60 && s.ended === "playing"; i++) {
      s.player.hp = s.player.maxHp;
      step(s, { ax: Math.cos(i / 300), ay: 0.8, dash: i % 240 === 0, choose: 0 }, DT);
    }
    return snapshot(s);
  };
  const a = run();
  clearWorldCache();
  assert.deepEqual(run(), a);
});

test("the camera follows with a deadzone and never shows outside the world", () => {
  let cam = { x: 480, y: 270 };
  cam = followCamera(cam, { x: 500, y: 290 }, 1 / 60);
  assert.deepEqual(cam, { x: 480, y: 270 }, "inside the deadzone nothing moves");
  for (const target of [
    { x: WORLD.maxX + 500, y: WORLD.maxY + 500 },
    { x: WORLD.minX - 500, y: WORLD.minY - 500 },
  ]) {
    for (let i = 0; i < 600; i++) cam = followCamera(cam, target, 1 / 60);
    const r = viewRect(cam);
    assert.ok(r.x0 >= WORLD.minX - 1e-9 && r.x1 <= WORLD.maxX + 1e-9);
    assert.ok(r.y0 >= WORLD.minY - 1e-9 && r.y1 <= WORLD.maxY + 1e-9);
  }
  assert.deepEqual(clampCamera(0, 0), { x: 0, y: SCREEN.height / 2 });
});

// ---------------------------------------------------------------- districts, landmarks, props (FEAT-006)
import { BIOME_DEFS, LANDMARK_DEFS, PROP_DEFS } from "../dist/defs/index.js";
import { DISTRICTS } from "../dist/defs/biomes/districts.js";
import { biomeAt, districtSites, isStartChunk } from "../dist/game/world-gen.js";

function eachChunk(seed, f) {
  for (let cy = CHUNK.minCy; cy <= CHUNK.maxCy; cy++)
    for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) f(chunkContent(seed, cx, cy), cx, cy);
}

test("every registered biome owns chunks in the world, and the start yard is old town", () => {
  assert.ok(BIOME_DEFS.ids().length >= 4);
  assert.ok(DISTRICTS.cols * DISTRICTS.rows >= BIOME_DEFS.ids().length, "enough district sites for every biome");
  for (const seed of [20261116, 1, 2, 3, 99]) {
    const seen = new Map();
    eachChunk(seed, (c) => seen.set(c.biome, (seen.get(c.biome) ?? 0) + 1));
    for (const id of BIOME_DEFS.ids()) assert.ok((seen.get(id) ?? 0) >= 1, `seed ${seed} lacks ${id}`);
    assert.equal(chunkContent(seed, 0, 0).biome, DISTRICTS.start);
    assert.equal(chunkContent(seed, 1, 0).biome, DISTRICTS.start);
    // Each site's own chunk belongs to it; sites never sit on the start yard.
    for (const s of districtSites(seed)) {
      assert.ok(!isStartChunk(s.cx, s.cy));
      assert.equal(biomeAt(seed, s.cx, s.cy).id, s.biome);
    }
  }
});

test("districts change what grows: biome props stay in their biomes and differ between them", () => {
  const seed = 20261116,
    kindsBy = new Map();
  eachChunk(seed, (c) => {
    if (c.start) return;
    const allowed = new Set([...BIOME_DEFS.get(c.biome).props.map((p) => p.prop), ...PROP_DEFS.all().filter((d) => d.spawn.from).map((d) => d.id)]);
    for (const p of c.props) assert.ok(allowed.has(p.kind), `${p.kind} in ${c.biome}`);
    const set = kindsBy.get(c.biome) ?? new Set();
    for (const p of c.props) set.add(p.kind);
    kindsBy.set(c.biome, set);
  });
  const signatures = new Set([...kindsBy.values()].map((s) => [...s].sort().join(",")));
  assert.equal(signatures.size, kindsBy.size, "every biome has its own prop mix");
});

test("the new landmarks are placed for several seeds, every kind fits the super-cells", () => {
  const cells = LANDMARK.cols * LANDMARK.rows - 1;
  assert.ok(LANDMARK_KINDS.length <= cells, `${LANDMARK_KINDS.length} kinds fit ${cells} cells`);
  for (const kind of ["paper-windmill", "puppet-theatre", "wishing-well", "paper-teahouse", "fold-greenhouse", "star-observatory"]) assert.ok(LANDMARK_DEFS.has(kind), kind);
  assert.deepEqual([...LANDMARK_KINDS], LANDMARK_DEFS.ids());
  for (const seed of [4, 8, 15, 16, 23, 42]) {
    const ls = landmarks(seed);
    for (const kind of LANDMARK_KINDS) assert.ok(ls.some((l) => l.kind === kind), `${seed} lacks ${kind}`);
  }
});

test("the denser town has 24 sites across five rows without enlarging the map", () => {
  assert.equal(LANDMARK.cols * LANDMARK.rows - 1, 24);
  for (const seed of [0, 7, 42, 20261116, 4294967295]) {
    const sites = landmarks(seed), rows = Array(LANDMARK.rows).fill(0);
    assert.equal(sites.length, 24);
    assert.equal(new Set(sites.map((l) => JSON.stringify(chunkOf(l.x, l.y)))).size, 24);
    for (const l of sites) rows[Math.floor(l.y / (WORLD.height / LANDMARK.rows))]++;
    assert.deepEqual(rows, [4, 5, 5, 5, 5], "each band offers places to visit, not one crowded corner");
  }
});

test("new workshop courts leave walkable approaches and reachable interaction spots", () => {
  const kinds = ["paper-teahouse", "fold-greenhouse", "star-observatory"];
  const distance = (x, y, o) => {
    const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
    const t = Math.max(0, Math.min(1, ((x - o.x1) * dx + (y - o.y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - o.x1 - t * dx, y - o.y1 - t * dy);
  };
  for (const seed of [0, 7, 42]) for (const kind of kinds) {
    const l = landmarks(seed).find((p) => p.kind === kind), parts = landmarkParts(l);
    assert.ok(parts.spots.length > 0, `${kind} is not just a facade`);
    for (let dy = 20; dy <= 150; dy += 10)
      for (const wall of parts.colliders) assert.ok(distance(l.x, l.y + dy, wall) > wall.radius + STATS.playerRadius + 12, `${kind}: approach at ${dy}`);
    for (const spot of parts.spots) for (const wall of parts.colliders)
      assert.ok(distance(spot.x, spot.y, wall) > wall.radius + STATS.playerRadius, `${kind}: interaction can be reached`);
    const s = quiet(seed);
    Object.assign(s.player, { x: l.x, y: l.y + 150 });
    step(s, { ax: 0, ay: 0, dash: false }, DT);
    assert.ok(s.landmarksFound.includes(l.id));
    assert.equal(s.notice.kind, `found-${kind}`);
  }
});

test("chunk content with biomes and props stays pure, and props per chunk stay under the cap", () => {
  for (const seed of [20261116, 7]) {
    const before = [];
    eachChunk(seed, (c) => before.push(JSON.stringify(c)));
    clearWorldCache();
    const after = [];
    eachChunk(seed, (c) => after.push(JSON.stringify(c)));
    assert.deepEqual(after, before);
    eachChunk(seed, (c) => {
      assert.ok(c.props.length <= DISTRICTS.propCap, `${c.key}: ${c.props.length} props`);
      assert.equal(new Set(c.props.map((p) => p.id)).size, c.props.length);
    });
  }
});
