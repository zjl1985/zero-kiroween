# Draw art with the paper kit and check it in the gallery

All art is Canvas code in the single papercraft style. No images, sprites, textures, CSS `url()` or data URIs. Every paper piece needs a cut edge, visible thickness and a contact shadow. Read `.kiro/steering/papercraft-art.md` before changing art. Only the user can approve art.

## Building blocks

Low level, `src/render/paper-material.ts` (`Ctx`, `Point` types):

- `path(points, smooth?)`, `oval(x, y, rx, ry, seed?, rough?)`, `box(x, y, w, h, seed?)`: rough-cut shapes as `Path2D`.
- `piece(ctx, p, color, { shadow, edge, texture, thickness })`: one paper piece with drop shadow, cut edge and fibre.
- `shadow(ctx, x, y, rx, ry)`: contact shadow on the ground. `glow(ctx, x, y, r, color, strength?, flat?)`. `stitch(ctx, p, color?, alpha?)`, `stroke(...)`, `line(...)`, `mix(a, b, k)`, `hash(n)`.

Composable, `src/render/paper-kit.ts`:

- `paperCut(ctx, shape, options)`: the main primitive. `shape` is a `Path2D`, a `Point[]` or a `(p: Path2D) => void` builder. Options (`PaperCutOptions`): `color` (required), `thickness`, `layers` (stacked sheets under it), `stitch` (true or a colour), `stitchInset`, `fold` (one or more `PaperFold { from, to, depth?, side? }` creases), `wear` (0..1 scuffed edge), `shadow`, `ground` (`{ x, y, rx, ry }` contact shadow), `edge`, `texture`, `seed`. Returns the `Path2D`.
- `paperStack(ctx, layers)`: `PaperLayer[]` glued back to front.
- `foldLine(ctx, x0, y0, x1, y1, strength?)`: a crease with a pale lip.
- `stitchAlong(ctx, shape, color?, alpha?, inset?)`: dashed thread inside an outline.
- `charEdge(ctx, shape, amount?, seed?)`: burnt rim. `tornEdge(ax, ay, bx, by, teeth, depth, seed)`: jagged torn points. `warmGlow(ctx, x, y, r, strength?, color?)`: lamp or window light.
- `toPath(shape)`, `insetPoints(points, inset)`.

Props, `src/render/prop-kit.ts`: `phasedPaint(look)` builds a `PropArt.paint` for all three phases from one intact painter (damaged = intact clipped below a seeded torn line plus scraps; scraps = torn stubs or ash). `post(ctx, x, y0, y1, w, color, seed?)` draws a paper post. Scrap helpers in `src/render/paper-scraps.ts` (`scrapPieces`, `ashPatch`, `tornStub`).

Seeded looks, `src/render/variants.ts`: `variant(seed, { palette, shift?, scale?, angle?, wear?, flip? })` returns `{ index, color, scale, angle, wear, flip }`, deterministic per seed. It uses the render-only `visHash` (`src/render/hash.ts`), never `Math.random` (tested). Props also get a per-placement size / tilt / mirror from their world seed (`PropArt.look`, default `PROP_LOOK`).

Caching, `src/engine/sprite.ts`: `cachedSprite(key, w, h, scale, paint, anchor?)` caches a painter on an offscreen canvas (LRU, `SPRITE_CACHE_LIMIT` 256). In Node (no DOM) it calls the painter directly. Painters behind a cache must be pure functions of their key. `src/render/sprite-tint.ts` caches `source-atop` tints on the sprite's own alpha, never on the scene; tint amounts must be fixed or quantized to avoid per-frame cache keys. Burning props use a brown tint; folding decor uses eight shade intervals.

## Rules for painters

- Read `SimState` only; never mutate it and never call the sim RNG. Use `hash`, `visHash` or `variant` with world-gen seeds.
- Cold night tones against warm lamp and window light; keep cats, ink and danger readable.
- Ground details come in clusters; houses have wall and roof volume; tree crowns are grouped leaf clusters.
- Fix shape design before adding decoration. Noise over flat shapes does not count as paper.
- Keep the official source data untouched. At the user’s explicit request, active heads now use authored curved silhouettes and identity patches from `CatArt.face`, with original palettes and recognizable eyewear/hair/chain interpreted as paper cuts. World and portrait rendering share cached cuts, old anchors and the narrow rim; source-contour helpers are reference-only.

## Ecology art contracts

- See [paper-ecology.md](paper-ecology.md) for shared status and geometry. `water-art.ts` draws the same straight polygon vertices as collision: shallow shelf, dark blocked core and explicit dry deck; never substitute rough/smoothed water outlines. Decks draw after roads.
- `paper-status-art.ts` adds carried flame/char or damp drops/ripples **after actual actor art**, excluding decoys. Keep eyes/markings readable. Steam, ink-wash, regrow and landmark-reward have distinct cached paper cues.
- `craft-props.ts` masks ink to the sprite alpha, folds the existing cut and shows regrowth anticipation without restoring intact art early. A fold remains drawn while `foldedUntil` exists, including occupancy deferral. Ground fire marks real 24-unit squares and draws flames only for positive live cells, not ash or stale `burnAt` alone.
- Enemy facets, wing parts and sleeves, and combat cranes/stars/flecks/open rings use finite cached pieces with live transforms. Do not key textured sprites by actor id, time or continuous angle; tests sample static times but do not establish motion quality or FPS.
- Activity marks use shared court anchors and sim progress/cooldown. Windmill's cached tower contains no sails; `DecorPiece.live` draws one rotating three-variant cached rotor with the body's depth/pop-up transform. Tall-building occlusion follows registered bounds rather than a historical id list.

## Minimal example

```ts
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { mix, shadow, type Ctx, type Point } from "../../../render/paper-material.js";
import { variant } from "../../../render/variants.js";

function signBoard(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: ["#a8825a", "#9a7650"], wear: [0.1, 0.5] });
  shadow(ctx, 0, 2, 16, 4);
  const board: Point[] = [[-14, -30], [14, -30], [14, -14], [-14, -14]];
  paperCut(ctx, board, {
    color: look.color,
    layers: 1,
    wear: look.wear,
    seed: v,
    fold: { from: [0, -30], to: [0, -14], depth: 0.25 },
  });
  stitchAlong(ctx, board, mix(look.color, "#f2d9a4", 0.5));
  foldLine(ctx, -14, -22, 14, -22, 0.4);
  warmGlow(ctx, 10, -34, 12, 0.2);
}
```

## The gallery page (`?gallery=1`)

`http://localhost:4173/?gallery=1` shows every registered entry on night-paper cards, without a sim, audio or game loop. It repaints on resize and on the language button.

- `src/ui/gallery-layout.ts` (pure, Node-safe, tested): `gallerySections()` builds sections from the registries in this order: cats (`idle`, `skill`), enemies (`normal`, plus `elite` when `eliteable`), props (`PROP_STATES`: `intact`, `damaged`, `scraps`, `burning`, `burnt`), landmarks (`building`), biomes (`ground`), weapons and passives (`icon`). `galleryLayout(sections, width)` returns headers and cells; `GALLERY_CELL` sets cell sizes per kind; `GALLERY_GRID` the spacing.
- `src/render/gallery.ts`: `paintGallery(canvas, locale, width, dpr)` dispatches by section kind only; it never names an id. Landmarks come from `landmarkPreview(id)` in `src/render/craft-world.ts`.
- `src/main.ts` `bootGallery()` runs instead of `boot()` when `?gallery=1`.

A newly registered cat, enemy, prop, landmark, biome, weapon or passive shows up automatically. A new content kind needs: a `GalleryKind` and states in `gallery-layout.ts`, a cell size, a painter in `gallery.ts`, `gallery.section.<name>` and `gallery.state.<state>` keys, and an update to the section count in `tests/gallery.test.mjs`.

The gallery is static (time 0, fixed seeds). Each cat's registered `skillPreview` draws its own skill pose and effect. Landmark previews build initial interaction-marker state from registered spots (including the moon lantern's starting charge), and use `craft-juice.ts` in world depth order without starting a sim or duplicating the decor bodies. A single system-Chrome screenshot at `output/playwright/paper-ecology-review.png` was captured and viewed for selected art only. It is not coverage of every gallery entry, every runtime status, the full gameplay screen or mobile layout, and the user has not approved the art. The gallery's five base prop states do not automatically include runtime ink/fold/regrowth treatments.

## Tests

`tests/gallery.test.mjs`: every registered entry gets a cell; states per kind; labels are i18n keys; cells stay inside the page and never overlap; variants are stable, spread within ranges and never call `Math.random`; `tornEdge` stays exported. `tests/registry.test.mjs`: art registries match defs and `cachedSprite` is keyed, capped and DOM-free. `tests/rendering.test.mjs` records Canvas commands to check skill dispatch, landmark markers / depth order and cached alpha-mask tinting; it does not check browser pixels or frame rate.

`tests/paper-visuals.test.mjs`, `water.test.mjs`, `cat-art.test.mjs` and `scenery-art.test.mjs` additionally check shared water vertices, official-face contours, finite caches, actor/prop status cues, court anchors and bounds. These are geometry/command checks, not browser-pixel, animation, audio or FPS validation. Latest verification: build and 237 passing tests.

## Checklist

- [ ] every piece has cut edge, thickness and contact shadow (`paperCut` / `piece` + `shadow`)
- [ ] variation through `variant` / render hashes only
- [ ] painter is pure if cached
- [ ] art registered in `src/render/art-index.ts`; visible in `?gallery=1`
- [ ] at most one static screenshot, if the environment allows; never call the art approved
