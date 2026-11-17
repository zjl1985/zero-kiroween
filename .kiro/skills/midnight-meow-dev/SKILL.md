---
name: midnight-meow-dev
description: Development workflow for Midnight Meow (猫猫守夜), the papercraft survivor-like browser game in this repo. Use it when adding or changing cats, weapons, passives, evolutions, enemies, props, reactions, landmarks, biomes, i18n strings or code-drawn art, or when verifying and committing a change.
---

# Midnight Meow development

Midnight Meow is a TypeScript + Canvas 2D static site (no framework, no bundler, no runtime dependencies). One chosen cat survives a 10-minute night in a bounded, seeded papercraft town. Content is built as **definitions + hooks + registries**: every cat, weapon, passive, evolution, enemy, prop, reaction, landmark and biome is a def file plus an art file, registered with one line in an index. The generic simulation and renderer look content up by id.

Before you start, read `HANDOFF.md` and `PLAN.md` (Chinese; the current requirements) and `.kiro/steering/*.md`. `docs/archive/` is obsolete history.

## Layers and import rules

```
src/engine/    content-agnostic: registry.ts (createRegistry), events.ts (createEventBus),
               sprite.ts (cachedSprite, LRU 256). Imports nothing from game/defs/render/ui/content.
src/defs/      content. types.ts (all def interfaces), registries.ts (empty registries + SIM_EVENTS),
               index.ts (registers sim defs, gates hooks), world-index.ts (materials, reactions,
               props, landmarks, biomes; also imported by world-gen), plus data modules
               progression.ts, horde.ts, materials.ts, fire.ts and one folder or file per def.
               Sim def files import defs/types, other defs and low-level game helpers (game/types,
               rng, collision, scenery, world-gen); never game/sim.ts, the facades or render.
               Art files (art.ts / <id>.art.ts) sit beside their defs, import render helpers and may
               read pure helpers from game/sim.ts or the facades (enemyRadius, playerStats).
src/game/      generic DOM-free simulation: sim.ts (createSim, step, snapshot), props.ts (reactions,
               fire), stats.ts (playerStats fold), world-gen.ts (pure seeded world), interactions.ts,
               types.ts (SimState, STATS, EFFECT_LIFE, FX_CAP, EffectKind, Notice). Facades
               characters.ts, upgrades.ts, enemies.ts keep the old export names. No per-cat literals.
src/render/    Canvas drawing. art-registry.ts (art interfaces and registries), art-index.ts
               (registers every art entry; the sim never imports it), paper-kit.ts, prop-kit.ts,
               variants.ts, craft-*.ts, world.ts, gallery.ts, timeline.ts. Reads SimState, never
               mutates it, never uses the sim RNG.
src/ui/        DOM UI: hud.ts, upgrade-cards.ts, character-panel.ts, journal.ts, gallery-layout.ts
               (pure, tested), touch.ts, ink.ts.
src/content/   i18n: keys.ts (MESSAGE_KEYS), en.ts, zh.ts, i18n.ts (t, missingKeys).
src/audio/     sfx.ts, synthesized Web Audio cues; main.ts plays them from diffs of sim counters.
src/cats/      Meow Wall official head data (meow-wall-art.ts CAT_VARIANTS, keyed by cat id).
src/main.ts    boot, screens, camera, render loop, prefs, ?start=1 / ?seed=N / ?gallery=1.
```

Rules of thumb: `engine` imports nothing of ours. `defs` and `game` share types and helpers, but the sim (`game/` plus sim def files) never imports `render`, `ui`, `content`, art files or the DOM. `render` and `ui` read defs and SimState; only `render/art-index.ts` imports art files. A test (`tests/registry.test.mjs`) fails if `src/engine` imports any other layer, if `src/game/*.ts` names a cat id literal, or if non-legacy `src/render`, `src/ui` or `main.ts` name a cat id literal.

## Hard constraints

- **One art style: papercraft / cut paper.** No pixel mode, no style toggle. Legacy `render/scene.ts`, `layout.ts`, `pixel.ts`, `pixel-art.ts`, `cast.ts` are code dependencies; do not delete them blindly.
- **Everything is drawn by Canvas code.** No images, sprites, textures, CSS `url()` or data URIs, no audio files. Offscreen canvases may cache procedural drawing (`cachedSprite`). The user's reference image is an art target only.
- **Pick one cat.** Zero (male) or Nicole (female); only the chosen cat is in a run, never a companion. Random helper cats are not built; ask the user first.
- **Distinct kits.** Zero: meow-bolt, mirror dash decoy, empowered fire, night-claw, long-shadow, Echo Legion = max meow-bolt + long-shadow. Nicole: moon-stars, fold-moon field and shields, rescue shield, star-fall, deep-fold, moon-shield, Full Moon = max moon-stars + deep-fold. Evolutions only on opening a chest.
- **i18n.** Every user-facing string goes through `t(locale, key)`. Add each key to `src/content/keys.ts`, `en.ts` and `zh.ts`. `zh` stays the default; ask before removing the Chinese pack.
- **Deterministic sim.** Randomness only from the `Rng` the sim passes to `WeaponDef.step` and `EnemyBehaviour.steer`. World content is a pure hash (`hash2` in world-gen). Fire spread uses `hash2`, never the step RNG. Registration order is behaviour: append new defs at the end of a list unless you mean to change order.
- **Gameplay numbers live in def files** (`src/defs/...`), not in render or UI code. Presentation timing lives in `src/render/timeline.ts`.
- **Files and git.** Delete with `trash` (git-tracked files may use `git rm`). Commit locally with gitmoji + type prefix (`✨ feat: ...`, `🐛 fix: ...`, `♻ refactor: ...`, `📝 docs: ...`). Never push, never change git config, never commit `.agents/` or `output/`.
- **Honesty.** Build and tests passing do not mean the art is approved. Never claim the art is final or the entry finished. Say plainly what was not viewed in a browser, not heard, or not profiled.

## Verification routine

1. `npm run build` (tsc to `dist/`).
2. `npm test` (`tsc && node --test tests/*.test.mjs`; tests import from `dist/`).
3. At most one static screenshot for art changes (`npm start` serves port 4173; check `lsof -i :4173` first). The sandbox has blocked Playwright and headless Chromium; if it fails, skip it and say so.
4. No animation or video-recording checks unless the user asks.

Details: [references/testing-and-verification.md](references/testing-and-verification.md).

## Recipes

| Task | Recipe |
| --- | --- |
| Add a cat | [references/add-cat.md](references/add-cat.md) |
| Add a weapon, passive or evolution | [references/add-weapon-passive-evolution.md](references/add-weapon-passive-evolution.md) |
| Add an enemy or behaviour | [references/add-enemy.md](references/add-enemy.md) |
| Add a prop, material or reaction row | [references/add-prop-and-reaction.md](references/add-prop-and-reaction.md) |
| Add a landmark or district biome | [references/add-landmark-biome.md](references/add-landmark-biome.md) |
| Add or change strings | [references/i18n.md](references/i18n.md) |
| Draw art with the paper kit, check it in the gallery | [references/paper-kit-and-gallery.md](references/paper-kit-and-gallery.md) |
| Build, test, probes, screenshot, commit | [references/testing-and-verification.md](references/testing-and-verification.md) |

## Quick map of "where does X go"

| Thing | Def (sim) | Art (render) | Register in | i18n keys |
| --- | --- | --- | --- | --- |
| Cat | `src/defs/cats/<id>/{stats,def}.ts` | `src/defs/cats/<id>/art.ts` | `CATS` list in `src/defs/index.ts`; `CAT_ART` in `src/render/art-index.ts` | `<id>.*`, `cat.<id>.choice`, `notice.<skill>` |
| Weapon / evolved weapon | `src/defs/weapons/<id>.ts` | `src/defs/weapons/<id>.art.ts` | `WEAPON_DEFS` list; `WEAPON_ART` list | `upgrade.<id>.name/.desc` |
| Passive | `src/defs/passives/<id>.ts` | `src/defs/passives/<id>.art.ts` | `PASSIVE_DEFS` list; `PASSIVE_ART` list | `upgrade.<id>.name/.desc` |
| Evolution rule | `src/defs/evolutions/<id>.ts` | (icon from the evolved weapon art) | `EVOLUTION_DEFS` list | `notice.<notice>` |
| Enemy | `src/defs/enemies/<id>/def.ts` | `src/defs/enemies/<id>/art.ts` | `ENEMY_DEFS` list; `ENEMY_ART` list | `enemy.<id>.name` |
| Behaviour | `src/defs/enemies/behaviours.ts` | none | `BEHAVIOURS` list | none |
| Material / reaction | `src/defs/materials.ts`, `src/defs/reactions/<id>.ts` | none | `src/defs/world-index.ts` | none |
| Prop | `src/defs/props/<id>/def.ts` | `src/defs/props/<id>/art.ts` | `PROP_DEFS` in world-index; `PROP_ART` in art-index | `prop.<id>.name` |
| Landmark | `src/defs/landmarks/<id>/def.ts` | `src/defs/landmarks/<id>/art.ts` | `LANDMARK_DEFS` in world-index; `LANDMARK_ART` | `landmark.<id>`, `notice.found-<id>` |
| Biome | `src/defs/biomes/<id>.ts` | `src/defs/biomes/<id>.art.ts` | `BIOME_DEFS` in world-index; `BIOME_ART` | `biome.<id>.name` |

New `EffectKind` or `Notice` values are string unions in `src/game/types.ts`; extend them when a def emits a new impact kind or notice.
