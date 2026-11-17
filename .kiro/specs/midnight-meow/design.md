# Design: Midnight Meow

## Overview

A static site (`index.html`, `styles.css`, compiled `dist/`) with no framework or runtime dependencies. The game splits into a DOM-free simulation, a Canvas renderer and a thin DOM UI layer, wired together in `src/main.ts`. A run is a 10-minute survivor-like night in a bounded seeded town with a follow camera.

## Architecture

```
input.ts / touch.ts ──► FrameInput ──► sim.step(state, input, FIXED_DT) ──► SimState
                                       ▲          ▲                         │
  characters / upgrades / enemies /    │          │ world-gen.ts            │
  interactions ────────────────────────┘          │ (pure seed + chunk hash)│
                                                  ▼                         │
                      camera.ts ──► world.ts (craft-world, craft-scene,  ◄──┤
                                    craft-cat, craft-combat, craft-enemies, │
                                    craft-juice, combat-fx, cue-fx)         │
                                       │                                    │
                          2x back canvas ──► stage canvas                   │
hud.ts / journal.ts / character-panel.ts / upgrade-cards.ts ◄── SimState + data + i18n
main.ts cueState (diff of sim counters) ──► audio/sfx.ts and timeline.ts cues
```

### World (`src/game/world-gen.ts`)

- `WORLD` is 10 x 10 screens of 960 x 540 (9600 x 5400; x -4320..5280, y 0..5400). The start yard keeps its original 0..960 x 0..540 coordinates at the middle of the north edge. The north edge is the hill horizon (actors stay below `WORLD.playTop` 264); the west, east and south edges are a paper hedge (`WORLD.edge` 36). The size is a tunable constant.
- `CHUNK` tiles the world in 480 x 540 chunks (20 x 10). `chunkContent(seed, cx, cy)` is a memoised pure hash of the seed and chunk coords that returns decor, colliders and interactable spots, so the sim and renderer agree without the sim RNG.
- Landmarks: one per 5 x 3 super-cell, 14 in total (start cell skipped), every kind at least once: clock tower, pumpkin patch, stone bridge, chapel yard, lantern market, moon hill. A road spine leaves the start yard south and one branch reaches each landmark.
- `nearColliders` returns colliders from the 3 x 3 chunks around a point; that window is the only collision culling. `ACTIVE` loads interactables within 1100 and drops idle far ones beyond 1500. `SPAWN_RING` places spawns just outside the view around `viewCentre(player)` with a 1500 leash.

### Simulation (`src/game/`)

- `createSim({ cat, seed, world, sessionSeconds })` builds a `SimState` with a single `player` whose `id` is the chosen cat, the starting weapon in `build.weapons`, and no companion slot.
- `step` loads chunks, spawns on the ring, moves the player, runs weapons (`stepWeapons`), resolves shots, fields, shields, contact damage, chests, interactables, the Boss and win / lose. The session is 600 s (`STATS.sessionSeconds`), with phases at `PHASE_AT` [0.15, 0.45, 0.8].
- **Horde (`enemies.ts`).** `HORDE.capByMinute` and `spawnPerSecondByMinute` ramp per tenth of the session (one minute at 600 s, via `hordeStep` / `hordeCap`), and `HORDE.hardCap` (100) bounds everything alive, including splits, summons, waves and elites. `KIND_CAP` limits smudges (8) and crumples (14). `WAVES` are side, ring (ellipse `WAVE_RING.scale` 1.18 x the spawn ring, so they start off screen) or line groups. `makeRoom()` rubs out the oldest commons so elites and the Boss always fit. Common kinds gain 15 % hp per minute.
- **Elites.** `ELITE` spawns a crowned common every 60 s from 60 s to 500 s (9x hp, 1.55x radius, 5x XP), skipped while the Boss lives. Each drops a chest.
- **Boss.** At `BOSS.spawnAt` 0.9 (540 s) the Eraser (420 hp) enters just outside the side of the view with more room. Beyond `huntRange` 360 it hunts at `huntSpeed` 92 and ignores scenery colliders (clamped to the world). `startBossAttack` cycles sweep, summon and charge with telegraph timers. It drops reward shards and a big chest.
- **Build (`upgrades.ts`).** `BUILD` has 3 weapon and 4 passive slots. `START_WEAPON` is Meowline for Zero and Moonstars for Nicole. `WEAPON_STEPS` hold per-level steps (damage, rate, count, pierce, area); weapon max level is steps + 1. Weapons: Meowline (Zero, 7), Night Claw (Zero, 5), Moonstars (Nicole, 7), Star Fall (Nicole, 5), Paper Crane (any, homing, 5), Pumpkin Seed (any, burst, 5). Passives: vitality, swift, magnet, focus, scholar, paper-armor, night-eyes (any), long-shadow (Zero), deep-fold and moon-shield (Nicole). `rollChoices` offers 3 eligible weapons / passives, never evolutions, and tops up with `snack`. `playerStats(state)` derives the live kit, so the sim never mutates `CHARACTERS`.
- **Chests and evolution.** `openChest(state, rng, big)`: if `readyEvolution(state)` (base weapon at max and the paired passive owned, see `EVOLUTIONS`) the weapon evolves and the evolution takes its slot; remaining levels (`CHEST.levels` 1, `bigLevels` 3) raise random owned non-max items, or give `snack`. The result is kept in `state.chestReveal` for the HUD slip.
- **Interactions (`interactions.ts`).** Pumpkins and moon-lanterns come from the start yard spots (matching `scene.ts` props) and from landmark spots in the world data; `state.treats` holds fish treats placed near the cat with the sim RNG. Stunned enemies skip movement and contact.
- **Feel.** `state.streak` counts kills inside `STATS.streakWindow`; `impacts` and `effects` (kinds and lifetimes in `EFFECT_LIFE` and `ENEMY_FX_LIFE`, capped by `FX_CAP`) carry a `seed` so the renderer can vary flakes without the RNG. `notices` drive phase ribbons, elite / chest / landmark notices, the boss banner and evolution messages. Arrays are pruned in place; there is no spatial hash or object pool.
- RNG state is stored in `SimState.rngState`, so `snapshot` comparisons prove determinism.

### Rendering (`src/render/`)

- `camera.ts` follows the cat with a 60 x 40 deadzone and 7/s smoothing, clamped to the world; the world translate is snapped to device pixels.
- `craft-world.ts` caches the ground of each chunk on 2x offscreen canvases (at most 14, one prefetch build per frame within 320 of the view), with roads, hedge and landmark ground art baked in. Tall decor and landmark buildings are y-sorted cached sprites culled by bounds; enemies, pickups and shots are culled to view + 140. `navTargets` feeds edge arrows for landmarks, the nearest chest and the Boss. Chunk builds are synchronous.
- `craft-scene.ts` draws the screen-space sky and the world-space hills and ground tiles, plus the dawn wash. It reuses layout coordinates and symbols from the legacy `scene.ts` and pixel helpers; that reuse is a code dependency only.
- `paper-material.ts` provides procedural paper primitives: fiber, embossing, torn / cut edges, thickness offset, contact shadow, stitching and glow.
- `craft-cat.ts` builds papercraft cats on top of the official Meow Wall head data, keeping the face identifiers, with a narrow paper edge along the face outline.
- `craft-combat.ts` and `combat-fx.ts` draw ink blobs, shots, moon stars, fields, shields and the weapon effects (claw arc, star fall, crane, seed burst).
- `craft-enemies.ts` draws each enemy kind (elites scaled with a gold glow and a stitched paper crown), tracking eyes, puddles, landing marks, dashed boss telegraphs, enemy shots and defeat effects. It redraws paper material per enemy per frame.
- `craft-juice.ts` draws camera shake, hit flash, stun stars, damage tags, dissolve flakes, level / streak paper bursts, shard trails, pumpkin and moon-lantern states, fish treats and chests.
- `timeline.ts` (pure) defines the four beats per cue kind (evolution, boss, boss-down, dawn, finale), slow motion, zoom (at most 1.1), tremble and the card deal stagger (70 ms). `presentationSteps` scales real time before `tickClock`, so the sim only ever sees `FIXED_DT` steps. `cue-fx.ts` draws the cues in world and screen space; under reduced motion only tints remain.
- `world.ts` composes layers with depth sorting so the cat and enemies are occluded correctly, applies shake, cue tremble and zoom inside a save / restore, and draws the paper frame outside it.
- Rendering reads `SimState` and world data only. It must not touch the RNG or mutate state.

### UI (`src/ui/`, `index.html`, `styles.css`)

- Screens: `title`, `play`, `pause`, `upgrade`, `result`, switched by `main.ts` via `document.body.dataset.screen`.
- The look is a night-watch journal, its own identity rather than Tibo Dog's. `hud.ts` shows a luggage-tag badge, a moon arc clock with the phase, lantern hearts (shield charges as paper rings), a folded minimap of explored chunks, the wick skill button, a 24-stitch XP seam, the level button, weapon pennants and passive tags, the chest slip and the Boss as an eraser in a paper sleeve. Canvases are painted by `src/render/journal-ui.ts` and repaint only when a signature changes. `journal-geometry.ts` holds the pure geometry (moon arc, seam stitches, minimap mapping, explored chunks, paces).
- `character-panel.ts` renders the playbill and ticket choices, including the starting weapon and evolution rule from `START_WEAPON` and `EVOLUTIONS`; the title frames the canvas cat with theater curtains.
- `upgrade-cards.ts` deals 3 lattice-window cards from a stack (keys 1 / 2 / 3, with an arm delay against accidental picks); `journal.ts` builds the result page (date, log, landmarks, paw stamp) from DOM nodes; `ink.ts` reveals text word by word (char by char for `zh`).
- UI motion ideas come from Snapblocks' public descriptions (Ink Reveal, Pleated Strip, Magnetic Button) and from video-shotcraft's beat structure. They are rebuilt in CSS / Canvas; no code is copied. Motion is off or reduced to short fades under `prefers-reduced-motion`.
- `touch.ts` adds a pointer joystick and skill button when touch is preferred.
- Preferences `{ locale, cat, muted }` persist in `localStorage` key `midnight-meow-prefs`.

### Audio (`src/audio/sfx.ts`)

- Oscillators and generated noise buffers only; no audio files. The `AudioContext` is created on the first pointerdown / keydown.
- `main.ts` keeps a `cueState` and diffs sim counters each frame (shots, hits, defeats, level-ups, boss events, interactions) to trigger sound cues and timeline cues, so the sim stays free of audio and presentation. Ambience (wind, drone, crickets) plays during `play`.

### Localization (`src/content/`)

- `keys.ts` lists every message key; `en.ts` and `zh.ts` implement them; `t(locale, key, values)` formats them.
- Current default locale is `zh` and the `en` pack is complete. Requirement 11 (deferred by the user) later switches the default to English; the fate of the Chinese pack and toggle is still an open question.

## Testing

`npm test` compiles and runs `node:test` suites in `tests/` against `dist/` (89 tests):

- `sim.test.mjs`: determinism, decoy without RNG use, single player with no companion, hit feedback.
- `characters.test.mjs`: different HP / speed, Zero bolts versus Nicole orbit, dash decoy and empower window, two-target pierce, orbit hit cooldown, Moonfold field and shield, shield limits, one-time rescue, cooldowns, full night to dawn within `HORDE.hardCap`.
- `world.test.mjs`: 10 x 10 screens and exact chunk tiling, pure chunk content, landmark placement and kinds, start yard spots, exploring along the road, world edge, spawns outside the view, leash, landmark discovery, determinism while exploring, camera deadzone and clamp.
- `enemies.test.mjs`: session, Boss and cap constants, crowd ramp (late peak at least 60, never above 100), spawn kinds per phase, crumple split, elite schedule and chest drop, chest levels, Boss spawn outside the view and hunting, sweep hit and miss, reward, win at 600 s, full-night run time.
- `upgrades.test.mjs`: start weapons, step tables and evolution data, no evolutions on level-up, slot limits, chest-only evolution, snack fallback, each weapon deals damage, per-cat pools, determinism, names in both language packs.
- `interactions.test.mjs`: start yard positions matching the scene props, pumpkins, fish treats, moon-lantern stun, streaks and milestones, hit flash and damage tags, phase ribbons, determinism.
- `journal.test.mjs`: moon arc and dawn window, seam stitches, wick charge, minimap mapping, explored chunks, paces and journal strings in both packs.
- `timeline.test.mjs`: easing, beat order, cue speed / zoom limits and reduced motion, cue ageing, deal delays, identical `snapshot()` with and without slow motion.
- `scenery.test.mjs`, `official.test.mjs`, `tokens.test.mjs`, `viewport.test.mjs`: collision, Meow Wall head data and identifiers, viewport fitting.

Verification is `npm run build` and `npm test`, plus at most one static screenshot; no animation or recording runs. Art quality, effect timing, UI layout, frame rate and audio are not covered by tests. Nobody has viewed the bounded world, the journal UI or the event timelines in a browser (the sandbox blocked headless Chromium this round), nobody has heard the audio, balance was only probed with throwaway idle bots, frame rate at about 100 enemies is unprofiled, and only the user can accept the art.
