# Midnight Meow handoff

The current game code is the paper wash-out round on top of e85365d (local commits 6931574 through b92920e, plus the docs commit that records them). Midnight Meow is a code-drawn papercraft survival game for Kiroween 2026. Start with [AGENTS.md](AGENTS.md) and the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md). The [plan](PLAN.md) holds the remaining work. Earlier rounds are in Git history, including the prior handoffs at e7bc669 and e85365d.

## Paper wash-out round (local only, not pushed, not viewed in a browser)

The user asked for this round with the words "try it; my P0 is still that it must look good". Everything below is implemented and tested by command recording and simulation tests. None of it has been seen in a browser, heard, or approved by the user.

- **Paper ruleset (6931574).** One moon light from the top-right, one hard shadow down-right, 1 to 3 flat layers, a lit rim and dark lip per layer (`src/render/paper-rules.ts`, `flatLayer` / `paperEmblem` / `flatCut` / `flatShadow` in `paper-kit.ts`). All 19 weapon and passive emblems, card mounts and HUD tags were redrawn with it. Developer views `/?gallery=1&check=value` and `&check=gloss`.
- **Paper world (265fe69, 8a42c20).** Redrawn ink blob, bat, crumple and Eraser; readable damaged, scraps and burnt prop states; district paper sheets with seams and fringe-cut verges; a distinct base per landmark kind instead of one shared oval.
- **Wash-out (f06b3a8, 39c10c9, caa24a4).** A sparse 32-unit colour grid in `SimState.wash`. Page states: painted, colourless (raw cream paper with the pencil underdrawing) and blank (rubbed out by the Eraser). Water lifts colour; pigment, lit pumpkins, full lanterns, the Watercolour Brush and dawn paint it back. Wash Drip and Pencil Sketch enemies, the Water Bucket prop, the `water` element and paper rain. Contract: [paper-ecology.md](.kiro/skills/midnight-meow-dev/references/paper-ecology.md#wash-out-colour-grid).
- **Paper verbs (3437a1b).** Zero's exclusive Paper Cut (close a loop to cut ink and paper out) and Nicole's exclusive Page Fold (fold the page over nearby ink; level 3 adds a short wall). Damage shows as creases and tears on the cat's clothes, healing as tape; the head is untouched. New snip and fold sounds.
- **Combat readability (b92920e).** Baked ground tiles are lowered and greyed (`PAPER_VALUE.ground`), plain decor and props a smaller step (`PAPER_VALUE.decor`), so cats, ink and shots read first. Cached enemy body parts and the live chosen cat get a pale moon-side cut rim. Player shots are one solid colour on a dark paper outline, without glow. Lamps were halved (every `lampChance` halved, lamps placed only beside roads; about 44 to 51 per seeded world instead of 100 to 110). Plain lamps, windows, candles and decor pumpkins lost their gradient glows, so interactive pumpkins and lanterns stay the brightest warm accents. The blurred `shadow()` became a flat down-right shadow, and scenery, props, lamps and landmark ground bake with `withFlatShadows` (hard down-right shadows instead of blurred down-left ones). No render module sets `ctx.filter` per frame; only the gallery value check uses a one-off grayscale filter.
- **Not done.** Page Fold's planned temporary dry bridge over water was skipped: the shared water contract (same pure polygons for art and physics, crossings only from world-gen) has no runtime crossing API. Balance and playtest of wash-out, paper rain, sketches, Paper Cut and Page Fold were not done. The new snip and fold sounds were never heard.
- **Verification.** `npm run build` and `npm test` pass **293 tests** (247 at e7bc669). Lamp placement changed seeded decor layouts deliberately; no seeded test expectation needed changing for it. Three tests were adjusted on purpose: the off-camera spawn test skips `wakesOn` kinds (sketches wake near the cat by design), the radius map adds Wash Drip 11 and Sketch 10, and the "brush is the last weapon" check became "after Pumpkin Seed". Screenshot: not yet taken when this section was first written; the result is recorded under "Visual evidence" below.
- **Sim timing (Node, seed 7, 3,600 steps after warm-up, 100 enemies, fire and water every 0.5 s, probe in ignored `output/playwright/step-timing.mjs`).** e85365d: 0.386 / 0.352 ms per step (Zero / Nicole, no wash grid). b92920e: 0.453 / 0.426 ms per step with 600 / 353 wash cells, about 17 to 21% more. No single hotspot was found worth changing, so the sim was left as is. Browser FPS, the cost of pencil compositing, sketch tile baking, bake-time grades and the per-frame cat rim (two scratch canvases per frame) are unmeasured.

## Current checkpoint

- **Character art.** The user approved the paper heads in 2d8b25e. Keep the proportions, rectangular eyewear, original markings, and narrow head edge. The source Meow Wall data remains under src/cats/.
- **Paper polish.** The shared Canvas theatre puts the cat on a layered stage with folded curtains. Desktop and portrait selection use the same painter. Offset tickets have a paw seal for the chosen cat. Compact layouts show all three skill headings with expandable descriptions. Mounted paper emblems and bound journal sheets give upgrades, chests, pause, and results finer edges and folds.
- **World art.** District patches and bridge boards have more distinct shapes and edges. Damaged crates expose corrugation, bales unroll, and vats spill ink. Fences and crates show flames. Shield folds and Eraser sweep arrows distinguish protection from danger. The gallery fits the elite bat with its actual drawing bounds and only shows fire states for props that can burn.
- **Walking performance.** b06adc0 moves terrain baking to one CPU-backed worker with a timed fallback. The main renderer keeps at most 14 ready tiles and ranks its prefetches within that budget. Run changes release pending work and bitmaps. The visible board is the 2× drawing surface, and the board stops repainting behind static menus. Crowd radius lookups and common dry or fire-free paths do less work.
- **Public documentation.** README.md is an English player guide with controls, setup, and credits. Keep release notes and test evidence here or in Git.

The user requested e7bc669's commit and push to origin/main. AGENTS.md now restricts the project to local commits: do not push or deploy without explicit authorization. Vercel can deploy automatically from a GitHub push. Check the exact commit and deployment status before saying a version is live.

## Game rules to preserve

- Use one papercraft style. Draw scenery, characters, UI art, and effects in Canvas or CSS. Synthesize audio with Web Audio. Reference images guide the art. Local Allo fonts and their license live in [assets/fonts/](assets/fonts/).
- Choose Zero or Nicole at the start. Each run has one protagonist. Afterimages are skill effects. Ask before starting random helper cats. Neutral town NPCs are also unimplemented.
- Zero has Meowline, Afterimage, and exclusive Night Claw and Long Shadow. Nicole has Moonstars, Moonfold, and exclusive Star Fall, Deep Fold, and Thick Paper. Both can pick up Paper Crane and Pumpkin Seed. Their evolutions are **Echo Legion** and **Full Moon**, earned when a chest opens with the starting weapon maxed and the matching passive owned. Evolution uses the original weapon slot.
- The build allows three weapon slots and four passive slots. If the passive slots fill before the player picks up the matching passive, that evolution is unavailable in that run. The user confirmed this consequence.
- Survive 600 seconds to dawn. Defeating the Eraser is optional. The seeded world spans 10 × 10 screens, with five districts, 12 landmark types across 24 sites, and at most 100 living enemies. Kiro Ghosts share the paper actor rules and have a separate cap of eight.
- Fire burns the cat and enemies, including fire started by the player. Shallow water extinguishes carried flames before damage. Deep water blocks movement, and explicit decks stay dry. Art and collision share the water polygons. The shallow basin east of the starting yard sits at (1040, 420).
- Paper can tear, burn, fold, and take an ink coating. Folded objects open a route temporarily. Plants regrow after the area clears, with one loot payment per prop per run. Fire destroys props without loot. The teahouse heals, the greenhouse responds to folding, the observatory freezes nearby enemies, and the windmill responds to crane wind.
- Use t(locale, key) for player-facing text. English is the default for new visitors. Keep the complete Chinese pack, language toggle, and saved choices.
- Wash-out is gameplay, not a style toggle. Water makes paper colourless (pencil showing); the Eraser makes it blank; pigment paints it back. Wet washed paper slows, cannot burn and tears easily. Sketch enemies wake only on colourless paper. Keep the zero-wash path free of mask work so an unwashed run looks and costs as before.
- Paper Cut stays Zero's and Page Fold stays Nicole's (CharacterDef.exclusives + WeaponDef.pool). Their existing actives are unchanged.
- Value hierarchy: ground lowest, plain decor and props one step up, actors and shots on top, interactive pumpkins and lanterns the brightest warm lights. New ground and decor art inherits the bake-time grade; new enemy body parts get the rim through `enemyPart`.

## Verification and remaining work

- **Latest game build.** npm run build and npm test pass 293 tests at b92920e. The Chrome checks below were made at e7bc669 and were not repeated for the wash-out round. At e7bc669, Chrome checks covered both cats and both languages at five viewport sizes. Compact skill headings, choosing a cat, starting, and pausing back to the same selection worked.
- **Visual evidence.** No browser image of the wash-out round has been viewed yet. output/playwright/papercraft-polish-2026-11-18.png is a static composite of the e7bc669 selection, combat fixtures, menus, and gallery. The approved head comparison is output/playwright/paper-head-comparison-2026-11-18.png. These files are local and ignored by Git. The ruleset emblems, paper enemies, district sheets, landmark bases, pencil underdrawing, tide lines, paper verbs, cat wear, value grade, rims and solid shots all still need a first browser look and user review.
- **Performance evidence at b06adc0.** On a fixed seed-7 route in local Chrome, frame interval P95 went from about 50 ms to about 16.7 ms with an empty scene and with 100 enemies plus 40 fire cells. Two 3,600-step Node probes at the crowd cap preserved state hashes and used 25–28% less time. The paper polish did not repeat those timings. Device memory peaks and device-specific frame times remain open.

The user deferred full playtesting. When they resume it, check one full run per cat for upgrade pacing, chest timing, Eraser pressure, water access, and landmark rewards. Check hazard and skill overlap on dark ground, touch controls through retry, and the audio mix. Devpost copy and media are pending. The plan records December 5, 2026 at 06:00 Beijing time as the deadline. Video recording needs explicit approval.

Use build and tests for routine verification, with at most one static screenshot when relevant. Keep timing and motion checks in their requested scope.

## Run and extend

Use Node.js 22 or newer and Python 3 for the preview. Install dependencies with `npm ci` if needed.

```sh
npm run build
npm start
```

The preview serves `site/` on port 4173. Check for an existing listener. Use `/?start=1&seed=7` for a repeatable start and `/?gallery=1` for the workshop. `npm test` builds the project before running tests. Vercel uses the static `site/` output.

| Area | Where to look |
| --- | --- |
| Content | [src/defs/](src/defs/) holds numbers, hooks, and adjacent art. Append in registration order in defs/index.ts, defs/world-index.ts, and render/art-index.ts. |
| Simulation | [src/game/](src/game/) advances the fixed step, derives stats, and manages progress, enemies, props, and actor contact. Preserve seeded outcomes for art or performance changes. |
| Paper art | [src/render/paper-kit.ts](src/render/paper-kit.ts), [prop-kit.ts](src/render/prop-kit.ts), [playbill-stage.ts](src/render/playbill-stage.ts), and [paper-face.ts](src/render/paper-face.ts). Keep live transforms separate from cached sheets. |
| Terrain and water | [src/render/craft-world.ts](src/render/craft-world.ts), [terrain-worker.ts](src/render/terrain-worker.ts), [water-art.ts](src/render/water-art.ts), and [src/game/world-gen.ts](src/game/world-gen.ts). |
| UI and language | [src/ui/](src/ui/), [styles.css](styles.css), and [src/content/](src/content/). Add string keys to the key list and both language packs. |

The simulation stays free of DOM and render imports. Rendering reads state and uses render hashes. Keep cat-specific logic in the registered definitions and art. Keep legacy pixel utilities that have callers. Follow the deletion rules in AGENTS.md and leave local task state and generated output out of commits. [Paper ecology recipe](.kiro/skills/midnight-meow-dev/references/paper-ecology.md)
