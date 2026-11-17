# Agent entry point

Midnight Meow (猫猫守夜) is a browser game for Kiroween 2026: a survivor-like roguelike in the Vampire Survivors genre, in a papercraft / cut-paper style drawn entirely by Canvas code.

## Read first

1. [HANDOFF.md](HANDOFF.md): current state, user requirements, known issues and pending decisions.
2. [PLAN.md](PLAN.md) (v0.12): current task order and verification rules.
3. [README.md](README.md): how to run the game.
4. The project skill [`.kiro/skills/midnight-meow-dev/SKILL.md`](.kiro/skills/midnight-meow-dev/SKILL.md) and its `references/` recipes. Follow it when you add or change cats, weapons, passives, evolutions, enemies, props, reactions, landmarks, districts, strings or art, and when you verify and commit.
5. `.kiro/steering/*.md` (product, tech, structure, papercraft-art): product constraints, tech stack, layout and art direction.

## Architecture: definitions + hooks + registries

- `src/engine/` holds content-agnostic tools (`createRegistry`, `createEventBus`, `cachedSprite`) and imports no other layer (tested).
- `src/defs/` holds one def file (numbers + hooks) per thing, with its art file beside it (`def.ts` + `art.ts`, or `<id>.ts` + `<id>.art.ts`). Defs are registered with one line in `src/defs/index.ts` (cats, weapons, passives, evolutions, behaviours, enemies) or `src/defs/world-index.ts` (materials, reactions, props, landmarks, biomes). Art is registered only in `src/render/art-index.ts`.
- Registration order is behaviour: weapon steps, the stat fold, the spawn table and the world-gen hash sequence depend on it. Append new entries at the end.
- `src/game/` is the generic simulation. It looks defs up by id and calls their hooks through `SimContext`. The sim never imports render, UI or the DOM.
- `src/game/`, non-legacy `src/render/`, `src/ui/` and `src/main.ts` never name cat ids; they go through the registries. `tests/registry.test.mjs` enforces this.
- The sim is deterministic. The seeded RNG goes only to `WeaponDef.step` and `EnemyBehaviour.steer`. World content, fire spread and prop drops use `hash2`. Rendering reads `SimState` and never mutates it or consumes the sim RNG.
- Gameplay numbers live in def files, not in render or UI code.

## Constraints that must not be misread

- **One art style only: papercraft / cut paper.** No dual style, no pixel mode, no style toggle, and do not restore the old pixel/paper switch. Pixel helpers, data and old layout code in the repo are code dependencies; do not delete them blindly.
- Everything is drawn by code and all sound is synthesized with Web Audio. No image or audio assets. The user's reference image is an art target only, never a background, texture or generated asset. Offscreen canvases may cache procedurally drawn content.
- The player picks one cat at the start: Zero (male) or Nicole (female). Only the chosen cat appears in a run. The other cat never enters, follows or acts as a companion.
- The two cats keep their distinct starting weapons, actives, passives, exclusive weapons / passives and evolutions (Echo Legion and Full Moon, which trigger only when a chest is opened).
- The goal is a competition-grade game (scenes, effects, interactions, evolutions) while the art keeps moving toward the reference. Next steps are in PLAN.md: browser playtest, balance, performance, user review.
- Effects may borrow ideas from the public descriptions of [Snapblocks](https://www.snapblocks.site/) and the rhythm ideas of [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), rebuilt in Canvas / CSS. Never copy their code.
- Every user-facing string goes through `t(locale, key)`. Add new keys to `src/content/keys.ts` and to every language pack. `en` is the default for new sessions; existing saved locale choices remain respected and both language packs stay complete. Ask the user before removing the Chinese pack or the language toggle.
- Verification is `npm run build` + `npm test`, plus at most one static screenshot. No animation or recording checks unless the user asks again.
- Everything in `docs/archive/` is obsolete history, not instructions.
- A passing build or test run does not mean the user approved the art. Never claim the art is final or the entry is finished. Say plainly what nobody has viewed, heard or measured.
- Random helper cats are not built. Ask the user before starting them.
- Commit messages use gitmoji plus a type prefix, for example `✨ feat: ...` or `📝 docs: ...`. `.agents/` is local task state and is not committed.

## Deleting files

Delete files and directories with `trash` (moves them to the macOS Trash) by default. Files tracked in Git history and temporary files may be deleted directly, as may anything the user explicitly asks to delete directly. For other files, if `trash` is unavailable, never silently fall back to permanent deletion.
