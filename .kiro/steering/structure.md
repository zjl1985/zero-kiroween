---
inclusion: always
---

# Project structure

Content is built as definitions + hooks + registries. To add or change content, follow the `midnight-meow-dev` skill (`.kiro/skills/midnight-meow-dev/SKILL.md` and its `references/` recipes).

```
index.html            DOM screens (theater title / playbill cat choice, journal HUD, folded pause page,
                      upgrade cards, journal result page, #gallery-screen); data-style="papercraft"
styles.css            UI styling in the papercraft night-watch journal look (no url() textures)
vercel.json           static deployment: npm ci, npm run build, output site/
scripts/build-site.mjs   package HTML, CSS and current compiled JS; exclude maps and stale outputs
site/                generated deployment output, git-ignored; npm start serves this directory
.vercelignore        exclude local task state, development output and internal docs from CLI upload
src/main.ts           boot, screen flow, resize, input wiring, follow camera, render loop, prefs,
                      audio cues and event timelines derived from sim counters; ?start=1, ?seed=N,
                      ?gallery=1 (bootGallery)
src/engine/           content-agnostic, imports no other layer (tested)
  registry.ts         createRegistry: id -> def, registration order kept, clear errors
  events.ts           createEventBus: typed synchronous sim events
  sprite.ts           cachedSprite (offscreen canvas LRU, 256), imageSprite (capability only, unused)
src/defs/             content definitions (numbers + hooks); sim defs never import render or the DOM
  types.ts            CharacterDef, WeaponDef, PassiveDef, EvolutionDef, EnemyDef, EnemyBehaviour,
                      SimContext, SimEvents, PlayerStats, Element, MaterialDef, ReactionDef, PropDef,
                      LandmarkDef, LandmarkActivity, BiomeDef, WaterShape, WaterRegion, WaterCrossing ...
  registries.ts       CATS, WEAPON_DEFS, PASSIVE_DEFS, EVOLUTION_DEFS, ENEMY_DEFS, BEHAVIOURS, MATERIALS,
                      REACTIONS, PROP_DEFS, LANDMARK_DEFS, BIOME_DEFS, SIM_EVENTS
  index.ts            registers cats, weapons, passives, evolutions, behaviours, enemies; gates hooks
  world-index.ts      registers materials, reactions, props, landmarks, biomes (world-gen imports it)
  progression.ts      BUILD slots, XP curve
  horde.ts            HORDE (hardCap 100), FILLER_KIND, KIND_CAP, PHASE_AT, ELITE, SPAWN_TABLE, WAVES
  materials.ts, fire.ts   paper materials; FIRE and PROP_HITS numbers
  water.ts            pure shore/core/crossing polygon helpers, WATER tuning and teaching basin
  wash.ts             WASH: wash-out colour grid numbers (cell 32, max 600, tick, splash, pigment,
                      lantern/pumpkin repaint, bucket, cut/fold marks, paper rain, dawn, sketch wake)
  ecology.ts          ink fuel multiplier, safe collider clearance and lifecycle retry timing
  landmark-activities.ts   four activity definitions, shared court anchors and reward/rotor tuning
  cats/<id>/          stats.ts, def.ts, art.ts (zero, nicole)
  weapons/<id>.ts     + <id>.art.ts; steps.ts, timers.ts helpers (11 weapons incl. 2 evolved; the
                      common watercolour-brush, Zero's paper-cut and Nicole's page-fold come last);
                      paper-geometry.ts pure loop closing / polygon tests for Paper Cut and the crease
  passives/<id>.ts    + <id>.art.ts (11 incl. the snack filler)
  evolutions/<id>.ts  echo-legion, full-moon
  enemies/<id>/       def.ts, art.ts (ink-blob, paper-bat, crumple, smudge, eraser-boss, kiro-ghost,
                      wash, sketch); behaviours.ts, fx-life.ts, eraser-boss/attacks.ts (also blanks wash cells)
  reactions/<id>.ts   27 unique material x element rows (wash-* for water); tear.ts, paper-status.ts helpers
  props/<id>/         def.ts, art.ts (18 props, including ink-vat / wax-candle / water-bucket; 5 renewable flora)
  landmarks/<id>/     def.ts, art.ts (12 kinds over 24 sites); ground-kit.art.ts flat per-kind bases
                      (riverbank, fence yard, furrows, boards, tiles, fringed mounds, stone ring);
                      night-workshop-kit.art.ts shared beams, folded plants, pots and star motifs
  biomes/<id>.ts      + <id>.art.ts (5 districts); districts.ts (DISTRICTS, BASE_DECOR)
src/game/             generic simulation, no DOM, no per-cat literals (tested)
  sim.ts              createSim, step, snapshot, chunk loading, ring spawning, makeRoom, weapons by
                      timing, shards, upgrades, elites, chests and evolution, Boss, interactions,
                      landmark discovery, win / lose; applyElement / igniteAt for tools and tests
  props.ts            prop phases, element reactions, capped fire, safe unfolding/regrowth, lifetime loot
  paper-status.ts     radius fire/water contact, carried burn, normal damage hooks and wet protection
  water.ts            shared region queries, dry/shallow/deep/bridge status, swept movement/recovery
  landmark-actions.ts   per-site activity charge/cooldowns, bounded renewal and integrated wind turn
  wash.ts             sparse wash-out colour grid: water lifts colour, Eraser blanks, pigment / lanterns /
                      pumpkins / brush / dawn repaint; paper rain, sketch wakes, colourKept; pure readers
                      (washLevelAt, washCellAt, isColourless, washEmpty ...)
  stats.ts            playerStats fold from the registries
  world-gen.ts        bounded seeded world: SCREEN, WORLD (10 x 10 screens), CHUNK, LANDMARK, landmarks,
                      roads, districtSites, biomeAt, chunkContent (pure hash), nearColliders, nearProps;
                      waterRegionsNear (pure spatial index independent of chunkContent, explicit crossings)
  characters.ts, upgrades.ts, enemies.ts
                      facades that keep the old export names over the registries
  interactions.ts     pumpkins, moon-lantern, fish treats, chests (start yard spots match scene.ts props)
  types.ts            SimState, PaperStatus, PropState, LandmarkEventState, STATS, EFFECT_LIFE, FX_CAP,
                      EffectKind, Notice
  input.ts            keyboard input (WASD / arrows, Space skill, Esc / P pause, 1 / 2 / 3 cards)
  collision.ts, scenery.ts, rng.ts, clock.ts
  seed.ts             pure decimal uint32 query-pin validation (invalid pins use fresh randomness)
src/render/           Canvas drawing; reads SimState, never mutates it, never uses the sim RNG
  art-registry.ts     CatArt, EnemyArt, WeaponArt, PassiveArt, PropArt, LandmarkArt, DecorPiece, BiomeArt
                      and their registries; catArt, activeWeaponArt, upgradeIcon, effectPainter, shotArt
  art-index.ts        registers every art file (the only module that imports them)
  paper-kit.ts        paperCut, paperStack, foldLine, stitchAlong, charEdge, tornEdge, warmGlow; flat
                      ruleset helpers flatLayer, paperEmblem, flatCut, flatShadow, fringeStrip, crease
  paper-rules.ts      ruleset data: PAPER_LIGHT (top-right), PAPER_SHADOW (down-right), PAPER_EDGE,
                      PAPER_LAYERS 1..3, PAPER_VALUE, probeGloss for the gallery gloss check
  paper-value.ts      bake-time value grade for ground/decor tiles, lit cut rim for enemy parts and the cat
  wash-art.ts         wash-out masks per chunk, tide lines, wet film, blank, cut-hole blots, blooms,
                      splash / pigment / rain effects (no work when the grid is empty)
  pencil.ts           pencil primitives (raw paper, gapped lines, construction lines, hatching)
  sprite-sketch.ts    cached sketched sprite variants and pooled scratch canvases for live actors
  prop-kit.ts         phasedPaint (intact / damaged / scraps from one painter), post
  variants.ts         variant(seed, base): seeded colour, scale, tilt, wear, mirror (render hash only)
  sprite-tint.ts      cached offscreen alpha-masked tints for burning props and folding decor
  paper-ground.ts     district ground sheets (seam styles, fringe-cut lower edges), global order
  paper-material.ts   low-level paper fiber, cut edges, thickness, shadows, stitching, glow
  paper-scraps.ts     scrap pieces, ash patch, torn stubs
  paper-face.ts       cached visible color contours / silhouette from untouched official data;
                      shared world head and portrait cuts, original anchors and narrow rim
  paper-status-art.ts read-only actor flame/char and wet overlays; steam, ink, regrow, reward cues
  water-art.ts        exact simulation shore/core/crossing vertices, layered paper water and dry decks
  craft-props.ts      prop phases, alpha-masked ink, deferred fold/regrow looks, real fire-cell marks
  craft-world.ts      per-chunk ground caches, roads, hedge, biome patches, landmark ground and pieces,
                      shared water/decks, pop-up folding, bounds-based occlusion, live pieces and activity
                      progress, culling, nav arrows, landmarkPreview
  gallery.ts          paintGallery for ?gallery=1
  camera.ts           follow camera (deadzone, smoothing, clamp to WORLD)
  craft-scene.ts      screen-space sky, world-space hills and ground, trees, houses, start yard, dawn
  craft-cat.ts        official-derived layered paper head / narrow edge over the articulated body
  cat-detail.ts       finite cached clothing / limb / lantern parts selected by appearance metadata
  scenery-details.ts shared folded leaf, fern and flower painters for grouped scenery
  craft-combat.ts, combat-fx.ts, craft-enemies.ts, craft-juice.ts
                      shared painters the art files call (no per-kind switch)
  timeline.ts         pure cue timelines, slow motion, zoom, card deal stagger, POPUP fold numbers
  cue-fx.ts           evolution, Boss entrance / defeat, dawn and finale effects
  journal-ui.ts       Canvas painters for the journal HUD and result page
  upgrade-icons.ts, world.ts, viewport.ts, hash.ts
  scene.ts, layout.ts, pixel*.ts, cast.ts
                      legacy code that craft-scene still uses for layout coordinates and symbols;
                      not a second art style, do not delete blindly
src/ui/               hud.ts, journal.ts, journal-geometry.ts (pure, tested), character-panel.ts (tickets
                      built from CATS), upgrade-cards.ts, gallery-layout.ts (pure, tested),
                      environment-copy.ts (hazard-priority and court guidance), ink.ts, touch.ts
src/content/          i18n: keys.ts (MESSAGE_KEYS), en.ts, zh.ts, i18n.ts (t, missingKeys, formatTime)
src/audio/sfx.ts      procedural Web Audio sound effects and ambience (incl. tear, crackle), mute
src/cats/             Meow Wall official cat head data (meow-wall-art.ts CAT_VARIANTS), composition
tests/*.test.mjs      node:test suites against dist/ (characters, enemies, gallery, interactions, journal,
                      official, reactions, registry, scenery, sim, timeline, tokens, upgrades, viewport,
                      world); ecology suites: environment-integration, fire-water, landmark-actions,
                      paper-elements, paper-visuals, water; wash-out round: paper-rules, wash,
                      paper-verbs, paper-value (latest verification: 295 passing tests)
.kiro/skills/midnight-meow-dev/   the development workflow skill and its recipes
docs/archive/         obsolete history, not instructions
output/playwright/    local screenshots/probes, git-ignored, not game assets; the wash-out round's
                      ?gallery=1 still was never produced (Chrome headless exit 134 in the sandbox)
```
