# Add a prop, material or reaction row

Paper props react to elements through a **material x element reaction table**. Weapons, lit pumpkins and fire apply an element to props in range (`ctx.elementHit`), `reactionFor(material, element)` finds the row, and the row's `effect` changes the prop through the context (`damageProp`, `ignite`). A prop has three looks: `intact`, `damaged`, `scraps` (burnt scraps are ash).

Interfaces in `src/defs/types.ts`: `Element` / `ELEMENTS` (`fire`, `ink`, `wind`, `cut`, `fold`, `water`), `MaterialDef`, `ReactionDef`, `PropDef`, `PropSpawn`, `PropSpot`, `PropHit`, `PropPhase`. Art: `PropArt` and `PROP_LOOK` in `src/render/art-registry.ts`, `phasedPaint` / `post` in `src/render/prop-kit.ts`. Sim side: `src/game/props.ts` (`elementHit`, `damageProp`, `ignite`, `stepFire`, `propPhase`, `propMaxHp`, `burningCount`), numbers in `src/defs/fire.ts` (`FIRE`, `PROP_HITS`).

Registration for this whole area is `src/defs/world-index.ts` (not `src/defs/index.ts`), because `src/game/world-gen.ts` imports it to place props.

## Facts to keep in mind

- `SimState.props` is one compact map of touched props for the whole run, so damage survives chunk unload and reload.
- Fire spread rolls use `hash2(seed, cell, 900 + ticks)`, never the step RNG. Drops use `hash2` of the prop id. Keep it that way.
- `drops` (including `burst`) roll only on the first eligible torn destruction. Burning pays nothing but still claims the lifetime roll. Never reset `dropsClaimed` during regrowth or greenhouse renewal.
- **Cats and enemies ignite and carry fire.** Cat burn damage is 1 HP/s through normal shields/invulnerability; enemies take 0.4 per 0.2 s. Water extinguishes first and grants 1.25 s wet protection. The former fire-safe-cat rule is superseded.
- Scraps and temporarily folded props open the path; damaged standing props keep their full collider. Use `propBlocks`, not a phase-only test. An expired fold stays open until safe to unfold.
- Ink (9 s fireproof prop coating) and fold (5 s reversible passage) have registered rows and real sources: smudge/vat for ink, Nicole and one Paper Crane launch pulse per volley for fold. Five flora props regrow after 18–32 s torn / 30–46 s burnt, with occupancy/fire deferral and lifetime loot protection.
- There are 18 props and 27 unique reaction rows. Card and cloth burn (flammability 0.45 / 0.65); card still has no wind row. `ink-vat` and `wax-candle` use the ink/wax materials.
- **Water** is the sixth element (appended last to `ELEMENTS`). The rows `wash-thin-paper`, `wash-card`, `wash-cloth`, `wash-straw` soak a prop (`PropState.soakedUntil`, `WASH.soakSeconds` 8 s): soaked props have flammability 0 and tear 1.6x easier, as do props standing on wet washed cells. Give a new paper prop `water` in `accepts` (every thin-paper/card/cloth/straw prop has it). `SimContext.wash` applies water to props together with the wash grid and fire quench.
- **`onScraps(state, prop, ctx, burnt)`** on `PropDef` runs once when the prop turns to scraps (torn or burnt), after drops. `water-bucket` uses it to spill (radius 64) through `ctx.wash`. Keep it idempotent with the lifetime state; it must not use the step RNG.
- Read [paper-ecology.md](paper-ecology.md) for the complete row matrix, source dispatch, lifecycle, water/fire ordering and test contracts. Numbers live in defs, never in art/UI.

## Material

Add a `MaterialDef` to `src/defs/materials.ts` and append it to `for (const m of [THIN_PAPER, CARD, INK, CLOTH, WAX, STRAW]) MATERIALS.register(m);`.

```ts
/** Hay and dry stalks: tears easily and catches fire faster than paper. */
export const STRAW: MaterialDef = { id: "straw", durability: 1.3, flammability: 1.2, tearability: 0.8 };
```

`flammability: 0` never burns; otherwise it scales the spread chance onto the prop.

## Reaction row

One file per row in `src/defs/reactions/<id>.ts`, appended to the `REACTIONS.register` list in world-index.ts. One row per (material, element) pair (tested).

Tearing rows reuse `tearRow` from `src/defs/reactions/tear.ts`:

```ts
import { tearRow } from "./tear.js";

/** Paper-crane wind tugs cloth loose at half a cut. */
export const GUST_CLOTH = tearRow("gust-cloth", "cloth", "wind", 0.5);
```

Custom rows implement `ReactionDef` (reference `src/defs/reactions/burn-straw.ts`):

```ts
import { FIRE } from "../fire.js";
import type { ReactionDef } from "../types.js";

export const BURN_STRAW: ReactionDef = {
  id: "burn-straw",
  material: "straw",
  element: "fire",
  result: "scraps",     // phase the prop ends in when used up
  fx: "ember",          // impact kind left behind (EffectKind)
  effect(state, hit, ctx) {
    ctx.ignite(state, hit.prop.x, hit.prop.y, FIRE.cell * 1.5);
  },
};
```

A new element source: give a weapon `elements: ["<element>"]` (shots carry **only the first element** through `shotTag`), or call `ctx.elementHit(state, x, y, radius, "<element>", power)` from a def hook. This context path also dispatches landmark activities. Paper Crane's second `fold` element is an explicit launch pulse, not another per-shot hit.

For reversible treatments reuse `inkRow` / `foldRow` in `reactions/paper-status.ts`; do not import `game/props.ts` into world-registration-time row helpers. `result: "intact"` is metadata, not permission to reset damaged HP. First touch must use material-scaled max HP, and repeated hits refresh deadlines rather than stacking. `melt-wax` uses burnt damage (no loot), not an automatic ignition call.

## Prop

1. **Def** `src/defs/props/<id>/def.ts` (reference `paper-crate`, `scarecrow` for `burst`, `paper-grass` for flat fuel):

   ```ts
   import type { PropDef } from "../../types.js";

   /** A folded card crate: cut it open for a shard and sometimes a fish treat. */
   export const PAPER_CRATE: PropDef = {
     id: "paper-crate",
     material: "card",
     size: { w: 36, d: 22 },                     // footprint at s = 1 for hits and fire cells
     colliders: (_seed, x, y, s) => [{ x1: x - 9 * s, y1: y - 6, x2: x + 9 * s, y2: y - 6, radius: 9 * s }],
     durability: 3,                              // times material.durability
     damagedBelow: 0.6,
     accepts: ["cut", "ink", "fold", "fire"],    // each needs a row for the material
     drops: { shard: 0.8, shardValue: 1, treat: 0.15 },   // burst?: n spills a ring of n shards
     spawn: { clear: 34, scale: [0.85, 1.15] },  // from?: "<decor kind>", chance?, count?, flat?
     art: "paper-crate",
   };
   ```

2. **Register**: append to the `PROP_DEFS.register` list in `src/defs/world-index.ts`.

3. **Place it**: a prop only appears in the world if a biome lists it (`BiomeDef.props` in `src/defs/biomes/<id>.ts`, see [add-landmark-biome.md](add-landmark-biome.md)) or if `spawn.from` migrates a generic decor kind. `spawn.chance` / `spawn.count` are defaults for biome entries; `spawn.clear`, `scale` and `flat` always come from the PropDef. Biome prop entries roll in list order and are part of the world-gen hash sequence: adding or reordering them changes every seed's world. Props past `DISTRICTS.propCap` (14 per chunk) are dropped.

4. **Art** `src/defs/props/<id>/art.ts` with `phasedPaint` (reference `src/defs/props/paper-crate/art.ts`):

   ```ts
   import type { PropArt } from "../../../render/art-registry.js";
   import { foldLine, paperCut } from "../../../render/paper-kit.js";
   import { mix, shadow, type Ctx, type Point } from "../../../render/paper-material.js";
   import { phasedPaint } from "../../../render/prop-kit.js";
   import { variant } from "../../../render/variants.js";

   const CARDS = ["#a8825a", "#9a7650", "#b48e62"] as const;
   const BOUNDS = { l: -24, r: 24, t: -38, b: 8 } as const;

   /** The intact prop at s = 1 with its base at (0, 0). */
   function crate(ctx: Ctx, v: number): void {
     const look = variant(v, { palette: CARDS, shift: 0.3, wear: [0.2, 0.55] });
     shadow(ctx, 2, 2, 22, 5);
     const front: Point[] = [[-18, 0], [-18, -24], [10, -24], [10, 0]];
     paperCut(ctx, front, { color: look.color, shadow: 2, thickness: 0.9, texture: 0.85, wear: look.wear, seed: v });
     foldLine(ctx, -4, -24, 5, -30, 0.5);
   }

   export const PAPER_CRATE_ART: PropArt = {
     id: "paper-crate",
     bounds: BOUNDS,
     variants: 3,                       // cached variants per phase
     flames: [],                        // [[dx, dy], ...] flame spots while burning (flammable props)
     scraps: [...CARDS, "#d9c597"],     // fleck and scrap colours
     // look: { scale: [0.95, 1.05], angle: [-0.04, 0.04], flip: true },   default PROP_LOOK
     paint: phasedPaint({
       bounds: BOUNDS,
       intact: crate,
       stub: "#9a7650",
       stubs: [[-10, 8], [4, 11]],      // torn stubs left standing: [x, height]
       scraps: [...CARDS, "#d9c597"],
       spread: [22, 7],                 // scrap / ash patch half size
     }),
   };
   ```

   Painters must be pure (results are cached per phase, burnt, scale and variant via `cachedSprite`). Append to the `PROP_ART` list in `src/render/art-index.ts`.

5. **i18n**: `prop.<id>.name` (gallery label).

## Tests to extend

- `tests/reactions.test.mjs` checks every row's material and element, one row per pair, every prop's material, accepted elements with a row, art, scraps and names. Add a behaviour test using the file's helpers `quiet()`, `run()`, `findProp(kind, seed)`, `parkAway()` with `applyElement(state, x, y, r, element, power)` / `igniteAt(state, x, y, r)` from `dist/game/sim.js` (patterns: "a torn scarecrow spills a ring of ink shards", "straw burns: fire lights a hay bale and spreads to it").
- `tests/registry.test.mjs` "biome prop mixes name registered props with art and reaction rows for what they accept".
- `tests/world.test.mjs` checks props per chunk stay under the cap and biome props stay in their biomes.
- `tests/gallery.test.mjs` adds the five base prop previews automatically (intact/damaged/scraps/burning/burnt); it does not automatically preview every runtime ink/fold/regrow overlay.
- `tests/paper-elements.test.mjs`, `fire-water.test.mjs`: source dispatch, real max HP, deadline refresh, flat-fold no-op, safe unfold/regrow, ink fuel suppression, wax consumption and one lifetime loot roll.
- `tests/water.test.mjs`, `environment-integration.test.mjs`, `paper-visuals.test.mjs`: wet placement clearance, integrated damage/extinguish ordering, read-only overlays and finite caches.

## Checklist

- [ ] material (if new) and every needed reaction row registered in world-index.ts
- [ ] prop def registered in world-index.ts, art registered in art-index.ts
- [ ] listed in at least one biome (or `spawn.from`)
- [ ] no step RNG in reactions or fire; seeded by `hash2` only
- [ ] optional `regrow` is flora-only; material-scaled HP, safe collider restoration and lifetime loot claim preserved
- [ ] water/fire/status behavior and treatment overlays follow paper-ecology.md
- [ ] `prop.<id>.name` in keys.ts, en.ts, zh.ts
- [ ] for implementation work, `npm run build && npm test` pass; disclose intentional world changes and do not claim stale local probe references were refreshed
