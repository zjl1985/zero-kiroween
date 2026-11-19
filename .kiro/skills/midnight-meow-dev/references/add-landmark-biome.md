# Add a landmark or a district biome

Both are registered in `src/defs/world-index.ts` and placed by the pure world generator `src/game/world-gen.ts` (`landmarks(seed)`, `landmarkParts(l)`, `districtSites(seed)`, `biomeAt(seed, cx, cy)`, `chunkContent(seed, cx, cy)`). Art is registered in `src/render/art-index.ts`. Everything here is a pure function of the seed: use the builder's `hash` or `hash2`, never the sim RNG or `Math.random`.

Interfaces: `LandmarkDef`, `LandmarkActivity`, `LandmarkPlace`, `LandmarkBuilder`, `LandmarkArea`, `BiomeDef`, `BiomeProp`, `DecorMix`, `WaterShape`, `WaterRegion`, `WaterCrossing` in `src/defs/types.ts`; `LandmarkArt`, `DecorPiece` (including `live`), `BiomeArt`, `decorPiece`, `landmarkReach` in `src/render/art-registry.ts`.

Placement changes can alter fixed-seed worlds. Disclose intentional changes; use current deterministic tests and refresh local probes only when available and in scope (see testing-and-verification.md). Do not claim old references were regenerated.

## Landmark

The world has 24 landmark super-cells (`LANDMARK.cols` 5 x `rows` 5, minus the start cell); each registered kind is placed at least once, so at most 24 kinds fit (tested). There are 12 today, including paper-teahouse, fold-greenhouse and star-observatory. The 10 x 10 screen world is unchanged; the extra rows shorten gaps between places to visit. Keep the 360-unit cell margins and check start-yard, per-chunk ownership and approach clearance when changing placement.

1. **Def** `src/defs/landmarks/<id>/def.ts` (reference `wishing-well`, `clock-tower`; `stone-bridge` uses `span` and `keepOut` for its river):

   ```ts
   import type { LandmarkDef } from "../../types.js";

   /** Pond numbers of the wishing well (ground art reads them too). */
   export const POND = { rx: 120, ry: 58, dy: 42 } as const;

   // Layout excerpt only: the real wishing-well def also supplies water(l).
   /** A roofed stone well by a paper-boat pond; a moon-lantern hangs by the rope. */
   export const WISHING_WELL: LandmarkDef = {
     id: "wishing-well",
     radius: 170,                         // generic decor keeps out; roads stop at its rim
     layout(_l, b) {
       b.add("well", 0, -36, 1);          // a piece this landmark's art registers
       b.wall(-22, -40, 22, -40, 16);     // static capsule collider
       b.add("lamp", 52, -30, 0.95, 1);   // generic decor: tree, cottage, bush, fence, stone, lamp,
                                          // candles, pumpkin, flowers, tuft, leaves
       b.spot("lantern", 52, -30, 0.95);  // interaction spot: "pumpkin" | "lantern"
       b.add("stone", -150, 28, 0.9, 2);  // last arg = seed salt
     },
     // span?(l, area) { return half length of a band through it },
     // keepOut?(l, x, y, pad) { return true where decor must stay clear },
     // water?(l) { return pure WaterShape[] shared by physics and art },
     // activity: a LandmarkActivity with radius, charge, cooldown and activate hook,
   };
   ```

   Layout calls run in order and must be deterministic; use `b.hash(a, b, salt)` for seeded variation.

2. **Register**: append to the `LANDMARK_DEFS.register` list in world-index.ts (order is the order kinds are handed out).

3. **Art** `src/defs/landmarks/<id>/art.ts`:

   ```ts
   import type { LandmarkArt } from "../../../render/art-registry.js";
   import { paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
   import { shadow, type Ctx } from "../../../render/paper-material.js";

   function well(ctx: Ctx, x: number, y: number, s: number, v: number): void {
     ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
     shadow(ctx, 0, 3, 34, 8);
     // paperCut(...) walls, roof, posts; warmGlow(...) for lit windows
     ctx.restore();
   }

   export const WISHING_WELL_ART: LandmarkArt = {
     id: "wishing-well",
     ink: "#8fb0c4",                                  // minimap dot
     ground(ctx, l) { /* flat art baked into chunk caches: plaza, soil; shared water draws separately */ },
     // reach(l) { return l.radius + 60; }            ground reach, default radius + 40
     pieces: [{ kind: "well", bounds: { l: -36, r: 36, t: -110, b: 10 }, paint: well /*, variants: 2, popup: true */ }],
   };
   ```

   - `pieces` are tall y-sorted cached sprites; every non-generic `b.add` kind must be a registered piece (tested). `popup: true` makes it fold up like a pop-up book page near the cat (`POPUP` in `src/render/timeline.ts`, render-only).
   - `base(ctx, l)` paints the kind's own grounded footing before `ground`; build it from the flat helpers in `src/defs/landmarks/ground-kit.art.ts` (`tornBank`, `fenceSilhouette`, `furrowStrips`, `boards`, `pavedTiles`, `fringedMound`, `stoneRing`, `blob`, `polygon`). Never reuse one shared oval base; tests require distinct base paths per kind and no gradients/shadowBlur.
   - `DecorPiece.live` draws live parts after the cached body under the same depth/pop-up transform. Windmill uses a tower without baked sails plus one three-variant cached rotor rotated from sim-owned `turn`; never cache by time/angle or draw duplicate sails. Preserve registered bounds and reduced-motion behavior.
   - Append to the `LANDMARK_ART` list in art-index.ts; `LANDMARK_ART.ids()` must equal `LANDMARK_DEFS.ids()`.

4. **Discovery notice**: add `"found-<id>"` to the `Notice` union in `src/game/types.ts` (the sim calls `notify(state, \`found-${kind}\`)`).

5. **i18n**: `landmark.<id>` (journal, nav arrows, gallery) and `notice.found-<id>`.

## Activities and water

Read [paper-ecology.md](paper-ecology.md) before changing these contracts:

- Four `LandmarkDef.activity` entries are live: teahouse proximity heal, fold-hit greenhouse renewal + treat, observatory proximity freeze + shards (not map reveal), wind-hit windmill pulse + shards and rotor boost. Tuning and walkable court anchors are shared in `src/defs/landmark-activities.ts`; state is per placed id in `SimState.landmarkEvents`.
- `game/landmark-actions.ts` preserves partial charge away from a court and advances cooldowns offscreen; element hits are capped at 2 charge per hit. `ctx.elementHit` reaches the activity runner. Set cooldown before reward hooks; do not create an every-frame reward or mutate state from art.
- Greenhouse advances only existing future deadlines of nearby renewable scraps, at most 10 within 320. Normal lifecycle still waits for occupancy/fire clearance and retains lifetime loot claims.
- `LandmarkDef.water` and `BiomeDef.water` produce pure shore/core/crossing polygons. World-gen adds explicit visible dry road crossings, clips deep solids and caches local regions without calling `chunkContent` recursively. Use `defs/water.ts` and `render/water-art.ts`; do not draw independent decorative pond/canal geometry or invisible road exemptions.
- Shallow water slows actors by 0.68 and extinguishes carried fire, deep cores block radius-swept movement, and dry decks stay dry unless the actor overlaps exposed water beside them. Keep the shallow teaching basin at (1040, 420), road passage, dry building contacts and visible reachable court/lantern approaches.

## District biome

The town splits into a jittered 4 x 3 grid of district sites (`DISTRICTS` in `src/defs/biomes/districts.ts`); each chunk belongs to its nearest site, a seeded shuffle gives every biome at least one site, and the start chunks are `DISTRICTS.start` (`old-town`). With 12 sites, at most 12 biomes fit; there are 5 today.

1. **Def** `src/defs/biomes/<id>.ts` (reference `pumpkin-farm.ts`):

   ```ts
   import type { BiomeDef } from "../types.js";

   /** Open farmland: paper grass, hay bales, scarecrows and pumpkins. */
   export const PUMPKIN_FARM: BiomeDef = {
     id: "pumpkin-farm",
     // Overrides of BASE_DECOR (districts.ts): chances and [min, max] counts.
     decor: { cottageChance: 0.08, trees: [0, 1], fenceChance: 0.45, pumpkinChance: 0.65 },
     // Props in roll order (part of the world-gen hash sequence).
     props: [
       { prop: "scarecrow", chance: 0.5, count: [1, 1] },
       { prop: "haybale", chance: 0.75, count: [1, 3] },
       { prop: "signpost", chance: 0.3, count: [1, 1], roadside: true },   // placed beside roads
     ],
   };
   ```

2. **Register**: append to `for (const b of [OLD_TOWN, PUMPKIN_FARM, GRAVEYARD_WOODS, LANTERN_CANAL, MOON_MEADOW]) BIOME_DEFS.register(b);` in world-index.ts. Keep `old-town` first.

3. **Art** `src/defs/biomes/<id>.art.ts` (reference `pumpkin-farm.art.ts`):

   ```ts
   import type { BiomeArt } from "../../render/art-registry.js";
   import { flatCut } from "../../render/paper-kit.js";
   import { hash, oval } from "../../render/paper-material.js";

   export const PUMPKIN_FARM_ART: BiomeArt = {
     id: "pumpkin-farm",
     swatch: ["#6a6a44", "#6b4f38", "#e0863f"],   // base paper + two accents (gallery, minimap)
     // Large ground sheets (render/paper-ground.ts): three night tones, a seam style
     // distinct per district (ruled | furrow | torn | wave | scallop), optional fringe-cut grass.
     sheet: { colors: ["#5d5240", "#655840", "#57503a"], seam: "furrow", fringe: "#6f7547" },
     patchChance: 0.7,                              // chance a 210-unit ground cell gets a patch
     patch(ctx, x, y, r, seed) {
       flatCut(ctx, oval(x, y, r, r * 0.38, seed, 0.14), { color: "#5f4a36", lift: 0.6, thickness: 1, texture: 0.85 });
       // clustered detail; use hash(seed + i), never Math.random
     },
   };
   ```

   Sheets and patches are baked into chunk ground caches (terrain worker and fallback run the same `paintChunk`). Append to the `BIOME_ART` list in art-index.ts.

4. **i18n**: `biome.<id>.name`.

## Townsfolk NPC

Neutral paper townsfolk live beside landmarks and give a localized tip when the cat is near. They are **not cats** (only the chosen cat appears in a run; random helper cats stay unbuilt), and they are pure world data: no `SimState`, no step RNG, no colliders, no damage. Enemies and weapons never see them.

1. **Def** `src/defs/townsfolk/<id>/def.ts`: `TownsfolkDef { id, homes, wander: { radius, speed, pause }, talkRadius, tips }`. `homes` are `LANDMARK_DEFS` ids; a landmark takes the first registered def whose homes list its kind. Shared numbers (cap 12, home ring, body clearance, court/spot pads, tip seconds) live in `src/defs/townsfolk/tuning.ts`. Append to the `TOWNSFOLK_DEFS` line in world-index.ts.
2. **Placement and pose** come from `src/game/townsfolk.ts`: `townsfolk(seed)`, `townsfolkNear(seed, x, y, r)`, `townsfolkPose(npc, t)`, `nearestTownsfolk(seed, x, y, t)`, `townsfolkTip`. Homes and stroll waypoints come from `hash2`; every point and every sampled leg must pass `townsfolkSafeAt` (dry, off colliders, off spots and court circles), so any pose on the ping-pong route is safe. Callers pass `sim.elapsed` as `t`.
3. **Art** `src/defs/townsfolk/<id>/art.ts`: `TownsfolkArt { id, bounds, foot, paint(ctx, facing, frame) }`. Author facing right with feet at (0, 0), build each emblem from 1 to 3 `paperEmblem` layers with `figure(f, b => ...)` from `src/render/townsfolk-kit.ts` (mirrors points, not the context, so the shadow stays down-right), and add ink dots with `inkDot`. Calm colours, no threat tones, no glowing eyes. `render/craft-townsfolk.ts` caches `townsfolk:<id>:<facing>:<frame>`, adds the flat shadow and bob live, uses `sketchedSprite` on colourless paper, and draws the speech tag over the one talking. Append to the `TOWNSFOLK_ART` line in art-index.ts.
4. **i18n**: `townsfolk.<id>.name` and `townsfolk.<id>.tip.1..tips` in keys.ts, en.ts and zh.ts. Tips must match current mechanics. `ui/environment-copy.ts` shows `townsfolk.say` after fire, court actions and wet hints and before the colourless and routine hints.
5. **Tests**: `tests/townsfolk.test.mjs` (registry/art parity, keys, pure capped placement, safe routes and poses over several seeds, identical sim snapshots with the helpers called, hint priority, in-view drawing). The gallery shows a "Townsfolk" card per def automatically.

## Tests to extend

- `tests/registry.test.mjs`: landmark / biome art ids match defs and names exist; landmark layouts only place generic decor or registered pieces; biome prop mixes reference props with art.
- `tests/world.test.mjs`: every biome owns chunks for several seeds; biome props stay in their biome and differ between biomes; new landmark kinds are placed for several seeds and kinds fit the super-cells; chunk content stays pure across `clearWorldCache()` and under `DISTRICTS.propCap`.
- `tests/interactions.test.mjs` lists interaction spot kinds per landmark; update it if your layout adds `b.spot` calls.
- `tests/gallery.test.mjs` counts gallery sections (9 today); new entries in an existing registry need no change.
- `tests/water.test.mjs`: shared vertices, explicit crossings, shallow shelves, swept dashes, spawn projection, negative coordinates, teaching basin and placement clearance.
- `tests/landmark-actions.test.mjs` / `environment-integration.test.mjs`: reachable anchors, charge/cooldown persistence, finite rewards, safe greenhouse tending, real element dispatch and deterministic rotor integration.
- `tests/paper-visuals.test.mjs` / `rendering.test.mjs`: read-only progress marks, bounds-based building occlusion and finite live-part caches (not animation/FPS checks).

## Checklist

- [ ] def + art registered in world-index.ts and art-index.ts in the same order
- [ ] every non-generic decor kind is a registered `DecorPiece`
- [ ] `found-<id>` in the `Notice` union; `landmark.<id>`, `notice.found-<id>` or `biome.<id>.name` in all packs
- [ ] pure: only `b.hash`, `hash2`, render `hash`
- [ ] water polygons and visible crossings agree; activity court shares the sim anchor and has localized guidance
- [ ] for implementation work, `npm run build && npm test` pass; disclose fixed-seed layout changes and actual probe evidence
