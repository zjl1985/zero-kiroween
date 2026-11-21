# Native pixel renderer

The requested reference is [danielwh2/sprite-stacking](https://github.com/danielwh2/sprite-stacking). The previous game is sealed at `archive/papercraft-2026-11-21` (`d26859b`); work lives on `refactor/pixel-stacking`. The ignored source archive is `output/releases/midnight-meow-papercraft-d26859b.zip`.

## Implementation

- `pixel-stack.ts` authors horizontal material slices into a packed native atlas, projects them at a common heading with vertical spacing, then caches the completed stack. Moving a static object stamps that projection once, without repainting every slice. Cache keys omit world position and time; the existing bounded sprite LRU owns disposal.
- `pixel-scene-art.ts`, `pixel-world-art.ts`, and `pixel-terrain.ts` replace the active scenery and all five districts, including props, state variants and landmarks. Native nearest-neighbour rendering replaces paper contours. Collision geometry is still supplied by the original definitions.
- `pixel-actors.ts` adapts every registered cat, costume, enemy and townsfolk painter. Original face data is read without alteration. Body frames and costume appearances use finite native sheets; reduced motion holds decorative animation.
- `pixel-combat.ts` and `pixel-vfx.ts` replace weapon/passive/costume effects, with existing positions, lifetimes and ranges. Wash terrain uses a bounded 16-tile dirty cache with explicit release, rather than rebaking the old paper underdrawing.
- `pixel-resolution.ts` uses one native pixel per two world units. CSS presentation uses nearest-neighbour scaling; camera dimensions, touch coordinates and movement speed remain in their original world units.
- Title, wardrobe, HUD, upgrade cards, pause/result views and gallery use the same dark pixel palette and square hard borders. No runtime style switch or added dependency.

The old art modules remain where their data/interfaces are still dependencies. Active art registrations use the pixel adapters. This avoids deleting shared simulation definitions or changing registration order.

## Verification

- `npm run build`: passed.
- `npm test`: 420 tests passed, none failed or skipped. Rendering assertions were migrated to native geometry while preserving bounds, state restoration, reduced-motion, footprint, cache and read-only-state checks.
- `node scripts/check-paper-gameplay.mjs /workspace/scratch/pixel-baseline/dist dist`: all 64 complete-state comparisons passed, using two cats, two seeds and 1800 fixed input steps per run.
- Actual Linux Chromium captures at 1280×720 and 390×844; both title and gameplay render without horizontal page overflow. Opening road seam, navigation plaque and mobile start-button position were corrected after inspecting screenshots.
- `?gallery=1&check=gloss`: browser instrumentation recorded zero violation outlines and no script errors.
- Browser alpha-bound probe: 127 prop and landmark states, none empty or outside their declared cache bounds (including existing padding).
- Both cats completed browser smoke flows through start, keyboard movement, skill, pause/resume, upgrade selection and defeat/result. No browser script errors. These were accelerated fixed-frame checks, not full ten-minute survival runs.
- Five district render fixtures use the actual world renderer and unchanged seed. They are controlled rendering checks, not claims that a player traversed the map. Rendering does not mutate their simulation states.

Evidence is local in `/workspace/scratch/paper-shots/` and `/workspace/scratch/pixel-art-bounds.json`. Generated captures are not committed. No iPhone Safari measurements, sustained device thermal testing, full Boss-run acceptance, audio listening test, user visual approval or deployment is claimed.
