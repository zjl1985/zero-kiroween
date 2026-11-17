# Requirements: Midnight Meow

## Introduction

Midnight Meow is a browser night-watch game in the Vampire Survivors genre (a survivor-like roguelike), with a moderate crowd rather than hundreds of enemies. The player picks Zero or Nicole and walks a bounded, seeded papercraft night town with a follow camera for one 10-minute night, building weapons and passives, opening chests to evolve, and holding off ink creatures, crowned elites and a hunting Eraser boss until dawn. All visuals are drawn by TypeScript on Canvas and all sound is synthesized with Web Audio.

The user said the map need not be endless ("max 100") and that hundreds of enemies are not needed. We read this as a world of at most 10 x 10 screens and at most 100 living enemies. Both numbers are tunable data constants (`WORLD` in `src/game/world-gen.ts`, `HORDE.hardCap` in `src/defs/horde.ts`, re-exported by `src/game/enemies.ts`).

Current scope follows the user's explicit request to implement the remaining art/interaction gaps, including paper actors igniting and water extinguishing them. Earlier fire-safe-cat and deferred-ecology clauses are superseded. Implementation details are in [design.md](design.md) and [the ecology recipe](../../skills/midnight-meow-dev/references/paper-ecology.md); implementation is not user acceptance.

## Requirement 1: Single papercraft art style

**User story:** As a player, I want one consistent papercraft night town, so that the game has a clear handmade identity.

### Acceptance criteria

1. THE game SHALL render the scene, cats, enemies, effects and UI in a single papercraft / cut-paper style.
2. THE game SHALL NOT offer an art-style toggle or a pixel-art mode.
3. THE game SHALL draw all scenery, characters and textures with Canvas code, without image files, sprites or image backgrounds. Offscreen canvases MAY cache procedurally drawn content.
4. WHEN a paper piece is drawn, THE renderer SHALL show a cut edge, visible thickness and a contact shadow.
5. THE scene SHALL include a large moon, warm windows, autumn trees, a curved road and stitched paper details, matching the user's reference image as an art target.
6. THE cat heads SHALL keep a narrow warm paper edge that follows the face outline, without a wide separate backing.
7. THE paper-face renderer SHALL derive cached visible color contours and silhouette from untouched official Meow Wall data, preserving overlap order, markings, small facial details and existing anchors; world heads and portraits SHALL share this source.
8. Enemy/combat refinements and runtime ecology cues SHALL retain readable silhouettes, eyes, telegraphs and negative space. Cached paper pieces SHALL use finite variants, not time/continuous-angle keys; rendering SHALL NOT mutate sim state.

## Requirement 2: Pick one cat

**User story:** As a player, I want to choose Zero or Nicole before the night starts, so that I play the cat I like.

### Acceptance criteria

1. WHEN the title screen is shown, THE game SHALL let the player choose exactly one of Zero (male cat) or Nicole (female cat).
2. WHILE a run is in progress, THE game SHALL show only the chosen cat as a playable character, with no companion or follower.
3. WHEN the player restarts, THE game SHALL keep the previously chosen cat; WHEN the player returns to the title, THE game SHALL allow changing the cat.
4. THE game SHALL remember the chosen cat between visits.

## Requirement 3: Distinct cat kits

**User story:** As a player, I want the two cats to play differently, so that the choice matters.

### Acceptance criteria

1. Zero SHALL have 4 HP and speed 126, start with the Meowline weapon (aimed bolts), and have an active "afterimage dash" that leaves a 1.2-second decoy with a 3-second cooldown.
2. WHEN Zero's dash ends, Zero SHALL fire twice as fast for 2 seconds, and each bolt SHALL pierce up to two distinct targets.
3. Nicole SHALL have 6 HP and speed 96 and start with the Moonstars weapon: three orbiting moon stars that hit each enemy at most once per hit interval and push it back.
4. WHEN Nicole uses Moonfold, THE game SHALL perform a short dash, leave a 3.5-second field that slows enemies by 60%, and grant 2 shield charges for 4.5 seconds, with a 5.5-second cooldown.
5. WHEN Nicole's HP first drops to 2, THE game SHALL grant 2 shield charges for 4 seconds, once per run, without reviving a defeated cat.
6. THE selection page and HUD SHALL read the same numbers as the simulation, including the starting weapon and the evolution rule.

## Requirement 4: One night session

**User story:** As a player, I want a night with a clear end, so that a run has a goal and a payoff.

### Acceptance criteria

1. THE session SHALL last 600 seconds (`STATS.sessionSeconds`), split into four night phases at 15%, 45% and 80% of the session.
2. WHEN the timer reaches zero while the cat has survived, THE game SHALL end the run as a win (dawn), regardless of whether the Boss was defeated. Defeating the Boss SHALL NOT be required for victory (user confirmed 2026-11-17).
3. WHEN the cat's HP reaches zero, THE game SHALL end the run as a loss.
4. WHEN a run ends, THE game SHALL show a result page with run stats and retry / back options.
5. THE simulation SHALL be deterministic for the same seed and input, including world generation.

## Requirement 5: Controls and accessibility

**User story:** As a player on desktop or phone, I want simple controls, so that I can play anywhere.

### Acceptance criteria

1. THE game SHALL support WASD / arrow keys to move, Space to use the skill, and 1 / 2 / 3 (or a click / tap) to pick an upgrade card.
2. WHEN Esc or P is pressed, the HUD pause chip is clicked, or the page is hidden, during play or while upgrade cards are shown, THE game SHALL pause (stopping the ambience); resuming SHALL return to the same card hand if one is pending.
3. WHERE the device prefers touch, THE game SHALL show a joystick and a skill button.
4. THE game SHALL respect `prefers-reduced-motion`.

## Requirement 6: Weapons, passives and evolution

**User story:** As a player, I want to build my cat during the night, so that each run builds toward a payoff.

### Acceptance criteria

1. WHEN an enemy is defeated, THE game SHALL drop ink shards worth that enemy kind's XP; shards inside the pickup radius SHALL drift to the cat.
2. WHEN XP reaches the next level threshold (`xpForLevel`), THE game SHALL freeze the simulation and offer 3 distinct cards.
3. THE build SHALL have 3 weapon slots and 4 passive slots (`BUILD`). Cards SHALL only offer weapons and passives from the chosen cat's pool (shared plus that cat's exclusives) that are owned below max level or fit a free slot; the other cat's items SHALL never be offered.
4. Level-up cards SHALL NOT offer evolutions. WHEN fewer than 3 items are eligible, THE game SHALL fill a slot with the Warm Milk filler card, which heals 1 heart.
5. WHEN Zero has Meowline at max level and owns Long Shadow and opens a chest, THE game SHALL evolve Meowline into Echo Legion, which makes the afterimage fire bolts and burst when it fades.
6. WHEN Nicole has Moonstars at max level and owns Deep Fold and opens a chest, THE game SHALL evolve Moonstars into Full Moon, which adds 2 moonstars and a periodic moon pulse that damages and pushes nearby enemies.
7. WHEN a chest is opened and no evolution is ready, THE game SHALL raise random owned items that are below max by one level each (1 level, 3 for the Boss chest), or give Warm Milk if nothing can grow, and SHALL show what the chest gave.
8. THE HUD SHALL show XP, level and the weapon and passive slots; THE result page SHALL show the level reached and the evolution if taken.
9. IF all passive slots are occupied and the evolution's required partner passive is not owned, THE corresponding evolution SHALL remain unavailable for that run. THE game SHALL NOT reserve a slot or automatically grant the missing partner to bypass that build choice (user confirmed 2026-11-17).

## Requirement 7: Enemy horde, elites and the Eraser boss

**User story:** As a player, I want a crowd that grows through the night and a boss near dawn, so that the night escalates.

### Acceptance criteria

1. THE game SHALL spawn ink blobs, paper bats (fast, swooping), crumples (tough, splitting into 2 small enemies on defeat) and smudges (keep range, lob a telegraphed ink drop that leaves a slowing puddle), weighted per night phase by `SPAWN_TABLE`, from a ring just outside the view, plus scripted side, ring and line waves (`WAVES`).
2. THE living enemy cap and spawn rate SHALL rise each minute (`HORDE.capByMinute`, `HORDE.spawnPerSecondByMinute`), and the number of living enemies SHALL never exceed `HORDE.hardCap` (100), counting splits, summons, waves and elites.
3. FROM 60 seconds, every 60 seconds until 500 seconds, THE game SHALL spawn a crowned elite that drops a chest when defeated.
4. WHEN 90% of the session has passed (540 seconds), THE Eraser boss SHALL appear just outside the view with a banner and a HUD health bar, and SHALL hunt the cat when it is far away.
5. THE boss SHALL use sweep, summon and charge attacks, each preceded by a visible telegraph.
6. WHEN the boss is defeated, THE game SHALL drop bonus shards and a big chest and record the defeat in the run stats.

## Requirement 8: Bounded world and interactions

**User story:** As a player, I want a town to explore, so that moving around the map matters.

### Acceptance criteria

1. THE world SHALL be bounded, at most 10 x 10 screens (`WORLD`, 9600 x 5400 world units), not endless, with a hill horizon on the north and a paper hedge on the other edges.
2. THE camera SHALL follow the cat and stay inside the world.
3. THE world SHALL be generated from the run seed in chunks, as a pure function of (seed, chunk coords), so the sim and renderer agree without using the sim RNG.
4. THE world SHALL contain roads and 12 landmark kinds (clock tower, pumpkin patch, stone bridge, chapel yard, lantern market, moon hill, paper windmill, puppet theatre, wishing well, paper teahouse, fold greenhouse, star observatory) across 24 sites; each registered kind SHALL appear at least once, and the HUD SHALL show arrows toward nearby landmarks, chests and the Boss. Activities and water SHALL follow Requirements 17–18.
5. WHEN the cat touches a charged pumpkin, THE pumpkin SHALL light for 6 seconds, damaging and pushing nearby ink, then recharge for 14 seconds.
6. A moon-lantern SHALL charge over 40 seconds; WHEN the cat touches it while full, THE game SHALL stun all enemies for 2.4 seconds (the boss for 0.9 seconds).
7. Fish treats SHALL appear from 45 seconds on near the cat at seeded random positions and heal 1 heart when collected.
8. Start yard pumpkin and lantern positions in the sim SHALL match the drawn scene props; landmark pumpkins and lanterns SHALL come from the same world data the renderer draws.

## Requirement 9: Feedback, motion and game feel

**User story:** As a player, I want every hit and milestone to feel clear, so that the action reads at a glance.

### Acceptance criteria

1. WHEN an enemy is hit, THE game SHALL flash it, show a damage tag, and on defeat dissolve it into paper flakes.
2. WHEN kills follow each other within 2.6 seconds, THE game SHALL count a kill streak, show a badge from 3 kills, and grant bonus XP every 10 kills.
3. THE game SHALL show a notice for each new night phase, elites, chests and found landmarks, level-up and evolution bursts, and a warning vignette at critical health. Boss and evolution banners SHALL NOT be replaced by routine notices.
4. Over the last 30 seconds (`STATS.dawnSeconds`), THE scene SHALL move toward dawn (lower moon, warmer horizon, dimmer lamps).
5. Evolution, the Boss entrance, the Boss defeat, dawn and the win finale SHALL play in four beats (anticipation, reveal, burst, settle); slow motion SHALL only change how many fixed simulation steps run per frame, so determinism holds. Upgrade cards SHALL be dealt from a stack with a stagger.
6. Camera shake, slow motion, zoom and UI motion SHALL be disabled or reduced to short fades under `prefers-reduced-motion`.
7. Rendering SHALL NOT consume the simulation RNG or mutate simulation state.

## Requirement 10: Procedural audio

**User story:** As a player, I want sound that matches the night, without asset downloads.

### Acceptance criteria

1. THE game SHALL synthesize all sound effects and ambience with Web Audio oscillators and generated noise, without audio files.
2. THE audio context SHALL start only after the first user gesture.
3. THE title screen and HUD SHALL offer a mute toggle, remembered between visits as `muted` in `midnight-meow-prefs`.

## Requirement 11: English language (deferred)

**User story:** As a hackathon judge or international player, I want the game in English, so that I can understand it without switching languages.

### Acceptance criteria

1. All user-facing strings SHALL go through the i18n message keys, with a complete English pack.
2. For new visitors without a saved language preference, THE game SHALL display English on first load and throughout a run (title, selection, HUD, notices, upgrade cards, pause, results).

Status: implemented at the user’s request on 2026-11-17. English is the default; Chinese and the language toggle remain available. Existing saved language preferences are honored.

## Requirement 12: Own UI identity

**User story:** As a player, I want the interface to feel like part of this night town, so that the game has its own look rather than copying another site.

### Acceptance criteria

1. THE UI SHALL use a papercraft night-watch journal language: luggage-tag badge, moon arc clock, lantern hearts, folded minimap, wick skill button, stitched XP seam, weapon pennants and passive tags, lattice-window upgrade cards, a theater title with a playbill and ticket choices, a folded pause page and a journal result page with a paw stamp.
2. THE UI SHALL NOT reuse Tibo Dog's layout or components; Tibo Dog is a reference for spatial exploration only.
3. HUD canvases SHALL be drawn by code and repaint only when their inputs change.

## Requirement 13: Extensible content skeleton

**User story:** As a developer of this entry, I want each piece of content to be one definition plus one art file, so that new cats, weapons, enemies, props and places can be added without editing the simulation or renderer.

### Acceptance criteria

1. Cats, weapons, passives, evolutions, enemies, enemy behaviours, materials, reaction rows, props, landmarks and district biomes SHALL be definitions registered by id in registries (`src/defs/registries.ts`), filled by `src/defs/index.ts` and `src/defs/world-index.ts`.
2. THE generic simulation (`src/game/`) SHALL look content up through the registries and call def hooks through a `SimContext`; it SHALL NOT name cat ids.
3. Def hooks SHALL run only while their content is active (the chosen cat; an owned weapon or passive, or the start weapon).
4. Art SHALL be registered in an art layer (`src/render/art-registry.ts`, filled only by `src/render/art-index.ts`) under the same ids; the simulation SHALL NOT import art. Non-legacy render and UI code SHALL NOT name cat ids.
5. `src/engine/` SHALL stay content-agnostic and import no other layer.
6. Registration order SHALL be stable, because spawn tables, weapon steps and stat folds depend on it for determinism.
7. For the original behavior-preserving refactor, snapshots for fixed seeds and inputs SHALL match the pre-refactor behavior. Subsequent intentional content/ecology changes MAY alter fixed-seed worlds and outcomes; same-seed/same-input determinism SHALL still hold. Old refactor snapshots SHALL NOT be treated as approval or a ban on the requested ecology.
8. THE development workflow SHALL be documented as a Kiro skill in English (`.kiro/skills/midnight-meow-dev/`).

## Requirement 14: Paper materials and element reactions

**User story:** As a player, I want the paper town to react to my weapons, so that fighting changes the place around me.

### Acceptance criteria

1. Weapons SHALL carry elements (fire, ink, wind, cut, fold); props SHALL have a material (thin paper, card, ink, cloth, wax, straw).
2. WHEN an element touches a prop, THE game SHALL look up the material x element reaction row and apply its effect; props without a row SHALL be unaffected.
3. Cut and wind SHALL tear accepting props through intact, damaged and scraps phases; scraps SHALL no longer block movement. Drops (shards, fish treats, a scarecrow's shard ring) SHALL use the prop id hash and a single lifetime claim. Burning SHALL pay no loot but SHALL still claim that roll, so restoration cannot create a loot farm.
4. Fire SHALL light dry standing flammable fuel on 24-unit cells, capped at 40 live cells, with 2.4 s life and 0.2 s ticks. Spread SHALL use world hashes, never step RNG. Water-overlapping cells SHALL NOT ignite and SHALL be removed before damage/spread. A prop SHALL lose at most 0.5 durability per fire tick regardless of its footprint's cell count. Card and cloth SHALL be flammable (0.45 / 0.65), alongside thin paper, straw and wax.
5. Both selectable cats and living arrived enemies SHALL ignite on radius contact with a burning square and carry fire for 3 s after dry contact. Cat burn SHALL deal 1 HP per 1 s through normal shields, invulnerability, rescue and defeat handling; enemy burn SHALL deal 0.4 per 0.2 s through normal enemy damage. Dead/arriving enemies and skill decoys SHALL NOT receive actor burn ticks. Carried fire SHALL spread into dry fuel only on bounded fire ticks. **The old fire-never-hurts-cat rule is superseded.**
6. Exposed-water radius contact SHALL extinguish actors before a due burn hit or same-step ignition, reset their burn clock and grant 1.25 s wet protection. Whole dry-deck contact SHALL NOT wet an actor, but reaching exposed water beside a deck SHALL. Burn/wet clocks SHALL continue with an empty fire grid and stop with paused/finished simulation.
7. Prop state SHALL persist across chunk unload/reload. Ink SHALL give standing thin-paper/card/cloth/straw a 9 s coating that suppresses ignition/fuel consumption without healing or awarding loot; water at the prop position SHALL wash it off. Fold SHALL disable a standing solid prop's collider for 5 s without damage or loot, refreshing rather than stacking. Flat props SHALL NOT gain a fake fold state. Unfolding SHALL wait while actors occupy the collider plus clearance.
8. Smudge landings and cut/wind-struck ink vats SHALL supply ink. Nicole's skill and one Paper Crane pulse per successful volley launch SHALL supply fold without replacing existing skill defenses/field or crane wind shots, fan, homing or timing. Wax fire reactions SHALL consume material through burnt damage without loot or fabricated ignition.
9. Only the five renewable flora defs SHALL regrow: grass 18/30 s, reeds 22/34 s, flowers 24/36 s, bush 28/42 s, mushroom 32/46 s (torn/burnt). Regrowth SHALL run offscreen, defer 0.5 s for actor occupancy or nearby fire, restore material-scaled max HP, clear only its own ash footprint and preserve lifetime loot claims. Handcrafted props SHALL stay destroyed.
10. Landmark pieces marked pop-up SHALL fold as the cat approaches, render-only and snapped under reduced motion. This presentation SHALL remain distinct from gameplay prop folding. Actor fire/wetness, prop treatments and regrowth anticipation SHALL be read-only visuals that follow actual sim state, including deferred restoration.

## Requirement 15: Paper kit and gallery

**User story:** As a developer, I want shared cut-paper tools and a page that shows every piece of art, so that new art stays in one material language and can be reviewed in one place.

### Acceptance criteria

1. THE renderer SHALL offer paper-kit primitives (cut piece with thickness, stacked layers, folds, stitching, wear, contact shadow, charred and torn edges, warm glow) and seeded variants (palette, size, tilt, wear, mirror) that use render-only hashes, never `Math.random`.
2. WHEN the page is opened with `?gallery=1`, THE game SHALL show every registered cat, enemy (and elite), prop in its five base preview states (intact, damaged, scraps, burning, burnt), landmark, biome, weapon and passive on labelled paper cards, without starting a run or audio. Gallery coverage SHALL NOT be represented as full runtime ink/fold/regrowth, gameplay-screen or mobile review.
3. Gallery labels SHALL come from i18n keys and SHALL follow the language toggle.

## Requirement 16: Districts and scene content

**User story:** As a player, I want different parts of town to look and play differently, so that exploring is worth it.

### Acceptance criteria

1. THE town SHALL be split into districts from the seed (old town, pumpkin farmland, graveyard woods, lantern canal, moon meadow); every district SHALL appear in every world, and the start yard SHALL be old town.
2. Each district SHALL have its own decor mix, prop mix and ground patches; roadside props SHALL stand beside roads.
3. A chunk SHALL hold at most `DISTRICTS.propCap` props.
4. District and prop placement SHALL be a pure function of the seed and chunk coords.
5. The current catalog SHALL include 17 props (including ink-vat and wax-candle), 6 materials and 23 unique material x element rows. Registrations SHALL remain append-ordered; generated props/building contacts SHALL avoid wet footprints while retaining road and landmark access.

## Requirement 17: Shared physical paper water

**User story:** As a player, I want visible safe shallows and dry crossings, so that I can escape fire without walking through a painted obstacle.

### Acceptance criteria

1. Water SHALL come from pure landmark/biome definitions and a bounded spatial index shared by sim and renderer, independent of chunk loading/RNG. Shore, deep core and dry crossing polygons SHALL use the same vertices in Canvas and physics, without hidden smoothing or invisible road exemptions.
2. Shallow water SHALL multiply player/enemy movement speed by 0.68; deep cores SHALL block actor circles. Movement SHALL sweep against cores and slide along banks, preventing a dash from tunneling to the far dry bank. Spawn/recovery positions SHALL project out of deep water.
3. The stone deck and every road/water crossing SHALL have matching visible dry polygons, with radius-aware clearance. Dry decks SHALL not confer blanket immunity when an actor overlaps exposed water beside them.
4. Wishing-well ponds, stone-bridge river and lantern-canal pockets SHALL have reachable shallow access. A fully shallow teaching basin at (1040, 420), radii 76 x 46, SHALL remain clear of the starting road and fixed obstacles.
5. Water queries SHALL handle negative world coordinates, preserve bounds/start-yard/landmark access and never consume step RNG. Water extinguishing SHALL follow Requirement 14.6.

## Requirement 18: Useful landmark activities

**User story:** As a player, I want visiting and interacting with landmarks to help my run, so that the town is more than scenery.

### Acceptance criteria

1. Activities SHALL be registered in landmark defs, with shared visible/walkable court anchors, def-owned tuning and per-placement sim progress/cooldown. Partial progress SHALL survive leaving and cooldowns SHALL advance offscreen, but neither SHALL advance while the sim is paused/upgrading/finished.
2. Paper teahouse SHALL heal 1 HP (capped at max) after 2.5 s within radius 44, with 32 s cooldown.
3. Fold greenhouse SHALL require fold hits to reach charge 2 within court radius 48, with 45 s cooldown; it SHALL drop a treat and advance at most 10 existing future flora regrowth deadlines within 320. It SHALL NOT directly restore HP, bypass fire/occupancy checks or reset loot claims.
4. Star observatory SHALL charge for 3 s within radius 44, with 48 s cooldown; it SHALL stun living arrived enemies within 240 for 3 s and drop shard value 4, not reveal the map.
5. Paper windmill SHALL require wind hits to reach charge 3 within court radius 100, with 24 s cooldown; its radius-210 pulse SHALL deal 1.5 damage, stun for 1.6 s and drop shard value 2. Wind SHALL refresh a 6 s rotor boost even during cooldown.
6. Element charge SHALL add at most 2 per hit and dispatch through the same context path as prop hits. Cooldown SHALL lock before rewards. Rotor turn SHALL integrate in sim time (0.25 rad/s idle, 2.6 boosted); rendering SHALL draw a single live rotor using finite cached textures under the tower's depth/pop-up transform, never mutate state or cache by angle/time.
7. Burning/wet notices, HUD status, help and nearby-activity instructions SHALL be localized in both packs; urgent hazard guidance SHALL take priority over routine hints. Progress marks SHALL use real court anchors and seconds/cooldown, not invented render timers.

## Deferred work and evidence limits

Random helper cats still require confirmation. English default is implemented (Requirement 11); dawn survival wins without a Boss kill, and full passive slots may lock out evolution by design. Full gameplay-screen/mobile review, user art acceptance, balance and performance remain open. Publishing this latest work and Devpost submission materials are pending (deadline 2026-12-05 06:00 Beijing time), not a reason to mark implemented ecology out of scope. Animation/video verification is prohibited unless the user asks again.

Latest verification: `npm run build && npm test` passed **237 tests**; one static screenshot was captured and viewed at `output/playwright/paper-ecology-review.png` using **system Chrome**, not missing bundled Chromium. It shows selected art only. No animation, recording, audio or FPS checks were performed, and the user has not approved the art.
