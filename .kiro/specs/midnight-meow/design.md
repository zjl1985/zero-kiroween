# Design: Midnight Meow

## Overview

A static site (`index.html`, `styles.css`, compiled `dist/`) with no framework or runtime dependencies. The game splits into a DOM-free simulation, a Canvas renderer and a thin DOM UI layer, wired together in `src/main.ts`.

## Architecture

```
input.ts / touch.ts ──► FrameInput ──► sim.step(state, input, dt) ──► SimState
                                                                      │
                                   world.ts (craft-scene, craft-cat,  ◄┘
                                   craft-combat, combat-fx)
                                      │
                         2x back canvas ──► stage canvas
hud.ts / character-panel.ts ◄── SimState + characters.ts + i18n
```

### Simulation (`src/game/`)

- `createSim({ cat, seed, world, sessionSeconds })` builds a `SimState` with a single `player` whose `id` is the chosen cat. There is no companion slot.
- `step` advances time, spawns ink blobs from the yard edges, moves the player, runs the cat's attack (Zero bolts or Nicole orbit), resolves shots, fields, shields, contact damage and win / lose.
- `nightPhase` splits the session into four phases at 20%, 60% and 90% of elapsed time. Spawn intervals are 3.8, 3.4, 2.4 and 1.65 seconds, and enemy speed rises by 4 per phase.
- RNG state is stored in `SimState.rngState`, so `snapshot` comparisons prove determinism.
- Per-cat numbers come from `CHARACTERS` in `characters.ts`; shared numbers from `STATS` in `types.ts`.

### Rendering (`src/render/`)

- `paper-material.ts` provides procedural paper primitives: fiber, embossing, torn / cut edges, thickness offset, contact shadow, stitching and glow.
- `craft-scene.ts` draws the static night town in layers and caches them on offscreen canvases. It reuses layout coordinates and symbols from the legacy `scene.ts` and pixel helpers; that reuse is a code dependency only.
- `craft-cat.ts` builds papercraft cats on top of the official Meow Wall head data, keeping the face identifiers.
- `craft-combat.ts` and `combat-fx.ts` draw ink blobs, warm-light shots, moon stars, fields and shields.
- `world.ts` composes layers with depth sorting so the cat and enemies are occluded correctly by foreground scenery.
- Rendering reads `SimState` only. It must not touch the RNG or mutate state.

### UI (`src/ui/`, `index.html`, `styles.css`)

- Screens: `title` (with character choice), `play`, `pause`, `result`, switched by `main.ts` via `document.body.dataset.screen`.
- `character-panel.ts` and `hud.ts` render cat stats and skill text from `CHARACTERS` and i18n keys.
- `touch.ts` adds a pointer joystick and skill button when touch is preferred.
- Preferences `{ locale, cat }` persist in `localStorage` key `midnight-meow-prefs`.

### Localization (`src/content/`)

- `keys.ts` lists every message key; `en.ts` and `zh.ts` implement them; `t(locale, key, values)` formats them.
- Current default locale is `zh`. Requirement 6 changes the default to English and keeps English throughout; the fate of the Chinese pack and toggle is still an open question.

## Testing

`npm test` compiles and runs `node:test` suites in `tests/` against `dist/`:

- `sim.test.mjs`: determinism, decoy without RNG use, single player with no companion, hit feedback.
- `characters.test.mjs`: different HP / speed, Zero bolts versus Nicole orbit, dash decoy and empower window, two-target pierce, orbit hit cooldown, Moonfold field and shield, shield limits, one-time rescue, cooldowns, full 300-second run to dawn.
- `scenery.test.mjs`: fence and boulder collision and world bounds.
- `official.test.mjs`, `tokens.test.mjs`: Meow Wall head data and identifiers.
- `viewport.test.mjs`: viewport fitting across sizes and DPRs.

Art quality is not covered by tests. It is judged from static running screenshots and only the user can accept it.
