---
inclusion: always
---

# Tech stack

- TypeScript 5 (`strict`, ES2022, Node16 modules), compiled by `tsc` from `src/` to `dist/`. No framework, no bundler, no runtime dependencies.
- Architecture: definitions + hooks + registries. `src/engine/` holds content-agnostic tools (`createRegistry`, `createEventBus`, `cachedSprite`). `src/defs/` holds one def file per cat, weapon, passive, evolution, enemy, material, reaction row, prop, landmark and biome, registered with one line in `src/defs/index.ts` or `src/defs/world-index.ts`. `src/game/` is the generic simulation that looks defs up by id and calls their hooks through a `SimContext`. Art files sit beside their defs and are registered only by `src/render/art-index.ts`, so the sim never imports art.
- Rendering: Canvas 2D. `src/main.ts` draws into a 2x internal back canvas, then presents it to the stage canvas. The 960 x 540 view follows the cat through a bounded world via `src/render/camera.ts`; ground (roads, landmark ground, district patches) is cached per chunk on 2x offscreen canvases (`craft-world.ts`), tall pieces and props are cached sprites (`cachedSprite`), and actors are culled to the view. New art uses the paper kit (`paper-kit.ts`, `prop-kit.ts`) and seeded variants (`variants.ts`).
- Paper interactions: weapons carry elements (`fire`, `ink`, `wind`, `cut`, `fold`); props have a material; a material x element reaction table decides tearing or burning (`src/game/props.ts`). Fire lives on a cell grid with a cap (`FIRE` in `src/defs/fire.ts`). Landmark pieces fold up like a pop-up book near the cat (render only, `POPUP` in `timeline.ts`).
- UI: plain DOM in `index.html` plus `styles.css`; screens are `title`, `play`, `pause`, `upgrade`, `result`, plus the `?gallery=1` page. HUD and result page canvases are painted by `src/render/journal-ui.ts` and repaint only when their inputs change.
- Simulation is deterministic: seeded RNG (`src/game/rng.ts`) passed only to `WeaponDef.step` and `EnemyBehaviour.steer`, state stored in `SimState`, advanced by `step(state, input, dt)`. Registration order is part of the behaviour. Rendering must not consume RNG or mutate simulation state. World content (chunks, districts, landmarks, roads, decor, props) comes from a pure hash of (seed, chunk coords) in `src/game/world-gen.ts` that both sim and renderer may call. Fire spread and prop drops use `hash2`, never the step RNG. Presentation slow motion (`src/render/timeline.ts`) only changes how many `FIXED_DT` steps run per frame.
- Audio: Web Audio only (`src/audio/sfx.ts`), oscillators and generated noise, no audio files. The `AudioContext` starts on the first pointerdown / keydown; `main.ts` derives cues from sim counters, so the sim stays audio-free.
- Preferences (locale, chosen cat, `muted`) are stored in `localStorage` under `midnight-meow-prefs`.

## Commands

```bash
npm install     # TypeScript only
npm run build   # tsc
npm start       # python3 -m http.server 4173
npm test        # tsc && node --test tests/*.test.mjs
```

- Open `http://localhost:4173/`; `/?start=1` jumps straight into a run with the saved cat, `?seed=N` pins the run seed (otherwise each run gets a fresh one), `/?gallery=1` shows every registered entry on paper cards.
- An old local server may still hold port 4173. Check the port before starting another one.
- Tests import compiled modules from `dist/`, so they always build first.

## Conventions

- ES module imports use the `.js` suffix (`./sim.js`) as required by Node16 resolution.
- Every user-facing string goes through `t(locale, key)` in `src/content/i18n.ts`. Add new keys to `src/content/keys.ts` and to every language pack.
- Gameplay numbers live in def files, not inline in render or UI code: per cat in `src/defs/cats/<id>/stats.ts`, per weapon / passive / enemy / prop / landmark in its def file, build and XP in `src/defs/progression.ts`, horde pacing, elites, spawn table and waves in `src/defs/horde.ts`, fire in `src/defs/fire.ts`, districts in `src/defs/biomes/districts.ts`, interactions in `src/game/interactions.ts`, world size in `src/game/world-gen.ts`, shared `STATS` / `EFFECT_LIFE` / `FX_CAP` in `src/game/types.ts`. The facades `src/game/characters.ts`, `upgrades.ts` and `enemies.ts` re-export registry data under the old names. Presentation timing (cue beats, slow motion, card deal, pop-up fold) lives in `src/render/timeline.ts`.
- `src/game/*.ts`, non-legacy `src/render/*.ts`, `src/ui/*.ts` and `src/main.ts` must not name cat ids; look them up through the registries (tested).
- Verification is `npm run build` and `npm test`, plus at most one static screenshot. No animation or recording runs.
- Delete files with `trash` (moves to the macOS Trash). Never silently fall back to permanent deletion for untracked user files.
- Commit messages use gitmoji plus a type prefix, for example `✨ feat: ...`, `📝 docs: ...`.
