# Midnight Meow handoff

LATEST LOCAL CHECKPOINT — FARM REFERENCE COMPOSITION (2026-11-21): User accepts pixel style but requires whole-screen scale/detail comparable to the supplied farm image, not isolated sprite sheets. Rebuilt the opening with a stacked red barn, cottage veranda, grounded architecture north of WORLD.playTop, framing trees, distant lake/villages/fields, mature garden plots and grouped tools/logs/bales/flower boxes. Portrait logical height960; minimap lower-right on touch portrait. Shared decor bounds eliminate stone/candle/fence cropping; model-specific compact shadows replace long bars. Candles and bushes refined. Only rendering/CSS/tests/docs changed; simulation, definitions, dependencies and movement-only controls untouched.

Verification at this checkpoint: build passed; npm test430/430. Actual desktop1280×720, reference-aspect804×1000 and phone390×844 screenshots viewed. Both cats pass scripted play/upgrade/result + pause/orientation flow, keyboard/joystick checks, errors0. Gallery gloss0 and127 prop/landmark paint-bound checks clean. Evidence paths and exact findings in docs/pixel-asset-review.md. Not iPhone performance evidence or user approval. No push; published origin/main remains4fd9245. Overall goal ACTIVE: remaining generated districts/landmarks, destructible states, enemies/weapons/costumes/UI still need detailed scene review. Continue from this checkpoint, do not re-open old dash mechanics or call the whole game finished.


USER-REPORTED HOUSE GROUNDING FIX: previous internal screenshot review missed hovering cottages. Removed the extra `26 * scale` vertical lift and raised grass platform; replaced it with ground-contact stone footing/steps, adjusted bottom cache bounds and removed cottage distance-fold animation. Same-camera desktop and walking phone screenshots actually viewed; actual map cottage near/far pixels match with zero browser errors. Build + 426 tests passed. Local only; no push. Candle work paused before editing. Do not claim prior cottage art review passed user acceptance.


Latest asset follow-up: scenery pumpkin in `src/render/pixel-pumpkin.ts`, revised three times after actual screenshots. Reduced ridge noise, lifted carved eyes, darkened cavities, retained six lobes and curved stem. 1×/3× and desktop/mobile gameplay viewed; build + 426 tests passed. Local only, movement-only input unchanged; see asset review log.


Latest asset follow-up: scenery stone in `src/render/pixel-stone.ts`, revised twice to replace a pointed dark cone with a lower faceted rock and broad crown. Three palettes and actual 1×/3×/desktop/mobile images viewed. Build + 426 tests passed; no gameplay changes, no push. See the asset review log for saved evidence and remaining queue.


Latest asset follow-up: scenery fence refined in `src/render/pixel-fence.ts` with joined rails, post caps, nails, material planes and three palettes. Actual 1×/3× and desktop/mobile-near-fence screenshots inspected; browser errors 0. Build and 426 tests passed. Local only; remaining assets tracked in `docs/pixel-asset-review.md`. Movement-only controls remain unchanged.


Latest override (2026-11-21): movement only, automatic attacks. Manual dash/active skills and their controls are removed locally; dependent upgrades now affect automatic combat. Historical dash preservation and baseline-equivalence claims below do not apply to this change. This revision is not pushed.

Movement-only verification: `npm run build` and `npm test` passed (426/426). Desktop and 390×844 Chromium flows checked absent skill buttons, keyboard movement, joystick press/release and pause/resume, with zero page errors. Viewed `output/pixel-asset-review/movement-only-mobile.png`; desktop capture is alongside it. Not pushed; no iPhone performance claim. Asset detail work remains pending per the review log.


Midnight Meow is a code-drawn pixel-art survivor-like for Kiroween 2026. Read [AGENTS.md](AGENTS.md), the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md) (wash-out contract in [paper-ecology.md](.kiro/skills/midnight-meow-dev/references/paper-ecology.md)) and [PLAN.md](PLAN.md). Finished work lives in Git history, not here.

## Published play checkpoint and individual asset review (2026-11-21)

User explicitly authorized pushing the current version for playtesting, then refining assets individually with actual screenshot self-review, including sprites. Pushed `4fd924511d39b0a4173f7fe20eafecc19d459e1c` to `origin/main` and `origin/refactor/pixel-stacking`, plus the paper archive tag. Verified both remote heads; Vercel commit status succeeded and live `/dist/render/pixel-resolution.js` matched the local build SHA256. Subsequent refinement stays local while the user tries that version.

First internally reviewed batch: cottage, tree, street lantern, Zero body and Nicole body. Each has actual native/magnified and in-game captures; cats also have 12-pose sheets. Tree crown proportions, Nicole's detached dash sleeve and lantern hood checker artifacts were found in screenshots, revised and recaptured. Cottage/tree/lantern now live in separate authored model modules; official cat heads and all simulation definitions remain unchanged. Full `npm run build` + `npm test` passed (420/420); baseline gameplay comparison passed all64 states. Gallery probe reported0 gloss violations; browser alpha bounds probe reported127 nonempty in-bounds prop/landmark states. No iPhone frame-time or user art approval is claimed. Remaining assets are explicitly pending, not completed.

Follow [the per-asset review log](docs/pixel-asset-review.md). A developer-only `scripts/review-pixel-asset.mjs` captures actual 1×/magnified painters and cat pose sheets, records source base/dirty-tree metadata and browser errors. It uses externally installed Playwright, adds no runtime dependency, and writes ignored evidence into `output/pixel-asset-review/`. Don't call unfinished assets perfect or substitute test results for visual review.

## Pixel detail refinement after user rejection (2026-11-21)

User rejected `1267c23` as too coarse and asked for much finer pixel art. Current follow-up raises the native world backing and ground/decor caches from 0.5× to 1×, while keeping logical camera/input sizes. Scene/prop stacks now have finer XY and height sections, detailed architectural windows/shutters/doors, controlled foliage lighting, and fine surface fittings. Actors gain tailoring and material details; equipment icons/projectiles have distinct fine silhouettes. Ground marks are finer and quieter; overlapping road-cap strokes were removed. The earlier coarse pixel commit remains in Git.

Actual browser screenshot review drove two additional foliage/roof corrections: striped highlights were removed, then overly dark exposed canopy shells were corrected. The result still requires user art approval. Final `npm run build` and `npm test` passed (420/420); fixed-input baseline comparison passed all 64 states. Both cat browser smoke flows reached pause/resume, upgrades and results without script errors. See `docs/pixel-refactor.md` for cached raster memory tradeoffs. Final browser probes: 127 prop/landmark states with no blank sprites or cache overflow; gallery gloss violations zero. Updated desktop/mobile and five-region screenshots captured. No gameplay source or definitions changed, no push/deployment.

## Native pixel refactor (2026-11-21)

User explicitly requested full pixel-art reconstruction using `danielwh2/sprite-stacking`, with the previous version sealed first. The baseline is tagged `archive/papercraft-2026-11-21` at `d26859b`. Active work is `refactor/pixel-stacking`. Older paper-only sample gates below are historical, not the current task.

The active renderer now uses native pixel sprites, real cached horizontal slice stacks for scenery, pixel terrain in all five districts, pixel actors/costumes/enemies/Boss/townsfolk, attacks/status/wash/prop lifecycle art, and pixel title/HUD/upgrades/pause/results/gallery. There is one style, no style switch. Definitions and simulation are unchanged; original cat source data is retained. See [implementation and verification](docs/pixel-refactor.md).

`npm run build` and `npm test` passed (420/420). The frozen baseline and new build matched at all 64 full-state checkpoints (two cats, two seeds, 1800 identical inputs per run). `src/game`, `src/defs` and `package.json` have no changes. Linux Chromium screenshots were actually captured and viewed, including desktop and mobile-size gameplay, mobile title, and region fixtures. A browser pixel probe checked 127 prop/landmark states with no blank sprites or out-of-bounds drawing. These are not iPhone measurements, an entire Boss run, or user art acceptance. Both cats also completed browser smoke flows through movement, skill, pause/resume, upgrade selection and defeat/result with no script errors. No push or deployment in this batch.

## Playable paper refactor prototype (2026-11-21)

User authorized implementation and committing all work after the prototype plan. Frozen baseline: `6d1eab6`, local tag `paper-baseline-6d1eab6`. Deliverable is a playable opening/canal A/B sample; broader districts, actors and UI remain behind the requested visual/device gate, not silently expanded.

- `paper-lantern-kit.ts` supplies one faceted contour and material model for intact, torn, charred and collapsed lanterns. The lantern prop and market dressing share it. Tears are holes in the local path, not destructive compositing on the world. Broken-state hangers use the exact cord curve.
- The two opening cottages use broad card faces, return folds, exposed cores, recessed windows and contact shadows. Generic cottages elsewhere remain as before. Canal dry towpaths use broad folded layers while retaining the dry-bank identification colour and existing patch bounds. Water, roads, collider layouts and all simulation definitions are unchanged.
- Developer-only `?profile=1` panel selects dry/crowded/first-water/steady-wash/repaint, records a bounded 3600-frame ring, stops on screen/viewport/motion-setting changes and exports JSON. Main-thread CPU ranges are deliberately labelled/documented as mixed work, not GPU time or proof of a specific bottleneck. Captures include seed, character/costume, viewport/DPR, game time, player/camera position and living-enemy count.
- `node scripts/prepare-paper-comparison.mjs` builds frozen baseline and prototype with identical instrumentation into ignored `output/paper-comparison/`, with separate playable links and a version manifest. It cleans up its temporary Git worktree. `scripts/check-paper-gameplay.mjs` compares full serializable state at 64 checkpoints over two cats, two seeds and 1800 identical input steps per run. See `docs/paper-prototype-review.md` for exact commands and three alternating iPhone A/B pairs.

Verification: both A/B builds (`npm run build`) passed; the scripted comparison passed all **64 state checks**; `npm test` passed **410/410** after retaining the original dry-bank colour. New tests cover bounded profiling/statistics and lantern state restoration, absence of gloss/scene erasure, shared contour/hole winding and cord attachment. `git diff --check` passed. HTTP checks returned 200 for both playable main modules; no browser was launched.

No screenshots, iPhone frame captures or art acceptance have been obtained. The baseline/prototype package is a runnable measurement deliverable, not fabricated device evidence. No new dependencies, gameplay changes, input-speed changes or approved-head edits. This batch is authorized for local Git commit; no new push/deployment request was made.

## Paper construction art pass (2026-11-21, committed as 6d1eab6)

Follow-up: reduced-motion support now reaches the paper art through the synchronous `paper-motion.ts` scope around `drawWorld`. Nested/failed painters restore the previous setting; cached painters do not read the preference. Crane wings and orbit-star faces hold steady; cut-out pieces and fold sheets use fixed poses with the existing lifetimes; impact lips, destruction/prop scraps, status motes and wash splashes retain fades without decorative flipping, spinning or travel. Actual attack/world coordinates and simulation timing remain unchanged. This covers the paper pass, not a claim of a complete accessibility audit of every legacy effect.

Follow-up validation: `npm run build` passed; `npm test` **401/401 passed**. New tests verify nested/error preference restoration, live preference switching, preserved orbit positions and calm hit geometry with the original fade. `git diff --check` passed. No browser/device comfort assessment or performance measurement; no push/deployment. The planned entity-height shadows, persistent debris buffer, character/audio/UI expansion are not part of this follow-up.

User authorized a visual-only pass: the same game, with consistent paper thickness, reverse faces, folded planes and contact shadows before extra grain/confetti. Do not add fold-wall controls or change routes, damage, hit timing, ranges, durations or skill mechanics. Existing simulated walls/bridges remain unchanged. Approved heads remain untouched.

- `paper-rules.ts` / `paper-kit.ts`: opt-in `PAPER_STOCK` thin/sheet/card profiles and a shared unprinted reverse. Existing `piece` / `paperCut` defaults remain unchanged to preserve approved heads.
- Weapon art and `combat-fx.ts`: two-sided hinged crane wings, turning cut-paper orbit stars, a short shaving ribbon on the existing Paper Cut line and a reverse edge on Night Claw, exposed Page Fold cut-core/corner, and sample-anchored watercolor seep marks. No new weapon, simulation or registry changes.
- `craft-combat.ts`, `craft-juice.ts`: finite cached dent/hinged-lip hit response and flipping fiber-edged fragments. `paper-status-art.ts` and `wash-art.ts`: char curls, dark burn openings, damp pigment/pleats; ground wrinkles are rebuilt only with their existing mask revision.
- `craft-props.ts` / `paper-scraps.ts`: small burnt-through areas are erased only on a cached prop surface, never on the scene; tear fragments have rough pulp edges and folded reverses. Cache keys exclude time and placement.
- `craft-scene.ts`, `paper-ground.ts`, `water-art.ts`: broad tree crown folds, card wall scores/eave returns, sparse world-anchored ground pressure folds, translucent dyed-paper water planes clipped to the original shared polygons. No water/collision geometry change.

Validation: `npm run build` passed; `npm test` passed **399/399**. Added a frozen-actor hit-response/cache lifecycle test and strengthened the prop burn test to check that destructive compositing stays off the main canvas. `git diff --check` passed. Gameplay source, definitions other than `.art.ts`, input, timing, routes and cat heads are unchanged.

**Not viewed or profiled.** No browser, animation/recording, iPhone Safari or FPS check was run. These are command/geometry checks, not art approval. For user review run `npm start` and open `/?gallery=1` plus `/?start=1&seed=7`; existing local screenshot tooling, if present on the user's machine, is `node output/playwright/open-work-shot.cjs` (the ignored `output/` tools are not in this fresh checkout). No push/deployment was authorized or performed.

## Portrait gameplay (2026-11-20)

The user's iPhone screenshot showed the fight confined to a 16:9 strip, with controls in the black space above and below. At a 390 × 844 CSS viewport the old strip was only 219 px high. Runs now use the full portrait app rectangle and a proportional camera 720 world units tall. This also applies behind the pause, upgrade and result screens. The town, enemies and cats use a uniform scale. The HUD uses the device safe areas and anchors the two thumb controls at the bottom. On a browser without the Fullscreen API the fullscreen control is hidden.

The board, camera bounds, minimap, navigation tabs, cue effects and paper frame use the run's current dimensions. Simulation still uses its original spawn distances, so distant enemies can become visible entering the taller view. Coverage includes 320 × 568, 390 × 664 and 390 × 844, rotation framing, map bounds and portrait frame drawing commands. `npm run build` succeeded and `npm test` passed 393/394 on the isolated portrait release. The 600 s simulation performance test exceeded its time budget. The combined local worktree previously passed 401/401. The previous phone screenshot was the reference. The new portrait HUD, thumb reach, Safari toolbar transitions and frame time are pending device review. On the user's phone open the game at `/?start=1&seed=7` in portrait, then rotate mid-run. The six-panel desktop art sheet does not verify this layout.

## Checkpoint (wash and lawn seam fixes, 2026-11-20, local commits only, not pushed)

The user sent a screenshot of the pushed build `b83b5f0` with two defects and asked to fix them ("改"). Commits on `main` after `b83b5f0`:

| commit | change |
| --- | --- |
| `57a1e7e` | **Washed paper.** Root cause: the pencil tile was baked ungraded (far brighter than every graded tile and sprite), its fibre was faint, open grass had almost no pencil marks, the not-yet-baked fallback was a flat `PENCIL.paper` fill and the tide line (width 3, alpha 0.42) was lighter than the ground. Fix: `PAPER_VALUE.washed` (desaturate 0.3, multiply `#a9a5b8`) applied at the end of the sketch bake; denser `rawPaper` fibre with pulp flecks (`PaperTone`); world-anchored `pencilGround` tufts and hatching; fallback draws graded fibre paper over the blot bounds; tide line `tideWidth` 6, `tideAlpha` 0.64, `tideInk` 0.7. The blob's source is wading/splashes in the fully shallow teaching basin at (1040, 420), not a water bucket; its size is intended by `WASH` (unchanged). |
| `9c8e91b` | **Hard horizontal seam.** The screenshot's seam sits at world y = 540 (the yard's fence at (759, 500), pumpkins near (862, 478), lamp (610, 447) and road lie just above it). Causes found by reading the code and a recording-mock probe of seed 7, chunks cx -1..3, cy 0..1: (C) an unbaked tile was drawn as one flat ungraded `#414538` rectangle, about 35% lighter and greener than the graded pulp, with a straight edge at the chunk border; this matches the screenshot best. (A) district sheets were hard-clipped along a coarse 15-point lawn polyline with no cut edge, a second near-straight line 36-92 units below y = 540. (B) the moss hatching was salted per tile with a density switch, so the yard and the tile below placed different marks along y = 540 (lamp pools and pulp noise were already world-anchored and continuous). Fix: a torn lawn contour (`lawnContour`, step 12, `LAWN_CUT` in `start-lawn.ts`) used by the clip, the pencil layer and a new `drawLawnEdge` (hard down-right shadow and darker card side on the lawn floor, lit rim and lip on the stock, a thin cut line, fringe-cut grass on stretches of the south edge, colours from the neighbouring district); moss on a 7-unit world grid; the bake placeholder (`groundUnderlay`) now fills graded pulp, the district stock outside the lawn at the sheet opacity, and a world-anchored fibre. No straight long edges remain at y = 540; the remaining long near-horizontal strokes in the probe are the cut edges of `ruled`/furrow district sheets (with their own shadow, rim and lip). |
| docs commit | This checkpoint, stated test counts, paper-ecology wash look numbers. |

Verification: `npm run build` ok, `npm test` **391 / 391 pass** (382 at `b83b5f0`; 4 new cases in `paper-visuals`, new suite `ground-seams` with 5 cases; each new case fails on the old code). Render-only changes: no `src/game`, `src/defs` or RNG change; `src/cats/` untouched.

**Not viewed.** Nothing was opened in a browser; no screenshot, animation or frame-time check. The new washed paper, tide line, lawn cut edge and bake placeholder are unapproved art. Reproduce on your machine: `/?start=1&seed=7`, stand still or walk right to the pond east of the yard (it washes out within seconds); for the seam, walk straight south out of the start yard down the road and look at the lawn's lower edge and the tiles below it. Or run `node output/playwright/open-work-shot.cjs`.

## Checkpoint (costumes round, 2026-11-19, local commits only, not pushed)

The user's answers: the meme cats are **costumes** ("就是 服装") that the chosen cat (Zero or Nicole) wears, so the single-cat rule stays; build all 14 ("都做"); cats only, distilled into a reusable workshop ("猫，而且要提炼成工坊"). A = b: the "workshop" is a production recipe in the dev skill ([add-costume.md](.kiro/skills/midnight-meow-dev/references/add-costume.md)), not an in-game screen. B = b: each costume carries one small auto skill adapted from that character's old assist idea; both cats' kits stay; balance re-tuned. C: costumes are unlocked by play (not all available at the start), and the head may get makeup the way Meow Wall did it (skin/markings, expression, accessories as layered overlays), drawn as a separate cached layer over the untouched approved head (`2d8b25e`); `src/cats/` is unchanged. Random helper cats as separate characters remain not built. No human faces, no real logos or trademarks. Player-facing names are cat nicknames without real names (an agent choice, open below).

Commits on `main` after `0599dec`:

| commit | change |
| --- | --- |
| `9439d52` | Framework: `CostumeDef` / `CostumeUnlock` / `CostumeSkill`, `COSTUME_DEFS` registered last, `SimConfig.costume`, `SimState.costume` (absent on a plain run), `stepCostume` after the auto weapons, Boss-safe primitives in `src/defs/costumes/skills.ts`, pure unlock progress in `src/game/costumes.ts`. |
| `692ef9f` | The 14 costumes (`src/defs/costumes/<id>/def.ts`: tibo, poteto, musk, jensen, karpathy, linus, guido, eich, jobs, gates, zuckerberg, hassabis, levels, dario), their skills and unlocks, a `dawn` unlock kind, 88 i18n keys in en/zh, a real-name/brand blocklist test. |
| `a48b08c` | Art: `paperFaceMakeup` makeup layer, `costume-accessories.ts` (Meow Wall accessory list as flat paper plus costume pieces), cached outfit parts for both tailorings, zone looks, gallery Wardrobe section. |
| `88bfc2c` | Wardrobe strip under the cat tickets (locked tickets cannot be chosen), prefs with costume and unlock progress, `?costume=<id>` review pin (never saved), HUD costume tag with charge, result-page unlock line. |
| `17fdbed` | Balance: jensen copy damage 0.5 → 0.6 and cap 12 → 40; jobs cooldown 28 → 20, radius 90 → 120, damage 3 → 6; musk cooldown 32 → 24, radius 60 → 130, damage 4 → 6; eich damage 1 → 2; unlocks dario kills 1800 → 1700, levels skill uses 120 → 100, zuckerberg props torn 60 → 45. |
| docs commit | This checkpoint, the workshop recipe, SKILL, steering, AGENTS and PLAN v0.19. |

Verification: `npm run build` ok, `npm test` **382 / 382 pass** (332 at the start; new suites `costumes`, `wardrobe`, new cases in `cat-art`, `gallery`, `paper-rules`, `paper-visuals`, `registry`). `git diff 2d8b25e -- src/cats/` is empty. Plain runs are unchanged: `baseline-snapshot.mjs` and `baseline-long.mjs` match the `*-pre-costumes` references byte for byte, and the plain balance matrix equals `balance-pre-costumes.json`.

Unlocks (single-night stats unless noted; hit rate over 16 plain scripted nights): tibo nights ≥ 1; poteto treats eaten ≥ 2; eich dawn ≥ 1 (counts a boss-escaped dawn); jobs wins ≥ 1; musk distance ≥ 20000 (16/16); karpathy level ≥ 20, jensen damage ≥ 2000, linus chests ≥ 5, guido elites ≥ 6, gates shards ≥ 1500, hassabis best streak ≥ 1200, zuckerberg props torn ≥ 45 (12/16 each); levels skill uses ≥ 100, dario kills ≥ 1700 (11/16).

**Costume balance** (`balance-run.mjs` with `COSTUMES=`, 4 seeds × 2 card policies × 2 cats = 16 nights per look, 240 nights; summary `balance-costumes-summary.mjs`, data `output/playwright/balance-costumes-full.json`). TTK = Boss seconds from arrival to defeat, averaged over defeats:

| look | wins Zero / 8 | wins Nicole / 8 | deaths | boss escaped | boss TTK s | costume damage share | skill uses (avg) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| plain | 6 | 1 | 5 | 4 | 45 | 0% | 0 |
| tibo | 4 | 0 | 8 | 4 | 49 | 0% | 16 |
| poteto | 2 | 0 | 9 | 5 | 30 | 0% | 14 |
| musk | 5 | 1 | 7 | 3 | 41 | 2.9% | 21 |
| jensen | 4 | 0 | 7 | 5 | 32 | 1.9% | 14 |
| karpathy | 2 | 0 | 9 | 5 | 26 | 0% | 16 |
| linus | 4 | 0 | 8 | 4 | 36 | 0% | 15 |
| guido | 5 | 1 | 5 | 5 | 38 | 0% | 16 |
| eich | 5 | 1 | 7 | 3 | 32 | 2.9% | 16 |
| jobs | 4 | 0 | 7 | 5 | 36 | 2.7% | 24 |
| gates | 4 | 0 | 9 | 3 | 43 | 0% | 18 |
| zuckerberg | 5 | 1 | 6 | 4 | 34 | 0% | 17 |
| hassabis | 3 | 1 | 7 | 5 | 38 | 0% | 15 |
| levels | 4 | 0 | 11 | 1 | 38 | 0% | 14 |
| dario | 5 | 0 | 5 | 6 | 45 | 0% | 14 |

Every look loses some nights; no costume makes the night unlosable. Poteto and karpathy (2/8 Zero wins) are mobility/pickup skills without damage; 12 extra nights on other seeds (plain 7, poteto 6, karpathy 5 Zero wins) and a no-op costume (6/8, same as plain) suggest seed noise from perturbing a chaotic deterministic run, not a weak skill. Levels' 11 deaths come from its speed pads leading the scripted bot into crowds. These were not retuned. Nicole wins 0 or 1 of 8 with every look; no costume closes her Boss-damage gap.

**Not viewed, heard or measured.** No browser can run in this sandbox, so none of the costume art, head makeup, outfits, zone looks, wardrobe UI, locked covers, HUD tag, result unlock line or mobile layout was viewed. No animation, audio or browser FPS checks. Balance numbers come from a scripted Node probe, not a human playtest. The user reviews on their own machine: `node output/playwright/open-work-shot.cjs` (that review sheet does not stage costumes yet), `/?gallery=1` (Wardrobe section, also `&check=gloss`) and `/?start=1&seed=45&costume=<id>`.

Open questions for the user:

1. **Names.** Player-facing names are cat nicknames with no real names ("Roast Sweet Potato Cat", "Night Desk Cat"); the def comments and this doc keep the source ids. Is that the naming you want?
2. **Unlock thresholds** above, and whether any costume should be free at the start (today all 14 are locked on a fresh save; tibo unlocks after the first night).
3. **The `dawn` unlock** (eich) counts a boss-escaped dawn, which is a loss. Keep or require a win?
4. **Poteto, karpathy and levels** probe results: seed noise or a real weakness? Only a playtest can tell.
5. **Nicole's Boss damage** (0 to 1 of 8 wins with every look) is still the open balance question from the design-decisions round.

## Checkpoint (design decisions, 2026-11-19, local commits only, not pushed)

The user answered the three open design questions: outrunning the Boss to dawn is not a win; a full passive bar gets a fallback; ink pinned under a Page Fold does not bite. Commits on `main` after `ca8ad06`:

| commit | change |
| --- | --- |
| `63e8928` | Dawn with the Eraser still alive ends the night as a loss. `SimState.endReason` is `'dawn' \| 'fallen' \| 'boss-escaped'` (null while playing). Beating the Boss does not end the night early. A run without a registered Boss still wins at dawn. New keys `result.heading_boss_escaped` / `result.boss_escaped`; `result.boss_left` now reads "Still loose" / "仍在游荡"; the Boss notice reads "The Eraser is coming · Wear it down before dawn" / "橡皮擦来了 · 天亮前把它磨平". |
| `6e7d657` | Evolution fallback in `readyEvolution`: the weapon at max plus either the partner passive or a full passive bar (`BUILD.passiveSlots`). Still granted only by opening a chest, never as a level-up card, once. Selector copy `evolution.rule` mentions the full bar. |
| `1d88912` | Test only: ink pinned under a Page Fold neither moves nor bites, through the shared stun skip in `stepEnemies` (the moon-lantern freeze uses the same skip). The earlier note that pinned ink still bites was a misreading. |
| docs commit | Records these rules in HANDOFF, PLAN, steering and the skill. |

Verification: `npm test` **332 / 332 pass** (327 plus 5 new cases). The new result heading, result line, Boss notice and selector copy were not viewed in a browser.

Probes (Node only, git-ignored references in `output/playwright/`, old ones kept as `*-reference-pre-decisions.txt`):

- `baseline-snapshot.mjs` and `baseline-long.mjs`: every checkpoint differs only by the new `endReason` field; kills, levels, builds and evolution timing are identical. The four long-run finals change from `won` to `lost` (`boss-escaped`), because none of those scripted runs defeats the Eraser.
- **Balance** (`balance-run.mjs`, same 16 runs, `balance-after-decisions.json` against `balance-pre-decisions.json`): wins 11/16 → 7/16 (Zero 6/8 → 6/8, Nicole 5/8 → 1/8). The 4 lost wins are Nicole runs that reached dawn with the Eraser alive (exclusive-first seed 91, brush-first seeds 45, 91, 2026); they now end `boss-escaped`. Boss defeats stay 7, and every win now defeats the Boss. Evolutions 11 → 12: brush-first Nicole seed 45 filled her bar without Deep Fold and now evolves Full Moon at 323 s through the fallback (she still loses at dawn). Every other evolution time is unchanged (265 to 375 s). No numbers were retuned; Nicole's Boss damage is the open balance question for a playtest.

## Checkpoint (open-work round, 2026-11-19, local commits only, not pushed)

Commits on `main` after `c9fee79`, in order:

| commit | change |
| --- | --- |
| `2effc4a` | Nicole in a white tee and denim. This commit (the user's own pending work, committed as found) also removed the lantern for **both** cats: `cat-detail.ts` no longer has the `lantern` part, `paintLantern`, the lamp glow or the lantern swing, `world.ts` dropped `drawGroundLight` beside the cat, and `ZERO_ART` lost `lantern: "shutter"` and `accessory: "watch-chain"` (the watch chain is still drawn inside his coat). Zero no longer carries a lantern; this was not reverted and needs the user's review. Nicole's authored face patches (crown cut into both side locks, part line, cheek patch, chin inset) were redrawn by the earlier session and are **not user-approved**. Official head data `src/cats/` is unchanged against `2d8b25e`. |
| `528c55e` | Fold protection shows for its whole 6 s (`drawFoldGuards`), cut holes have one edge, Paper Cut pieces pruned by age (`PAPER_CUT.maxOuts` 8). The cat box (±54 / −106..22) was measured unclipped in tests (part reach x ±38.9, y −75..13, also at cue zoom 1.1). |
| `20a4c81` | Page Fold lays a dry paper bridge over water from level 2 (`FOLD_BRIDGE` in `page-fold.ts`, runtime decks in `src/game/water.ts`). Fire cells never occupy a deck (`props.ts` `wetCell` ignores decks), while a burning actor on a deck counts as dry and keeps burning until it reaches water. |
| `996829e` | Neutral townsfolk: lamplighter mouse, stargazer owl, ferry frog (pure `src/game/townsfolk.ts`, cap 12, tips in en/zh). They are not cats. |
| `06d5691` | Balance: Wash Drip windup 0.7 → 0.8 s, drop speed 140 → 120 u/s. |
| `334b2da` | Audio mix table `src/audio/mix.ts`, every cue throttled, hard limiter after the compressor. |
| `decb960` | Sim speed-ups (enemy separation early-out, flat water index, wash lookups), behaviour byte-identical. |
| `3066542` | Pencil enemies use cached per-part pencil variants instead of scratch-canvas compositing. |
| `392a631` | Art pass: lighter, sparser pencil second pass and fibre; one tide line per wash edge (`WASH_LOOK.tideWidth` 3, alpha 0.42) instead of a soft band plus a dark line; the Paper Cut slit is drawn in 4 continuous bands so round caps no longer bead along it. No change to enemy art on dark ground in this commit. |
| review fixes (after `2ae1105`) | Contact knockback now passes the Page Fold decks to `resolveWaterMove` for the cat and the enemy, so a hit on a bridge no longer throws either actor about 53 units off the deck. New `paper-verbs` cases: knockback mid-deck keeps both on the deck (fails without the fix), and expiry waits for a frozen enemy over the core, then sets it on a bank. Sprite cache: the reviewer's "102 parts" was the sum of enemy radii; a dense Node sweep (8 kinds, painted plus both pencil steps, elites, hit flash, slow, stun, many ids, times and facings) caches 91 entries in the shared 256 LRU, now asserted at most 128 in `paper-visuals`. No separate cache budget was added. Scene-wide cache use with props, decor, cat and townsfolk together was not measured. Verified: `npm test` **327 / 327 pass**; `baseline-snapshot.mjs` and `baseline-long.mjs` outputs byte-identical to their references (those runs never lay a bridge). |

Verification at `392a631`: `npm run build` ok, `npm test` **325 / 325 pass** (301 at the start of the round; new suites `townsfolk`, `audio-mix`, plus new cases in `paper-verbs`, `paper-visuals`, `cat-art`, `water`, `gallery`). `git diff 2d8b25e -- src/cats/` is empty.

### Probe numbers

- **Sim step time** (`output/playwright/step-timing.mjs`, seed 7, 100 enemies, fire and water every 0.5 s, median of 3 runs): Zero 0.449 → 0.357 ms, Nicole 0.427 → 0.344 ms per step (before = `334b2da`, after = `decb960`). Older references: 0.453 / 0.418 at the round start, 0.386 / 0.352 at `e85365d`.
- **Browser frame time: not measured.** System Chrome headless crashed at launch every time in this OS sandbox (`signal=SIGABRT`, the exit-134 crash, with `kill EPERM`); the bundled `chromium_headless_shell-1248` hung until timeout.
- **Balance** (`output/playwright/balance-run.mjs`, simulated full 600 s nights, seeds 7 / 45 / 91 / 2026, two scripted card-pick policies, 16 runs). Before the Wash Drip change it dealt 60 damage against Smudge's 28 at about half the spawn share and caused 4 of 9 deaths. After: Zero wins 2/8 → 6/8, all runs 7/16 → 11/16 (under the old rule that dawn always wins; 7/16 under the design-decisions rule, see above). First chest at 69 to 110 s in every run; evolution at 265 to 375 s, or none when passive slots locked it out (fixed by the fallback); levels 16 to 18 at 5 min, 31 to 35 at 10 min; peak 92 enemies (cap 100 never hit). Page Fold 18 to 34% of Nicole's damage, Watercolour Brush 12 to 15% of Nicole's and 0 to 1% of Zero's. Paper Cut shows 0% damage only because the scripted kiting keeps Zero 145 units from ink (probe limitation, not a measured weakness). Exclusive-first Nicole dies before the Boss on 3 of 4 seeds; brush-first Nicole wins 4/4. No other numbers were changed.
- **Audio levels** (`mixTable()` envelope peaks, not perceived loudness): the loudest frequent cue is now 0.074, below the quietest event cue 0.087 (defeat was 0.128 before). Snip and fold sit in the 0.060 to 0.080 band. Nobody has listened to it.

### The single screenshot of this round

Exactly one attempt was made with `output/playwright/open-work-shot.cjs` (review sheet `output/playwright/open-work-review.html` + `open-work-stage.mjs`: six 960 × 540 panels staged from real sims on seed 45 graveyard-woods and seed 5 canal: dense encounters for both cats with 60 enemies, Wash Drips, washed patches and sketches; Nicole on a Page Fold bridge with a fold guard; Zero after a closed Paper Cut loop; a townsfolk tip tag; evolution cue-zoom peak with a worn Zero). The staging ran in Node without errors. Chrome failed at launch: `browserType.launch: Target page, context or browser has been closed`, `<process did exit: exitCode=null, signal=SIGABRT>`, `exception while trying to kill process: Error: kill EPERM`. As instructed, no retry and no other tool. **No image of this round exists.** Every art change from `2effc4a` to `392a631` (outfit, fold guards, cut holes, bridge, townsfolk, per-part pencil enemies, the `392a631` pass) is unviewed in a browser. The last real still is the earlier [graveyard combat screenshot](output/playwright/combat-readability-2026-11-18.png).

## User verdict and P0

The user rated the wash-out round "只能说凑合" (only passable). The art is **not approved**. The P0 is still that the game must look good. The approved paper heads (`2d8b25e`) stay as they are: proportions, rectangular eyewear, markings, narrow head edge. Costume makeup is only a separate layer drawn on top while a costume is worn.

## Open work

Needs the user (cannot be finished by an agent):

1. **Art approval (P0).** View this round in a browser (the review sheet above can be rendered once Chrome runs, or play `/?start=1&seed=45`). Check pencil underdrawing, tide lines, Paper Cut / Page Fold, the bridge, townsfolk next to enemies, cat wear, Nicole's redrawn face patches and both cats without their lanterns (Zero lost his shutter lantern and its ground light in `2effc4a`; decide whether to keep that or restore it). Enemy readability on graveyard ground was not changed in this round.
2. **Listen to the audio.** The new mix, the snip and fold cues and the limiter are unheard.
3. **Human playtest** on a real device, including touch controls through retry. Paper Cut and bridge use are under-sampled by the scripted probe.
4. **Design decisions: resolved** (see the design-decisions checkpoint). Dawn with a living Eraser is a loss (`boss-escaped`). A full passive bar counts in place of the missing partner passive, so a chest still evolves the maxed weapon. Ink pinned under a Page Fold deals no contact damage. Still open: whether Nicole needs more Boss damage now that 3 of her 4 brush-first dawns are losses (balance, not retuned).
5. **Costumes instead of helper cats (decided 2026-11-19).** The meme cats are 14 unlockable costumes the chosen cat wears (see the costumes checkpoint); their art, UI and balance await the user's review. Random helper cats as separate characters remain not built and would need a new go-ahead.
6. **Publishing.** All commits above are local. Push and deploy need explicit authorization (a GitHub push may trigger Vercel).
7. **Devpost copy and promotional media: not touched, the user's own work.** Agents must not draft them. Deadline 2026-12-05 06:00 Beijing time.

Blocked by the environment:

8. **Browser frame time** (p50 / p95 / max) and any screenshot: the user runs these on their own machine (`node output/playwright/frame-time.cjs`, `node output/playwright/open-work-shot.cjs`). Agents must not launch any browser in the sandbox.

## Run

Node.js 22+, Python 3 for the preview, `npm ci` if needed.

```sh
npm run build   # tsc -> dist/, static output -> site/
npm start       # serves site/ on port 4173 (check for an existing listener first)
npm test        # builds, then runs node --test tests/*.test.mjs
```

- `http://localhost:4173/?start=1` starts a run with the saved cat; add `&seed=N` (or `?seed=N`) to pin the seed.
- `/?gallery=1` shows every registered entry; `&check=value` shows values only, `&check=gloss` flags gradients, blurred shadows and additive light.
- Agent verification is build plus tests. Agents must never launch Chrome, Chromium or a Playwright browser in the sandbox (each crash shows the user a macOS dialog). The user takes screenshots with `node output/playwright/open-work-shot.cjs` and measures frame time with `node output/playwright/frame-time.cjs`; agents name the command and record the art as not viewed. No animation or recording checks unless the user asks.
