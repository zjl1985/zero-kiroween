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
- Keep the Meow Wall face identifiers for Zero and Nicole (`src/cats/`).
- Fix shape design before adding more decoration. Uniform noise, plain geometric blocks and more props do not replace good shapes.

## Paper kit

- Build new pieces with `paperCut(ctx, shape, options)` from `src/render/paper-kit.ts` (cut edge, thickness, optional `layers`, `stitch`, `fold` creases, `wear`, `ground` contact shadow), plus `paperStack`, `foldLine`, `stitchAlong`, `charEdge`, `tornEdge` and `warmGlow`. Lower-level helpers (`piece`, `shadow`, `oval`, `box`, `path`, `glow`) are in `paper-material.ts`.
- Props paint their intact look once and get damaged and scraps phases from `phasedPaint` in `src/render/prop-kit.ts`.
- Vary repeated pieces with `variant(seed, base)` from `src/render/variants.ts` (palette pick, scale, tilt, wear, mirror). Seeds come from world-gen or render hashes; never `Math.random` or the sim RNG.
- Painters behind `cachedSprite` must be pure functions of their cache key.
- Check new art on the `?gallery=1` page, which shows every registered cat, enemy, prop (all five states), landmark, biome, weapon and passive.
- Recipes: `.kiro/skills/midnight-meow-dev/references/paper-kit-and-gallery.md`.

## Review

- Judge art changes from a real running screenshot when one is possible (`npm run build`, `npm start`, `/?start=1` or `/?gallery=1`), at most one static screenshot per change. No animation or recording checks for now. The sandbox has blocked headless browsers; if so, say no screenshot was taken.
- Do not report the art as approved; only the user can accept it.
