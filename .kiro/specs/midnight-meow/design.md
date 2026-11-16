# Design: Midnight Meow

## Overview

A static site (`index.html`, `styles.css`, compiled `dist/`) with no framework or runtime dependencies. The game splits into a DOM-free simulation, a Canvas renderer and a thin DOM UI layer, wired together in `src/main.ts`.

## Architecture

```
input.ts / touch.ts ──► FrameInput ──► sim.step(state, input, dt) ──► SimState
                                       ▲                              │
              characters / upgrades /  │        world.ts (craft-scene, ◄┤
              enemies / interactions ──┘        craft-cat, craft-combat,│
                                                craft-enemies,          │
                                                craft-juice, combat-fx) │
                                                   │                    │
                                      2x back canvas ──► stage canvas   │
hud.ts / character-panel.ts / upgrade-cards.ts ◄── SimState + data + i18n
main.ts cueState (diff of sim counters) ──► audio/sfx.ts
```

### Simulation (`src/game/`)

- `createSim({ cat, seed, world, sessionSeconds })` builds a `SimState` with a single `player` whose `id` is the chosen cat. There is no companion slot.
- `step` advances time, spawns ink blobs from the yard edges, moves the player, runs the cat's attack (Zero bolts or Nicole orbit), resolves shots, fields, shields, contact damage and win / lose.
- `nightPhase` splits the session into four phases at 20%, 60% and 90% of elapsed time. Spawn intervals are 3.8, 3.4, 2.4 and 1.65 seconds, and enemy speed rises by 4 per phase.
- RNG state is stored in `SimState.rngState`, so `snapshot` comparisons prove determinism.
- Per-cat numbers come from `CHARACTERS` in `characters.ts`; shared numbers from `STATS` in `types.ts`.
- **Upgrades (`upgrades.ts`).** `UPGRADES` lists shared, Zero-only and Nicole-only cards, the two evolutions (`echo-legion`, `full-moon`, gated by `requires`) and the `snack` filler. Defeats call `dropShard`; shards are magnetised inside `XP.pickupRadius`. When XP reaches `xpForLevel(level)`, `rollChoices` puts 3 cards in `state.pendingChoice` and `step` returns early, applying only `input.choose`, until `chooseUpgrade(state, i)` resolves it. `playerStats(state)` derives the live kit from `state.upgrades`, so the sim never mutates `CHARACTERS`.
- **Enemies (`enemies.ts`).** `ENEMIES` holds hp, speed, radius, contact damage, XP and knockback per kind. `SPAWN_TABLE` weights kinds per phase, `WAVES` adds scripted groups at fixed fractions, and `ENEMY_CAP` bounds living enemies including splits and summons. Smudges fire `enemyShots` that land as `hazards` (slowing puddles). Bats get a swoop phase from their id, so no RNG is spent.
- **Boss.** At `BOSS.spawnAt` (0.78) the Eraser spawns; `startBossAttack` cycles sweep, summon and charge with telegraph timers; `inSweep` tests the sweep rectangle. `state.boss` tracks spawn and defeat; the reward is `rewardShards` shards of `rewardValue`.
- **Interactions (`interactions.ts`).** `state.interactables` holds the 3 pumpkins and the moon-lantern at positions shared with the scene props; `state.treats` holds fish treats placed with the sim RNG. Stunned enemies skip movement and contact.
- **Feel.** `state.streak` counts kills inside `STATS.streakWindow`; `impacts` and `effects` (kinds and lifetimes in `EFFECT_LIFE` and `ENEMY_FX_LIFE`) carry a `seed` so the renderer can vary flakes without the RNG. `notices` drive phase ribbons, the boss banner and evolution messages.

### Rendering (`src/render/`)

- `paper-material.ts` provides procedural paper primitives: fiber, embossing, torn / cut edges, thickness offset, contact shadow, stitching and glow.
- `craft-scene.ts` draws the static night town in layers and caches them on offscreen canvases. It reuses layout coordinates and symbols from the legacy `scene.ts` and pixel helpers; that reuse is a code dependency only.
- `craft-cat.ts` builds papercraft cats on top of the official Meow Wall head data, keeping the face identifiers.
- `craft-combat.ts` and `combat-fx.ts` draw ink blobs, warm-light shots, moon stars, fields and shields.
- `craft-enemies.ts` draws each enemy kind, googly eyes that follow the cat and blink from a render-only hash, puddles, landing marks, dashed boss telegraphs, enemy shots and defeat effects.
- `craft-juice.ts` draws camera shake, hit flash, stun stars, damage tags, dissolve flakes, level / evolve / streak paper bursts, shard trails, pumpkin and moon-lantern states and fish treats.
- `world.ts` composes layers with depth sorting so the cat and enemies are occluded correctly by foreground scenery. Shake is applied inside a save / restore and the paper frame (`drawFrame`) is drawn outside it. Over the last 30 seconds `dawnAmount` lowers the moon, warms the horizon and dims the lamps.
- Rendering reads `SimState` only. It must not touch the RNG or mutate state.

### UI (`src/ui/`, `index.html`, `styles.css`)

- Screens: `title` (with character choice), `play`, `pause`, `upgrade`, `result`, switched by `main.ts` via `document.body.dataset.screen`.
- `character-panel.ts` and `hud.ts` render cat stats and skill text from `CHARACTERS` and i18n keys. The HUD adds the XP bar, level, owned charms, streak badge, boss bar and a critical-health vignette.
- `upgrade-cards.ts` deals 3 cards as a fanned hand (keys 1 / 2 / 3, with a 320 ms arm delay against accidental picks); `ink.ts` reveals text word by word (char by char for `zh`).
- UI motion ideas come from Snapblocks' public descriptions (Fan Deck, Tear Ticket, Ink Reveal, Pleated Strip, Magnetic Button, Glowcap). They are rebuilt in CSS / Canvas; no Snapblocks code is used. All motion is off under `prefers-reduced-motion`.
- `touch.ts` adds a pointer joystick and skill button when touch is preferred.
- Preferences `{ locale, cat, muted }` persist in `localStorage` key `midnight-meow-prefs`.

### Audio (`src/audio/sfx.ts`)

- Oscillators and generated noise buffers only; no audio files. The `AudioContext` is created on the first pointerdown / keydown.
- `main.ts` keeps a `cueState` and diffs sim counters each frame (shots, hits, defeats, level-ups, boss events, interactions) to trigger cues, so the sim stays free of audio. Ambience (wind, drone, crickets) plays during `play`.

### Localization (`src/content/`)

- `keys.ts` lists every message key; `en.ts` and `zh.ts` implement them; `t(locale, key, values)` formats them.
- Current default locale is `zh` and the `en` pack is complete. Requirement 11 (deferred by the user) later switches the default to English; the fate of the Chinese pack and toggle is still an open question.

## Testing

`npm test` compiles and runs `node:test` suites in `tests/` against `dist/`:

- `sim.test.mjs`: determinism, decoy without RNG use, single player with no companion, hit feedback.
- `characters.test.mjs`: different HP / speed, Zero bolts versus Nicole orbit, dash decoy and empower window, two-target pierce, orbit hit cooldown, Moonfold field and shield, shield limits, one-time rescue, cooldowns, full 300-second run to dawn.
- `scenery.test.mjs`: fence and boulder collision and world bounds.
- `official.test.mjs`, `tokens.test.mjs`: Meow Wall head data and identifiers.
- `viewport.test.mjs`: viewport fitting across sizes and DPRs.
- `upgrades.test.mjs`: shard drops, level-up into 3 valid cards, time freeze during a choice, real stat changes, evolution gating and effects, per-cat pools, determinism, names in both language packs.
- `enemies.test.mjs`: spawn kinds per phase, crumple split, boss arrives once on schedule, erase sweep hit and miss, boss reward.
- `interactions.test.mjs`: sim positions matching the scene props, pumpkins, fish treats, moon-lantern stun, streaks and milestones, hit flash and damage tags, phase ribbons, determinism.

Verification is `npm run build` and `npm test`, plus at most one static screenshot; no animation or recording runs. Art quality, effect timing and audio are not covered by tests. Nobody has watched the new effects in a browser or heard the audio yet, and only the user can accept the art.
