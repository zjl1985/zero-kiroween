# Add a landmark or a district biome

Both are registered in `src/defs/world-index.ts` and placed by the pure world generator `src/game/world-gen.ts` (`landmarks(seed)`, `landmarkParts(l)`, `districtSites(seed)`, `biomeAt(seed, cx, cy)`, `chunkContent(seed, cx, cy)`). Art is registered in `src/render/art-index.ts`. Everything here is a pure function of the seed: use the builder's `hash` or `hash2`, never the sim RNG or `Math.random`.

Interfaces: `LandmarkDef`, `LandmarkPlace`, `LandmarkBuilder`, `LandmarkArea`, `BiomeDef`, `BiomeProp`, `DecorMix` in `src/defs/types.ts`; `LandmarkArt`, `DecorPiece`, `BiomeArt`, `decorPiece`, `landmarkReach` in `src/render/art-registry.ts`.

Any change here changes the generated world for every seed, so the behaviour probes must be re-recorded (see testing-and-verification.md).

## Landmark

The world has 24 landmark super-cells (`LANDMARK.cols` 5 x `rows` 5, minus the start cell); each registered kind is placed at least once, so at most 24 kinds fit (tested). There are 12 today, including paper-teahouse, fold-greenhouse and star-observatory. The 10 x 10 screen world is unchanged; the extra rows shorten gaps between places to visit. Keep the 360-unit cell margins and check start-yard, per-chunk ownership and approach clearance when changing placement.

1. **Def** `src/defs/landmarks/<id>/def.ts` (reference `wishing-well`, `clock-tower`; `stone-bridge` uses `span` and `keepOut` for its river):

   ```ts
   import type { LandmarkDef } from "../../types.js";

   /** Pond numbers of the wishing well (ground art reads them too). */
   export const POND = { rx: 120, ry: 58, dy: 42 } as const;

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
     ground(ctx, l) { /* flat art baked into chunk caches: plaza, pond, soil */ },
     // reach(l) { return l.radius + 60; }            ground reach, default radius + 40
     pieces: [{ kind: "well", bounds: { l: -36, r: 36, t: -110, b: 10 }, paint: well /*, variants: 2, popup: true */ }],
   };
   ```

   - `pieces` are tall y-sorted cached sprites; every non-generic `b.add` kind must be a registered piece (tested). `popup: true` makes it fold up like a pop-up book page near the cat (`POPUP` in `src/render/timeline.ts`, render-only).
   - Shared plaza ground: `src/defs/landmarks/plaza.art.ts`.
   - Append to the `LANDMARK_ART` list in art-index.ts; `LANDMARK_ART.ids()` must equal `LANDMARK_DEFS.ids()`.

4. **Discovery notice**: add `"found-<id>"` to the `Notice` union in `src/game/types.ts` (the sim calls `notify(state, \`found-${kind}\`)`).

5. **i18n**: `landmark.<id>` (journal, nav arrows, gallery) and `notice.found-<id>`.

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
   import { paperCut } from "../../render/paper-kit.js";
   import { hash, oval } from "../../render/paper-material.js";

   export const PUMPKIN_FARM_ART: BiomeArt = {
     id: "pumpkin-farm",
     swatch: ["#6a6a44", "#6b4f38", "#e0863f"],   // base paper + two accents (gallery, minimap)
     patchChance: 0.7,                              // chance a 150-unit ground cell gets a patch
     patch(ctx, x, y, r, seed) {
       paperCut(ctx, oval(x, y, r, r * 0.38, seed, 0.14), { color: "#5f4a36", shadow: 1, thickness: 1, texture: 0.85 });
       // clustered detail; use hash(seed + i), never Math.random
     },
   };
   ```

   Patches are baked into chunk ground caches. Append to the `BIOME_ART` list in art-index.ts.

4. **i18n**: `biome.<id>.name`.

## Tests to extend

- `tests/registry.test.mjs`: landmark / biome art ids match defs and names exist; landmark layouts only place generic decor or registered pieces; biome prop mixes reference props with art.
- `tests/world.test.mjs`: every biome owns chunks for several seeds; biome props stay in their biome and differ between biomes; new landmark kinds are placed for several seeds and kinds fit the super-cells; chunk content stays pure across `clearWorldCache()` and under `DISTRICTS.propCap`.
- `tests/interactions.test.mjs` lists interaction spot kinds per landmark; update it if your layout adds `b.spot` calls.
- `tests/gallery.test.mjs` counts gallery sections (7 today); new entries in an existing registry need no change.

## Checklist

- [ ] def + art registered in world-index.ts and art-index.ts in the same order
- [ ] every non-generic decor kind is a registered `DecorPiece`
- [ ] `found-<id>` in the `Notice` union; `landmark.<id>`, `notice.found-<id>` or `biome.<id>.name` in all packs
- [ ] pure: only `b.hash`, `hash2`, render `hash`
- [ ] `npm run build && npm test` pass; probes re-recorded (world changed)
