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
- **i18n stays in place.** Every user-facing string goes through `t()`. `en` is the default for new sessions and both packs are complete. Saved language choices are respected; ask the user before removing the Chinese pack or the toggle.
- **The paper ecology is gameplay.** The user explicitly requested the remaining art/interaction gaps and paper actors igniting on fire, with water extinguishing them. This supersedes the old fire-never-hurts-cat rule and deferred ink/fold, regrowth, windmill and water-collision work. Both cats and enemies carry fire; normal shields/invulnerability still apply to the cat. Never restore blanket cat fire immunity.

## Current priority

1. Make the game competition grade. The user confirmed the older Vercel version works, requested finer characters/scenes, then explicitly required the art and interaction gaps. Code now includes official-data-derived paper faces, refined enemy/combat cuts and status overlays; shared shallow/deep water and dry crossings; actor fire/wetness; ink/fold sources and treatments; safe flora regrowth; 17 props, 23 reaction rows; four landmark activities including a live windmill rotor. The previous clothing/scenery refinements, five districts and 12 landmark kinds across 24 sites remain. These are implemented contracts, not approved art. Next comes full gameplay/mobile and user review, then authorized browser playtest/balance and performance work (the earlier idle Nicole probe could not finish the Eraser; Boss/dawn policy still needs the user's decision).
2. Extend content through the `midnight-meow-dev` skill (`.kiro/skills/midnight-meow-dev/`): one def file plus one art file and one registry line per entry.
3. Effects may borrow ideas from [Snapblocks](https://www.snapblocks.site/), a paid React library. Rebuild ideas from its public descriptions in Canvas / CSS only; never copy its code. Event rhythm (anticipation, reveal, burst, settle) follows ideas from [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), rebuilt in Canvas / CSS.
4. Keep polishing the papercraft art toward the reference (paper fiber, cut-edge thickness, contact shadows, folds, stitching, warm windows, autumn trees, a curved road, a large moon). The UI must keep its own journal identity and not copy Tibo Dog, which is a spatial reference only.
5. Verify with `npm run build` and `npm test`, plus at most one static screenshot. **Do not run animation or video-recording verification** unless the user asks again. The user finds heavy checking excessive.
6. Later: publish the latest refinements and complete Devpost submission (English default is implemented) before 2026-12-05 06:00 Beijing time. The previous version is already deployed according to the user. Random helper cats are not built; confirm with the user before starting them.

## Implemented ecology at a glance

- Water uses the same pure polygons in art and physics: shallow speed x0.68, blocked deep core, visible dry bridge/road crossings, swept movement. The fully shallow teaching basin is at (1040, 420).
- Cats take 1 HP per 1 s through the normal damage path; enemies take 0.4 per 0.2 s. Radius fire contact refreshes 3 s carried burn; water extinguishes before burn ticks and grants 1.25 s wet protection. Fire remains capped at 40 cells and cannot occupy exposed water.
- Ink coats props fireproof for 9 s; fold gives 5 s reversible passage without damage/loot. Nicole and crane launches supply fold, smudge landings/vats supply ink. Card and cloth now burn (0.45/0.65 flammability).
- Only five flora props regrow (18–32 s torn, 30–46 s burnt); occupancy/fire defers restoration, lifetime loot claims prevent farming. Handcrafted props stay destroyed.
- Teahouse heals; fold-powered greenhouse schedules safe renewal and drops a treat; observatory freezes nearby enemies and drops shards (not map reveal); wind-powered windmill pulses and boosts its cached live rotor. Court charge/cooldowns are per-site sim state.
- Full contracts and source pointers: `.kiro/skills/midnight-meow-dev/references/paper-ecology.md`.

## Honesty rules

- Passing a build or tests does not mean the user approved the art.
- Never claim the art is final or the entry is finished.
- Latest verification: `npm run build && npm test` passed **237 tests**. One static screenshot was captured and viewed at `output/playwright/paper-ecology-review.png` using **system Chrome**, not missing bundled Chromium. It shows selected art only, not the full gameplay screen or mobile layout.
- No animation, recording, audio or FPS checks were performed. Balance and roughly-100-enemy performance remain unmeasured for this work, and the user has not approved the art. The older deployed version was viewed by the user; neither “nobody has seen anything” nor “the latest game is approved/deployed” is accurate. Build/command-recording tests and one still are not full visual acceptance.
