# Build, test, verify and commit

The user wants light verification: build and tests. **Never launch Google Chrome, Chromium or any Playwright browser (system Chrome or the bundled headless shell) from this sandbox**, for any reason. It aborts at launch and macOS shows the user a crash dialog each time. No animation or video-recording checks unless the user asks again.

## Commands

```bash
npm ci           # Node.js 22+; only if dependencies need installing (TypeScript only)
npm run build    # tsc -> dist/; package isolated static files -> site/ (both git-ignored)
npm test         # npm run build && node --test tests/*.test.mjs
npm start        # python3 -m http.server 4173 --directory site
```

Tests import compiled modules from `dist/`, and deployment tests inspect `site/`, so `npm test` always runs the full build first. Latest verification: **`npm run build && npm test` passed 327 tests** at 7fe42d1. Vercel runs `npm ci` and `npm run build`, then serves only `site/` (`vercel.json`); it needs no Python or runtime server. Do not publish the repository root or `dist/` directly. The user confirmed the previous Vercel deployment works, not that the latest ecology is deployed or approved.

## Test suites (`tests/*.test.mjs`, node:test)

| Suite | Covers |
| --- | --- |
| `registry.test.mjs` | def registries: pools, exclusives, evolution pairs, spawn tables, i18n keys, duplicate / unknown ids, event bus order, engine import isolation, no cat literals in `src/game` / render / UI / main, art registries match defs, icons, `cachedSprite`, landmark / biome art and layouts, biome prop mixes |
| `reactions.test.mjs` | tearing, scraps opening colliders, fire spread and cap, non-flammable materials, determinism with props and fire, prop state across chunk reloads, migrated fence / bush props, reaction table integrity, pop-up fold, scarecrow burst, straw fire |
| `environment-integration.test.mjs` | main-step shallow slowing / water-first extinguishing for both cats, real landmark element dispatch and rotor state, localized danger/activity copy, no pickup/upgrade after lethal contact |
| `fire-water.test.mjs` | radius ignition, carried burn, shields/invulnerability/rescue/defeat, enemy arrival/death handling, wet priority and bridge edges, bounded spread, once-per-prop burn, safe offscreen regrowth/unfolding, lifetime no-farm loot |
| `landmark-actions.test.mjs` | reachable courts, proximity vs element charging, progress/cooldowns across unloads, finite rewards, safe greenhouse scheduling, deterministic RNG-free activity state |
| `paper-elements.test.mjs` | unique ink/fold/ink-vat/wax rows, material-scaled HP, refreshed deadlines, flat-fold no-op, vat splash, wax melting, smudge landing, Nicole and once-per-volley crane fold sources |
| `paper-visuals.test.mjs` | read-only status/effect overlays, real fire-cell marks, deferred prop visuals, finite enemy/combat caches, court progress anchors, registered-bounds occlusion; static command recording, not animation/FPS |
| `water.test.mjs` | pure local polygons, negative coordinates, shared render vertices, shallow/deep/deck classification, swept movement/corners, spawn recovery, explicit road crossings, placement clearance and teaching basin |
| `paper-rules.test.mjs` | ruleset light/shadow directions, 1 to 3 layer limit, gloss-free weapon/passive icons and mounts, `?check=` parsing, the gloss probe |
| `wash.test.mjs` | deterministic capped grid without step RNG, water element rows and fire block, tear ease, sources (bucket, wash drip, smudge, rain, Eraser), unstacked wet slow, pigment/lantern/pumpkin/dawn restoration, fold protection and dash cut holes, sketch wakes and caps, the brush, strings in both packs, no state without wash |
| `paper-verbs.test.mjs` | Paper Cut loop closing, inside-only cut and white cells, partial Boss cut, slit expiry, age-pruned cut pieces; Page Fold flip and pin; level-3 walls; level-2 dry bridge (deck, expiry hold, determinism, exact vertices); per-cat offers; determinism; cat wear creases/tears/tape |
| `townsfolk.test.mjs` | pure townsfolk placement and cap, safe homes/routes off water and colliders, poses, nearest talker and tips, hint priority, no SimState or RNG use |
| `audio-mix.test.mjs` | cue tiers and throttles, envelope peak math, frequent cues below event cues, snip/fold in band, limiter and bus headroom |
| `paper-value.test.mjs` | no render `ctx.filter` except the one-off gallery value check, value hierarchy data (ground below decor, rim, dark shot outlines), half lamp chance and road-side lamps |
| `gallery.test.mjs` | gallery sections, base preview states, labels, layout bounds, seeded variants without `Math.random` |
| `rendering.test.mjs` | Canvas command recording: registered skill previews, landmark markers / depth order, cached alpha-mask tinting (not pixel or performance checks) |
| `seed.test.mjs` | uint32 bounds, zero, decimal syntax, invalid / overflowing seed rejection |
| `deployment.test.mjs` | Vercel settings, isolated output allowlist, entry assets and module imports, stale-output cleanup |
| `world.test.mjs` | 10 x 10 world and chunk tiling, pure chunk content, landmarks, start yard, exploring, edges, spawn ring, leash, discovery, camera, districts and biome props, prop cap |
| `sim.test.mjs` | determinism, decoy without RNG, single player, hit feedback, `makeRoom` |
| `characters.test.mjs` | Zero and Nicole kits |
| `cat-art.test.mjs` | registered appearance metadata, official-source visible color contours / silhouette, preserved face details / rim / anchors, finite caches, deterministic pose geometry / bounds |
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

## Screenshots and frame time (the user runs them)

Agents do not take screenshots or measure browser frame time. The user runs these on their own machine:

- `node output/playwright/open-work-shot.cjs`: the six-panel review sheet.
- `node output/playwright/frame-time.cjs`: browser frame time (p50 / p95 / max).

After an art change, tell the user which command to run and record the art as not viewed. For manual viewing: `lsof -i :4173` first, then `npm run build && npm start`, then open `http://localhost:4173/?start=1` (add `&seed=N` to pin the world) or `/?gallery=1`.

Current evidence: for the wash-out round the attempt aborted (system Chrome headless exit code 134, no output) in the sandbox, so no image exists. Nobody has viewed that round in a browser. No animation, recording, audio or FPS checks were performed; no user art approval is recorded. Older stills (`paper-ecology-review.png`, `papercraft-polish-2026-11-18.png`) predate this round.

Do not retry headless Chrome from the sandbox; earlier attempts all aborted with exit 134 and produced no image. Never describe unviewed art or infer motion/performance from one still.

## Query parameters

- `?start=1`: skip the title, start a run with the saved cat.
- `?seed=N`: pin the run seed (1–10 decimal digits within `0..4294967295`, including zero). Missing, malformed or out-of-range values use a fresh seed from `crypto.getRandomValues`; they never wrap.
- `?gallery=1`: the paper workshop gallery instead of the game. Add `&check=value` (luminance only) or `&check=gloss` (red outline on cells that use gradients, blurred shadows or additive light); developer views, never linked from the UI.

## Kiro hooks

`.kiro/hooks/test-on-game-change.kiro.hook` asks for `npm test` when sim, defs, engine, cats or content files change; `.kiro/hooks/papercraft-guard.kiro.hook` asks for an art-rule check and `npm run build` when render, art def, style or markup files change.

## Commit

Only commit when the user explicitly authorizes it; a documentation update is not implicit authorization.

1. `git --no-pager --no-optional-locks status` and `git --no-pager diff`; stage files by name (never `git add -A`). Never commit `.agents/` or `output/`.
2. Message: gitmoji + type prefix, for example `✨ feat: add the paper kite prop`, `🐛 fix: ...`, `♻ refactor: ...`, `📝 docs: ...`, `✅ test: ...`.
3. Commit locally on the current branch. Never push, never change git config, never skip hooks. After a hook failure, fix it and make a new commit.
4. Delete files with `trash` (git-tracked files may use `git rm`); never silently fall back to permanent deletion for untracked files.

## Reporting

Report verification accurately. Latest verification: build and 327 passing tests at 7fe42d1; the open-work round's one screenshot failed (Chrome crashed in the sandbox, see `HANDOFF.md`); Node step probe 0.357 / 0.344 ms per step for Zero / Nicole at 100 enemies with fire and water (0.386 / 0.352 at e85365d); scripted balance probe `output/playwright/balance-run.mjs` (16 simulated nights). State what is still unreviewed: every art change of the round, full gameplay screen/mobile, motion, audio listening, a human playtest and browser FPS. Passing tests and a static image do not mean the user approved the art or that the entry is finished.
