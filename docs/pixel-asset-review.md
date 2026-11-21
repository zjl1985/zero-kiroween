# Pixel asset review log

The user rejected the coarse pixel pass and requests asset-by-asset refinement with actual screenshots, including actors. Current playable checkpoint `4fd9245` was pushed to `main` on 2026-11-21; Vercel reported success and the live native-resolution module matched the built file. Keep subsequent work local while that checkpoint is being tried.

## Review procedure

For each asset, capture the existing painter at actual world size and nearest-neighbour 3×, make a focused change, capture again, inspect both sizes, then check it in the game. Include colour variants and relevant damage/motion states. The movement-only correction removes dash poses from new reviews; older dash screenshots below are historical evidence, not current gameplay. Do not treat passing tests or a dense texture as art approval. Record remaining defects rather than marking an asset perfect.

The developer-only command is:

```sh
PIXEL_REVIEW_PLAYWRIGHT=/path/to/playwright/index.mjs \
  node scripts/review-pixel-asset.mjs scene cottage before
```

Serve the built `site/` on localhost:4175. `PIXEL_REVIEW_CHROMIUM` optionally specifies the executable. This tooling adds no runtime dependency or shipped asset. Captures and their commit/error metadata go into ignored `output/pixel-asset-review/`.

## Ordered queue

| Asset / family | Review state | Main issue / next check |
| --- | --- | --- |
| Cottage, three roof colours | Grounding corrected after user rejection; review pending | Previous internal review missed the floating turf base. Removed the extra upward offset and raised turf slab; added ground-contact stone footing/steps, enlarged the cache bottom and disabled the cottage paper-fold animation. Rechecked same-camera and phone screenshots; do not treat previous “passed” status as user approval. |
| Tree crowns and branches | Revised twice; internal screenshot review passed | Branches, leaning bark planes and angular roots; individually shaped leaf tiers. First revision rejected as uniformly round. Final 1×/2× and in-game images viewed; three palettes checked. User approval pending. |
| Street lantern | Revised twice; internal screenshot review passed | Tapered glazing, frame/rails, socket, post collars and beveled foot. First hood had per-slice checker artifacts; exposed face coverage fixed and 1×/3× recaptured. Three metal palettes checked. Final in-game screenshot viewed; user approval pending. |
| Scenery fence | Revised; internal screenshot review passed | Solid rails, exposed ends, joined post caps, side planes, nail heads and sparse grain; three timber palettes. Original dimensions and collision retained. Interactive paper-fence lifecycle remains in the registered-prop queue. |
| Scenery stone | Revised twice; internal screenshot review passed | Angular cross-sections, lower off-centre crown, broad lit/shaded faces, one crown fissure and three mineral palettes. First revision too pointed; revised silhouette checked at 1×/3× and in desktop/mobile gameplay. User approval pending. |
| Scenery pumpkin | Revised three times; internal screenshot review passed | Six real lobes, broad skin lighting, curved stem, carved eye/mouth contours and three palettes. Initial sparkling ridges rejected; eye placement and cavity contrast revised. 1×/3× and desktop/mobile captures viewed. User approval pending. |
| Candles | Revised; native/magnified and scene images viewed | Wax shoulders, drips, recessed wick, small flames and compact contact shadow. User approval pending. |
| Ground and roadside vegetation | Five-district pass viewed; further composition work remains | Crops, paving/drains, roots/ferns, reeds and flower groups; road wear and opening farm contours. Water/deck detail remains pending. |
| Zero | Revised; internal screenshot review passed | Stepped shoulders/waist, separate coat tails, curved tail, shaped sleeves/feet and four poses. 1×/3×, 12-pose sheet and phone gameplay viewed; face preserved, cat-art17/17. Dark coat remains subdued; user approval pending. |
| Nicole | Revised twice; internal screenshot review passed | Shaped tee/sleeves, denim legs/pockets/cuffs and curved tail. 1×/3×, 12-pose and mobile game images viewed; dash detached-sleeve defect found and fixed, then pose sheet recaptured. Face/glasses preserved; user approval pending. |
| Costumes | Pending | Every registered outfit must survive front/back layering and bounds |
| Enemies and Eraser | Pending | Each silhouette/material, ordinary/elite/attack/washed variants |
| Windmill landmark | Rebuilt; native/2× and seeded scene fixtures viewed | Grounded masonry tower, real pointed cap, arched door/windows, native lattice sails. Reduced Motion and supplied activity angle verified. User approval pending. |
| Observatory landmark | Rebuilt; building/instruments and scene fixtures viewed | Faceted drum, arched entry, supported dome/slit/telescope, brass armillary, chart desk and compass court. First roof speckle and chart stripes corrected; user approval pending. |
| Greenhouse landmark | Rebuilt; native/magnified and scene fixtures viewed | Divided glazing, planted benches, brick footing, continuous roof beam, climbing trellis, terracotta pots and potting bench. Flush garden approach; user approval pending. |
| Other registered props and landmarks | Pending | Fence contrast repaired; individual architecture, lifecycle detail and all cache edges still need review. |
| Weapons, passives and status effects | Pending | Distinct forms in motion and at HUD size; preserve hazard footprint |
| UI portraits/cards/HUD | Pending | Readability, deliberate spacing and consistent miniature materials |

No row in this table implies user approval or iPhone performance acceptance.

## Evidence for this reviewed batch

Local generated files (not shipped or committed):

- `scene-cottage-before.png` / `scene-cottage-after.png`
- `scene-tree-before.png` / `scene-tree-after.png` / `scene-tree-reviewed.png`
- `cat-zero-before.png` / `cat-zero-after.png` / `cat-zero-after-poses.png`
- `cat-nicole-before.png` / `cat-nicole-after-poses.png` / `cat-nicole-reviewed-poses.png`
- `scene-lamp-before.png` / `scene-lamp-after.png` / `scene-lamp-reviewed.png`
- `batch-one-game-desktop.png` / `batch-one-game-mobile.png` / `nicole-ingame-mobile.png`

All five assets were actually inspected by the root agent at native and magnified scale, then in game. Tree proportions, Nicole dash shoulder attachment and lamp hood checker artifacts required further edits and recapture. This is internal review of this batch, not a statement that the remaining asset queue is complete or that the art is perfect.

Validation for this batch: `npm run build` passed; `npm test` passed 420/420; fixed-input baseline comparison passed 64 complete-state checkpoints. `git diff --check` passed. Browser gallery gloss marks 0, errors 0; alpha-bound probe 127 states, none blank or out of bounds. No iPhone performance acceptance.

## Scenery fence follow-up

Added `pixel-fence.ts`: thicker joined rails, exposed end grain, post caps, nail heads, broad timber planes and three palettes. Model dimensions, world placement and collision are unchanged; drawing remains cached. Viewed `scene-fence-before.png`, `scene-fence-after.png`, `fence-ingame-desktop.png`, and `fence-ingame-mobile-near.png` after walking to the fence with actual keyboard input in the mobile viewport. Default phone spawn crops the side fences out, so that initial screenshot was not used as fence evidence. Browser errors: 0. `npm run build`, `npm test` (426/426) and `git diff --check` passed. Local only; not a claim of user art approval or iPhone performance. Interactive destructible paper-fence art is a separate pending item.

## Scenery stone follow-up

`pixel-stone.ts` replaces the cone-like dark silhouette with authored polygon cross-sections and exposed face colours. The first revision still looked pointed; the second lowers and widens its crown. Same footprint/model cache bounds, original placement and untouched simulation/collision. The existing sprite cache bakes the geometry; no per-frame rock generation was added. Viewed `scene-stone-before.png`, `scene-stone-after.png`, `scene-stone-reviewed.png`, `stone-ingame-desktop.png` and `stone-ingame-mobile.png`. All three mineral palettes inspected. This only covers scenery stones; registered destructible props remain pending.

Stone validation: `npm run build` passed; `npm test` passed 426/426; `git diff --check` passed; capture reported no page errors. Not pushed. No iPhone performance or user art approval claimed.

## Scenery pumpkin follow-up

`pixel-pumpkin.ts` replaces overlapping discs with a six-lobed cross-section and draws carved openings on the exposed front surface. The initial model had distracting bright ridges; these were removed. The second view revealed low, indistinct eyes; the final revision lifts them and darkens the cavity. Saved and viewed `scene-pumpkin-before.png`, `scene-pumpkin-after.png`, `scene-pumpkin-reviewed.png`, `scene-pumpkin-final.png`, `pumpkin-ingame-desktop.png` and `pumpkin-ingame-mobile.png`. Three palettes and small/large gameplay instances reviewed. Original cache dimensions, placement and collision unchanged; simulation and movement-only input untouched. This covers scenery pumpkins only, not the separate destructible-prop lifecycle.

Pumpkin validation: `npm run build`, `npm test` (426/426) and `git diff --check` passed. Browser captures reported no page errors. Local only; no iPhone performance or user art approval claimed.

## Cottage grounding correction — user-reported defect

The user rejected the hovering houses. Previous screenshot review failed to catch it. `drawPixelDecor` lifted cottages by `26 * scale` despite their model owning a ground plane; the model also carried a large raised turf slab. This combination read as a floating island. Removed the lift, replaced turf with a shallow stone footing and descending steps, disabled the generic bar shadow for cottages, and extended `craft-world.ts` bottom cache/culling bounds from 16 to 52. Cottages no longer use the legacy distance-driven paper-fold transform. Simulation, placement data, collision, and movement-only controls are untouched. Regression coverage checks all cottage variants/scales fit their declared cache bounds and approaching/leaving or Reduced Motion never changes their baked shape/position.

Saved same-camera `cottage-grounding-before-desktop.png` and `cottage-grounding-after-desktop.png`, plus actual walking phone capture `cottage-grounding-after-mobile.png`; viewed all revised gameplay captures. Candle refinement was paused before code changes to prioritize this defect. No push.

Grounding validation: `npm run build` and `npm test` passed (426/426); `git diff --check` passed. Browser fixture used an actual seeded map cottage at (-1333, 1403): near/far rendered pixels identical, decor unchanged, page errors 0; inspected `cottage-grounding-map-near-far.png`. Screenshot checks are not iPhone performance acceptance or user art approval.

## Whole-screen farm composition — user reference revision

The user's supplied farm image changes the review target: a coherent inhabited landscape with foreground, midground and distance, substantial architecture, connected garden plots and grouped furnishings. Isolated enlarged asset sheets do not demonstrate this target. Current art still requires scene-by-scene work; no competition-quality completion or reference-equivalent finish is claimed.

Implemented opening revision:

- Replaced the left opening cottage with a braced timber barn and moved the residence into the portrait composition. Both keep real ground-contact foundations. Moved only the two noninteractive yard lamps to keep them off the new roof silhouettes; interactive lantern index 3 and all interactive pumpkin positions remain unchanged.
- Authored distant hills, shore settlements and a wider lake entirely above the playable boundary. The same world coordinates are clipped per chunk; it is scenic backdrop, not a new playable water region.
- Joined the buildings to wheat/vegetable plots with subdued ground shapes and worn aprons. Added grouped logs, bales, tools and flower boxes. Crop ground continues into the southern row of chunks, painted before actual water and roads so gameplay geometry remains authoritative.
- Portrait world height is 960 (was720), retaining uniform aspect and original world movement speed. Title framing remains960×540. Roof visibility and character readability checked at390×844; portrait/landscape smoke checks and joystick press/release passed.
- Shared native scenery bounds now drive cache allocation, culling and actor occlusion. Alpha audit found clipped stone/candle edges and insufficient fence scale headroom in old bounds. All8 native scenery families are checked across6 variants and3 scales. Lamps, stones, pumpkins, trees, bushes and candles now have compact cached contact shadows instead of generic long bars.

First integrated screenshots exposed lamps on roofs, a clipped barn and an over-bright barn side; these were corrected before the revised capture. Enlarged lake initially hid all reflection groups behind the residence; one group was moved into the visible opening. These findings illustrate why full-screen inspection is mandatory. Simulation/defs/dependencies have no changes in this revision.


Further screenshot-driven corrections:

- A later placement review found that enlarged architectural footings approached the walkable north boundary. Both buildings were retreated into the scenic strip; a raster regression now checks their entire footprint ends before `WORLD.playTop`. No collider was added to disguise the mistake.
- Added a real stacked cottage veranda (posts, open rail, lean-to roof), warm inset windows and shared stone footing. Tree groups frame the houses in portrait rather than sitting outside the screen. The new barn uses exposed red timber planes and continuous braced doors.
- Mature wheat, layered cabbage and ripe tomato clusters replace sparse stick crops. Flower borders have contiguous foliage. Ground aprons now use one-pixel contour interpolation rather than large rectangle stair-steps. Native detailed candles include wax shoulders, drips, recessed wick and a tiny flame; bushes now have separate overlapping leaf crowns.
- Moved the touch portrait minimap to the lower right, opposite the joystick, so it does not cover the cottage roof. Desktop/landscape layout is preserved.

Final local verification: `npm run build` passed; `npm test` passed **430/430**. Actual Linux Chromium captures at1280×720,804×1000(reference aspect),390×844 were inspected. Movement-only desktop/phone checks passed (no active-skill buttons, keyboard/joystick release, pause/resume), and both cats traversed play/upgrade/result in the scripted browser smoke with zero page errors;844×390 rotation has no horizontal overflow. Gallery gloss marks0;127 registered prop/landmark state paints had no empty/clipped results. These are not a human ten-minute run, iPhone frame-time measurements or user art approval.

Latest evidence under `output/pixel-asset-review/`: `farm-screen-final-desktop.png`, `farm-screen-reference-aspect.png`, `farm-zero-mobile.png`, `farm-nicole-mobile.png`, `scene-candles-farm-detail.png`, `scene-bush-farm-detail.png`. Whole-screen and candle/bush native/3× images actually viewed. Local only, no push/deployment.

Remaining art target: the reference's scene richness is not yet achieved across the whole game. The southern generated terrain, broad road intersections, other districts and landmarks, destructible prop states and remaining enemy/weapon/costume/UI detail still require individual in-game review. Keep the overall goal active; this checkpoint establishes the revised farm scale and fixes grounding/cache problems, not completion of all art.

## Generated districts and scenery stability follow-up

Reviewed all five seeded district fixtures after the farm checkpoint. Replaced repeated ground line marks with distinct groups: mature farm plants, inset town paving/drains, woodland root/moss/fern seams, canal reed fans with dry bank stones, and meadow leaf/flower clusters. Placement, base palette, terrain bounds and shared water geometry remain unchanged. Road widths/routes remain identical; subdued edge contrast, intermittent cart wear and small stone flags give the existing wide routes material detail without creating extra obstacles.

Removed the remaining distance-driven pop-up transform from native trees and registered landmark pieces. Cottages already stood upright, but other scenery still inherited the paper-era squash, hinge and tinted-copy cache. Native scenery now keeps its full volume at all distances; actor occlusion, washed appearance and Reduced Motion live overlays remain. Player-triggered prop folding and combat mechanics are separate and unchanged. Updated the cache/occlusion regressions to require the same upright sprite on approach and at distance.

The farm fixture also exposed a separate apparent floating-fence defect. Browser pixel sampling confirmed complete fence geometry, but its main wood RGB135,99,78 nearly matched the farm ground RGB133,102,73, hiding its posts and lower rail. The correction adds visible structural faces and joint detail rather than changing collision or inventing a missing-geometry fix.


Verification: `npm run build` and `npm test` passed (430/430). Five seeded district browser fixtures reported unchanged simulation state and zero page errors; their images were inspected, and the final farm capture confirms both fence posts/lower rail are now visible. Actual three-second keyboard walking captures at1280×720 and390×844 were viewed, including nearby automatic-combat enemies. Gallery gloss0;127 prop/landmark lifecycle paints nonempty and within bounds. Before/after region images are `pixel-region-<biome>-terrain-before.png` / `-terrain-after.png`, plus `terrain-south-desktop.png` and `terrain-south-mobile.png` in `output/pixel-asset-review/`. No iPhone frame-time measurement, human full-night playtest, publication or user art approval. The windmill cap/body and many registered landmark/prop silhouettes still require detailed individual work; goal remains active.


## Windmill architecture and live rotor

Replaced the generic tube/rectangular roof block with `pixel-windmill.ts`: half-unit stacked faceted masonry, shallow ground-contact footing, tapering tower, arched door and warm inset glazing, timber cornice, and a cap tapering in both axes. The windmill now draws at its ground anchor without the generic landmark upward offset; its compact contact shadow and complete live silhouette fit the existing bounds. Other landmark painters are untouched.

`pixel-windmill-rotor.ts` rasterises four asymmetric flax-covered timber sails onto integer pixel runs, with spars, lattice battens, open slits and a layered hub. Fixed rotor hub and interaction/idle angular timing are preserved. No image assets, per-frame canvas allocation, clock reads or unbounded pose cache. The shared geometry remains unchanged; this is rendering only.

Viewed actual native/2× before/after images and seeded desktop960×540/phone390×844 world-render fixtures at windmill site(4287,1482), seed7. These fixtures reposition the cat for review; they are not a full manually played run. Saved `windmill-before-detail.png`, `windmill-after-detail.png`, `windmill-before-desktop.png`, `windmill-after-desktop.png`, `windmill-before-mobile.png`, `windmill-after-mobile.png` under `output/pixel-asset-review/`. Simulation state before/after rendering is identical, browser errors0.

Validation: `npm run build`, `npm test`432/432. New tests sample96 angles at3 scales for integer runs, existing live bounds, bounded≤1800 fill calls and canvas-state restoration; explicit interaction angle overrides time without mutating activity. Actual browser isolated native sprite comparison: Reduced Motion time1 vs31 pixels identical, normal-mode pixels change. Isolated full-sprite drawing probe including world-sprite lookup and pixel readback in Linux Chromium: p50≈1.9ms,p95≈2.1ms. This is not whole-frame, GPU, first-load or iPhone performance evidence. Gallery gloss0;127 prop/landmark state paints nonempty and within bounds. Local only; user approval and remaining landmark/prop/actor/UI art reviews are still open.

## Observatory building, instruments and compass court

Replaced the generic domed cylinder with a dedicated half-unit model (`pixel-observatory.ts`): shallow footing/steps at the actual ground anchor, faceted masonry drum, recessed arched door/windows, a supported copper-blue dome and observation slit, and a telescope growing continuously from its trunnion. New `pixel-observatory-props.ts` supplies the separate brass armillary and inclined star-chart desk: continuous indexed voxel rings, central globe and pedestal; joined trestles, inset constellation map, ruler/compass and rolled parchment. Static native geometry stays cached. No changes to the landmark layout, collision wall, activity radius/timing or rewards.

The court (`pixel-observatory-court.ts`) is a low-contrast stone ellipse with sparse joints, a native compass inlay and a short flush doorway approach. It fits the old landmark footprint and is baked under actors, never a new obstacle or water surface. All three instruments/buildings draw at their ground anchors without the generic model-depth upward offset.

First captures exposed accidental stippling on the dome's moving per-slice highlight boundary and wood-coloured risers running across the sloped chart like stripes. Fixed the cap highlight to a stable meridian and extended the blue map surface over its half-step risers. Rebuilt and recaptured: the broad dome face is clean and the intended constellation remains visible.

Viewed native/2× building before/after, instrument1×/3× detail, and seeded desktop960×540/phone390×844 world-render fixtures at site(-3431,1634), seed7. Fixtures reposition the chosen cat for scene review, not a full manual playthrough. Simulation state remains byte-identical across rendering and page errors0. Evidence: `observatory-before-detail.png`, `observatory-final-detail.png`, `observatory-instruments-detail.png`, `observatory-final-desktop.png`, `observatory-final-mobile.png` in `output/pixel-asset-review/`. The first `after` captures intentionally preserve the visual defects; `refined` fixes the roof, `final` also fixes the chart.


Observatory verification: `npm run build` and `npm test` passed432/432. Browser gallery gloss0;127 registered prop/landmark state paints nonempty and within bounds. Rendering does not mutate the seeded simulation. No iPhone frame-time profiling, human full-night run, user art approval or publication. Continue the active goal with the greenhouse/remaining landmark structures, other props, enemies/Boss, outfits, weapons and UI.


## Greenhouse architecture and potting garden

Replaced the plain blue volume with a dedicated half-unit stacked greenhouse: brick footing at ground zero, framed double doors, divided glass with visible plant/shelf silhouettes, two sloped roof planes and a ridge. The new model and three garden props use their real ground anchors instead of the generic upward offset. Their static geometry remains cached. No definitions, collisions, interaction timing, simulation, controls or dependencies changed.

The separate garden models include a joined diamond-lattice climbing trellis, terracotta pots with thick lips/dark soil/broad leaves, and a supported workbench with drawers, seedling tray, watering can, spade and lower shelf. Replaced the coarse green platform with a single-pixel contoured flush garden, an earthen apron, doorway stones and small nursery beds; these are decorative baked surfaces, not obstacles.

First screenshot revealed a broken dotted roof crossbeam caused by exposed glazing between narrow slice edges. Extended the beam through the full roof-slab thickness and three fine slices, then recaptured. Viewed native/2× building and all three garden props plus desktop960×540/phone390×844 seed7 world fixtures at site(3778,3713). Both world fixtures preserve simulation state and report zero page errors. These are repositioned scene fixtures, not full manual playthroughs. Evidence in output/pixel-asset-review: greenhouse-before-detail.png, greenhouse-final-detail.png, greenhouse-final-desktop.png, greenhouse-final-mobile.png, greenhouse-tools-detail.png. The first after images intentionally retain the beam defect and old ground.

Remaining whole-screen issue: surrounding procedural spacing and other generic landmarks still fall short of the supplied farm reference. This is one local asset batch, not full-game art approval, iPhone performance verification or publication. Continue the active goal with other architecture and scene composition, then remaining props/actors/weapons/UI.

Greenhouse verification: `npm run build` passed; `npm test`432/432. Gallery gloss0, browser errors0,127 registered prop/landmark paints nonempty and in bounds. Local only; no push/deployment.
