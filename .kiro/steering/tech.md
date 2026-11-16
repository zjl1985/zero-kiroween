---
inclusion: always
---

# Tech stack

- TypeScript 5 (`strict`, ES2022, Node16 modules), compiled by `tsc` from `src/` to `dist/`. No framework, no bundler, no runtime dependencies.
- Rendering: Canvas 2D. `src/main.ts` draws into a 2x internal back canvas, then presents it to the stage canvas.
- UI: plain DOM in `index.html` plus `styles.css`; screens are `title`, `play`, `pause`, `upgrade`, `result`.
- Simulation is deterministic: seeded RNG (`src/game/rng.ts`), state stored in `SimState`, advanced by `step(state, input, dt)`. Rendering must not consume RNG or mutate simulation state.
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
- Gameplay numbers belong in data modules, not inline in render or UI code: `src/game/characters.ts` (per cat base kit), `upgrades.ts` (cards, evolutions, XP curve), `enemies.ts` (enemy kinds, spawn table, waves, Boss), `interactions.ts` (pumpkins, moon-lantern, fish treats), or `STATS` / `EFFECT_LIFE` in `types.ts` (shared).
- Verification is `npm run build` and `npm test`, plus at most one static screenshot. No animation or recording runs.
- Delete files with `trash` (moves to the macOS Trash). Never silently fall back to permanent deletion for untracked user files.
- Commit messages use gitmoji plus a type prefix, for example `✨ feat: ...`, `📝 docs: ...`.
