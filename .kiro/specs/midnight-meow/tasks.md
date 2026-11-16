# Tasks: Midnight Meow

Checked items exist in the code today. Unchecked items are open work. A checked art or effect item means the code exists and builds, not that the user approved it or that anyone has watched it in a browser.

## Foundation

- [x] 1. TypeScript + Canvas static site with `npm run build`, `npm start`, `npm test`
- [x] 2. Deterministic simulation with seeded RNG and `snapshot` (Req 4.5)
- [x] 3. 2x internal back canvas and viewport fitting (`viewport.ts`)

## Cats

- [x] 4. Official Meow Wall head data for Zero and Nicole with locked identifiers
- [x] 5. Title-screen choice of exactly one cat; only that cat in the run (Req 2.1, 2.2)
- [x] 6. Remember chosen cat; retry keeps it, back to title allows changing it (Req 2.3, 2.4)
- [x] 7. Zero kit: aimed bolts, afterimage dash decoy, post-dash rapid piercing fire (Req 3.1, 3.2)
- [x] 8. Nicole kit: three orbiting moon stars, Moonfold field and shields, one-time rescue shield (Req 3.3 to 3.5)
- [x] 9. Selection page and HUD read numbers from `characters.ts` (Req 3.6)

## Session

- [x] 10. 300-second night with four spawn phases (Req 4.1)
- [x] 11. Win at dawn, lose at zero HP (Req 4.2, 4.3)
- [x] 12. Result screen with stats, retry and back (Req 4.4)
- [x] 13. Keyboard, pause on Esc / P / hidden page, touch joystick and skill button, reduced-motion handling (Req 5)

## Papercraft art

- [x] 14. Procedural paper material: fiber, embossing, cut edges, thickness, contact shadows, stitching, glow
- [x] 15. Night sky, hills, tree crowns, corner houses with folded roofs and stacked tiles, paper road, yard and foreground
- [x] 16. Papercraft cats, ink blobs, warm-light shots and skill effects
- [x] 17. UI palette moved to papercraft colors; style toggle removed (`data-style="papercraft"` only)
- [ ] 18. Refine shapes, texture scale, shadow layering, lighting and UI consistency until the user accepts the art against the reference image (Req 1)
  - [ ] 18.1 Compare a real static screenshot with the reference image and list the largest gaps
  - [ ] 18.2 Fix shape design of houses and trees before adding decoration
  - [ ] 18.3 Unify cats, enemies, HUD and panels with the scene's material language

## Language

- [x] 19. i18n message keys with English and Chinese packs (all new gameplay strings included)
- [ ] 20. Default to English and keep English throughout the game (Req 11, deferred by the user)
  - [ ] 20.1 Confirm with the user whether to remove the Chinese pack and toggle or keep them as an option
  - [ ] 20.2 Change the default locale, `<html lang>` and `<title>` to English

## Gameplay depth

- [x] 21. Ink-shard XP, level-up card choice, shared and per-cat upgrades, Echo Legion and Full Moon evolutions (`upgrades.ts`, `upgrade-cards.ts`; Req 6)
- [x] 22. Enemy kinds: paper bats, crumples, smudges with puddles; spawn table, waves and enemy cap (`enemies.ts`, `craft-enemies.ts`; Req 7.1, 7.2)
- [x] 23. Eraser boss with banner, HUD bar, telegraphed sweep / summon / charge and reward (Req 7.3 to 7.5)
- [ ] 24. Random helper cats (not built; confirm with the user first, must not break the single-cat rule)
- [x] 25. Procedural Web Audio effects and ambience with a remembered mute toggle (`src/audio/sfx.ts`; Req 10)
- [x] 28. Yard interactions: pumpkins, moon-lantern stun, fish treats (`interactions.ts`; Req 8)
- [x] 29. Game feel: hit flash, damage tags, paper dissolve, camera shake, kill streaks, phase ribbons, level / evolve bursts, critical-health vignette, dawn sky (`craft-juice.ts`, `world.ts`, `hud.ts`; Req 9)
- [x] 30. UI motion ideas rebuilt from Snapblocks public descriptions (fan deck, tear ticket, ink reveal, pleated banners, magnetic Start button), disabled under reduced motion; no Snapblocks code copied
- [ ] 31. Real-browser playtest and balance pass (difficulty curve, card strength, boss HP, audio levels); nobody has viewed the new effects in a browser or heard the audio yet

## Release

- [ ] 26. Animation and video-recording verification (only if the user asks; a Devpost video needs the user's consent)
- [ ] 27. Deployment and Devpost submission materials before 2026-12-05 06:00 Beijing time
