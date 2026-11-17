# Requirements: Midnight Meow

## Introduction

Midnight Meow is a browser night-watch game in the Vampire Survivors genre (a survivor-like roguelike), with a moderate crowd rather than hundreds of enemies. The player picks Zero or Nicole and walks a bounded, seeded papercraft night town with a follow camera for one 10-minute night, building weapons and passives, opening chests to evolve, and holding off ink creatures, crowned elites and a hunting Eraser boss until dawn. All visuals are drawn by TypeScript on Canvas and all sound is synthesized with Web Audio.

The user said the map need not be endless ("max 100") and that hundreds of enemies are not needed. We read this as a world of at most 10 x 10 screens and at most 100 living enemies. Both numbers are tunable data constants (`WORLD` in `src/game/world-gen.ts`, `HORDE.hardCap` in `src/defs/horde.ts`, re-exported by `src/game/enemies.ts`).

## Requirement 1: Single papercraft art style

**User story:** As a player, I want one consistent papercraft night town, so that the game has a clear handmade identity.

### Acceptance criteria

1. THE game SHALL render the scene, cats, enemies, effects and UI in a single papercraft / cut-paper style.
2. THE game SHALL NOT offer an art-style toggle or a pixel-art mode.
3. THE game SHALL draw all scenery, characters and textures with Canvas code, without image files, sprites or image backgrounds. Offscreen canvases MAY cache procedurally drawn content.
4. WHEN a paper piece is drawn, THE renderer SHALL show a cut edge, visible thickness and a contact shadow.
5. THE scene SHALL include a large moon, warm windows, autumn trees, a curved road and stitched paper details, matching the user's reference image as an art target.
6. THE cat heads SHALL keep a narrow warm paper edge that follows the face outline, without a wide separate backing.

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
2. WHEN the timer reaches zero, THE game SHALL end the run as a win (dawn).
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
4. THE world SHALL contain roads and landmarks (clock tower, pumpkin patch, stone bridge, chapel yard, lantern market, moon hill, paper windmill, puppet theatre, wishing well); each registered kind SHALL appear at least once, and the HUD SHALL show arrows toward nearby landmarks, chests and the Boss.
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
2. WHEN the default is switched (later), THE game SHALL display English on first load and throughout a run (title, selection, HUD, notices, upgrade cards, pause, results).

Status: deferred by the user. `zh` stays the default for now. Open question: whether the Chinese pack and language toggle are removed or kept as an option. Confirm with the user.

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
7. THE refactor into definitions SHALL NOT change gameplay: snapshots for fixed seeds and inputs SHALL match the pre-refactor behaviour.
8. THE development workflow SHALL be documented as a Kiro skill in English (`.kiro/skills/midnight-meow-dev/`).

## Requirement 14: Paper materials and element reactions

**User story:** As a player, I want the paper town to react to my weapons, so that fighting changes the place around me.

### Acceptance criteria

1. Weapons SHALL carry elements (fire, ink, wind, cut, fold); props SHALL have a material (thin paper, card, ink, cloth, wax, straw).
2. WHEN an element touches a prop, THE game SHALL look up the material x element reaction row and apply its effect; props without a row SHALL be unaffected.
3. Cut and wind SHALL tear props through intact, damaged and scraps phases; scraps SHALL no longer block movement; seeded drops (shards, fish treats, a scarecrow's shard ring) SHALL come from the prop's id hash.
4. Fire SHALL light flammable props and spread on a cell grid capped at `FIRE.maxCells`, damage enemies standing in it, and burn props to ash. Fire SHALL NOT hurt the cat. Spread rolls SHALL use a world hash, never the step RNG.
5. Prop damage SHALL persist for the whole run, including after its chunk unloads and loads again.
6. Landmark pieces marked as pop-up SHALL fold up like a pop-up book page as the cat approaches; this SHALL be render-only and SHALL snap under reduced motion.

## Requirement 15: Paper kit and gallery

**User story:** As a developer, I want shared cut-paper tools and a page that shows every piece of art, so that new art stays in one material language and can be reviewed in one place.

### Acceptance criteria

1. THE renderer SHALL offer paper-kit primitives (cut piece with thickness, stacked layers, folds, stitching, wear, contact shadow, charred and torn edges, warm glow) and seeded variants (palette, size, tilt, wear, mirror) that use render-only hashes, never `Math.random`.
2. WHEN the page is opened with `?gallery=1`, THE game SHALL show every registered cat, enemy (and elite), prop in every state, landmark, biome, weapon and passive on labelled paper cards, without starting a run or audio.
3. Gallery labels SHALL come from i18n keys and SHALL follow the language toggle.

## Requirement 16: Districts and scene content

**User story:** As a player, I want different parts of town to look and play differently, so that exploring is worth it.

### Acceptance criteria

1. THE town SHALL be split into districts from the seed (old town, pumpkin farmland, graveyard woods, lantern canal, moon meadow); every district SHALL appear in every world, and the start yard SHALL be old town.
2. Each district SHALL have its own decor mix, prop mix and ground patches; roadside props SHALL stand beside roads.
3. A chunk SHALL hold at most `DISTRICTS.propCap` props.
4. District and prop placement SHALL be a pure function of the seed and chunk coords.

## Out of scope for now

Random helper cats (not built; confirm with the user before starting), ink and fold element sources, prop regrowth, wind on the windmill, water colliders for ponds and the canal, deployment and Devpost submission (deadline 2026-12-05 06:00 Beijing time), and animation or video-recording verification (not unless the user asks).
