---
inclusion: always
---

# Product: Midnight Meow (猫猫守夜)

A short browser night-watch game for Kiroween 2026. The player picks one cat and guards a code-drawn papercraft night town against ink blobs until dawn (a 300-second session).

Read `HANDOFF.md` and `PLAN.md` before starting work. They hold the current requirements. `docs/archive/` is obsolete history, never current instructions.

## Hard constraints

- **One art style only: papercraft / cut paper.** No dual style, no pixel mode, no style toggle. Do not restore the old pixel/paper switch. Pixel helpers and old layout code still in the repo are code dependencies, not a second product style.
- **Everything is drawn by code on Canvas.** No image backgrounds, textures, sprites or generated images. The user's reference image is an art target only and must never be imported as an asset. Offscreen canvases may cache procedurally drawn content.
- **Pick one cat at the start.** Zero (male cat) or Nicole (female cat). Only the chosen cat appears in a run. The other cat never enters as a companion or follower. Zero's dash afterimage is a short skill effect, not a second character.
- **The two cats play differently.** Keep their distinct attacks, actives and passives. Numbers live in `src/game/characters.ts`, and the selection page and HUD read from the same data.
- **English language requirement (new, not yet implemented):** the user asked that the game default to English and be in English throughout. Current code still defaults to `zh`, with a zh/en toggle. Confirm with the user whether the Chinese pack and toggle should be removed or only demoted before changing it.

## Current priority

1. Polish static art and UI toward the user's papercraft night-town reference: paper fiber, cut-edge thickness, layered contact shadows, folds, stitching, warm windows, autumn trees, a curved road, a large moon.
2. Check with a build and real static screenshots.
3. **Do not run animation or video-recording verification** unless the user asks again.
4. Do not expand Boss, random helper cats, upgrades or audio before the art is accepted.

## Honesty rules

- Passing a build or tests does not mean the user approved the art.
- Never claim the art is final or the entry is finished.
