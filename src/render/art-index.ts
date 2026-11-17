/**
 * Registers every art entry. Import this once from the render / UI entry
 * points (world.ts, main.ts and the UI painters do); the sim never imports it.
 * Order follows the sim defs index: cats and enemies as listed there, weapons
 * in WEAPON_DEFS order (that order also decides draw order within a layer).
 * Adding content means adding an art file beside its def and one line here.
 * Import-safe in Node: art modules only define painters.
 */
import { NICOLE_ART } from "../defs/cats/nicole/art.js";
import { ZERO_ART } from "../defs/cats/zero/art.js";
import { CRUMPLE_ART } from "../defs/enemies/crumple/art.js";
import { ERASER_BOSS_ART } from "../defs/enemies/eraser-boss/art.js";
import { INK_BLOB_ART } from "../defs/enemies/ink-blob/art.js";
import { PAPER_BAT_ART } from "../defs/enemies/paper-bat/art.js";
import { SMUDGE_ART } from "../defs/enemies/smudge/art.js";
import { DEEP_FOLD_ART } from "../defs/passives/deep-fold.art.js";
import { FOCUS_ART } from "../defs/passives/focus.art.js";
import { LONG_SHADOW_ART } from "../defs/passives/long-shadow.art.js";
import { MAGNET_ART } from "../defs/passives/magnet.art.js";
import { MOON_SHIELD_ART } from "../defs/passives/moon-shield.art.js";
import { NIGHT_EYES_ART } from "../defs/passives/night-eyes.art.js";
import { PAPER_ARMOR_ART } from "../defs/passives/paper-armor.art.js";
import { SCHOLAR_ART } from "../defs/passives/scholar.art.js";
import { SNACK_ART } from "../defs/passives/snack.art.js";
import { SWIFT_ART } from "../defs/passives/swift.art.js";
import { VITALITY_ART } from "../defs/passives/vitality.art.js";
import { ECHO_LEGION_ART } from "../defs/weapons/echo-legion.art.js";
import { FULL_MOON_ART } from "../defs/weapons/full-moon.art.js";
import { MEOW_BOLT_ART } from "../defs/weapons/meow-bolt.art.js";
import { MOON_STARS_ART } from "../defs/weapons/moon-stars.art.js";
import { NIGHT_CLAW_ART } from "../defs/weapons/night-claw.art.js";
import { PAPER_CRANE_ART } from "../defs/weapons/paper-crane.art.js";
import { PUMPKIN_SEED_ART } from "../defs/weapons/pumpkin-seed.art.js";
import { STAR_FALL_ART } from "../defs/weapons/star-fall.art.js";
import { PAPER_BUSH_ART } from "../defs/props/paper-bush/art.js";
import { PAPER_FENCE_ART } from "../defs/props/paper-fence/art.js";
import { PAPER_GRASS_ART } from "../defs/props/paper-grass/art.js";
import { CLOCK_TOWER_ART } from "../defs/landmarks/clock-tower/art.js";
import { GRAVEYARD_ART } from "../defs/landmarks/graveyard/art.js";
import { LANTERN_MARKET_ART } from "../defs/landmarks/lantern-market/art.js";
import { MOON_HILL_ART } from "../defs/landmarks/moon-hill/art.js";
import { PUMPKIN_FIELD_ART } from "../defs/landmarks/pumpkin-field/art.js";
import { STONE_BRIDGE_ART } from "../defs/landmarks/stone-bridge/art.js";
import { CAT_ART, ENEMY_ART, LANDMARK_ART, PASSIVE_ART, PROP_ART, WEAPON_ART } from "./art-registry.js";

export * from "./art-registry.js";

for (const a of [ZERO_ART, NICOLE_ART]) CAT_ART.register(a);
for (const a of [INK_BLOB_ART, PAPER_BAT_ART, CRUMPLE_ART, SMUDGE_ART, ERASER_BOSS_ART]) ENEMY_ART.register(a);
for (const a of [
  MEOW_BOLT_ART,
  NIGHT_CLAW_ART,
  ECHO_LEGION_ART,
  MOON_STARS_ART,
  STAR_FALL_ART,
  FULL_MOON_ART,
  PAPER_CRANE_ART,
  PUMPKIN_SEED_ART,
])
  WEAPON_ART.register(a);
for (const a of [
  VITALITY_ART,
  SWIFT_ART,
  MAGNET_ART,
  FOCUS_ART,
  SCHOLAR_ART,
  PAPER_ARMOR_ART,
  NIGHT_EYES_ART,
  LONG_SHADOW_ART,
  DEEP_FOLD_ART,
  MOON_SHIELD_ART,
  SNACK_ART,
])
  PASSIVE_ART.register(a);
for (const a of [PAPER_FENCE_ART, PAPER_BUSH_ART, PAPER_GRASS_ART]) PROP_ART.register(a);
for (const a of [CLOCK_TOWER_ART, PUMPKIN_FIELD_ART, STONE_BRIDGE_ART, GRAVEYARD_ART, LANTERN_MARKET_ART, MOON_HILL_ART])
  LANDMARK_ART.register(a);
