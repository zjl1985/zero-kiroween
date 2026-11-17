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
- Keep official Meow Wall face data untouched (`src/cats/`). `paper-face.ts` derives cached color contours and silhouette with original overlap order, markings, holes and small facial details; world cats and portraits use those paper cuts at the existing anchors with a narrow rim. Do not redraw a substitute face or return to a pixel mode.
- Fix shape design before adding more decoration. Uniform noise, plain geometric blocks and more props do not replace good shapes.

## Paper kit

- Build new pieces with `paperCut(ctx, shape, options)` from `src/render/paper-kit.ts` (cut edge, thickness, optional `layers`, `stitch`, `fold` creases, `wear`, `ground` contact shadow), plus `paperStack`, `foldLine`, `stitchAlong`, `charEdge`, `tornEdge` and `warmGlow`. Lower-level helpers (`piece`, `shadow`, `oval`, `box`, `path`, `glow`) are in `paper-material.ts`.
- Props paint their intact look once and get damaged and scraps phases from `phasedPaint` in `src/render/prop-kit.ts`.
- Vary repeated pieces with `variant(seed, base)` from `src/render/variants.ts` (palette pick, scale, tilt, wear, mirror). Seeds come from world-gen or render hashes; never `Math.random` or the sim RNG.
- Painters behind `cachedSprite` must be pure functions of their cache key.
- The `?gallery=1` page shows every registered cat, enemy, prop (five base preview states), landmark, biome, weapon and passive. Runtime ink/fold/regrowth and actor statuses are not automatically all covered by those previews; never treat gallery coverage as gameplay review.
- Recipes: `.kiro/skills/midnight-meow-dev/references/paper-kit-and-gallery.md`.

## Ecology and combat presentation

- The user required the remaining art/interactions and paper actors burning/water extinguishing. Do not restore the old harmless-fire presentation. `paper-status-art.ts` draws distinct carried flame/char and damp drop/ripple overlays after actual actor art, never on decoys or over identifying eyes; steam, ink-wash, regrow and reward cues are distinct.
- `water-art.ts` must use the exact shared shore/core/crossing polygons: pale shallow access, dark blocked core, explicit dry decks after roads. No independent jittered/smoothed water collision outline. The start teaching basin at (1040, 420) is fully shallow.
- Ground fire marks the actual 24-unit cell squares; flames only come from positive live cells. Prop ink stays inside the cut alpha, fold reuses the cut, and regrowth is an anticipation cue until the sim restores the prop. Deferred folds remain folded while collider restoration waits.
- Enemy facets, bat wings, crumple valleys, smudge layers and Eraser sleeve; combat cranes, stars, flecks and open rings use finite cached cuts with live transforms. Preserve negative space, threat silhouettes and telegraphs; no time/actor-id texture keys or claimed FPS gain without measurement.
- Activity progress uses shared sim court anchors. Windmill tower cache excludes sails; `DecorPiece.live` draws one cached rotor in the same depth/pop-up transform, reading sim-owned `turn`. Tall building occlusion uses registered bounds, not a special-case id list.
- Complete source/timing/lifecycle contracts: `.kiro/skills/midnight-meow-dev/references/paper-ecology.md`.

## Review

- At most one static screenshot for authorized art verification; no animation or recording checks. Latest evidence: `output/playwright/paper-ecology-review.png` was captured and viewed using system Chrome (not missing bundled Chromium). It shows selected art only; full gameplay screen/mobile remain unreviewed.
- Latest verification: build and 237 passing tests. Geometry/Canvas-command checks do not prove browser pixels, motion or speed. No animation, recording, audio or FPS checks were performed; balance and performance remain open.
- Do not report the art as approved; only the user can accept it.
