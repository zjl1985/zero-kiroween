# Requirements: Midnight Meow

## Introduction

Midnight Meow is a browser night-watch game. The player picks Zero or Nicole and protects a papercraft night town from ink creatures and an Eraser boss for one 300-second night, levelling up through upgrade cards and a per-cat evolution. All visuals are drawn by TypeScript on Canvas and all sound is synthesized with Web Audio.

## Requirement 1: Single papercraft art style

**User story:** As a player, I want one consistent papercraft night town, so that the game has a clear handmade identity.

### Acceptance criteria

1. THE game SHALL render the scene, cats, enemies and effects in a single papercraft / cut-paper style.
2. THE game SHALL NOT offer an art-style toggle or a pixel-art mode.
3. THE game SHALL draw all scenery, characters and textures with Canvas code, without image files, sprites or image backgrounds.
4. WHEN a paper piece is drawn, THE renderer SHALL show a cut edge, visible thickness and a contact shadow.
5. THE scene SHALL include a large moon, warm windows, autumn trees, a curved road and stitched paper details, matching the user's reference image as an art target.

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

1. Zero SHALL have 4 HP and speed 126, auto-fire aimed bolts, and an active "afterimage dash" that leaves a 1.2-second decoy with a 3-second cooldown.
2. WHEN Zero's dash ends, Zero SHALL fire twice as fast for 2 seconds, and each bolt SHALL pierce up to two distinct targets.
3. Nicole SHALL have 6 HP and speed 96, and three orbiting moon stars that hit each enemy at most once per hit interval and push it back.
4. WHEN Nicole uses Moonfold, THE game SHALL perform a short dash, leave a 3.5-second field that slows enemies by 60%, and grant 2 shield charges for 4.5 seconds, with a 5.5-second cooldown.
5. WHEN Nicole's HP first drops to 2, THE game SHALL grant 2 shield charges for 4 seconds, once per run, without reviving a defeated cat.
6. THE selection page and HUD SHALL read the same numbers as the simulation.

## Requirement 4: One night session

**User story:** As a player, I want a short night with a clear end, so that a run fits in a few minutes.

### Acceptance criteria

1. THE session SHALL last 300 seconds, with enemy spawning speeding up across night phases.
2. WHEN the timer reaches zero, THE game SHALL end the run as a win (dawn).
3. WHEN the cat's HP reaches zero, THE game SHALL end the run as a loss.
4. WHEN a run ends, THE game SHALL show a result screen with run stats and retry / back options.
5. THE simulation SHALL be deterministic for the same seed and input.

## Requirement 5: Controls and accessibility

**User story:** As a player on desktop or phone, I want simple controls, so that I can play anywhere.

### Acceptance criteria

1. THE game SHALL support WASD / arrow keys to move, Space to use the skill, and 1 / 2 / 3 (or a click / tap) to pick an upgrade card.
2. WHEN Esc or P is pressed, or the page is hidden, THE game SHALL pause.
3. WHERE the device prefers touch, THE game SHALL show a joystick and a skill button.
4. THE game SHALL respect `prefers-reduced-motion`.

## Requirement 6: Upgrades and evolution

**User story:** As a player, I want to grow stronger during the night, so that each run builds toward a payoff.

### Acceptance criteria

1. WHEN an enemy is defeated, THE game SHALL drop ink shards worth that enemy kind's XP; shards inside the pickup radius SHALL drift to the cat.
2. WHEN XP reaches the next level threshold (`xpForLevel`), THE game SHALL freeze the simulation and offer 3 distinct upgrade cards.
3. THE card pool SHALL contain shared cards and cards specific to the chosen cat; the other cat's cards SHALL never be offered.
4. WHEN Zero owns Quick Whiskers level 2 and Long Shadow level 2, THE game SHALL offer the Echo Legion evolution in the first slot; Echo Legion SHALL make the afterimage fire bolts and burst when it fades.
5. WHEN Nicole owns Another Star level 2 and Heavy Stars level 2, THE game SHALL offer the Full Moon evolution in the first slot; Full Moon SHALL add 2 moonstars and a periodic moon pulse that damages and pushes nearby enemies.
6. WHEN fewer than 3 regular cards are eligible, THE game SHALL fill a slot with the Warm Milk filler card, which heals 1 heart.
7. THE HUD SHALL show XP, level and owned upgrades; THE result screen SHALL show the level reached and the evolution if taken.

## Requirement 7: Enemy variety and the Eraser boss

**User story:** As a player, I want enemies that behave differently and a boss near dawn, so that the night escalates.

### Acceptance criteria

1. THE game SHALL spawn ink blobs, paper bats (fast, swooping), crumples (tough, splitting into 2 small enemies on defeat) and smudges (keep range, lob a telegraphed ink drop that leaves a slowing puddle), weighted per night phase by `SPAWN_TABLE`, plus fixed small waves (`WAVES`).
2. THE number of living enemies SHALL never exceed `ENEMY_CAP` (18).
3. WHEN 78% of the session has passed, THE Eraser boss SHALL appear with a banner and a HUD health bar.
4. THE boss SHALL use sweep, summon and charge attacks, each preceded by a visible telegraph.
5. WHEN the boss is defeated, THE game SHALL drop bonus shards and record the defeat in the run stats.

## Requirement 8: Yard interactions

**User story:** As a player, I want the town itself to help me, so that moving around the yard matters.

### Acceptance criteria

1. WHEN the cat touches one of the 3 pumpkins while it is charged, THE pumpkin SHALL light for 6 seconds, damaging and pushing nearby ink, then recharge for 14 seconds.
2. THE moon-lantern SHALL charge over 40 seconds; WHEN the cat touches it while full, THE game SHALL stun all enemies for 2.4 seconds (the boss for 0.9 seconds).
3. Fish treats SHALL appear from 35 seconds on at seeded random positions and heal 1 heart when collected.
4. Pumpkin, lantern and treat positions in the sim SHALL match the drawn scene props.

## Requirement 9: Feedback and game feel

**User story:** As a player, I want every hit and milestone to feel clear, so that the action reads at a glance.

### Acceptance criteria

1. WHEN an enemy is hit, THE game SHALL flash it, show a damage tag, and on defeat dissolve it into paper flakes.
2. WHEN kills follow each other within 2.6 seconds, THE game SHALL count a kill streak, show a badge from 3 kills, and grant bonus XP every 10 kills.
3. THE game SHALL show a ribbon notice for each new night phase, level-up and evolution bursts, and a warning vignette at critical health.
4. Over the last 30 seconds, THE scene SHALL move toward dawn (lower moon, warmer horizon, dimmer lamps).
5. Camera shake and UI motion SHALL be disabled under `prefers-reduced-motion`.
6. Rendering SHALL NOT consume the simulation RNG or mutate simulation state.

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

## Out of scope for now

Random helper cats (not built; confirm with the user before starting), deployment and Devpost submission (deadline 2026-12-05 06:00 Beijing time), and animation or video-recording verification (not unless the user asks).
