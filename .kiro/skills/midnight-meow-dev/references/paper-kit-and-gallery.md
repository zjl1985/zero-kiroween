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

Props, `src/render/prop-kit.ts`. `phasedPaint(look)` can clip the intact prop below a seeded tear line and add scraps. A custom `damaged` painter can reveal the construction of a specific material, such as a rolled core or a corrugated flap. Scrap states use stubs or ash from `paper-scraps.ts`, and `post` gives stems and posts a cut edge.

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

## Paper ruleset

Emblems, upgrade icons and their mounts follow one shared ruleset, defined as data in `src/render/paper-rules.ts` and drawn by the flat helpers in `src/render/paper-kit.ts` (which re-exports the constants):

- **One light.** `PAPER_LIGHT` is the moon, from the top-right (`dirX 0.6, dirY -0.8`). Every layer gets a pale cut-edge rim on its top-right inner edge and a dark lip (`PAPER_EDGE.lip`) on the bottom-left.
- **One shadow.** `PAPER_SHADOW` is a hard cast shadow with a fixed offset down-right (`dx 1.1, dy 1.5` local units, `alpha 0.46`). Each layer casts it on the layers below; `lift` scales it (0 = glued flat). A thin darker card side (`PAPER_EDGE.thickness`) peeks out on the same side.
- **1 to 3 flat layers** per asset (`PAPER_LAYERS`). A layer is one colour and may hold several separate cuts (two eyes, three claws). Holes are anticlockwise subpaths (`cutHole`) inside a clockwise outline.
- **Paper fibre** overlay (`PAPER_FIBER`, multiply, clipped to the cut).
- **No gloss.** No gradients, no `shadowBlur`, no `filter: blur`, no `lighter` compositing and no specular highlight dots. Fold creases (`fold` on a layer, or `crease()`) and stitches are the allowed surface detail.

Helpers: `flatLayer(ctx, layer)`, `paperEmblem(ctx, layers)` (throws outside 1 to 3 layers), `crease(...)` (pale lip toward the moon), `placePoints(points, x, y, angle, k)` (rotate points, never the context, so the shadow keeps its direction), `starPoints`, `addPoints`, `cutHole`. Shared emblem shapes live in `src/render/upgrade-icons.ts` (`heartPath`, `boltPoints`, `CAT_HEAD`, a generic emblem head, not a character face).

```ts
icon(ctx, ink) {
  paperEmblem(ctx, [
    { shape: starPoints(22, 10, 8.5, 8, 0.52), color: "#e2a35a", lift: 0.8 },        // back burst
    { shape: boltPoints(14, 18, -0.72, 12), color: ink,                                // main cut
      fold: { from: [5, 25], to: [23, 9], depth: 0.22, side: 1 } },
    { shape: starPoints(23, 9, 4, 4, 0.42, 0), color: "#fff1c6", lift: 1.2 },         // detail
  ]);
}
```

Scope: all registered weapon and passive icons (11 weapons including the 2 evolved ones and the later Watercolour Brush, Paper Cut and Page Fold, plus 11 passives), the upgrade card emblem mount (`paintCardEmblem`, also used for the evolution seal in the chest reveal) and the HUD slot tag (`paintUpgradeIcon`). `piece` and `paperCut` keep their older soft drop shadow because the approved cat heads (`paper-face.ts`) are built from `paperCut`; do not change their defaults without the user's approval of the heads. Warm lamp/window light (`warmGlow`, `glow`) is scene lighting and stays outside emblems.

### Gallery check views (developer only)

Selected only by the URL; no button or game screen links to them, and they are not a style toggle:

- `/?gallery=1&check=value`: the finished page reduced to luminance (`grayscale(1)`), to compare actor against background value contrast.
- `/?gallery=1&check=gloss`: each cell's painter runs inside `probeGloss`, which wraps the 2D context prototypes (page and offscreen sprite canvases, with the sprite cache cleared per cell) and counts gradients, `shadowBlur > 0` and `lighter` compositing. Offending cells get a dashed red outline. Cats, enemies, props and landmarks that still use `piece`/`glow` are expected to show red until later paperization passes.

`galleryCheck(location.search)` in `src/ui/gallery-layout.ts` parses the mode (default `none`); the subtitle shows the localized `gallery.check.<mode>` text. The layout is identical in every mode. `tests/paper-rules.test.mjs` asserts the ruleset directions, the 1 to 3 layer limit, that every weapon/passive icon and mount paints without gradients, `shadowBlur`, blur filters or `lighter`, the query parsing and the probe. These are Canvas-command checks, not browser-pixel or art approval.

## The gallery page (`?gallery=1`)

`http://localhost:4173/?gallery=1` shows every registered entry on night-paper cards, without a sim, audio or game loop. It repaints on resize and on the language button.

- `src/ui/gallery-layout.ts` builds the list from the registries and computes cell bounds. Cats have idle and skill poses. Elite previews require `eliteable`. Props have intact, damaged, and scrap previews. Fire previews require a flammable material and a prop that accepts fire. `GALLERY_CELL` and `GALLERY_GRID` control sizes and spacing.
- `src/render/gallery.ts`: `paintGallery(canvas, locale, width, dpr)` dispatches by section kind only; it never names an id. Landmarks come from `landmarkPreview(id)` in `src/render/craft-world.ts`.
- `src/main.ts` `bootGallery()` runs instead of `boot()` when `?gallery=1`.

A newly registered cat, enemy, prop, landmark, biome, weapon or passive shows up automatically. Every district also gets a `wash` section row (painted / colourless pencil / erased blank / mid-transition tide line) drawn with the same pencil primitives (`src/render/pencil.ts`) and wash colours (`washLook`, `swatchBlot` in `src/render/wash-art.ts`) as the game. A new content kind needs: a `GalleryKind` and states in `gallery-layout.ts`, a cell size, a painter in `gallery.ts`, `gallery.section.<name>` and `gallery.state.<state>` keys, and an update to the section count in `tests/gallery.test.mjs`.

### Washed paper (wash-out rendering)

- Colourless cells reveal a per-chunk pencil layer (`paintSketchChunk` in `craft-world.ts`, `buildChunk(seed, cx, cy, "sketch")`), baked by the terrain worker or the budgeted fallback with the same generator, only for visible chunks that have washed cells, inside the same 14 ready-tile budget and released with the painted chunk.
- `wash-art.ts` buckets `SimState.wash` per chunk each frame (one check and nothing else when no cells are stored), builds quantised vector masks (one watercolour blot per cell, `washStep` 0..4) and rebuilds a chunk's mask only when its signature changes (`washMaskRevision`). Tide line under the pencil layer, blank paper, white cut-hole blots (none under a live Paper Cut piece), then blooms timed by `WASH_LOOK` / `washBloom` in `timeline.ts`.
- Pieces and actors on colourless cells use `sprite-sketch.ts`: cached `sketch:<sprite id>:<0.5|1>` variants for decor, props and landmark bodies, and pooled scratch canvases for live actors (at most `SKETCH_ACTORS_PER_FRAME`). Blend modes only; no canvas filter, pixel reads or gradients. Cat head art is drawn unchanged underneath the overlay.

The gallery is static (time 0, fixed seeds). Each cat's registered `skillPreview` draws its own skill pose and effect. Landmark previews build initial interaction-marker state from registered spots (including the moon lantern's starting charge), and use `craft-juice.ts` in world depth order without starting a sim or duplicating the decor bodies. The wash-out round's one allowed screenshot of this page failed (Chrome headless exit 134 in the sandbox), so nobody has viewed it. Even a successful still would not be coverage of every runtime status, the full gameplay screen or mobile layout, and the user has not approved the art. The gallery's five base prop states do not automatically include runtime ink/fold/regrowth treatments, and the washed-paper swatches are static, not live wash.

### Value hierarchy and flat shadows

- `src/render/paper-value.ts`: `gradeCanvas` lowers and greys baked ground tiles (`PAPER_VALUE.ground`) and decor/prop sprites one smaller step (`PAPER_VALUE.decor`) at bake time; `addLitRim` gives cached enemy parts (through `enemyPart`) a pale top-right cut rim; `drawWithLitRim` does the same for the live chosen cat from its finished pose (decoys skip it). New ground and decor art inherits the grade automatically.
- `withFlatShadows(fn)` in `paper-material.ts` makes `piece` / `paperCut` cast the hard down-right `PAPER_SHADOW` inside cached scenery, props, lamps and landmark ground. The approved cat heads keep the old default. `shadow()` is two flat down-right ovals, not a blur.
- Player shots are one solid colour with a dark paper outline. Only interactive pumpkins and full lanterns keep warm glows.

## Tests

`tests/gallery.test.mjs`: every registered entry gets a cell; states per kind; labels are i18n keys; cells stay inside the page and never overlap; variants are stable, spread within ranges and never call `Math.random`; `tornEdge` stays exported. `tests/registry.test.mjs`: art registries match defs and `cachedSprite` is keyed, capped and DOM-free. `tests/rendering.test.mjs` records Canvas commands to check skill dispatch, landmark markers / depth order and cached alpha-mask tinting; it does not check browser pixels or frame rate.

`tests/paper-visuals.test.mjs`, `water.test.mjs`, `cat-art.test.mjs` and `scenery-art.test.mjs` additionally check shared water vertices, official-face contours, finite caches, actor/prop status cues, court anchors and bounds; `paper-visuals` also covers the wash masks, pencil tiles, sketched sprites, effects and brush ribbon. `paper-rules.test.mjs` and `paper-value.test.mjs` cover the ruleset and value hierarchy. These are geometry/command checks, not browser-pixel, animation, audio or FPS validation. Latest verification: build and 295 passing tests.

## Checklist

- [ ] every piece has cut edge, thickness and contact shadow (`paperCut` / `piece` + `shadow`, or `flatLayer` / `flatCut` + `flatShadow` under the ruleset)
- [ ] light from the top-right, shadow down-right; no gradients, `shadowBlur`, filters or `lighter` in emblems (check `/?gallery=1&check=gloss` and `&check=value`)
- [ ] the piece still reads when sketched (colourless) and on the darker graded ground
- [ ] variation through `variant` / render hashes only
- [ ] painter is pure if cached
- [ ] art registered in `src/render/art-index.ts`; visible in `?gallery=1`
- [ ] at most one static screenshot, if the environment allows; never call the art approved
