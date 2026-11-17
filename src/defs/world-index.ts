/**
 * Registers the paper world defs: materials, the reaction rows, props,
 * landmarks and district biomes.
 * src/defs/index.ts imports this, and so does src/game/world-gen.ts, which
 * places props and cannot import the full defs index (horde.ts imports
 * world-gen, so that would be a cycle). These files import no game module.
 * Adding a reaction or prop means one file and one line here.
 */
import { OLD_TOWN } from "./biomes/old-town.js";
import { PUMPKIN_FARM } from "./biomes/pumpkin-farm.js";
import { GRAVEYARD_WOODS } from "./biomes/graveyard-woods.js";
import { LANTERN_CANAL } from "./biomes/lantern-canal.js";
import { MOON_MEADOW } from "./biomes/moon-meadow.js";
import { CARD, CLOTH, INK, STRAW, THIN_PAPER, WAX } from "./materials.js";
import { DEAD_TREE } from "./props/dead-tree/def.js";
import { HAYBALE } from "./props/haybale/def.js";
import { LAUNDRY_LINE } from "./props/laundry-line/def.js";
import { MAILBOX } from "./props/mailbox/def.js";
import { PAPER_CRATE } from "./props/paper-crate/def.js";
import { PAPER_FLOWERS } from "./props/paper-flowers/def.js";
import { PAPER_LANTERNS } from "./props/paper-lanterns/def.js";
import { PAPER_MUSHROOM } from "./props/paper-mushroom/def.js";
import { PAPER_REEDS } from "./props/paper-reeds/def.js";
import { PAPER_TOMBSTONE } from "./props/paper-tombstone/def.js";
import { SCARECROW } from "./props/scarecrow/def.js";
import { SIGNPOST } from "./props/signpost/def.js";
import { PAPER_WINDMILL } from "./landmarks/paper-windmill/def.js";
import { PUPPET_THEATRE } from "./landmarks/puppet-theatre/def.js";
import { WISHING_WELL } from "./landmarks/wishing-well/def.js";
import { PAPER_TEAHOUSE } from "./landmarks/paper-teahouse/def.js";
import { FOLD_GREENHOUSE } from "./landmarks/fold-greenhouse/def.js";
import { STAR_OBSERVATORY } from "./landmarks/star-observatory/def.js";
import { BURN_STRAW } from "./reactions/burn-straw.js";
import { GUST_CLOTH } from "./reactions/gust-cloth.js";
import { GUST_STRAW } from "./reactions/gust-straw.js";
import { TEAR_STRAW } from "./reactions/tear-straw.js";
import { PAPER_BUSH } from "./props/paper-bush/def.js";
import { PAPER_FENCE } from "./props/paper-fence/def.js";
import { PAPER_GRASS } from "./props/paper-grass/def.js";
import { BURN_THIN_PAPER } from "./reactions/burn-thin-paper.js";
import { GUST_THIN_PAPER } from "./reactions/gust-thin-paper.js";
import { TEAR_CARD } from "./reactions/tear-card.js";
import { TEAR_CLOTH } from "./reactions/tear-cloth.js";
import { TEAR_THIN_PAPER } from "./reactions/tear-thin-paper.js";
import { CLOCK_TOWER } from "./landmarks/clock-tower/def.js";
import { GRAVEYARD } from "./landmarks/graveyard/def.js";
import { LANTERN_MARKET } from "./landmarks/lantern-market/def.js";
import { MOON_HILL } from "./landmarks/moon-hill/def.js";
import { PUMPKIN_FIELD } from "./landmarks/pumpkin-field/def.js";
import { STONE_BRIDGE } from "./landmarks/stone-bridge/def.js";
import { BIOME_DEFS, LANDMARK_DEFS, MATERIALS, PROP_DEFS, REACTIONS } from "./registries.js";

for (const m of [THIN_PAPER, CARD, INK, CLOTH, WAX, STRAW]) MATERIALS.register(m);
for (const r of [
  TEAR_THIN_PAPER,
  TEAR_CARD,
  TEAR_CLOTH,
  GUST_THIN_PAPER,
  BURN_THIN_PAPER,
  TEAR_STRAW,
  GUST_STRAW,
  BURN_STRAW,
  GUST_CLOTH,
])
  REACTIONS.register(r);
// Migrated decor first (fence, bush), then the props districts scatter.
for (const p of [
  PAPER_FENCE,
  PAPER_BUSH,
  PAPER_GRASS,
  PAPER_LANTERNS,
  SCARECROW,
  HAYBALE,
  PAPER_CRATE,
  MAILBOX,
  SIGNPOST,
  PAPER_FLOWERS,
  PAPER_REEDS,
  PAPER_MUSHROOM,
  LAUNDRY_LINE,
  PAPER_TOMBSTONE,
  DEAD_TREE,
])
  PROP_DEFS.register(p);
// Order is the order world-gen hands kinds out (each at least once).
for (const l of [
  CLOCK_TOWER,
  PUMPKIN_FIELD,
  STONE_BRIDGE,
  GRAVEYARD,
  LANTERN_MARKET,
  MOON_HILL,
  PAPER_WINDMILL,
  PUPPET_THEATRE,
  WISHING_WELL,
  PAPER_TEAHOUSE,
  FOLD_GREENHOUSE,
  STAR_OBSERVATORY,
])
  LANDMARK_DEFS.register(l);
// District biomes; the first is also the start yard's district.
for (const b of [OLD_TOWN, PUMPKIN_FARM, GRAVEYARD_WOODS, LANTERN_CANAL, MOON_MEADOW]) BIOME_DEFS.register(b);

/** The reaction row for a material and element, if any. */
export function reactionFor(material: string, element: string) {
  return REACTIONS.all().find((r) => r.material === material && r.element === element);
}
