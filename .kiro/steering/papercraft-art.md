---
inclusion: fileMatch
fileMatchPattern: ["src/render/**/*.ts", "src/defs/**/*art.ts", "styles.css", "index.html"]
---

# Papercraft art direction

Applies when editing rendering code, art files beside defs (`src/defs/**/art.ts`, `src/defs/**/<id>.art.ts`) or UI styling.

- Draw only with Canvas code. No `Image`, `<img>`, CSS `url()` textures or data-URI pictures for scenery, characters or UI. `imageSprite` in `src/engine/sprite.ts` is a capability only; nothing shipped may use it.
- Each paper piece needs a cut edge, visible thickness, a contact shadow and correct overlap. Noise laid over a flat shape is not enough.
- Trees, houses, road, grass, cats, enemies, props and UI share one material language.
- Houses need volume in walls and roof faces; tree crowns need grouped leaf clusters; ground details come in clusters, not evenly scattered.
- Cold night tones should set off warm lamp and window light. Cats, ink blobs and danger must stay readable (check this on darker district ground such as graveyard-woods).
- Keep official Meow Wall source data untouched (`src/cats/`). The user explicitly requested redrawn non-grid heads: each cat art entry supplies a curved `face.outline` and identity patches; `paper-face.ts` retains original palettes and accessory identities (gold hair/sunglasses/chain; dark hair/rectangular frames) in authored paper cuts. World heads and portraits share the same cached cuts, anchors and narrow rim. Do not restore pixel tracing as the active head design.
- Fix shape design before adding more decoration. Uniform noise, plain geometric blocks and more props do not replace good shapes.

## Paper kit

- Build new pieces with `paperCut(ctx, shape, options)` from `src/render/paper-kit.ts` (cut edge, thickness, optional `layers`, `stitch`, `fold` creases, `wear`, `ground` contact shadow), plus `paperStack`, `foldLine`, `stitchAlong`, `charEdge`, `tornEdge` and `warmGlow`. Lower-level helpers (`piece`, `shadow`, `oval`, `box`, `path`, `glow`) are in `paper-material.ts`.
- Props paint their intact look once and get damaged and scraps phases from `phasedPaint` in `src/render/prop-kit.ts`.
- Vary repeated pieces with `variant(seed, base)` from `src/render/variants.ts` (palette pick, scale, tilt, wear, mirror). Seeds come from world-gen or render hashes; never `Math.random` or the sim RNG.
- Painters behind `cachedSprite` must be pure functions of their cache key.
- The `?gallery=1` page shows every registered cat, enemy, prop (five base preview states), landmark, biome, weapon and passive. Runtime ink/fold/regrowth and actor statuses are not automatically all covered by those previews; never treat gallery coverage as gameplay review.
- Recipes: `.kiro/skills/midnight-meow-dev/references/paper-kit-and-gallery.md`.

## Paper ruleset (emblems and icons)

- Defined in `src/render/paper-rules.ts`, drawn with `flatLayer` / `paperEmblem` / `crease` from `paper-kit.ts`: one moon light from the top-right (`PAPER_LIGHT`), one hard cast shadow down-right with a fixed offset (`PAPER_SHADOW`), 1 to 3 flat paper layers per asset, a light cut-edge rim on the lit side and a dark lip bottom-left per layer, a subtle fibre overlay.
- No gradients, `shadowBlur`, blur filters, `lighter` compositing or specular highlights in emblems. Rotate points (`placePoints`), not the context, so the shadow keeps its direction.
- Applies to every weapon/passive icon, the upgrade card emblem mount and HUD slot tags (tested in `tests/paper-rules.test.mjs`). `piece`/`paperCut` defaults stay unchanged because the approved cat heads use them.
- Developer check views: `/?gallery=1&check=value` (luminance only) and `/?gallery=1&check=gloss` (red outline on cells whose painter used gradients, blurred shadows or additive light). URL only, never linked from the game UI, not a style toggle.

## Ecology and combat presentation

- The user required the remaining art/interactions and paper actors burning/water extinguishing. Do not restore the old harmless-fire presentation. `paper-status-art.ts` draws distinct carried flame/char and damp drop/ripple overlays after actual actor art, never on decoys or over identifying eyes; steam, ink-wash, regrow and reward cues are distinct.
- `water-art.ts` must use the exact shared shore/core/crossing polygons: pale shallow access, dark blocked core, explicit dry decks after roads. No independent jittered/smoothed water collision outline. The start teaching basin at (1040, 420) is fully shallow.
- Ground fire marks the actual 24-unit cell squares; flames only come from positive live cells. Prop ink stays inside the cut alpha, fold reuses the cut, and regrowth is an anticipation cue until the sim restores the prop. Deferred folds remain folded while collider restoration waits.
- Enemy facets, bat wings, crumple valleys, smudge layers and Eraser sleeve; combat cranes, stars, flecks and open rings use finite cached cuts with live transforms. Preserve negative space, threat silhouettes and telegraphs; no time/actor-id texture keys or claimed FPS gain without measurement.
- Activity progress uses shared sim court anchors. Windmill tower cache excludes sails; `DecorPiece.live` draws one cached rotor in the same depth/pop-up transform, reading sim-owned `turn`. Tall building occlusion uses registered bounds, not a special-case id list.
- Complete source/timing/lifecycle contracts: `.kiro/skills/midnight-meow-dev/references/paper-ecology.md`.

## Value hierarchy and shadows (b92920e)

- Order of brightness and contrast: baked ground lowest (`PAPER_VALUE.ground`, graded at bake time in `paper-value.ts`), plain decor and props one step up (`PAPER_VALUE.decor`), actors and shots on top, interactive pumpkins and full lanterns the brightest warm lights. Plain lamps, windows, candles and decor pumpkins have no gradient glow; lamps sit only beside roads (`lampChance` 0.22).
- Cached enemy parts (through `enemyPart`) and the live chosen cat get a pale top-right cut rim. Player shots are one solid colour on a dark paper outline, no glow.
- Cached scenery, props, lamps and landmark ground bake inside `withFlatShadows`, so `piece`/`paperCut` cast the hard down-right `PAPER_SHADOW`. The approved cat heads keep the old default. No `ctx.filter` per frame anywhere in render.

## Washed paper (wash-out)

- Three page states read from `SimState.wash`: painted (normal art), colourless (raw cream paper with a graphite pencil underdrawing of the same scene) and blank (clean paper, rubbed halo, no pencil). Washed edges get a watercolour tide line; fresh changes bloom for `WASH.bloom`. Wet cells show a wet film, fold-protected cells a translucent fold cover, Zero's cut cells white cut holes with a lifted shadow.
- Pencil art uses `pencil.ts` primitives and `sprite-sketch.ts` (blend modes only, no pixel reads or filters). Keep eyes readable on sketched actors. Lamps stay painted. The cat head is never redrawn; the sketch overlay sits on top.
- An unwashed run must look and cost exactly as before: `washFrame` returns null after one empty check.
- The gallery has a "Washed paper" section (painted, colourless, blank, tide line per district).

## Paper verbs

- Paper Cut: slit with a lit wall and dark lip, a closing guide, and a lifting, turning cut-out piece over a white hole. Page Fold: a two-sided cached flap under a live affine transform, hard shadow and crease, and a pleated accordion wall from level 3. Cat wear: cached creases, tears and tape pieces on clothing only (thresholds `CAT_WEAR` in `timeline.ts`).

## Review

- At most one static screenshot for authorized art verification; no animation or recording checks. For the wash-out round the attempt aborted (system Chrome headless exit code 134, no output) in the sandbox, so no image exists; nobody has viewed its art in a browser. Full gameplay screen/mobile remain unreviewed.
- Latest verification: build and 293 passing tests. Geometry/Canvas-command checks do not prove browser pixels, motion or speed. No animation, recording, audio or FPS checks were performed; balance and performance remain open.
- Do not report the art as approved; only the user can accept it. The user's P0 is that it must look good.
