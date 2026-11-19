---
name: midnight-meow-dev
description: Development workflow for Midnight Meow (猫猫守夜), the papercraft survivor-like browser game in this repo. Use it when adding or changing cats, weapons, passives, evolutions, enemies, props, reactions, landmarks, biomes, i18n strings or code-drawn art, or when verifying and committing a change.
---

# Midnight Meow development

Midnight Meow is a TypeScript + Canvas 2D static site (no framework, no bundler, no runtime dependencies). One chosen cat survives a 10-minute night in a bounded, seeded papercraft town. Content is built as **definitions + hooks + registries**: every cat, weapon, passive, evolution, enemy, prop, reaction, landmark and biome is a def file plus an art file, registered with one line in an index. The generic simulation and renderer look content up by id.

Before you start, read `HANDOFF.md`, `PLAN.md` and `.kiro/steering/*.md`. `docs/archive/` is obsolete history. The latest user requirement explicitly includes the art/interaction gaps and paper actors igniting with water extinguishing them; it supersedes old fire-safe-cat rules and deferred ecology gaps. See [references/paper-ecology.md](references/paper-ecology.md) for the implemented contracts.

## Layers and import rules

```
src/engine/    content-agnostic: registry.ts (createRegistry), events.ts (createEventBus),
               sprite.ts (cachedSprite, LRU 256). Imports nothing from game/defs/render/ui/content.
src/defs/      content. types.ts (all def interfaces), registries.ts (empty registries + SIM_EVENTS),
               index.ts (registers sim defs, gates hooks), world-index.ts (materials, reactions,
               props, landmarks, biomes; also imported by world-gen), plus data modules
               progression.ts, horde.ts, materials.ts, fire.ts, water.ts, wash.ts, ecology.ts,
               landmark-activities.ts and one folder or file per def.
               Sim def files import defs/types, other defs and low-level game helpers (game/types,
               rng, collision, scenery, world-gen); never game/sim.ts, the facades or render.
               Art files (art.ts / <id>.art.ts) sit beside their defs, import render helpers and may
               read pure helpers from game/sim.ts or the facades (enemyRadius, playerStats).
src/game/      generic DOM-free simulation: sim.ts (createSim, step, snapshot), props.ts (reactions,
               fire/lifecycle), paper-status.ts, water.ts, wash.ts, landmark-actions.ts,
               stats.ts (playerStats fold), world-gen.ts (pure seeded world), interactions.ts,
               types.ts (SimState, STATS, EFFECT_LIFE, FX_CAP, EffectKind, Notice). Facades
               characters.ts, upgrades.ts, enemies.ts keep the old export names. No per-cat literals.
src/render/    Canvas drawing. art-registry.ts (art interfaces and registries), art-index.ts
               (registers every art entry; the sim never imports it), paper-kit.ts, paper-rules.ts,
               paper-value.ts, prop-kit.ts, paper-face.ts, paper-status-art.ts, water-art.ts,
               wash-art.ts, pencil.ts, sprite-sketch.ts, variants.ts, craft-*.ts,
               world.ts, gallery.ts, timeline.ts. Reads SimState, never
               mutates it, never uses the sim RNG.
src/ui/        DOM UI: hud.ts, upgrade-cards.ts, character-panel.ts, journal.ts, gallery-layout.ts
               (pure, tested), environment-copy.ts (localized ecology guidance), touch.ts, ink.ts.
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
- **Distinct kits.** Zero: meow-bolt, mirror dash decoy, empowered fire, night-claw, long-shadow, Echo Legion = max meow-bolt + long-shadow. Nicole: moon-stars, fold-moon field and shields, rescue shield, star-fall, deep-fold, moon-shield, Full Moon = max moon-stars + deep-fold. Evolutions only on opening a chest; a full passive bar (`BUILD.passiveSlots`) counts in place of the missing partner passive. Dawn wins only if the Eraser was defeated; dawn with the Boss alive is a loss (`endReason` `'boss-escaped'`).
- **i18n.** Every user-facing string goes through `t(locale, key)`. Add each key to `src/content/keys.ts`, `en.ts` and `zh.ts`. `en` is the default for new sessions; retain saved locale choices and ask before removing the Chinese pack.
- **Deterministic sim.** Randomness only from the `Rng` the sim passes to `WeaponDef.step` and `EnemyBehaviour.steer`. World content is a pure hash (`hash2` in world-gen). Fire spread uses `hash2`, never the step RNG. Registration order is behaviour: append new defs at the end of a list unless you mean to change order.
- **Gameplay numbers live in def files** (`src/defs/...`), not in render or UI code. Presentation timing lives in `src/render/timeline.ts`.
- **Paper ecology.** Cats and enemies carry fire; water extinguishes before burn damage and grants temporary wet protection. Shared water polygons govern art/collision, and fold/regrowth must not restore occupied colliders or reset lifetime loot claims. Ink/fold sources, 18 props, 27 reaction rows and four landmark activities are implemented, not deferred.
- **Wash-out and paper verbs.** Water lifts colour off a sparse 32-unit grid (`SimState.wash`, `src/defs/wash.ts`, `src/game/wash.ts`): painted, colourless (pencil underdrawing) or blank (Eraser). Pigment, lanterns, pumpkins, the Watercolour Brush and dawn repaint it. It is gameplay, not a style toggle, and an unwashed run must do no mask work. Zero's Paper Cut and Nicole's Page Fold are exclusive cards (`CharacterDef.exclusives` + `WeaponDef.pool`). Contracts in [references/paper-ecology.md](references/paper-ecology.md#wash-out-colour-grid).
- **Paper ruleset.** One moon light top-right, one hard shadow down-right, 1 to 3 flat layers, lit rim and dark lip (`src/render/paper-rules.ts`), and a value hierarchy with ground lowest (`paper-value.ts`). Check new art with `/?gallery=1&check=value` and `&check=gloss`. See [references/paper-kit-and-gallery.md](references/paper-kit-and-gallery.md#paper-ruleset).
- **Files and git.** Delete with `trash` (git-tracked files may use `git rm`). Only commit when explicitly authorized, locally with gitmoji + type prefix (`✨ feat: ...`, `🐛 fix: ...`, `♻ refactor: ...`, `📝 docs: ...`). Never push, never change git config, never commit `.agents/` or `output/`.
- **Honesty.** Build and tests passing do not mean the art is approved. Never claim the art is final or the entry finished. Say plainly what was not viewed in a browser, not heard, or not profiled.

## Verification routine

1. `npm run build` (tsc to `dist/`, then isolated static output to `site/`; Node.js 22+).
2. `npm test` (`npm run build && node --test tests/*.test.mjs`; tests import from `dist/` and inspect `site/`).
3. Never launch Chrome, Chromium or a Playwright browser in the sandbox (it aborts at launch and macOS shows the user a crash dialog). For art changes, tell the user to run `node output/playwright/open-work-shot.cjs` (screenshots) or `node output/playwright/frame-time.cjs` (frame time) on their machine, and record the art as not viewed.
4. No animation or video-recording checks unless the user asks.

Latest verification: build + **332 passing tests** at 1d88912 (the design-decisions round: boss-escaped dawn, evolution fallback, Page Fold pin; 327 at 7fe42d1; 325 after the open-work round, 2effc4a through 392a631, which added suites `townsfolk`, `audio-mix`). The new result and selector copy was not viewed in a browser. The open-work round's one allowed screenshot failed: system Chrome headless crashed at launch (SIGABRT, `kill EPERM`) in the sandbox, so no image exists. No animation, recording, audio listening or browser FPS checks; a scripted balance probe ran, but a human playtest, mobile review and user approval remain open.

Details: [references/testing-and-verification.md](references/testing-and-verification.md).

## Recipes

| Task | Recipe |
| --- | --- |
| Add a cat | [references/add-cat.md](references/add-cat.md) |
| Add a weapon, passive or evolution | [references/add-weapon-passive-evolution.md](references/add-weapon-passive-evolution.md) |
| Add an enemy or behaviour | [references/add-enemy.md](references/add-enemy.md) |
| Add a prop, material or reaction row | [references/add-prop-and-reaction.md](references/add-prop-and-reaction.md) |
| Change water, fire/status, treatments, regrowth, wash-out or landmark activities | [references/paper-ecology.md](references/paper-ecology.md) |
| Add a landmark or district biome | [references/add-landmark-biome.md](references/add-landmark-biome.md) |
| Add a townsfolk NPC | [references/add-landmark-biome.md#townsfolk-npc](references/add-landmark-biome.md#townsfolk-npc) |
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
| Townsfolk (neutral NPC, not a cat) | `src/defs/townsfolk/<id>/def.ts` (+ shared `tuning.ts`) | `src/defs/townsfolk/<id>/art.ts` | `TOWNSFOLK_DEFS` in world-index; `TOWNSFOLK_ART` | `townsfolk.<id>.name`, `townsfolk.<id>.tip.1..n` |

New `EffectKind` or `Notice` values are string unions in `src/game/types.ts`; extend them when a def emits a new impact kind or notice.
