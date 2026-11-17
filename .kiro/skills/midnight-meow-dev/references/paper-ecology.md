# Paper ecology: water, fire, treatments and landmark activities

This is the implemented contract as of 2026-11-17, not a claim of visual approval. The user explicitly requested the remaining art and interaction gaps, including **paper actors catching fire and water extinguishing them**. This supersedes the old “fire never hurts the cat” rule and the old deferral of ink/fold sources, regrowth, windmill interaction and water collision.

## Ownership and state

- Numbers and pure geometry: `src/defs/fire.ts` (`FIRE`, `PROP_HITS`), `water.ts` (`WATER`, polygon helpers), `ecology.ts` (`ECOLOGY`), `reactions/paper-status.ts` (`PAPER_ELEMENTS`), `landmark-activities.ts` (activity definitions and shared court anchors).
- Simulation: `src/game/water.ts`, `paper-status.ts`, `props.ts`, `landmark-actions.ts`; integration and normal damage paths in `sim.ts`. None imports rendering or the DOM.
- State: player/enemies extend `PaperStatus` (`burnTime`, `burnClock`, `wetTime`); touched props retain HP, phase, treatment deadlines, regrowth deadline and lifetime `dropsClaimed`; `SimState.landmarkEvents` is keyed by placed landmark id, not kind.
- All ecology clocks are simulation time. Pause/upgrade screens stop stepping; finished runs reject mutations. Touched state survives chunk unloads. Geometry, fire spread and drops use pure hashes, never the step RNG. Rendering only reads these states.

## Water is geometry, not decoration

`LandmarkDef.water` and `BiomeDef.water` return pure `WaterShape`s. `world-gen.ts` builds a bounded, spatially indexed cache (`WATER.cachedSeeds` = 4), independently of `chunkContent`, and adds explicit road crossing polygons. `prepareWater` subtracts crossings from the deep core into convex `solids`. `waterRegionsNear` is shared by simulation and rendering, including negative world coordinates.

- `waterAt`: `dry`, `shallow`, `deep`, `bridge`. Shallow water multiplies player/enemy movement speed by **0.68**. Deep cores block actors by radius; the stone deck and generated road crossings are dry and passable.
- `resolveWaterMove` sweeps a circle against the deep polygons and slides along the bank (bounded passes), so a dash cannot jump through a core just because its endpoint is dry. `avoidDeepWater` projects spawn/recovery positions out of deep water. Scenery-ignoring enemies still use the water sweep on normal movement.
- `water-art.ts` draws the exact shore/core/crossing vertices with straight edges, not a separately jittered or smoothed water outline. Pale shelves show shallow access, darker paper shows blocked cores, and decks draw after roads. Do not restore decorative walkable ponds or invisible road exemptions.
- Sources: wishing-well ponds, stone-bridge river, lantern-canal pockets, and the fully shallow teaching basin at **(1040, 420)** with radii **76 x 46**, just east of the starting yard. The basin has no deep core.
- Generated props and building contacts stay clear of wet footprints. Preserve start-yard protection, landmark court/lantern approaches, world bounds and road passage when editing geometry.

## Actors ignite; water wins

`touchPaperEnvironment` latches contact immediately after movement and contact knockback, without advancing timers. This preserves extinguishing if the actor reaches water but is pushed dry or killed by contact later in that same tick. `stepFire` removes wet fire cells, runs prop lifecycle, then `stepPaperStatus`, then the fixed fire ticks. Actor status continues even when the fire grid is empty. Apply shallow movement scaling after enemy steering so custom Boss charges cannot bypass it.

| Contract | Current tuning / behavior |
| --- | --- |
| Ground fire | 24-unit cells; at most 40 live cells; each lives 2.4 s; 0.2 s fire tick |
| Spread | Four-neighbor hash rolls, chance 0.35 times flammability; only standing flammable fuel, no wet cells; bounded ash memory (500) |
| Actor contact | Circle against the whole burning square, not only the actor's centre cell |
| Carried burn | Refresh to 3 s on dry fire contact; persists off-grid; `burnClock` is separate from ground-fire time |
| Cat damage | 1 HP per 1 s, with a full first beat; calls normal `hurtPlayer`, preserving shields, invulnerability, rescue hook and defeat handling |
| Enemy damage | 0.4 per 0.2 s through `hurtEnemy`; skips dead/arriving enemies and does not tick newborn death-hook splits in that same actor pass |
| Extinguish | Radius contact with exposed shallow/deep water clears burn and burn clock **before a due burn hit or same-step ignition**, emits steam, and gives 1.25 s wet protection |
| Dry decks | Crossing polygons are subtracted from exposed water; standing wholly on a bridge does not wet an actor, but an actor whose radius reaches water beside it is extinguished |
| Carried spread | Only on `FIRE.tick`, reaches actor radius + 4 into dry fuel; wet actors never spread fire |
| Prop burn | 0.5 durability per prop per fire tick, not per footprint cell; water-overlapping cells cannot light and are removed before spread/damage |

These rules apply to both selectable cats and living enemies, not to skill decoys. Water-contact status uses actor radius; the movement slowdown uses the actor centre's `waterAt` result. Water extinguishes fire, not all other damage sources. Do not reintroduce a cat-only immunity or apply direct HP subtraction to bypass normal defense hooks.

## Materials, rows and sources

`world-index.ts` registers **6 materials, 23 unique material x element rows and 17 props**. The row matrix is:

| Material | Elements with rows | Flammability |
| --- | --- | --- |
| thin-paper | cut, wind, fire, ink, fold | 1 |
| card | cut, fire, ink, fold | 0.45 |
| cloth | cut, wind, fire, ink, fold | 0.65 |
| straw | cut, wind, fire, ink, fold | 1.2 |
| ink | cut, wind | 0 |
| wax | cut, fire | 0.5 |

`PropDef.accepts` and the row must both allow an element. Card still has no wind row; do not invent one. `PROP_HITS.hitInterval` (0.18 s) throttles repeat hits to a prop. Keep one row per material/element pair and append registrations rather than reordering them.

- **Ink:** smudge drops apply ink once on landing while keeping their existing splash/puddle behavior. Cutting or gusting `ink-vat` damages it and splashes ink within `76 * scale`, even before destruction. A vat does not accept ink, so the splash cannot recurse into itself.
- **Ink coating:** 9 s on standing thin-paper/card/cloth/straw; refreshes an absolute deadline, does not stack, heal, destroy or award loot. `ECOLOGY.inkFlammability = 0` prevents ignition and ongoing fuel consumption while coated. Water at the prop position washes it off. This is a prop treatment, not an actor shield, and it does not erase unrelated neighboring fire.
- **Fold:** Nicole's Moonfold supplies fold at her real field radius without replacing shields or the slow field. Paper Crane supplies **one** radius-84, power-1 fold pulse at the cat per successful volley launch. Crane shots remain wind (`elements[0]`); merely listing a second element does not dispatch it automatically. Fan, homing, timing and RNG remain unchanged.
- **Folded props:** 5 s temporary passage for standing props that actually have colliders. No HP, destruction-stat or loot change; no fake treatment of flat flora. `propBlocks` remains false while `foldedUntil` exists, including an expired fold awaiting safe unfolding. Retry in 0.5 s if the cat or an enemy occupies the collider plus 8-unit clearance. This is distinct from render-only landmark pop-up folding.
- **Wax:** `wax-candle` accepts cut/fire. `melt-wax` consumes `power * 0.8` through burnt damage without loot or an invented ignition call. Its wax material can separately fuel real grid fire.

The 17 props are paper-fence, paper-bush, paper-grass, paper-lanterns, scarecrow, haybale, paper-crate, mailbox, signpost, paper-flowers, paper-reeds, paper-mushroom, laundry-line, paper-tombstone, dead-tree, ink-vat and wax-candle.

## Regrowth is restoration, never a loot farm

Only these five flora definitions opt into `regrow`:

| Prop | Torn delay | Burnt delay |
| --- | --- | --- |
| paper-grass | 18 s | 30 s |
| paper-reeds | 22 s | 34 s |
| paper-flowers | 24 s | 36 s |
| paper-bush | 28 s | 42 s |
| paper-mushroom | 32 s | 46 s |

- Lifecycle runs offscreen against absolute `regrowAt` deadlines, resolving the original placement from the prop id. Handcrafted props stay destroyed.
- Occupied colliders or nearby live fire defer regrowth by 0.5 s. Never spawn solid geometry around an actor. On restoration, use **prop durability x material durability**, clear old burn/treatment state and only ash inside that prop's footprint, not another prop's fire/ash.
- Torn props may roll their seeded drops only once in the run. Burning also claims that lifetime roll but pays no loot. Regrowth and greenhouse tending retain/set `dropsClaimed`; repeated tearing, burning or renewal cannot farm shards/treats. A renewed plant can be fuel again.
- A render regrowth cue is only anticipation: scraps remain scraps until the sim restores them. A deferred fold likewise remains visually folded until collision is safe to restore.

## Four landmark activities

`LandmarkDef.activity` opts in; tuning and shared visible court anchors are in `landmark-activities.ts`, execution in `game/landmark-actions.ts`. `SimContext.elementHit` dispatches both prop reactions and eligible landmark hits through `applyElement`.

| Landmark | Trigger / charge / cooldown | Reward |
| --- | --- | --- |
| paper-teahouse | Stand within 44 of court for 2.5 s; 32 s cooldown | Heal 1 HP, capped at max HP |
| fold-greenhouse | Fold hits within court radius 48; charge 2; 45 s cooldown | One treat; advance up to 10 nearby renewable scraps' existing future regrowth deadlines within 320 |
| star-observatory | Stand within 44 of court for 3 s; 48 s cooldown | Stun living, arrived enemies within 240 for 3 s; shard value 4; **not** a map reveal |
| paper-windmill | Wind hits within court radius 100; charge 3; 24 s cooldown | Pulse within 210: 1.5 damage and 1.6 s stun; shard value 2 |

- Proximity charge is seconds; element charge adds `min(power, 2)` per hit. Greenhouse/windmill do not charge simply by standing nearby. Partial progress survives leaving; cooldowns continue offscreen and cannot pay repeated frame-rate rewards.
- Greenhouse tending schedules normal lifecycle checks; it does not directly resurrect/heal props, remove occupancy/fire checks or reset loot history.
- Wind hits refresh a 6 s rotor boost even during cooldown. Sim-owned `turn` integrates 0.25 rad/s idle and 2.6 rad/s boosted; rendering reads it without mutation. The cached tower has no sails; `DecorPiece.live` draws one rotor under the same depth/pop-up transform using only three cached texture variants, never time/angle cache keys.
- Court progress/cooldown marks use the same `landmarkActivityPoint` as simulation. Keep their approach walkable and copy localized. `src/ui/environment-copy.ts` gives burning status/help first priority. Wet status remains visible; a nearby court's real action/cooldown takes hint priority over wet help, which otherwise replaces the routine early-run hint.

## Art and evidence boundaries

- `paper-face.ts` derives cached color contours and silhouette from untouched official Meow Wall rectangle data with last-rectangle-wins visibility. Keep markings, holes, diagonal contacts, small eye/nose/highlight regions, narrow rim and existing anchors. World cats and portraits share that source; do not replace the face or edit official data to fake papercraft.
- Enemy cuts and combat effects use finite cached facets, wings, sleeves, cranes, stars, flecks and open rings, with live transforms instead of per-frame texture rebuilding. Keep threat silhouettes, eyes and telegraphs readable.
- `paper-status-art.ts` supplies read-only carried flame/char and damp drop/ripple overlays after actual actor art, not decoys; steam, ink-wash, regrow and landmark-reward have separate paper cues. Prop ink is alpha-masked, folds retain the underlying cut, ground fire marks the real square cell. Tall building occlusion uses registered bounds, not an id allowlist.
- New regression suites: `environment-integration`, `fire-water`, `landmark-actions`, `paper-elements`, `paper-visuals`, `water` (all `tests/*.test.mjs`). Also retain cat-art, reactions, rendering, scenery-art, registry and official-data checks. Canvas command/geometry tests are not browser-pixel, animation or performance tests.
- Latest verification: `npm run build && npm test` passed **237 tests**. One static screenshot was captured **and viewed** at `output/playwright/paper-ecology-review.png` using system Chrome, not the missing bundled Chromium. It shows selected art only, not a full gameplay-screen or mobile review.
- No animation, recording, audio or FPS checks were performed. Balance, full-screen/mobile layout, motion and user art approval remain open; the art and entry are not finished. Do not infer deployment of this work from the user's confirmation of the older Vercel version. Follow [testing-and-verification.md](testing-and-verification.md).
