---
inclusion: always
---

# Project structure

```
index.html            DOM screens (title / character choice, HUD, pause, upgrade cards, result); data-style="papercraft"
styles.css            UI styling in the papercraft palette
src/main.ts           boot, screen flow, resize, input wiring, render loop, prefs, audio cues from sim counters
src/audio/sfx.ts      procedural Web Audio sound effects and ambience, mute
src/cats/             Meow Wall official cat head data (meow-wall-art.ts), Zero / Nicole definitions, composition
src/content/          i18n: keys.ts (message keys), en.ts, zh.ts, i18n.ts (t, formatTime)
src/game/             simulation, no DOM
  characters.ts       per-cat combat numbers (single source for sim, selection page, HUD)
  upgrades.ts         upgrade cards, Zero / Nicole evolutions, XP curve, playerStats, rollChoices
  enemies.ts          enemy kinds, spawn table, waves, enemy cap, Eraser Boss numbers
  interactions.ts     pumpkins, moon-lantern and fish treats (positions match scene.ts props)
  sim.ts              createSim, step, spawning, night phases, combat, shards, upgrades, Boss,
                      streaks, interactions, win / lose
  types.ts            SimState, shared STATS, EFFECT_LIFE
  input.ts            keyboard input (WASD / arrows, Space skill, Esc / P pause, 1 / 2 / 3 cards)
  collision.ts, scenery.ts, rng.ts, clock.ts
src/render/           Canvas drawing
  paper-material.ts   procedural paper fiber, embossing, cut edges, thickness, shadows, stitching, glow
  craft-scene.ts      papercraft sky, hills, trees, houses, roof tiles, road, yard, foreground
  craft-cat.ts        papercraft cats that keep the official face identifiers
  craft-combat.ts     paper ink blobs and warm-light shots
  combat-fx.ts        moon stars, fields, shields, skill effects
  craft-enemies.ts    enemy shapes, tracking eyes, telegraphs, puddles, enemy shots and defeat effects
  craft-juice.ts      camera shake, hit flash, damage tags, dissolves, level / evolve / streak bursts,
                      pumpkin and moon-lantern states, fish treats
  upgrade-icons.ts    upgrade card icons
  world.ts            layered composition, occlusion, paper frame and dawn sky
  viewport.ts         fit the view to the window
  scene.ts, layout.ts, pixel*.ts, cast.ts
                      legacy code that craft-scene still uses for layout coordinates and symbols;
                      not a second art style, do not delete blindly
src/ui/               character-panel.ts (selection), hud.ts (XP, level, charms, streak, Boss bar),
                      upgrade-cards.ts (fanned card hand), ink.ts (word-by-word ink reveal),
                      touch.ts (mobile joystick + skill button)
tests/*.test.mjs      node:test suites against dist/
docs/archive/         obsolete history, not instructions
output/playwright/    local screenshots, git-ignored, not game assets
```
