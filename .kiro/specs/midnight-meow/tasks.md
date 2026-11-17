# Tasks: Midnight Meow

Checked items record implementation, not user approval. Original task numbers/history are retained below; superseded rules and gaps are explicitly labeled rather than silently erased. The user's latest request includes all remaining art/interaction gaps and paper actors igniting with water extinguishing them. This overrides the old harmless-to-cat fire rule and deferral of ecology.

Latest verification: **`npm run build && npm test` passed 237 tests**. One static screenshot was captured and viewed at `output/playwright/paper-ecology-review.png` using **system Chrome**, not the missing bundled Chromium. It shows selected art only. Full gameplay-screen/mobile review, balance and user art acceptance remain open; no animation, recording, audio or FPS checks were performed. The user viewed the older deployed version and asked for refinement; neither older approval nor a static image accepts the latest game.

## Foundation

- [x] 1. TypeScript + Canvas static site with `npm run build`, `npm start`, `npm test`
- [x] 2. Deterministic simulation with seeded RNG and `snapshot` (Req 4.5)
- [x] 3. 2x internal back canvas and viewport fitting (`viewport.ts`)

## Cats

- [x] 4. Official Meow Wall head data for Zero and Nicole with locked identifiers
- [x] 5. Title-screen choice of exactly one cat; only that cat in the run (Req 2.1, 2.2)
- [x] 6. Remember chosen cat; retry keeps it, back to title allows changing it (Req 2.3, 2.4)
- [x] 7. Zero kit: Meowline bolts, afterimage dash decoy, post-dash rapid piercing fire (Req 3.1, 3.2)
- [x] 8. Nicole kit: Moonstars orbit, Moonfold field and shields, one-time rescue shield (Req 3.3 to 3.5)
- [x] 9. Selection page and HUD read numbers, starting weapon and evolution rule from data (Req 3.6)

## Session

- [x] 10. 600-second night with four phases at 15 / 45 / 80 % (Req 4.1)
- [x] 11. Win at dawn, lose at zero HP (Req 4.2, 4.3)
- [x] 12. Result page with stats, retry and back (Req 4.4)
- [x] 13. Keyboard, pause on Esc / P / hidden page, touch joystick and skill button, reduced-motion handling (Req 5)

## Papercraft art

- [x] 14. Procedural paper material: fiber, embossing, cut edges, thickness, contact shadows, stitching, glow
- [x] 15. Night sky, hills, tree crowns, houses with folded roofs and stacked tiles, paper road, yard and foreground
- [x] 16. Papercraft cats, ink blobs, warm-light shots and skill effects
- [x] 17. UI palette moved to papercraft colors; style toggle removed (`data-style="papercraft"` only)
- [x] 32. Narrow cat face paper edge along the outline instead of a wide backing (Req 1.6; not yet confirmed by the user as the area they meant)
- [ ] 18. Refine shapes, texture scale, shadow layering, lighting and UI consistency until the user accepts the art against the reference image (Req 1)
  - [ ] 18.1 Complete full gameplay-screen/mobile and reference-target review; one selected-art static screenshot is captured/viewed, not full acceptance
  - [x] 18.2 Implement cottage roof/window volume, grouped tree crowns and clustered district motifs (code complete; user review still open)
  - [x] 18.3 Implement official-source paper faces, enemy/combat paper refinements and ecology overlays (latest scope below); full HUD/panel consistency and user acceptance remain open

## Language

- [x] 19. i18n message keys with English and Chinese packs (all new gameplay strings included)
- [ ] 20. Default to English and keep English throughout the game (Req 11, deferred by the user)
  - [ ] 20.1 Confirm with the user whether to remove the Chinese pack and toggle or keep them as an option
  - [ ] 20.2 Change the default locale, `<html lang>` and `<title>` to English

## World

- [x] 33. Bounded seeded world of 10 x 10 screens (`WORLD`, tunable), chunked, pure hash of seed + chunk coords (`world-gen.ts`; Req 8.1, 8.3)
- [x] 34. Follow camera with deadzone and world clamp (`camera.ts`; Req 8.2)
- [x] 35. Landmarks (clock tower, pumpkin patch, stone bridge, chapel yard, lantern market, moon hill; later paper windmill, puppet theatre, wishing well), roads, hedge edges, landmark discovery notices and nav arrows (Req 8.4)
- [x] 36. Per-chunk ground caches, sprite culling and view culling of actors (`craft-world.ts`)

## Gameplay depth

- [x] 21. Ink-shard XP and level-up choice of 3 weapons / passives with 3 weapon and 4 passive slots, per-cat pools, snack filler (`upgrades.ts`, `upgrade-cards.ts`; Req 6.1 to 6.4)
- [x] 37. Six weapons with per-level steps (Meowline, Night Claw, Moonstars, Star Fall, Paper Crane, Pumpkin Seed) and ten passives (Req 6.3)
- [x] 38. Chest-only evolution: Echo Legion (max Meowline + Long Shadow), Full Moon (max Moonstars + Deep Fold); otherwise chest levels with a HUD slip (Req 6.5 to 6.7)
- [x] 22. Enemy kinds: paper bats, crumples, smudges with puddles; spawn table, side / ring / line waves (`enemies.ts`, `craft-enemies.ts`; Req 7.1)
- [x] 39. Horde pacing per minute with `HORDE.hardCap` 100 living enemies (tunable), ring spawns outside the view, leash (Req 7.2)
- [x] 40. Crowned elites every 60 s from 60 s to 500 s, each dropping a chest (Req 7.3)
- [x] 23. Eraser boss at 540 s, entering outside the view and hunting, with banner, HUD bar, telegraphed sweep / summon / charge, reward shards and a big chest (Req 7.4 to 7.6)
- [ ] 24. Random helper cats (not built; confirm with the user first, must not break the single-cat rule)
- [x] 25. Procedural Web Audio effects and ambience with a remembered mute toggle (`src/audio/sfx.ts`; Req 10)
- [x] 28. Interactions: pumpkins and moon-lanterns in the start yard and landmarks, fish treats near the cat (`interactions.ts`; Req 8.5 to 8.8)
- [x] 29. Game feel: hit flash, damage tags, paper dissolve, camera shake, kill streaks, phase ribbons, level / evolve bursts, critical-health vignette, dawn sky (`craft-juice.ts`, `world.ts`, `hud.ts`; Req 9.1 to 9.4)
- [x] 30. UI motion ideas rebuilt from Snapblocks public descriptions (ink reveal, pleated banners, magnetic Start button), disabled under reduced motion; no Snapblocks code copied
- [x] 41. Event timelines with four beats for evolution, Boss entrance and defeat, dawn and the win finale; deterministic slow motion; staggered card deal and chest slip (`timeline.ts`, `cue-fx.ts`; Req 9.5, 9.6)
- [x] 42. Night-watch journal UI: badge, moon arc, lantern hearts, minimap, wick skill, XP seam, build tags, Boss eraser bar, lattice-window cards, theater title, folded pause page, journal result page (`hud.ts`, `journal.ts`, `journal-ui.ts`; Req 12)
- [ ] 31. Real-browser playtest and balance pass (difficulty curve under the 100 cap, weapon / passive strength, chest pacing, Boss HP; the idle Nicole bot leaves the Eraser at about 300 hp; audio levels)
- [ ] 43. Authorized real-browser performance check at about 100 enemies with fire and fast moves into unbuilt chunks (chunk builds remain synchronous; the old blanket statement that enemy textures redraw every frame is superseded by finite cached cuts, not by measured FPS)
- [ ] 44. User review of the new UI identity and the narrow face edge

## Extensible skeleton

- [x] 45. Content-agnostic engine: registry, typed event bus, cached sprites (`src/engine/`; Req 13.5)
- [x] 46. Cats, weapons, passives, evolutions, enemies and behaviours as registered defs with gated hooks; facades keep old exports; behaviour unchanged against recorded snapshot probes (`src/defs/`; Req 13.1 to 13.3, 13.6, 13.7)
- [x] 47. Registered art layer for cats, enemies, weapons, passives; title tickets built from `CATS`; no cat literals outside defs and legacy files (`src/render/art-registry.ts`, `art-index.ts`; Req 13.4)
- [x] 48. Fresh run seed per run unless `?seed=N`; moon-lantern "full" notice only near the view
- [x] 49. Development workflow skill in English with recipes (`.kiro/skills/midnight-meow-dev/`; Req 13.8)

## Paper interactions

- [x] 50. Materials, elements and the reaction table; tearable props with intact / damaged / scraps phases, seeded drops, colliders that open (`src/game/props.ts`, `src/defs/reactions/`; Req 14.1 to 14.3, 14.5)
- [x] 51. Historical implementation: spreading fire on a capped cell grid, enemy damage and ash. **The original “never hurting the cat” rule is superseded** by shared actor burn/wetness (task 69; Req 14.4–14.6).
- [x] 52. Pop-up folding of landmark pieces near the cat, render only (`POPUP`; Req 14.6)
- [x] 53. `tear` and `crackle` sound cues; props torn and cells burnt on the result page
- [x] 54. Former gap superseded: smudge landings/vats supply ink; Nicole and one crane launch pulse per volley supply fold, with real registered treatments (task 70).
- [x] 55. Former gap superseded: five flora defs regrow after torn/burnt delays, safely and without renewable loot; handcrafted props remain destroyed (task 71).
- [x] 56. Former gap superseded: wind charges windmill pulse rewards and a live cached rotor boost (task 72); no animation/FPS claim.
- [x] 57. Former gap superseded: shared shallow/deep water polygons, explicit dry crossings, swept movement and teaching basin (task 68).

## Paper kit, gallery and content

- [x] 58. Paper kit primitives, `phasedPaint`, seeded variants with render-only hashes (`paper-kit.ts`, `prop-kit.ts`, `variants.ts`; Req 15.1)
- [x] 59. `?gallery=1` page with every registered entry, i18n labels and a pure tested layout (`gallery-layout.ts`, `gallery.ts`; Req 15.2, 15.3)
- [x] 60. Landmarks as defs with their own layout and art; three new landmarks (paper windmill, puppet theatre, wishing well)
- [x] 61. Historical content expansion: five districts and 12 new props (15 at that milestone). Latest total is 17 with ink-vat/wax-candle and 23 unique reaction rows (task 70; Req 16).
- [x] 62. `makeRoom` erases the farthest off-screen commons first
- [ ] 63. User review of districts, new landmarks, props, fire and the gallery in a real browser (patch density, district edges, readability of cats and ink on graveyard-woods ground)
- [ ] 64. Check the 14-row result page layout
- [ ] 65. Decide with the user whether the Boss should stop the cat from outrunning it to dawn
- [ ] 66. Hint or guard when an evolution's paired passive can no longer fit a passive slot

## Latest implemented paper ecology (2026-11-17)

Details and source contracts: [design.md](design.md), [requirements.md](requirements.md) and [paper-ecology.md](../../skills/midnight-meow-dev/references/paper-ecology.md). These checks mean implemented/tested code, not art approval.

- [x] 67. Preserve official Meow Wall data untouched; derive cached visible color contours/silhouette for world faces and portraits, preserving markings, anchors and narrow rim. Retain articulated clothing/accessories; refine cached enemy facets/wings/sleeves and combat crane/star/fleck/open-ring cuts (Req 1.7–1.8).
- [x] 68. Pure water definitions shared by physics/render: shallow speed x0.68, blocked deep cores, dry visible stone/road decks, radius-swept movement and spawn recovery; no decorative/collision mismatch. Wishing-well/canal/river access and fully shallow teaching basin at (1040, 420), radii 76 x 46 (Req 17).
- [x] 69. Radius ignition for both cats/enemies, 3 s carried burn, cat 1 HP/1 s through normal defenses, enemy 0.4/0.2 s. Water extinguishes before burn damage and grants wet 1.25 s; exposed deck-edge contact counts, wholly dry decks do not. No wet fire cells, cap 40, carry spread only on fire ticks, once-per-prop fuel damage (Req 14.4–14.6).
- [x] 70. 17 props / 6 materials / 23 unique reaction rows: ink-vat, wax-candle, card/cloth burning (0.45/0.65), ink 9 s fireproof coat and fold 5 s reversible solid-prop passage. Nicole/crane fold and smudge/vat ink sources preserve existing kits; wax heat consumes material without loot or fabricated ignition (Req 14.7–14.8).
- [x] 71. Flora regrowth after 18–32 s torn / 30–46 s burnt, offscreen absolute deadlines, occupied/fire retries, material-scaled max HP, local ash cleanup and lifetime drop claim retained even when burnt. No repeated loot farming or premature collider restoration (Req 14.9).
- [x] 72. Four activities: teahouse proximity heal; fold-powered greenhouse schedules safe renewal + treat; observatory proximity freeze + shards (not reveal); wind-powered windmill damage/stun/shards + live cached rotor. Shared walkable court anchors, per-site progress/cooldown, bounded element charge and sim-integrated rotor turn (Req 18).
- [x] 73. Read-only carried flame/char and wet overlays after real actors (not decoys), steam/ink/regrow/reward effects, alpha-masked prop ink, deferred fold/regrowth visuals, real square fire-cell marks, court progress and bounds-based building occlusion. Localized hazard-priority HUD/help/activity copy in both languages (Req 14.10, 18.7).
- [x] 74. New `environment-integration`, `fire-water`, `landmark-actions`, `paper-elements`, `paper-visuals`, `water` suites plus updated cat-art/reactions/rendering/scenery tests. Latest verification: full build and 237 tests passed; static geometry/command tests do not measure motion/audio/FPS.
- [x] 75. One static system-Chrome screenshot captured and viewed: `output/playwright/paper-ecology-review.png`, selected art only. Earlier missing bundled Chromium failure is historical, not the current evidence.
- [ ] 76. Full gameplay-screen/mobile, reference-target and user art review; existing task 18/44/63/64 acceptance remains open. Verification remains limited to at most one static screenshot; animation or recording requires the user's explicit request.
- [ ] 77. Authorized balance/performance/audio follow-up; no animation, recording, audio or FPS checks have been performed for the ecology. Do not mark the art or competition entry finished.

## Release

- [ ] 26. Animation and video-recording verification (only if the user asks; a Devpost video needs the user's consent)
- [ ] 27. Publish the latest refinement/ecology when authorized and prepare Devpost materials before 2026-12-05 06:00 Beijing time. The user confirmed the older Vercel version works; that is not deployment evidence for this latest work.
