# Add an enemy

An enemy is an `EnemyDef` (sim) with a list of behaviour refs, plus an `EnemyArt` (render), plus a spawn rule in `src/defs/horde.ts`. Interfaces: `EnemyDef`, `EnemyStats`, `EnemyBehaviour`, `BehaviourRef`, `EnemyMove` in `src/defs/types.ts`; `EnemyArt`, `EnemyDissolve`, `EffectPainter` in `src/render/art-registry.ts`.

References: `src/defs/enemies/ink-blob/` (minimal), `crumple/` (`onDeath` split), `smudge/` (behaviour params, `catSlow`, `stepWorld` projectiles), `paper-bat/` (`swoop`), `eraser-boss/` (the scheduled Boss with `arrival`, `onSpawn`, `boss: true`).

The crowd is capped at `HORDE.hardCap` (100) alive, counting splits, summons, waves and elites. Respect it in anything that spawns (`ctx.livingEnemies(state) >= HORDE.hardCap`).

## Steps

1. **Def** `src/defs/enemies/<id>/def.ts`:

   ```ts
   import { HORDE } from "../../horde.js";
   import type { EnemyDef } from "../../types.js";
   import { ENEMY_FX_LIFE } from "../fx-life.js";

   /** Kind numbers other modules (art, behaviours) may read. */
   export const <KIND> = { /* tunables */ } as const;

   export const <KIND>_DEF: EnemyDef = {
     id: "<id>",
     stats: { hp: 4, speed: 36, radius: 12, contactDamage: 1, xp: 2, knockback: 0.8 },
     behaviours: [{ id: "chase" }],            // add { id: "swoop", params: ... } etc.
     eliteable: true,
     contactPush: 8,
     // crowd?: false, throughScenery?: true, lureRange?, slowMultiplier?, dropsShard?: false
     // onSpawn(e, state) { e.timer = 1; }      no RNG here
     // onDeath: [(state, e, ctx) => { ctx.effect(state, e.x, e.y, "<fx>", ENEMY_FX_LIFE["<fx>"]); }],
     // catSlow(state) { return 1; }            speed factor on the cat (puddles)
     // stepWorld(state, dt, ctx) {}            per step after the enemy pass: projectiles, hazards
   };
   ```

   A new enemy impact kind goes into `ENEMY_FX_LIFE` (`src/defs/enemies/fx-life.ts`) and the `EffectKind` union in `src/game/types.ts`.

2. **Behaviour (optional)**: add an `EnemyBehaviour<P>` to `src/defs/enemies/behaviours.ts` and append it to `for (const b of [CHASE, SWOOP, KITE_LOB, BOSS_HUNT]) BEHAVIOURS.register(b);` in `src/defs/index.ts`.

   ```ts
   export const <NAME>: EnemyBehaviour<typeof <KIND>> = {
     id: "<behaviour-id>",
     speed(state, e, def, params) { return def.stats.speed; },        // optional
     steer(state, e, move, params, rng, ctx) {                         // optional
       // bend move.dx / move.dy; return "halt" to end this step's enemy pass.
       // rng is the sim step RNG: using it shifts later rolls.
     },
   };
   ```

3. **Register**: append to `for (const e of [INK_BLOB, PAPER_BAT, CRUMPLE_DEF, SMUDGE_DEF, ERASER_BOSS]) ENEMY_DEFS.register(e);` in `src/defs/index.ts`.

4. **Spawning**, all in `src/defs/horde.ts`:
   - `SPAWN_TABLE[phase]`: weighted `[kind, weight]` rows per night phase (4 rows).
   - `WAVES`: `{ at, kind, count, pattern: "side" | "ring" | "line" }`.
   - `ELITE.kinds`: cycled elite kinds (must be `eliteable`).
   - `KIND_CAP`: optional cap per kind; extra rolls become `FILLER_KIND`.
   Changing any of these changes RNG use and run outcomes.

5. **Art** `src/defs/enemies/<id>/art.ts`:

   ```ts
   import type { EnemyArt } from "../../../render/art-registry.js";
   import { googly, hpStrip, spawning } from "../../../render/craft-enemies.js";
   import { piece, path, shadow, type Ctx } from "../../../render/paper-material.js";
   import { enemyRadius } from "../../../game/sim.js";

   export const <KIND>_ART: EnemyArt = {
     id: "<id>",
     draw(ctx, e, time, look) {
       if (spawning(ctx, e, "#b9a98e")) return;   // spawn-in silhouette
       const r = enemyRadius(e);
       shadow(ctx, e.x, e.y, r, r * 0.32);
       // cut-paper body: piece(ctx, path(points), colour, { shadow, edge, texture, thickness })
       // eyes that track the cat: googly(...)
     },
     dissolve: { flakes: ["#2c2340", "#e8d9bd"], count: 10 },
     // ground(ctx, e) {}      flat telegraphs
     // cullMargin: 60         large bodies
     // effects: { "<fx>"(ctx, e, { t, fade, ease }) {} }
   };
   ```

   Elites are scaled, glowed and crowned by the caller; draw only the base body. Append to the `ENEMY_ART` list in `src/render/art-index.ts`. `src/render/craft-enemies.ts` must not switch on kinds or name kind literals (tested).

6. **i18n**: `enemy.<id>.name` (gallery label) in keys.ts, en.ts, zh.ts.

## Tests to extend

- `tests/registry.test.mjs` covers: spawn tables, elites, waves and kind caps name registered enemies; behaviours exist; names in both packs; art exists with dissolve flakes.
- `tests/enemies.test.mjs`: add a behaviour test (pattern: "a crumpled ball splits into two small blobs on defeat", or "later phases bring bats, crumples and smudges, deterministically").
- `tests/gallery.test.mjs` adds normal and elite cells automatically.

## Checklist

- [ ] def.ts and art.ts under `src/defs/enemies/<id>/`
- [ ] `ENEMY_DEFS` and `ENEMY_ART` lists appended
- [ ] spawn rule in `horde.ts` (table, wave or elite)
- [ ] new impact kinds in `ENEMY_FX_LIFE` + `EffectKind`, painted under `effects`
- [ ] spawning respects `HORDE.hardCap`
- [ ] `enemy.<id>.name` in all packs
- [ ] `npm run build && npm test` pass; re-record behaviour probes if outcomes changed on purpose
