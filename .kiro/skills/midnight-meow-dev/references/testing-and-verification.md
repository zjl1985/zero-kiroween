# Build, test, verify and commit

The user wants light verification: build, tests, and at most one static screenshot. No animation or video-recording checks unless the user asks again.

## Commands

```bash
npm ci           # Node.js 22+; only if dependencies need installing (TypeScript only)
npm run build    # tsc -> dist/; package isolated static files -> site/ (both git-ignored)
npm test         # npm run build && node --test tests/*.test.mjs
npm start        # python3 -m http.server 4173 --directory site
```

Tests import compiled modules from `dist/`, and deployment tests inspect `site/`, so `npm test` always runs the full build first. The suite has 163 tests at the time of writing. Vercel runs `npm ci` and `npm run build`, then serves only `site/` (`vercel.json`); it needs no Python or runtime server. Do not publish the repository root or `dist/` directly. The user confirmed the previous Vercel deployment works. The latest character / scenery refinement has not been deployed or viewed by the agent.

## Test suites (`tests/*.test.mjs`, node:test)

| Suite | Covers |
| --- | --- |
| `registry.test.mjs` | def registries: pools, exclusives, evolution pairs, spawn tables, i18n keys, duplicate / unknown ids, event bus order, engine import isolation, no cat literals in `src/game` / render / UI / main, art registries match defs, icons, `cachedSprite`, landmark / biome art and layouts, biome prop mixes |
| `reactions.test.mjs` | tearing, scraps opening colliders, fire spread and cap, non-flammable materials, determinism with props and fire, prop state across chunk reloads, migrated fence / bush props, reaction table integrity, pop-up fold, scarecrow burst, straw fire |
| `gallery.test.mjs` | gallery sections, states, labels, layout bounds, seeded variants without `Math.random` |
| `rendering.test.mjs` | Canvas command recording: registered skill previews, landmark markers / depth order, cached alpha-mask tinting (not pixel or performance checks) |
| `seed.test.mjs` | uint32 bounds, zero, decimal syntax, invalid / overflowing seed rejection |
| `deployment.test.mjs` | Vercel settings, isolated output allowlist, entry assets and module imports, stale-output cleanup |
| `world.test.mjs` | 10 x 10 world and chunk tiling, pure chunk content, landmarks, start yard, exploring, edges, spawn ring, leash, discovery, camera, districts and biome props, prop cap |
| `sim.test.mjs` | determinism, decoy without RNG, single player, hit feedback, `makeRoom` |
| `characters.test.mjs` | Zero and Nicole kits |
| `cat-art.test.mjs` | registered appearance metadata, preserved face print / edge, finite caches, deterministic pose geometry / bounds |
| `scenery-art.test.mjs` | district motifs, seed determinism, patch / cottage / tree bounds, cached scenery reuse |
| `upgrades.test.mjs` | build slots, steps, chest-only evolution, snack, extra weapons, per-cat pools, names |
| `enemies.test.mjs` | horde ramp and hard cap, phases, crumple split, elites, chests, Boss arrival, sweep, reward, dawn win |
| `interactions.test.mjs` | pumpkins, fish treats, moon-lantern, streaks, notices, spot kinds per landmark |
| `journal.test.mjs`, `timeline.test.mjs`, `scenery.test.mjs`, `official.test.mjs`, `tokens.test.mjs`, `viewport.test.mjs` | HUD geometry, cue timelines and slow-motion determinism, collision, Meow Wall head data, viewport |

When adding content, the generic registry, reactions and gallery tests usually catch missing registration, art or keys. Add a behaviour test next to the closest existing one.

## Determinism guards

- Same seed + same inputs must give identical `snapshot(state)` (`src/game/sim.ts`). Tests compare snapshots; keep randomness to the passed-in `Rng`, world-gen `hash2` and render-only hashes.
- Rendering must never consume the sim RNG or mutate `SimState`.
- Local behaviour probes (git-ignored, they exist only on the machine where they were written): `output/playwright/baseline-snapshot.mjs` and `baseline-long.mjs` print snapshot hashes for fixed seeds and scripted inputs. For a refactor that must not change behaviour:

  ```bash
  npm run build && node output/playwright/baseline-snapshot.mjs | diff - output/playwright/baseline-reference.txt
  npm run build && node output/playwright/baseline-long.mjs | diff - output/playwright/baseline-long-reference.txt
  ```

  When a change is meant to alter gameplay or the world, keep a copy of the old reference (for example `baseline-reference-pre-<feature>.txt`), regenerate the reference twice and confirm both runs are byte-identical. If the probes are missing, rely on the snapshot tests and say so.

## Screenshot (optional, at most one)

1. `lsof -i :4173` first; an old server may already hold the port.
2. `npm run build && npm start`.
3. Open `http://localhost:4173/?start=1` (straight into a run with the saved cat), add `&seed=N` to pin the world, or `/?gallery=1` for the art gallery.

Earlier attempts encountered sandbox permissions. The latest one-static-shot attempt failed because the installed Playwright package's Chromium headless-shell executable is missing; no image was produced. If a screenshot fails, skip it and report the actual error. Do not retry or install browsers just to extend this light verification. Never describe art you have not seen.

## Query parameters

- `?start=1`: skip the title, start a run with the saved cat.
- `?seed=N`: pin the run seed (1–10 decimal digits within `0..4294967295`, including zero). Missing, malformed or out-of-range values use a fresh seed from `crypto.getRandomValues`; they never wrap.
- `?gallery=1`: the paper workshop gallery instead of the game.

## Kiro hooks

`.kiro/hooks/test-on-game-change.kiro.hook` asks for `npm test` when sim, defs, engine, cats or content files change; `.kiro/hooks/papercraft-guard.kiro.hook` asks for an art-rule check and `npm run build` when render, art def, style or markup files change.

## Commit

1. `git status` and `git diff`; stage files by name (never `git add -A`). Never commit `.agents/` or `output/`.
2. Message: gitmoji + type prefix, for example `✨ feat: add the paper kite prop`, `🐛 fix: ...`, `♻ refactor: ...`, `📝 docs: ...`, `✅ test: ...`.
3. Commit locally on the current branch. Never push, never change git config, never skip hooks. After a hook failure, fix it and make a new commit.
4. Delete files with `trash` (git-tracked files may use `git rm`); never silently fall back to permanent deletion for untracked files.

## Reporting

State what you ran and its result. State what was not checked: whether anyone viewed it in a browser, whether a screenshot was taken, that audio was not heard, that balance and performance at about 100 enemies were not profiled. Passing tests does not mean the user approved the art, and the entry is not finished.
