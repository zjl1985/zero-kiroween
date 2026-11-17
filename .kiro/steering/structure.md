---
inclusion: always
---

# Project structure

```
index.html            DOM screens (theater title / playbill cat choice, journal HUD, folded pause page,
                      upgrade cards, journal result page); data-style="papercraft"
styles.css            UI styling in the papercraft night-watch journal look (no url() textures)
src/main.ts           boot, screen flow, resize, input wiring, follow camera, render loop, prefs,
                      audio cues and event timelines derived from sim counters
src/audio/sfx.ts      procedural Web Audio sound effects and ambience, mute
src/cats/             Meow Wall official cat head data (meow-wall-art.ts), Zero / Nicole definitions, composition
src/content/          i18n: keys.ts (message keys), en.ts, zh.ts, i18n.ts (t, formatTime)
src/game/             simulation, no DOM
  world-gen.ts        bounded seeded world: SCREEN, WORLD (10 x 10 screens), CHUNK, landmarks, roads,
                      chunkContent (pure hash of seed + chunk coords), nearColliders, SPAWN_RING, ACTIVE
  characters.ts       per-cat combat numbers (single source for sim, selection page, HUD)
  upgrades.ts         weapons, passives, BUILD slots, START_WEAPON, WEAPON_STEPS, EVOLUTIONS,
                      XP curve, playerStats, rollChoices, readyEvolution
  enemies.ts          enemy kinds, HORDE pacing (hardCap 100), KIND_CAP, PHASE_AT, ELITE,
                      spawn table, waves, Eraser Boss numbers
  interactions.ts     pumpkins, moon-lantern, fish treats, chests (start yard spots match scene.ts props)
  sim.ts              createSim, step, chunk loading, ring spawning, night phases, weapons, shards,
                      upgrades, elites, chests and evolution, Boss hunt, streaks, interactions, win / lose
  types.ts            SimState, shared STATS, EFFECT_LIFE, FX_CAP
  input.ts            keyboard input (WASD / arrows, Space skill, Esc / P pause, 1 / 2 / 3 cards)
  collision.ts, scenery.ts, rng.ts, clock.ts
src/render/           Canvas drawing
  camera.ts           follow camera (deadzone, smoothing, clamp to WORLD)
  craft-world.ts      per-chunk ground caches, roads, hedge, landmark buildings, culling, nav arrows
  paper-material.ts   procedural paper fiber, embossing, cut edges, thickness, shadows, stitching, glow
  craft-scene.ts      screen-space sky, world-space hills and ground, trees, houses, start yard, dawn
  craft-cat.ts        papercraft cats that keep the official face identifiers (narrow face paper edge)
  craft-combat.ts     paper ink blobs and warm-light shots
  combat-fx.ts        moon stars, fields, shields, weapon and skill effects
  craft-enemies.ts    enemy shapes, elite crowns, tracking eyes, telegraphs, puddles, enemy shots,
                      defeat effects
  craft-juice.ts      camera shake, hit flash, damage tags, dissolves, level / streak bursts,
                      pumpkin and moon-lantern states, fish treats, chests
  timeline.ts         pure cue timelines (anticipation / reveal / burst / settle), slow motion, zoom,
                      card deal stagger, presentationSteps
  cue-fx.ts           evolution, Boss entrance / defeat, dawn and finale effects in world and screen space
  journal-ui.ts       Canvas painters for the journal HUD and result page (moon arc, lanterns, wick,
                      minimap, paw stamp, window flowers)
  upgrade-icons.ts    upgrade card icons
  world.ts            layered composition, occlusion, paper frame and dawn sky
  viewport.ts         fit the view to the window
  hash.ts             render-only hashes
  scene.ts, layout.ts, pixel*.ts, cast.ts
                      legacy code that craft-scene still uses for layout coordinates and symbols;
                      not a second art style, do not delete blindly
src/ui/               hud.ts (badge, moon arc, lantern hearts, minimap, wick skill, XP seam, build tags,
                      chest slip, Boss eraser bar), journal.ts (result journal page),
                      journal-geometry.ts (pure HUD geometry, tested), character-panel.ts (selection),
                      upgrade-cards.ts (lattice-window cards dealt from a stack), ink.ts (word-by-word
                      ink reveal), touch.ts (mobile joystick + skill button)
tests/*.test.mjs      node:test suites against dist/ (characters, enemies, interactions, journal, official,
                      scenery, sim, timeline, tokens, upgrades, viewport, world)
docs/archive/         obsolete history, not instructions
output/playwright/    local screenshots and throwaway probes, git-ignored, not game assets
```
