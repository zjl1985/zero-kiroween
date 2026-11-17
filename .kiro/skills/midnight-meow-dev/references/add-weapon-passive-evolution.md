# Add a weapon, passive or evolution

Interfaces in `src/defs/types.ts`: `WeaponDef`, `WeaponStep`, `WeaponTiming`, `PassiveDef`, `EvolutionDef`, `PlayerStats`, `StatQuery`, `SimContext`. Art interfaces in `src/render/art-registry.ts`: `WeaponArt`, `PassiveArt`, `EffectPainter`. Build limits and XP live in `src/defs/progression.ts` (`BUILD`: 3 weapon slots, 4 passive slots).

The facade `src/game/upgrades.ts` derives `UPGRADES`, `WEAPON_STEPS`, `WEAPONS`, `UPGRADE_VALUES`, `EVOLUTIONS`, `rollChoices`, `readyEvolution` and `upgradeParams` from the registries, so you never edit it to add content.

## Weapon

Reference: `src/defs/weapons/star-fall.ts` (timed area hits) or `paper-crane.ts` (shots).

1. **Def** `src/defs/weapons/<id>.ts`:

   ```ts
   import { EFFECT_LIFE } from "../../game/types.js";
   import type { WeaponDef } from "../types.js";
   import { stepBonus } from "./steps.js";
   import { weaponReady } from "./timers.js";

   const BASE = { interval: 2.2, range: 230, radius: 34, damage: 2.5, count: 1 } as const;
   // STEPS[i] is gained going from level i + 1 to i + 2; max level = STEPS.length + 1.
   const STEPS = [{ count: 1 }, { damage: 1 }, { area: 8 }, { count: 1, rate: 0.15 }] as const;

   declare module "../types.js" {
     interface PlayerStats { <field>: false | { interval: number; range: number; radius: number; damage: number; count: number } }
     interface WeaponBaseMap { "<id>": typeof BASE }
   }

   export const <ID>: WeaponDef = {
     id: "<id>",
     pool: "any",            // or a cat id for an exclusive
     kind: "weapon",
     steps: STEPS,
     base: BASE,              // card params: {interval}, {damage} ... in upgrade.<id>.desc
     timing: "auto",          // "move" (hand weapons), "aura" (orbits, pulses), "auto" (timed)
     elements: ["cut"],       // what it does to props: fire | ink | wind | cut | fold (first is used)
     // shotTag: "<tag>",     // only if it spawns shots (ShotState.weapon)
     stats(s, level) {
       const b = stepBonus(STEPS, level);
       s.<field> = level > 0 && {
         interval: BASE.interval * (1 - b.rate),
         range: BASE.range,
         radius: (BASE.radius + b.area) * s.area,
         damage: BASE.damage + b.damage,
         count: BASE.count + b.count,
       };
     },
     step(state, ps, dt, rng, ctx) {
       if (!ps.<field> || !weaponReady(state, "<id>", dt)) return;
       // pick targets (rng only from the argument), then:
       // ctx.effect(state, x, y, "<impact-kind>", EFFECT_LIFE["<impact-kind>"], { radius });
       // ctx.hurtEnemy(state, e, damage);
       // ctx.elementHit(state, x, y, radius, "cut", damage);   // tears props
       state.weaponTimers["<id>"] = ps.<field>.interval;
     },
   };
   ```

   - Randomness only from `rng`. Using it changes the RNG sequence, so later spawns and card rolls change too; that is fine for new content but it re-records the behaviour probes (see testing-and-verification.md).
   - Shots: `ctx.spawnShot(state, { x, y, vx, vy, life, alive: true, weapon: "<shotTag>", damage, pierce, hits: [] })`. The sim maps `shotTag` to `elements[0]` for prop hits.
   - A new impact kind needs a value in the `EffectKind` union and in `EFFECT_LIFE` (`src/game/types.ts`), and a painter under `effects` in the art.
   - `init(state)` sets initial SimState fields in `createSim`; `hooks` run only while the weapon is owned or is the chosen cat's start weapon.

2. **Register**: append to the weapon list in `src/defs/index.ts` (`WEAPON_DEFS.register`). Position matters: it is card order and step order within a timing, and it shifts RNG use. Append at the end.

3. **Art** `src/defs/weapons/<id>.art.ts`:

   ```ts
   import type { WeaponArt } from "../../render/art-registry.js";
   import { glow, oval, stitch } from "../../render/paper-material.js";
   import { ring, star } from "../../render/combat-fx.js";

   export const <ID>_ART: WeaponArt = {
     id: "<id>",
     icon(ctx, ink) { /* 32 x 32 card glyph */ },
     effects: {
       "<impact-kind>"(ctx, e, { t, fade, ease }) { /* e.x, e.y, e.radius */ },
     },
     // shotTag: "<tag>", shot(ctx, s, time) {...}   draws your shots
     // ground(ctx, state), sprites(ctx, state, time, add), front(ctx, state)   only while active
   };
   ```

   Append to the `WEAPON_ART` list in `src/render/art-index.ts` in the same position as in `WEAPON_DEFS` (it is also draw order).

4. **i18n**: `upgrade.<id>.name`, `upgrade.<id>.desc` (desc may use `{interval}`, `{damage}` ... from `base`).

## Passive

Reference: `src/defs/passives/swift.ts` + `swift.art.ts`, or `deep-fold.ts` (exclusive).

```ts
import type { PassiveDef } from "../types.js";

const VALUES = { speed: 0.08 } as const;
declare module "../types.js" {
  interface UpgradeValueMap { "<id>": typeof VALUES }
}

export const <ID>: PassiveDef = {
  id: "<id>",
  pool: "any",          // or a cat id
  maxLevel: 4,
  values: VALUES,        // card params {speed}
  percent: true,         // cards show values as percentages
  modify(s, level) { s.speed = s.speed * (1 + VALUES.speed * level); },
  // onLevel(state, ctx) {}   runs each time a level is taken
  // hooks: {}                run only while owned
};
```

Register by appending to the passive list in `src/defs/index.ts` (after `SNACK`, so existing card and stat-fold order stay unchanged; the fold runs passives in registration order). Art: `src/defs/passives/<id>.art.ts` with `PassiveArt { id, icon(ctx, ink) }`, appended to the `PASSIVE_ART` list in `src/render/art-index.ts`. Keys: `upgrade.<id>.name/.desc`.

`filler: true` marks the card that tops up a short hand (only `snack` today).

## Evolution

An evolution is two defs: the evolved weapon (`WeaponDef` with `kind: "evolution"`, `values` instead of `steps`/`base`) and the rule (`EvolutionDef`). References: `src/defs/weapons/full-moon.ts` and `src/defs/evolutions/full-moon.ts`.

```ts
import type { EvolutionDef } from "../types.js";

/** <Cat>: max <weapon> + <passive>, granted only by opening a chest. */
export const <ID>_EVOLUTION: EvolutionDef = {
  id: "<id>",               // same id as the evolved weapon def
  cat: "<cat-id>",
  weapon: "<base-weapon>",  // must be at max level
  passive: "<passive>",     // must be owned
  replaces: "<base-weapon>",// slot it takes over
  notice: "evolve-<cat-id>",// Notice union + notice.<...> key
  onEvolve(state) { /* optional one-off setup */ },
};
```

1. Evolved weapon def in `src/defs/weapons/<id>.ts`, pool = the cat id, appended to `WEAPON_DEFS`; its art in `<id>.art.ts` (icon required), appended to `WEAPON_ART`.
2. Rule in `src/defs/evolutions/<id>.ts`, appended to `for (const e of [ECHO_LEGION_EVOLUTION, FULL_MOON_EVOLUTION]) EVOLUTION_DEFS.register(e);`.
3. Add the id to the cat's `exclusives` and `evolutions` in `src/defs/cats/<cat>/def.ts`.
4. Keys `upgrade.<id>.name/.desc`, `notice.<notice>`.

Evolutions are never offered on level-up cards; `openChest` in `src/game/sim.ts` grants them when `readyEvolution` holds. Keep that rule.

Known gap (not fixed): if all passive slots fill before the paired passive is taken, the evolution can never happen, and there is no in-run hint.

## Tests to extend

- `tests/registry.test.mjs` checks pools, evolution pairs, icons (`upgradeIcon`) and i18n keys for every registered weapon, passive and evolution automatically.
- `tests/upgrades.test.mjs`: add a damage test like "the extra weapons hit ink: night claw, star fall, paper crane, pumpkin seed": grant it the way the game does (`s.pendingChoice = { options: ["<id>"] }; chooseUpgrade(s, 0);`), place a stunned enemy with the file's `enemy(s, x, y, hp)` helper, step with `idle` input and assert its hp dropped.
- For a cat-specific item, `each cat is only ever offered its own pool` covers pools.

## Checklist

- [ ] def + art file, both appended at the same position in their lists
- [ ] `declare module` augmentation for every new `PlayerStats` / `UpgradeValueMap` / `WeaponBaseMap` field
- [ ] new `EffectKind` + `EFFECT_LIFE` entries, painters under `effects`
- [ ] `elements` set if it should touch props
- [ ] keys in keys.ts, en.ts, zh.ts
- [ ] `npm run build && npm test` pass; re-record probes if RNG use changed on purpose
