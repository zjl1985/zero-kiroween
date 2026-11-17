---
inclusion: always
---

# Tech stack

- TypeScript 5 (`strict`, ES2022, Node16 modules), compiled by `tsc` from `src/` to `dist/`. No framework, no bundler, no runtime dependencies.
- Rendering: Canvas 2D. `src/main.ts` draws into a 2x internal back canvas, then presents it to the stage canvas. The 960 x 540 view follows the cat through a bounded world via `src/render/camera.ts`; ground is cached per chunk on 2x offscreen canvases (`craft-world.ts`) and actors are culled to the view.
- UI: plain DOM in `index.html` plus `styles.css`; screens are `title`, `play`, `pause`, `upgrade`, `result`. HUD and result page canvases are painted by `src/render/journal-ui.ts` and repaint only when their inputs change.
- Simulation is deterministic: seeded RNG (`src/game/rng.ts`), state stored in `SimState`, advanced by `step(state, input, dt)`. Rendering must not consume RNG or mutate simulation state. World content (chunks, landmarks, roads, decor) comes from a pure hash of (seed, chunk coords) in `src/game/world-gen.ts` that both sim and renderer may call. Presentation slow motion (`src/render/timeline.ts`) only changes how many `FIXED_DT` steps run per frame.
- Audio: Web Audio only (`src/audio/sfx.ts`), oscillators and generated noise, no audio files. The `AudioContext` starts on the first pointerdown / keydown; `main.ts` derives cues from sim counters, so the sim stays audio-free.
- Preferences (locale, chosen cat, `muted`) are stored in `localStorage` under `midnight-meow-prefs`.

## Commands

```bash
npm install     # TypeScript only
npm run build   # tsc
npm start       # python3 -m http.server 4173
npm test        # tsc && node --test tests/*.test.mjs
```

- Open `http://localhost:4173/`; `/?start=1` jumps straight into a run with the saved cat.
- An old local server may still hold port 4173. Check the port before starting another one.
- Tests import compiled modules from `dist/`, so they always build first.

## Conventions

- ES module imports use the `.js` suffix (`./sim.js`) as required by Node16 resolution.
- Every user-facing string goes through `t(locale, key)` in `src/content/i18n.ts`. Add new keys to `src/content/keys.ts` and to every language pack.
- Gameplay numbers belong in data modules, not inline in render or UI code: `src/game/characters.ts` (per cat base kit), `upgrades.ts` (weapons, passives, slots, evolutions, XP curve), `enemies.ts` (enemy kinds, `HORDE` pacing and hard cap, elites, spawn table, waves, Boss), `interactions.ts` (pumpkins, moon-lantern, fish treats, chests), `world-gen.ts` (`WORLD`, chunks, landmarks, spawn ring), or `STATS` / `EFFECT_LIFE` / `FX_CAP` in `types.ts` (shared). Presentation timing (cue beats, slow motion, card deal) lives in `src/render/timeline.ts`.
- Verification is `npm run build` and `npm test`, plus at most one static screenshot. No animation or recording runs.
- Delete files with `trash` (moves to the macOS Trash). Never silently fall back to permanent deletion for untracked user files.
- Commit messages use gitmoji plus a type prefix, for example `✨ feat: ...`, `📝 docs: ...`.
