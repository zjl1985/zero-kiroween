# Requirements: Midnight Meow

## Introduction

Midnight Meow is a browser night-watch game. The player picks Zero or Nicole and protects a papercraft night town from ink blobs for one 300-second night. All visuals are drawn by TypeScript on Canvas.

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

1. THE game SHALL support WASD / arrow keys to move and Space to use the skill.
2. WHEN Esc or P is pressed, or the page is hidden, THE game SHALL pause.
3. WHERE the device prefers touch, THE game SHALL show a joystick and a skill button.
4. THE game SHALL respect `prefers-reduced-motion`.

## Requirement 6: English language

**User story:** As a hackathon judge or international player, I want the game in English, so that I can understand it without switching languages.

### Acceptance criteria

1. WHEN the game loads for the first time, THE game SHALL display English.
2. THE game SHALL present all user-facing text in English throughout a run (title, selection, HUD, notices, pause, results).
3. All user-facing strings SHALL go through the i18n message keys.

Open question: whether the Chinese pack and language toggle are removed or kept as an option. Confirm with the user.

## Out of scope for now

Upgrades, more enemy types, a Boss, random helper cats, audio, deployment, and animation or video-recording verification. These wait until the user accepts the static art.
