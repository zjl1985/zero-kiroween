import type { LandmarkDef } from "../../types.js";
import { WATER, waterRect } from "../../water.js";

/** River band dimensions shared by water geometry and the stone landing art. */
export const RIVER = { halfLength: 420, halfWidth: 50, bridgeHalf: 100, deckHalf: 70 } as const;

/** A paper river with walkable shallow banks and a dry stone deck. */
export const STONE_BRIDGE: LandmarkDef = {
  id: "stone-bridge",
  radius: 160,
  span(l, area) {
    return Math.min(RIVER.halfLength, l.x - area.west, area.east - l.x, Math.abs(l.x - area.spineX) - area.spineClear / 2);
  },
  keepOut(l, x, y, pad) {
    return Math.abs(y - l.y) < RIVER.halfWidth + pad + 10 && Math.abs(x - l.x) < (l.span ?? 0) + pad;
  },
  water(l) {
    const span = l.span ?? RIVER.halfLength, { x, y } = l;
    return [{ id: `${l.id}:channel`, seed: l.seed,
      shore: waterRect(x - span, y - RIVER.halfWidth, x + span, y + RIVER.halfWidth),
      core: waterRect(x - span + WATER.rim, y - RIVER.halfWidth + WATER.rim,
        x + span - WATER.rim, y + RIVER.halfWidth - WATER.rim),
      crossings: [{ id: `${l.id}:deck`, polygon: waterRect(x - RIVER.deckHalf, y - RIVER.halfWidth - 16,
        x + RIVER.deckHalf, y + RIVER.halfWidth + 16) }],
    }];
  },
  layout(_l, b) {
    const r = RIVER;
    b.add("lamp", -r.deckHalf - 22, -64, 0.95, 1);
    b.add("lamp", r.deckHalf + 22, 70, 0.95, 2);
    b.add("stone", -150, 76, 0.9, 3);
    b.add("stone", 170, -76, 0.7, 4);
    b.add("bush", -210, -92, 0.9, 5);
    b.add("tuft", 120, 74, 1, 6);
    b.add("tuft", -110, -74, 1, 7);
  },
};
