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
| Candles | Pending | Wax drips, recessed wick and deliberate grouped silhouettes |
| Ground, roadside vegetation, water/deck | Pending | Grouping, edge transitions, floor contrast beneath warnings |
| Zero | Revised; internal screenshot review passed | Stepped shoulders/waist, separate coat tails, curved tail, shaped sleeves/feet and four poses. 1×/3×, 12-pose sheet and phone gameplay viewed; face preserved, cat-art17/17. Dark coat remains subdued; user approval pending. |
| Nicole | Revised twice; internal screenshot review passed | Shaped tee/sleeves, denim legs/pockets/cuffs and curved tail. 1×/3×, 12-pose and mobile game images viewed; dash detached-sleeve defect found and fixed, then pose sheet recaptured. Face/glasses preserved; user approval pending. |
| Costumes | Pending | Every registered outfit must survive front/back layering and bounds |
| Enemies and Eraser | Pending | Each silhouette/material, ordinary/elite/attack/washed variants |
| Registered props and landmarks | Pending | Lifecycle consistency, individual architecture and all cache edges |
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
