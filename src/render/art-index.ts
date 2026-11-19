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
import { KIRO_GHOST_ART } from "../defs/enemies/kiro-ghost/art.js";
import { SMUDGE_ART } from "../defs/enemies/smudge/art.js";
import { WASH_ART } from "../defs/enemies/wash/art.js";
import { SKETCH_ART } from "../defs/enemies/sketch/art.js";
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
import { WATERCOLOUR_BRUSH_ART } from "../defs/weapons/watercolour-brush.art.js";
import { PAPER_CUT_ART } from "../defs/weapons/paper-cut.art.js";
import { PAGE_FOLD_ART } from "../defs/weapons/page-fold.art.js";
import { PAPER_BUSH_ART } from "../defs/props/paper-bush/art.js";
import { PAPER_FENCE_ART } from "../defs/props/paper-fence/art.js";
import { PAPER_GRASS_ART } from "../defs/props/paper-grass/art.js";
import { CLOCK_TOWER_ART } from "../defs/landmarks/clock-tower/art.js";
import { GRAVEYARD_ART } from "../defs/landmarks/graveyard/art.js";
import { LANTERN_MARKET_ART } from "../defs/landmarks/lantern-market/art.js";
import { MOON_HILL_ART } from "../defs/landmarks/moon-hill/art.js";
import { PUMPKIN_FIELD_ART } from "../defs/landmarks/pumpkin-field/art.js";
import { STONE_BRIDGE_ART } from "../defs/landmarks/stone-bridge/art.js";
import { PAPER_LANTERNS_ART } from "../defs/props/paper-lanterns/art.js";
import { SCARECROW_ART } from "../defs/props/scarecrow/art.js";
import { HAYBALE_ART } from "../defs/props/haybale/art.js";
import { PAPER_CRATE_ART } from "../defs/props/paper-crate/art.js";
import { MAILBOX_ART } from "../defs/props/mailbox/art.js";
import { SIGNPOST_ART } from "../defs/props/signpost/art.js";
import { PAPER_FLOWERS_ART } from "../defs/props/paper-flowers/art.js";
import { PAPER_REEDS_ART } from "../defs/props/paper-reeds/art.js";
import { PAPER_MUSHROOM_ART } from "../defs/props/paper-mushroom/art.js";
import { LAUNDRY_LINE_ART } from "../defs/props/laundry-line/art.js";
import { PAPER_TOMBSTONE_ART } from "../defs/props/paper-tombstone/art.js";
import { DEAD_TREE_ART } from "../defs/props/dead-tree/art.js";
import { INK_VAT_ART } from "../defs/props/ink-vat/art.js";
import { WAX_CANDLE_ART } from "../defs/props/wax-candle/art.js";
import { WATER_BUCKET_ART } from "../defs/props/water-bucket/art.js";
import { PAPER_WINDMILL_ART } from "../defs/landmarks/paper-windmill/art.js";
import { PUPPET_THEATRE_ART } from "../defs/landmarks/puppet-theatre/art.js";
import { WISHING_WELL_ART } from "../defs/landmarks/wishing-well/art.js";
import { PAPER_TEAHOUSE_ART } from "../defs/landmarks/paper-teahouse/art.js";
import { FOLD_GREENHOUSE_ART } from "../defs/landmarks/fold-greenhouse/art.js";
import { STAR_OBSERVATORY_ART } from "../defs/landmarks/star-observatory/art.js";
import { OLD_TOWN_ART } from "../defs/biomes/old-town.art.js";
import { PUMPKIN_FARM_ART } from "../defs/biomes/pumpkin-farm.art.js";
import { GRAVEYARD_WOODS_ART } from "../defs/biomes/graveyard-woods.art.js";
import { LANTERN_CANAL_ART } from "../defs/biomes/lantern-canal.art.js";
import { MOON_MEADOW_ART } from "../defs/biomes/moon-meadow.art.js";
import { LAMPLIGHTER_MOUSE_ART } from "../defs/townsfolk/lamplighter-mouse/art.js";
import { STARGAZER_OWL_ART } from "../defs/townsfolk/stargazer-owl/art.js";
import { FERRY_FROG_ART } from "../defs/townsfolk/ferry-frog/art.js";
import { BIOME_ART, CAT_ART, ENEMY_ART, LANDMARK_ART, PASSIVE_ART, PROP_ART, TOWNSFOLK_ART, WEAPON_ART } from "./art-registry.js";

export * from "./art-registry.js";

for (const a of [ZERO_ART, NICOLE_ART]) CAT_ART.register(a);
for (const a of [INK_BLOB_ART, PAPER_BAT_ART, CRUMPLE_ART, SMUDGE_ART, ERASER_BOSS_ART, KIRO_GHOST_ART, WASH_ART, SKETCH_ART])
  ENEMY_ART.register(a);
for (const a of [
  MEOW_BOLT_ART,
  NIGHT_CLAW_ART,
  ECHO_LEGION_ART,
  MOON_STARS_ART,
  STAR_FALL_ART,
  FULL_MOON_ART,
  PAPER_CRANE_ART,
  PUMPKIN_SEED_ART,
  WATERCOLOUR_BRUSH_ART,
  PAPER_CUT_ART,
  PAGE_FOLD_ART,
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
for (const a of [
  PAPER_FENCE_ART,
  PAPER_BUSH_ART,
  PAPER_GRASS_ART,
  PAPER_LANTERNS_ART,
  SCARECROW_ART,
  HAYBALE_ART,
  PAPER_CRATE_ART,
  MAILBOX_ART,
  SIGNPOST_ART,
  PAPER_FLOWERS_ART,
  PAPER_REEDS_ART,
  PAPER_MUSHROOM_ART,
  LAUNDRY_LINE_ART,
  PAPER_TOMBSTONE_ART,
  DEAD_TREE_ART,
  INK_VAT_ART,
  WAX_CANDLE_ART,
  WATER_BUCKET_ART,
])
  PROP_ART.register(a);
for (const a of [
  CLOCK_TOWER_ART,
  PUMPKIN_FIELD_ART,
  STONE_BRIDGE_ART,
  GRAVEYARD_ART,
  LANTERN_MARKET_ART,
  MOON_HILL_ART,
  PAPER_WINDMILL_ART,
  PUPPET_THEATRE_ART,
  WISHING_WELL_ART,
  PAPER_TEAHOUSE_ART,
  FOLD_GREENHOUSE_ART,
  STAR_OBSERVATORY_ART,
])
  LANDMARK_ART.register(a);
for (const a of [OLD_TOWN_ART, PUMPKIN_FARM_ART, GRAVEYARD_WOODS_ART, LANTERN_CANAL_ART, MOON_MEADOW_ART]) BIOME_ART.register(a);
for (const a of [LAMPLIGHTER_MOUSE_ART, STARGAZER_OWL_ART, FERRY_FROG_ART]) TOWNSFOLK_ART.register(a);
