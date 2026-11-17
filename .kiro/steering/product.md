---
inclusion: always
---

# Product: Midnight Meow (猫猫守夜)

A short browser night-watch game for Kiroween 2026, a survivor-like roguelike in the Vampire Survivors genre with a moderate crowd (no hundreds of enemies). The player picks one cat and walks a bounded, seeded papercraft night town (at most 10 x 10 screens, `WORLD` in `src/game/world-gen.ts`, with a follow camera) for a 10-minute night (`STATS.sessionSeconds` 600). Ink blobs, paper bats, crumples, smudges, crowned elites and a hunting Eraser boss close in (at most `HORDE.hardCap` = 100 alive). The cat collects ink shards to level weapons and passives, opens chests from elites and the Boss to evolve, finds landmarks along the roads, and walks through five districts whose paper props tear and burn. The 10 x 10 and 100 numbers are our reading of the user's "max 100" and stay tunable data.

Read `HANDOFF.md` and `PLAN.md` before starting work. They hold the current requirements. `docs/archive/` is obsolete history, never current instructions.

## Hard constraints

- **One art style only: papercraft / cut paper.** No dual style, no pixel mode, no style toggle. Do not restore the old pixel/paper switch. Pixel helpers and old layout code still in the repo are code dependencies, not a second product style.
- **Everything is drawn by code on Canvas.** No image backgrounds, textures, sprites or generated images. The user's reference image is an art target only and must never be imported as an asset. Offscreen canvases may cache procedurally drawn content.
- **Pick one cat at the start.** Zero (male cat) or Nicole (female cat). Only the chosen cat appears in a run. The other cat never enters as a companion or follower. Zero's dash afterimage is a short skill effect, not a second character.
- **The two cats play differently.** Keep their distinct starting weapons, actives and passives. This includes their exclusive weapons / passives and evolutions (Zero: Echo Legion = max Meowline + Long Shadow; Nicole: Full Moon = max Moonstars + Deep Fold; both unlock only when a chest is opened). Numbers live in the def files (`src/defs/cats/<id>/stats.ts`, `src/defs/weapons/`, `src/defs/passives/`, `src/defs/evolutions/`), and the selection page and HUD read from the same registries.
- **No image or audio assets.** Sound is synthesized in `src/audio/sfx.ts` with oscillators and generated noise.
- **i18n stays in place.** Every user-facing string goes through `t()`. `zh` is the default for now and the `en` pack is complete. Switching the default to English comes later through i18n; ask the user before removing the Chinese pack or the toggle.

## Current priority

1. Make the game competition grade. The bounded world, follow camera, landmarks, horde pacing, elites, chests, weapon / passive build, the night-watch journal UI and the event timelines exist in code. The latest round added the extensible skeleton (engine + defs + registries, art registry), paper reactions (tearing, spreading fire, pop-up landmark pieces), the paper kit with seeded variants, the `?gallery=1` page, five districts, three new landmarks and twelve new props. Next comes a real-browser playtest, balance (Nicole's idle bot cannot finish the Eraser; the Boss can be outrun so dawn still wins) and a performance check at about 100 enemies.
2. Extend content through the `midnight-meow-dev` skill (`.kiro/skills/midnight-meow-dev/`): one def file plus one art file and one registry line per entry.
3. Effects may borrow ideas from [Snapblocks](https://www.snapblocks.site/), a paid React library. Rebuild ideas from its public descriptions in Canvas / CSS only; never copy its code. Event rhythm (anticipation, reveal, burst, settle) follows ideas from [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), rebuilt in Canvas / CSS.
4. Keep polishing the papercraft art toward the reference (paper fiber, cut-edge thickness, contact shadows, folds, stitching, warm windows, autumn trees, a curved road, a large moon). The UI must keep its own journal identity and not copy Tibo Dog, which is a spatial reference only.
5. Verify with `npm run build` and `npm test`, plus at most one static screenshot. **Do not run animation or video-recording verification** unless the user asks again. The user finds heavy checking excessive.
6. Later: English default, deployment and Devpost submission before 2026-12-05 06:00 Beijing time. Random helper cats are not built; confirm with the user before starting them.

## Honesty rules

- Passing a build or tests does not mean the user approved the art.
- Never claim the art is final or the entry is finished.
- Nobody has yet viewed the game in a running browser: not the bounded world, landmarks, camera, elites, chests, weapons, journal UI or event timelines, and not this round's work either (rendering through the art registry, tearable and burning props, fire, pop-up folding, districts, the new landmarks and props, the `?gallery=1` page). The sandbox blocked Playwright and headless Chromium, so no screenshot was taken. Nobody has heard the audio (including the new tear and crackle cues). Balance was only probed with throwaway idle bots and frame rate at about 100 enemies is unprofiled. Say so instead of implying it was checked.
