# Add a cat

A cat is a `CharacterDef` (sim) plus a `CatArt` (render) plus official head data and i18n copy. Interfaces: `CharacterDef` and `CatBaseStats` in `src/defs/types.ts`; `CatArt`, `CatBodyPalette`, `CatColors` in `src/render/art-registry.ts`. Use Nicole (`src/defs/cats/nicole/`) as the reference; she uses every optional hook.

Hard rules: only the chosen cat is in a run (no companion), and every cat keeps its own kit: start weapon, skill, passive, exclusives and an evolution. Ask the user before adding helper cats.

## Steps

1. **Numbers**: `src/defs/cats/<id>/stats.ts`.

   ```ts
   /** <Name>'s numbers: base kit plus her own skill numbers. */
   export const <ID>_STATS = {
     maxHp: 5,
     speed: 110,
     accent: "#a0c8b0",
     dashSpeed: 265,
     dashTime: 0.18,
     cooldown: 4,
     invulnerability: 0.22,
     // kit-specific numbers below
   } as const;
   ```

   The first seven fields are `CatBaseStats` and are required.

2. **Def**: `src/defs/cats/<id>/def.ts`, shaped like `NICOLE` in `src/defs/cats/nicole/def.ts`.

   ```ts
   import type { CharacterDef } from "../../types.js";
   import { <ID>_STATS as S } from "./stats.js";

   declare module "../../types.js" {
     interface PlayerStats { <kitField>: number }
     interface CharacterStatsMap { "<id>": typeof S }
   }

   export const <ID>: CharacterDef<typeof S> = {
     id: "<id>",
     gender: "female",
     stats: S,
     startWeapon: "<weapon-id>",          // must be a registered weapon in pool "any" or "<id>"
     exclusives: ["<weapon-id>", "<passive-id>", "<evolution-id>"],
     evolutions: ["<evolution-id>"],      // required: game/upgrades.ts evolutionFor() assumes one
     i18n: "<id>",
     art: "<id>",
     skillNotice: "<id>-skill",           // add to the Notice union in src/game/types.ts
     copyParams: () => ({ /* {name}: number used by the i18n copy */ }),
     kitStats(s) { s.<kitField> = S.<number>; },
     onSkill(state, ps, ctx) {
       // runs after the shared dash starts; use ctx.effect / ctx.notify / ctx.hurtEnemy ...
       ctx.notify(state, "<id>-skill");
     },
     hooks: { /* tick, hit, kill, dash, damaged, pickup, levelUp, chestOpen, touchProp */ },
   };
   ```

   - `kitStats` runs for **every** registered cat on every stat fold (`src/game/stats.ts`), so set only your own `PlayerStats` fields and do not read run state that assumes your cat.
   - `hooks` only run while this cat is the one in the run (gated in `src/defs/index.ts` `subscribe`).
   - Randomness: hooks get no RNG. If the skill needs randomness, derive it from `hash2` or redesign; never `Math.random`.
   - `enemySlow` (optional): speed factor on ink slowed by this cat's skill (Nicole 0.4).

3. **Kit content**: add the start weapon, exclusives and evolution with pool `"<id>"`, see [add-weapon-passive-evolution.md](add-weapon-passive-evolution.md).

4. **Register the def**: in `src/defs/index.ts`, import it and append to
   `for (const cat of [ZERO, NICOLE]) CATS.register(cat);`
   Append at the end: ticket order and stat fold order follow registration order.

5. **Head data**: add a variant with `id: "<id>"` to `CAT_VARIANTS` in `src/cats/meow-wall-art.ts` (palette, markings, accessories). `officialRects(id)` in `src/cats/official.ts` throws `missing meow-wall variant` without it. `src/cats/catalog.ts` (`getCat`, `allCats`) is legacy pixel data and is not used by the papercraft renderer.

6. **Art**: `src/defs/cats/<id>/art.ts`, shaped like `NICOLE_ART`.

   ```ts
   import type { CatArt } from "../../../render/art-registry.js";
   import { drawCraftCat } from "../../../render/craft-cat.js";
   import { drawOfficialHead } from "../../../render/layout.js";

   export const <ID>_ART: CatArt = {
     id: "<id>",
     body: { rim, tail, paw, pawEdge, cape, capeEdge, capeFold, body, bodyEdge, bib, belt, arm, chain: false },
     colors: { hud, tone, cardPaper, cardInk, icon, levelUp, evolve },
     draw(ctx, pose) { drawCraftCat(ctx, pose, <ID>_ART.body); },
     skillPreview(ctx, pose) { /* draw this cat's skill effect and pose without a sim or audio */ },
     portrait(ctx, pose, scale) { drawOfficialHead(ctx, pose, { scale }); },
     heroAura(ctx, x, y, time) { /* title aura, paper-kit / paper-material only */ },
     skillIcon(ctx, kind) { /* 32 x 32 glyph for "attack" | "active" | "passive" */ },
     ground(ctx, state) { /* optional flat skill marks */ },
     status(state) { return null; /* optional HUD status MessageKey */ },
   };
   ```

   Register it in `src/render/art-index.ts`: append to
   `for (const a of [ZERO_ART, NICOLE_ART]) CAT_ART.register(a);`
   `CAT_ART` order must equal `CATS` order (tested). The required `skillPreview` owns the gallery skill pose: choose dashing only when it fits this cat's skill, and draw the cat as well as the effect.

7. **i18n** (keys.ts + en.ts + zh.ts), see [i18n.md](i18n.md):
   `<id>.name`, `<id>.role`, `<id>.story`, `<id>.tactic`, `<id>.attack.name`, `<id>.attack.desc`, `<id>.active.name`, `<id>.active.short`, `<id>.active.desc`, `<id>.passive.name`, `<id>.passive.desc`, `cat.<id>.choice`, `notice.<skillNotice>`, the evolution's `notice.<notice>`, plus `upgrade.<id>.name/.desc` for each new weapon / passive.

8. **Optional theme**: a `body[data-cat="<id>"]` block in `styles.css` (see the `nicole` block). Without it the default (Zero) theme applies. No `url()` textures.

The ticket on the title screen is built by `buildCatTickets()` in `src/ui/character-panel.ts` from `CATS`; no `index.html` change is needed. Prefs accept any registered id.

## Tests to extend

`tests/registry.test.mjs` already checks every cat generically: registered start weapon from its own pool, exclusives in its own pool and not shared, evolution pairs, i18n keys, matching `CAT_ART`. Add a kit test in `tests/characters.test.mjs` (pattern: `createSim({ cat: "<id>", seed })`, `step(state, { ax, ay, dash: true }, FIXED_DT)`, then assert on `state`). `tests/gallery.test.mjs` picks the cat up automatically (idle + skill cells).

## Checklist

- [ ] stats.ts, def.ts, art.ts under `src/defs/cats/<id>/`
- [ ] start weapon, exclusives and one evolution registered, pool `"<id>"`
- [ ] `CATS` and `CAT_ART` lists appended in the same position
- [ ] `CAT_VARIANTS` entry with the same id
- [ ] new `Notice` values added to `src/game/types.ts`
- [ ] all keys in keys.ts, en.ts, zh.ts
- [ ] no `"<id>"` literal in `src/game/*.ts`, non-legacy `src/render/*.ts`, `src/ui/*.ts`, `src/main.ts`
- [ ] `npm run build && npm test` pass
