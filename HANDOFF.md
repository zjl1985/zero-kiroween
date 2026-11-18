# Midnight Meow handoff

The current game code is checkpoint e7bc669. Midnight Meow is a code-drawn papercraft survival game for Kiroween 2026. Start with [AGENTS.md](AGENTS.md) and the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md). The [plan](PLAN.md) holds the remaining work. Earlier rounds are in Git history, including the prior handoff at e7bc669.

## Current checkpoint

- **Character art.** The user approved the paper heads in 2d8b25e. Keep the proportions, rectangular eyewear, original markings, and narrow head edge. The source Meow Wall data remains under src/cats/.
- **Paper polish.** The shared Canvas theatre puts the cat on a layered stage with folded curtains. Desktop and portrait selection use the same painter. Offset tickets have a paw seal for the chosen cat. Compact layouts show all three skill headings with expandable descriptions. Mounted paper emblems and bound journal sheets give upgrades, chests, pause, and results finer edges and folds.
- **World art.** District patches and bridge boards have more distinct shapes and edges. Damaged crates expose corrugation, bales unroll, and vats spill ink. Fences and crates show flames. Shield folds and Eraser sweep arrows distinguish protection from danger. The gallery fits the elite bat with its actual drawing bounds and only shows fire states for props that can burn.
- **Walking performance.** b06adc0 moves terrain baking to one CPU-backed worker with a timed fallback. The main renderer keeps at most 14 ready tiles and ranks its prefetches within that budget. Run changes release pending work and bitmaps. The visible board is the 2× drawing surface, and the board stops repainting behind static menus. Crowd radius lookups and common dry or fire-free paths do less work.
- **Public documentation.** README.md is an English player guide with controls, setup, and credits. Keep release notes and test evidence here or in Git.

The user requested this checkpoint's commit and push to origin/main. Future pushes and manual deployments still need explicit authorization. Vercel can deploy automatically from a GitHub push. Check the exact commit and deployment status before saying a version is live.

## Game rules to preserve

- Use one papercraft style. Draw scenery, characters, UI art, and effects in Canvas or CSS. Synthesize audio with Web Audio. Reference images guide the art. Local Allo fonts and their license live in [assets/fonts/](assets/fonts/).
- Choose Zero or Nicole at the start. Each run has one protagonist. Afterimages are skill effects. Ask before starting random helper cats. Neutral town NPCs are also unimplemented.
- Zero has Meowline, Afterimage, and exclusive Night Claw and Long Shadow. Nicole has Moonstars, Moonfold, and exclusive Star Fall, Deep Fold, and Thick Paper. Both can pick up Paper Crane and Pumpkin Seed. Their evolutions are **Echo Legion** and **Full Moon**, earned when a chest opens with the starting weapon maxed and the matching passive owned. Evolution uses the original weapon slot.
- The build allows three weapon slots and four passive slots. If the passive slots fill before the player picks up the matching passive, that evolution is unavailable in that run. The user confirmed this consequence.
- Survive 600 seconds to dawn. Defeating the Eraser is optional. The seeded world spans 10 × 10 screens, with five districts, 12 landmark types across 24 sites, and at most 100 living enemies. Kiro Ghosts share the paper actor rules and have a separate cap of eight.
- Fire burns the cat and enemies, including fire started by the player. Shallow water extinguishes carried flames before damage. Deep water blocks movement, and explicit decks stay dry. Art and collision share the water polygons. The shallow basin east of the starting yard sits at (1040, 420).
- Paper can tear, burn, fold, and take an ink coating. Folded objects open a route temporarily. Plants regrow after the area clears, with one loot payment per prop per run. Fire destroys props without loot. The teahouse heals, the greenhouse responds to folding, the observatory freezes nearby enemies, and the windmill responds to crane wind.
- Use t(locale, key) for player-facing text. English is the default for new visitors. Keep the complete Chinese pack, language toggle, and saved choices.

## Verification and remaining work

- **Latest game build.** npm run build and npm test passed all 247 tests for e7bc669. Chrome checks covered both cats and both languages at five viewport sizes. Compact skill headings, choosing a cat, starting, and pausing back to the same selection worked.
- **Visual evidence.** output/playwright/papercraft-polish-2026-11-18.png is a static composite of the current selection, combat fixtures, menus, and gallery. The approved head comparison is output/playwright/paper-head-comparison-2026-11-18.png. These files are local and ignored by Git. The wider art pass still needs user review.
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
