---
inclusion: always
---

# Project structure

```
index.html            DOM screens (title / character choice, HUD, pause, result); data-style="papercraft"
styles.css            UI styling in the papercraft palette
src/main.ts           boot, screen flow, resize, input wiring, render loop, prefs
src/cats/             Meow Wall official cat head data (meow-wall-art.ts), Zero / Nicole definitions, composition
src/content/          i18n: keys.ts (message keys), en.ts, zh.ts, i18n.ts (t, formatTime)
src/game/             simulation, no DOM
  characters.ts       per-cat combat numbers (single source for sim, selection page, HUD)
  sim.ts              createSim, step, spawning, night phases, combat, win / lose
  types.ts            SimState and shared STATS
  input.ts            keyboard input (WASD / arrows, Space skill, Esc / P pause)
  collision.ts, scenery.ts, rng.ts, clock.ts
src/render/           Canvas drawing
  paper-material.ts   procedural paper fiber, embossing, cut edges, thickness, shadows, stitching, glow
  craft-scene.ts      papercraft sky, hills, trees, houses, roof tiles, road, yard, foreground
  craft-cat.ts        papercraft cats that keep the official face identifiers
  craft-combat.ts     paper ink blobs and warm-light shots
  combat-fx.ts        moon stars, fields, shields, skill effects
  world.ts            layered composition and occlusion of scene, cat and combat
  viewport.ts         fit the view to the window
  scene.ts, layout.ts, pixel*.ts, cast.ts
                      legacy code that craft-scene still uses for layout coordinates and symbols;
                      not a second art style, do not delete blindly
src/ui/               character-panel.ts (selection), hud.ts, touch.ts (mobile joystick + skill button)
tests/*.test.mjs      node:test suites against dist/
docs/archive/         obsolete history, not instructions
output/playwright/    local screenshots, git-ignored, not game assets
```
