# Midnight Meow

A papercraft survivor roguelike built for Kiroween 2026. Choose one cat, explore a seeded night town, and survive ten minutes until dawn. Collect ink shards, build a loadout, evolve weapons through treasure chests, and use the town's paper, fire, water, and landmarks to stay alive.

Characters, scenery, textures, lighting, and effects are drawn entirely with TypeScript and Canvas. Sound is synthesized with Web Audio. There are no image or audio assets; offscreen canvases cache procedural drawings. Allo is bundled separately as a licensed font.

**Work in progress.** The cat heads use the original Meow Wall proportions, markings, and eyewear as the starting point for layered paper portraits.

## Run locally

Requirements: Node.js 22+, npm, and Python 3 for the local preview server. Vercel does not require Python.

```bash
npm ci
npm run build
npm start
```

Open <http://localhost:4173/>. The build compiles TypeScript into `dist/` for tests, then creates the standalone `site/` directory. The preview server serves `site/`. Rebuild after source changes; there is no hot reload.

| URL option | Purpose |
| --- | --- |
| `/?start=1` | Skip the title and start with the saved character. |
| `/?start=1&seed=7` | Start a reproducible run with a fixed seed. |
| `/?gallery=1` | Open the static Paper Workshop Gallery without starting gameplay or audio. |

Seed pins accept 1–10 decimal digits in the inclusive range `0..4294967295`. Missing, malformed, or out-of-range values generate a fresh seed rather than wrapping. Content changes may produce different worlds or encounters for the same seed across versions.

## Characters and controls

Choose **Zero** or **Nicole** at the start. Only the selected cat appears as the playable protagonist; the other cat does not follow as a companion.

| Character | Starting kit | Evolution |
| --- | --- | --- |
| Zero | Meowline ranged shots, an afterimage dash that draws enemies away, and a short burst of empowered piercing fire after dashing. | **Echo Legion:** max Meowline + Long Shadow, then open a chest. |
| Nicole | Three orbiting Moonstars, Moonfold's slowing field and shields, and a one-time emergency shield. | **Full Moon:** max Moonstars + Deep Fold, then open a chest. |

- Move with **WASD** or **arrow keys**; use the character skill with **Space**.
- Pause with **Esc** or **P**.
- Choose an upgrade with **1 / 2 / 3**, or click its card.
- On touch devices, use the movement stick and skill button.
- Mute controls are available on the title screen and HUD.

A loadout has three weapon slots and four passive slots. Level-ups offer three choices. Elites and the Boss drop chests; evolutions happen only when a chest is opened. Filling the passive slots before obtaining an evolution's required partner can lock that evolution out for the run. Surviving until dawn wins even if the Boss is still alive.

## The paper town

The bounded world spans up to 10 × 10 screens, with a following camera, five districts, and 24 sites drawn from 12 landmark types. Roads, bridges, courtyards, gardens, and a hedge border connect the town. At most 100 enemies may be alive at once.

- **Fire is dangerous to everyone.** Cats and enemies can carry flames after leaving a fire, including fires created by the player. Normal shields, invulnerability, emergency protection, and defeat rules still apply.
- **Shallow water extinguishes fire.** It slows movement and briefly leaves actors damp. Deep water blocks passage, while bridge decks stay dry. A shallow teaching basin lies east of the starting yard. Rendering and collision use shared water geometry.
- **Paper materials react.** Cutting an ink vat spills a temporary fire-resistant coating. Card, cloth, straw, and wax can burn. Moonfold and crane launches temporarily fold obstacles to open routes.
- **Plants regrow without farming rewards.** Grass, flowers, reeds, bushes, and mushrooms recover after a delay; burning takes longer. Regrowth waits for actors and fire to clear, and each plant pays its loot only once per run. Handcrafted structures stay destroyed.
- **Landmarks have functions.** Staying near the teahouse restores health. Folding at the greenhouse tends plants and grants a treat. Aligning the observatory freezes nearby enemies and grants shards. Crane wind powers the windmill's gust. These activities have cooldowns and localized HUD guidance.

The enemy roster includes Ink Blobs, Paper Bats, Crumples, Smudges, Kiro Ghosts, and the Eraser Boss. Kiro Ghosts can appear in the opening phase, with at most eight alive at once. Their folding tails accompany a periodic glide toward the player; they use the shared collision, water, and fire rules.

## Art, effects, and interface

The game uses one papercraft / cut-paper art direction: layered cuts, folded surfaces, stitched edges, warm lantern light, and cool night colors. It has no art-style toggle.

Zero wears a split coat with a watch chain and shuttered lantern; Nicole wears a bell coat, layered cape, moon satchel, and petal lantern. Enemies have distinct paper silhouettes, impact compression, edge glints, and dissolving scraps. Skills and upgrades use paper arrows, ribbons, stars, and flecks. Splash warnings show circular damage areas, and Boss charges show a directional corridor.

The interface follows a night-watch journal theme, with character tickets, a moon-arc clock, lantern hearts, a folded map, upgrade cards, and a result journal. Pause, upgrade, and result menus use the full device area and allow long content to scroll. Narrow result pages use a single column.

English is the default for new visitors. Valid saved language preferences are respected, and the complete Chinese translation and language toggle remain available. All user-facing strings go through `t(locale, key)`.

### Typography

English UI and Canvas labels use [Allo](https://allo.joshpuckett.me/) 1.0.1 by Josh Puckett. The unmodified fonts are bundled locally under [SIL OFL 1.1](assets/fonts/OFL.txt), with provenance in [SOURCE.txt](assets/fonts/SOURCE.txt).

- `AlloVariableFriendly.woff2` provides weights 100–900 and optical sizing, with Friendly roundness fixed at 50.
- `Allo-Oblique.woff2` provides regular italic text.
- Chinese uses system-font fallbacks.

The initial Canvas paint waits for the local normal font to load, with a fallback if loading fails.

## Architecture

Content uses **definitions, hooks, and registries**. Each content item has its own definition and adjacent art, registered through the appropriate index. Registration order is significant.

| Location | Responsibility |
| --- | --- |
| `src/engine/` | Content-independent registries, event bus, and sprite cache. |
| `src/defs/` | Cats, weapons, passives, evolutions, enemy behaviors, enemies, materials, reactions, props, landmarks, biomes, and gameplay tuning. |
| `src/game/` | DOM-free simulation, progression, combat, world generation, collision, water, fire, regrowth, and landmark activities. |
| `src/render/` | Registered art, paper primitives, cached scenery, camera, effects, gallery, and Canvas UI. |
| `src/ui/` | HUD, character selection, upgrade cards, menus, touch controls, and layout helpers. |
| `src/content/` | Message keys and complete English/Chinese language packs. |
| `src/audio/` | Synthesized effects and ambience. |
| `src/cats/` | Unmodified original Meow Wall reference data. |
| `assets/fonts/` | Allo font files, license, and source information. |
| `scripts/build-site.mjs` | Produces the isolated static distribution. |
| `.kiro/` | Project specifications, steering, hooks, and development recipes. |

The simulation is deterministic for the same seed and inputs. Seeded RNG is passed only to weapon steps and enemy steering; world generation, fire spread, and prop drops use hashes. Rendering reads state without mutating it or consuming simulation RNG.

The generic simulation does not import art, UI, or the DOM. Gameplay numbers belong in definitions. Legacy pixel helpers remain as code dependencies and reference material; do not delete them blindly.

## Resource management

- Restarting a run or returning to the title clears world memo tables, chunk canvases, popup-fold state, and references to the previous run.
- Evicted chunk canvases have their dimensions reset to release their backing pixels. The cache holds at most 14 chunk canvases, approximately 55 MiB of raw RGBA pixels before browser overhead.
- The general sprite LRU holds at most 256 entries. Finite shared art is retained for reuse.
- Short audio voices disconnect after ending. Turning ambience off or muting stops its looping sources and cancels cricket scheduling.
- One AudioContext and a shared noise buffer remain available for the lifetime of the page.

These bounds and cleanup paths do not establish a measured memory footprint or guarantee immediate browser garbage collection. Live heap/GPU memory and frame-rate measurements remain outstanding.

## Verification and current limits

```bash
npm run build
npm test
```

The latest recorded code verification passed **246 tests**. Tests cover simulation determinism, progression, water/fire ordering, collision, regrowth rewards, landmark cooldowns, rendering commands, resource cleanup, translations, and static packaging.

Static menu fixtures in both languages were checked at 320 × 568, 390 × 844, and 844 × 390. Allo loaded, and the tested pause, upgrade, and result layouts had no horizontal or text overflow. This is not evidence of complete touch-flow or gameplay acceptance.

The author approved the revised paper heads. The comparison sheet shows the original reference, previous and revised paper portraits, and both cats in the starting yard at normal game scale.

Full-run balance, audio quality, live memory usage, and frame rate near the enemy cap remain unverified. Neutral town NPCs and random helper cats are not implemented; helper cats require explicit approval. Passing tests does not mean the art is approved or the competition entry is complete.

Documentation-only edits do not require rerunning gameplay tests. For code changes, follow the project verification rules: build and tests, at most one static screenshot, and no animation or recording checks unless requested.

## Static deployment configuration

The repository contains a Vercel configuration for a static site with no backend, database, or environment variables.

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | Repository root (`.`) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `site` |
| Node.js | 22 or a newer supported version |

The build recreates `site/` from an explicit allowlist: HTML, CSS, current compiled JavaScript, the two Allo fonts, and their license/source notes. It excludes TypeScript, source maps, tests, private task state, internal documentation, and stale compiled modules. Do not substitute `dist/` for the publish directory.

Assets use cache revalidation because filenames are not content-hashed. The query-string entry modes do not require an SPA fallback; missing resources should return 404. `npm start` is a local preview command, not a production server command.

The existing Git integration can deploy automatically when commits are pushed. **Local commits are permitted; do not push or deploy without a new explicit authorization.** The earlier push request applied to that checkpoint, not to subsequent work. Deployment instructions are not permission to publish.

## References and contributor guidance

The original Zero and Nicole reference heads come from the author's [Meow Wall](https://meow-wall.vercel.app), originally in `zjl1985/meow-wall` at `src/components/mascot/mascot-art.ts`. Original reference data remains unchanged. The body, town, materials, and effects are implemented in this repository. Reference images guide the art; they are not imported as game assets.

Before changing the project, read [AGENTS.md](AGENTS.md), [HANDOFF.md](HANDOFF.md), and [PLAN.md](PLAN.md). Follow the [Midnight Meow development skill](.kiro/skills/midnight-meow-dev/SKILL.md) and its recipes. [REVIEW-IMPROVEMENTS.md](REVIEW-IMPROVEMENTS.md) contains earlier review notes; superseded art directions there and all documents under `docs/archive/` are historical, not current instructions.
