# Design: Midnight Meow

## Overview

A static site (`index.html`, `styles.css`, compiled `dist/`) with no framework or runtime dependencies. Content is built as **definitions + hooks + registries**: a content-agnostic engine, content definitions, a generic DOM-free simulation, a registered art layer on Canvas and a thin DOM UI, wired together in `src/main.ts`. A run is a 10-minute survivor-like night in a bounded seeded town with a follow camera. The workflow for adding content is the `midnight-meow-dev` skill (`.kiro/skills/midnight-meow-dev/`).

## Architecture

```
src/engine/   registry.ts  events.ts  sprite.ts          (content-agnostic, imports nothing of ours)
                 │            │          │
src/defs/     registries.ts (CATS, WEAPON_DEFS, PASSIVE_DEFS, EVOLUTION_DEFS, ENEMY_DEFS, BEHAVIOURS,
              MATERIALS, REACTIONS, PROP_DEFS, LANDMARK_DEFS, BIOME_DEFS, SIM_EVENTS)
              index.ts ── registers sim defs, gates hooks      world-index.ts ── world defs
              cats/ weapons/ passives/ evolutions/ enemies/ reactions/ props/ landmarks/ biomes/
                 │  (def files: numbers + hooks)                    │  (art files beside them)
                 ▼                                                  ▼
input.ts / touch.ts ─► FrameInput ─► sim.step(state, input, FIXED_DT) ─► SimState
                                      │ SimContext helpers, SIM_EVENTS   │
                                      │ world-gen.ts (pure seed hash)    │
                                      ▼                                  ▼
            render/art-index.ts ─► art registries ─► world.ts (craft-world, craft-props, craft-scene,
                                                     craft-cat, craft-enemies, craft-juice, combat-fx, cue-fx)
                                                       │
                                          2x back canvas ─► stage canvas
hud.ts / journal.ts / character-panel.ts / upgrade-cards.ts ◄── SimState + registries + i18n
gallery-layout.ts + render/gallery.ts ◄── registries (?gallery=1, no sim)
main.ts cueState (diff of sim counters) ─► audio/sfx.ts and timeline.ts cues
```

### Engine (`src/engine/`)

- `createRegistry<T>(kind)`: `register` (throws on a duplicate id), `get` (throws with the registered ids on an unknown id), `find`, `has`, `all`, `ids`. Registration order is kept and is part of the contract.
- `createEventBus<S, E, C>()`: synchronous typed events; handlers run in registration order inside `emit`; handler lists live in module scope, never in `SimState`.
- `cachedSprite(key, w, h, scale, paint, anchor)`: offscreen canvas cache with LRU eviction at `SPRITE_CACHE_LIMIT` 256; without a DOM it calls the painter directly. `imageSprite` exists as a capability; nothing shipped uses images.
- A test enforces that `src/engine/` imports nothing from game, defs, render, ui or content.

### Definitions (`src/defs/`)

- `types.ts` holds every interface: `CharacterDef`, `WeaponDef` (`timing` "move" / "aura" / "auto", `steps`, `base`, `elements`, `shotTag`, `stats`, `step`, `init`, `hooks`), `PassiveDef` (`modify`, `onLevel`), `EvolutionDef`, `EnemyDef` (`behaviours`, `onSpawn`, `onDeath`, `catSlow`, `stepWorld`, `arrival`), `EnemyBehaviour` (`speed`, `steer`), `SimContext`, `SimEvents` (tick, hit, kill, dash, damaged, pickup, levelUp, chestOpen, touchProp), `MaterialDef`, `ReactionDef`, `PropDef`, `LandmarkDef`, `BiomeDef`. Def files add their own `PlayerStats` fields by module augmentation.
- `index.ts` registers cats (zero, nicole), weapons (meow-bolt, night-claw, echo-legion, moon-stars, star-fall, full-moon, paper-crane, pumpkin-seed), passives (vitality, swift, magnet, focus, scholar, paper-armor, night-eyes, long-shadow, deep-fold, moon-shield, snack), evolutions (echo-legion, full-moon), behaviours (chase, swoop, kite-lob, boss-hunt) and enemies (ink-blob, paper-bat, crumple, smudge, eraser-boss). Cat hooks run only for the chosen cat; weapon and passive hooks only while owned (or the start weapon).
- `world-index.ts` registers materials, reaction rows, props, landmarks and biomes; `src/game/world-gen.ts` imports it directly to avoid an import cycle through `horde.ts`.
- Data modules: `progression.ts` (`BUILD`, `XP`), `horde.ts` (`HORDE`, `FILLER_KIND`, `KIND_CAP`, `PHASE_AT`, `ELITE`, `SPAWN_TABLE`, `WAVES`, `WAVE_RING`), `fire.ts` (`FIRE`, `PROP_HITS`), `materials.ts`, `biomes/districts.ts` (`DISTRICTS`, `BASE_DECOR`), and the Boss numbers in `enemies/eraser-boss/def.ts`.
- RNG: `SimContext` has no RNG. The sim passes its step `Rng` only to `WeaponDef.step` and `EnemyBehaviour.steer`, so RNG use stays visible at the call sites.

### World (`src/game/world-gen.ts`)

- `WORLD` is 10 x 10 screens of 960 x 540 (9600 x 5400; x -4320..5280, y 0..5400). The start yard keeps its original 0..960 x 0..540 coordinates at the middle of the north edge. The north edge is the hill horizon (actors stay below `WORLD.playTop` 264); the west, east and south edges are a paper hedge (`WORLD.edge` 36). The size is a tunable constant.
- `CHUNK` tiles the world in 480 x 540 chunks (20 x 10). `chunkContent(seed, cx, cy)` is a memoised pure hash of the seed and chunk coords that returns decor, props, colliders, interactable spots and the chunk's biome, so the sim and renderer agree without the sim RNG.
- Landmarks: one per super-cell (`LANDMARK` 5 x 3, start cell skipped, 14 in total), every registered kind at least once: clock tower, pumpkin patch, stone bridge, chapel yard (`graveyard`), lantern market, moon hill, paper windmill, puppet theatre, wishing well. `landmarkParts(l)` runs the def's `layout` with a `LandmarkBuilder` (`add`, `wall`, `spot`, `hash`). A road spine leaves the start yard south and one branch reaches each landmark.
- Districts: `districtSites(seed)` puts one site per cell of a 4 x 3 grid on a non-start chunk, a seeded shuffle gives every biome a site, and `biomeAt(seed, cx, cy)` is the nearest site. Start chunks are old town. Generic decor uses the biome's decor mix over `BASE_DECOR`; biome props roll in list order, roadside props stand on road slots, and at most `DISTRICTS.propCap` (14) props fit a chunk. Generic fences and bushes became props at the same spot and hash.
- `nearStaticColliders`, `nearProps` and `nearColliders` return data from the 3 x 3 chunks around a point. `ACTIVE` loads interactables within 1100 and drops idle far ones beyond 1500. `SPAWN_RING` places spawns just outside the view around `viewCentre(player)` with a 1500 leash.

### Simulation (`src/game/`)

- `createSim({ cat, seed, world, sessionSeconds })` builds a `SimState` with a single `player` whose `id` is the chosen cat, the starting weapon in `build.weapons`, and no companion slot. Weapon `init` hooks set their initial fields.
- `step` order: timers and the `tick` event, the player (skill through `CharacterDef.onSkill`, "move" weapons), `syncChunks`, `discoverLandmarks`, the page line, "aura" then "auto" weapons in registration order, shots, enemies (behaviours in order), leash, each enemy def's `stepWorld`, chests, pickups, interactables, treats, `stepFire`, then schedule, phases, treats and horde spawning. The session is 600 s (`STATS.sessionSeconds`), with phases at `PHASE_AT` [0.15, 0.45, 0.8].
- `src/game/stats.ts` folds `playerStats(state)` in a fixed order: the chosen cat's base, every cat's `kitStats`, passives' `modify`, weapons' `stats` in registration order.
- **Horde (`src/defs/horde.ts`).** `HORDE.capByMinute` and `spawnPerSecondByMinute` ramp per tenth of the session and `HORDE.hardCap` (100) bounds everything alive, including splits, summons, waves and elites. `KIND_CAP` limits smudges (8) and crumples (14). `WAVES` are side, ring or line groups. `makeRoom()` rubs out off-screen commons first, farthest first, so elites and the Boss always fit; elites and the Boss are never removed.
- **Elites.** `ELITE` spawns a crowned common every 60 s from 60 s to 500 s (9x hp), skipped while the Boss lives. Each drops a chest.
- **Boss.** At `BOSS.spawnAt` 0.9 (540 s) the Eraser (420 hp) enters just outside the view. Beyond `huntRange` 360 it hunts at `huntSpeed` 92 and ignores scenery colliders. Sweep, summon and charge attacks are telegraphed (`enemies/eraser-boss/attacks.ts`). It drops reward shards and a big chest. Open issue: the cat can outrun it and dawn still wins (the user has not been asked).
- **Build.** `BUILD` has 3 weapon and 4 passive slots. Level-up cards offer 3 eligible weapons / passives of the chosen cat's pool, never evolutions, topped up with `snack`. `openChest` evolves when `readyEvolution(state)` holds (max base weapon + owned paired passive), otherwise raises owned items (`CHEST.levels` 1, `bigLevels` 3) or gives `snack`; the result is kept in `state.chestReveal`. Open issue: an evolution's passive can be locked out when the passive slots fill first, and there is no in-run hint.
- **Paper props (`src/game/props.ts`).** `elementHit` applies an element to every prop whose footprint overlaps a circle; `reactionFor(material, element)` picks the row; `damageProp` lowers durability (intact, damaged below `damagedBelow`, scraps at 0; burnt scraps are ash) and rolls seeded drops from the prop id hash (`drops.burst` spills a ring of shards). `SimState.props` is one compact map of touched props for the whole run. Standing props add colliders through `safePosition`; scraps open the path. Weapon shots carry `elements[0]` through `shotTag`; claws, orbit stars and star-fall apply cut; lit pumpkins call `ignite(FIRE.pumpkinRadius)`.
- **Fire.** `SimState.fire` holds burning cells (`FIRE.cell` 24) and ash. Every `FIRE.tick` (0.2 s) a cell may light one flammable neighbour with `FIRE.spreadChance` x flammability using `hash2(seed, cell, 900 + ticks)`, damages enemies inside by `FIRE.enemyDamage` and burns props under it. At most `FIRE.maxCells` (40) burn at once. Fire never hurts the cat.
- **Interactions (`interactions.ts`).** Pumpkins and moon-lanterns come from the start yard spots (matching `scene.ts` props) and from landmark `spot` calls; `state.treats` holds fish treats placed near the cat with the sim RNG; a moon-lantern only announces it is full when it is near the view.
- **Feel.** `state.streak`, `impacts` (kinds in the `EffectKind` union, lifetimes in `EFFECT_LIFE` and `ENEMY_FX_LIFE`, capped by `FX_CAP`) and `notices` drive feedback. There is no spatial hash or object pool.
- RNG state is stored in `SimState.rngState`, so `snapshot` comparisons prove determinism. `main.ts` uses a fresh seed per run unless `?seed=N` pins it.

### Rendering (`src/render/`)

- **Art layer.** `art-registry.ts` defines `CatArt`, `EnemyArt`, `WeaponArt`, `PassiveArt`, `PropArt`, `LandmarkArt` (ground, reach, minimap ink, `DecorPiece`s), `BiomeArt` (swatch, patch) and their registries; helpers `catArt`, `activeWeaponArt`, `upgradeIcon`, `effectPainter`, `shotArt`, `decorPiece`, `landmarkReach`. `art-index.ts` registers every art file in def order. Shared painters (`craft-enemies.ts`, `combat-fx.ts`, `craft-juice.ts`, `cue-fx.ts`, `upgrade-icons.ts`) dispatch through the registries and do not switch on kinds.
- **Paper kit.** `paper-kit.ts` (`paperCut`, `paperStack`, `foldLine`, `stitchAlong`, `charEdge`, `tornEdge`, `warmGlow`) builds on `paper-material.ts`. `prop-kit.ts` `phasedPaint` derives damaged and scraps looks from one intact painter. `variants.ts` `variant(seed, base)` gives seeded palette, size, tilt, wear and mirror from the render-only `visHash`.
- `camera.ts` follows the cat with a 60 x 40 deadzone and 7/s smoothing, clamped to the world.
- `craft-world.ts` caches the ground of each chunk on 2x offscreen canvases (at most 14, one prefetch build per frame), with roads, hedge, landmark ground and district patches (150-unit render grid) baked in. Tall decor, landmark pieces and props are y-sorted cached sprites culled by bounds. Pop-up pieces fold toward the cat (`POPUP` in `timeline.ts`, folds kept in a render-only map, snapped under reduced motion). `landmarkPreview(kind)` serves the gallery. `navTargets` feeds edge arrows for landmarks, the nearest chest and the Boss. Chunk builds are synchronous.
- `craft-props.ts` draws prop sprites per phase and variant with a per-placement look, burning tint and cut-paper flames, scorch and ash on the ground, and prop impacts (flecks, scrap flutter, embers).
- `craft-scene.ts` draws the sky, hills, ground tiles and dawn wash, reusing layout coordinates from the legacy `scene.ts` and pixel helpers (code dependency only). `craft-cat.ts` builds papercraft cats on the official Meow Wall heads with a narrow face paper edge.
- `timeline.ts` (pure) defines cue beats, slow motion, zoom, tremble, the card deal stagger and the pop-up fold. `presentationSteps` scales real time before `tickClock`, so the sim only sees `FIXED_DT` steps. `cue-fx.ts` draws the cues.
- `world.ts` composes layers with depth sorting and applies shake, tremble and zoom; `gallery.ts` paints the `?gallery=1` cards.
- Rendering reads `SimState` and world data only. It must not touch the RNG or mutate state.

### UI (`src/ui/`, `index.html`, `styles.css`)

- Screens: `title`, `play`, `pause`, `upgrade`, `result`, switched by `main.ts` via `document.body.dataset.screen`, plus `gallery` for `?gallery=1`.
- The look is a night-watch journal. `hud.ts` (badge, moon arc, lantern hearts, minimap, wick skill, XP seam, build tags, chest slip, Boss eraser bar) is painted through `src/render/journal-ui.ts`; `journal-geometry.ts` holds the pure geometry. Cat colours and status lines come from `CatArt`.
- `character-panel.ts` builds one ticket per registered cat (`buildCatTickets`) and reads numbers and copy params from the defs. `upgrade-cards.ts` deals lattice-window cards; `journal.ts` builds the result page (now 14 rows, including props torn and cells burnt); `ink.ts` reveals text; `touch.ts` adds the joystick and skill button.
- `gallery-layout.ts` (pure) builds sections (cats, enemies, props, landmarks, biomes, weapons, passives) and a non-overlapping grid from the registries.
- UI motion ideas come from Snapblocks' public descriptions and from video-shotcraft's beat structure, rebuilt in CSS / Canvas; no code is copied. Motion is reduced under `prefers-reduced-motion`.
- Preferences `{ locale, cat, muted }` persist in `localStorage` key `midnight-meow-prefs`; any registered cat id is accepted.

### Audio (`src/audio/sfx.ts`)

- Oscillators and generated noise buffers only; no audio files. The `AudioContext` is created on the first pointerdown / keydown.
- `main.ts` keeps a `cueState` and diffs sim counters each frame (shots, hits, defeats, level-ups, boss events, interactions, props torn, burning cells) to trigger sound and timeline cues, so the sim stays free of audio. New cues: `tear` and a throttled `crackle` while anything burns.

### Localization (`src/content/`)

- `keys.ts` lists every message key; `en.ts` and `zh.ts` implement them; `t(locale, key, values)` formats them; `missingKeys` must be empty for both packs.
- Each def family has its keys (`upgrade.<id>.*`, `enemy.<id>.name`, `prop.<id>.name`, `landmark.<id>`, `notice.found-<id>`, `biome.<id>.name`, cat copy under its `i18n` prefix).
- Current default locale is `zh` and the `en` pack is complete. Requirement 11 later switches the default to English.

## Testing

`npm test` compiles and runs `node:test` suites in `tests/` against `dist/` (130 tests):

- `registry.test.mjs`: pools, exclusives, evolution pairs, spawn tables, i18n keys for every def, duplicate / unknown ids, event bus order, engine isolation, no cat literals in game / render / UI / main, art registries match defs, icons, cached sprites, landmark and biome art, layouts and biome prop mixes.
- `reactions.test.mjs`: tearing and scraps colliders, fire spread, cap and enemy damage, non-flammable materials, determinism with props and fire, persistence across chunk reloads, migrated props, reaction table integrity, pop-up fold, scarecrow burst, straw fire.
- `gallery.test.mjs`: gallery coverage, states, labels, layout bounds, seeded variants without `Math.random`.
- `world.test.mjs`: world size and chunks, pure chunk content, landmarks, start yard, exploring, edges, spawn ring, leash, discovery, camera, districts, biome props and the prop cap.
- `sim.test.mjs`, `characters.test.mjs`, `enemies.test.mjs`, `upgrades.test.mjs`, `interactions.test.mjs`, `journal.test.mjs`, `timeline.test.mjs`, `scenery.test.mjs`, `official.test.mjs`, `tokens.test.mjs`, `viewport.test.mjs`: determinism, both kits, horde, elites, Boss, build and evolution, interactions, HUD geometry, cue timelines, collision, head data, viewport.

During the refactor, local probes (`output/playwright/baseline-*.mjs`, git-ignored) compared snapshot hashes for fixed seeds and scripted inputs against references recorded before the change; they stayed byte-identical until content changes were intended, then were re-recorded.

Verification is `npm run build` and `npm test`, plus at most one static screenshot; no animation or recording runs. Art quality, effect timing, UI layout, frame rate and audio are not covered by tests. Nobody has viewed the game in a browser, including this round's art-registry rendering, props, fire, pop-up folding, districts, landmarks and gallery (the sandbox blocked Playwright and headless Chromium, so there is no screenshot). Nobody has heard the audio, balance was only probed with throwaway idle bots, frame rate at about 100 enemies is unprofiled, and only the user can accept the art.
