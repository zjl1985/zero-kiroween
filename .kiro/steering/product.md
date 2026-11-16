---
inclusion: always
---

# Product: Midnight Meow (猫猫守夜)

A short browser night-watch game for Kiroween 2026. The player picks one cat and guards a code-drawn papercraft night town against ink blobs, paper bats, crumples, smudges and the Eraser boss until dawn (a 300-second session), collecting ink shards to level up, pick upgrade cards and evolve.

Read `HANDOFF.md` and `PLAN.md` before starting work. They hold the current requirements. `docs/archive/` is obsolete history, never current instructions.

## Hard constraints

- **One art style only: papercraft / cut paper.** No dual style, no pixel mode, no style toggle. Do not restore the old pixel/paper switch. Pixel helpers and old layout code still in the repo are code dependencies, not a second product style.
- **Everything is drawn by code on Canvas.** No image backgrounds, textures, sprites or generated images. The user's reference image is an art target only and must never be imported as an asset. Offscreen canvases may cache procedurally drawn content.
- **Pick one cat at the start.** Zero (male cat) or Nicole (female cat). Only the chosen cat appears in a run. The other cat never enters as a companion or follower. Zero's dash afterimage is a short skill effect, not a second character.
- **The two cats play differently.** Keep their distinct attacks, actives and passives. This includes their upgrade pools and evolutions (Zero: Echo Legion, Nicole: Full Moon). Numbers live in `src/game/characters.ts` and `src/game/upgrades.ts`, and the selection page and HUD read from the same data.
- **No image or audio assets.** Sound is synthesized in `src/audio/sfx.ts` with oscillators and generated noise.
- **i18n stays in place.** Every user-facing string goes through `t()`. `zh` is the default for now and the `en` pack is complete. Switching the default to English comes later through i18n; ask the user before removing the Chinese pack or the toggle.

## Current priority

1. Make the game competition grade: scene, effects, interaction and evolution. A first version of upgrades / evolutions, enemy kinds, the Eraser boss, yard interactions (pumpkins, moon-lantern, fish treats), hit feedback and procedural audio exists; tune and extend it.
2. Effects may borrow ideas from [Snapblocks](https://www.snapblocks.site/), a paid React library. Rebuild ideas from its public descriptions in Canvas / CSS only; never copy its code.
3. Keep polishing the papercraft art toward the reference (paper fiber, cut-edge thickness, contact shadows, folds, stitching, warm windows, autumn trees, a curved road, a large moon).
4. Verify with `npm run build` and `npm test`, plus at most one static screenshot. **Do not run animation or video-recording verification** unless the user asks again. The user finds heavy checking excessive.
5. Later: English default, deployment and Devpost submission before 2026-12-05 06:00 Beijing time. Random helper cats are not built; confirm with the user before starting them.

## Honesty rules

- Passing a build or tests does not mean the user approved the art.
- Never claim the art is final or the entry is finished.
- Nobody has yet viewed the new enemies, effects or UI motion in a running browser, and nobody has heard the audio. Say so instead of implying it was checked.
