/**
 * Registers the paper world defs: materials, the reaction rows, props and
 * landmarks.
 * src/defs/index.ts imports this, and so does src/game/world-gen.ts, which
 * places props and cannot import the full defs index (horde.ts imports
 * world-gen, so that would be a cycle). These files import no game module.
 * Adding a reaction or prop means one file and one line here.
 */
import { CARD, CLOTH, INK, THIN_PAPER, WAX } from "./materials.js";
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
import { LANDMARK_DEFS, MATERIALS, PROP_DEFS, REACTIONS } from "./registries.js";

for (const m of [THIN_PAPER, CARD, INK, CLOTH, WAX]) MATERIALS.register(m);
for (const r of [TEAR_THIN_PAPER, TEAR_CARD, TEAR_CLOTH, GUST_THIN_PAPER, BURN_THIN_PAPER]) REACTIONS.register(r);
// Order is world-gen order: migrated decor first, then scattered props.
for (const p of [PAPER_FENCE, PAPER_BUSH, PAPER_GRASS]) PROP_DEFS.register(p);
// Order is the order world-gen hands kinds out (each at least once).
for (const l of [CLOCK_TOWER, PUMPKIN_FIELD, STONE_BRIDGE, GRAVEYARD, LANTERN_MARKET, MOON_HILL]) LANDMARK_DEFS.register(l);

/** The reaction row for a material and element, if any. */
export function reactionFor(material: string, element: string) {
  return REACTIONS.all().find((r) => r.material === material && r.element === element);
}
