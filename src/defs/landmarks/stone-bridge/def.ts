import type { LandmarkDef } from "../../types.js";

/** River band numbers. halfLength stays under one chunk width so the 3 x 3 collider window always covers it. */
export const RIVER = { halfLength: 420, halfWidth: 30, bridgeHalf: 100, deckHalf: 70 } as const;

/** A paper river crossed by a stone deck; the banks are solid. */
export const STONE_BRIDGE: LandmarkDef = {
  id: "stone-bridge",
  radius: 160,
  span(l, area) {
    return Math.min(RIVER.halfLength, l.x - area.west, area.east - l.x, Math.abs(l.x - area.spineX) - area.spineClear / 2);
  },
  keepOut(l, x, y, pad) {
    return Math.abs(y - l.y) < RIVER.halfWidth + pad + 10 && Math.abs(x - l.x) < (l.span ?? 0) + pad;
  },
  layout(l, b) {
    const r = RIVER,
      span = l.span ?? r.halfLength,
      bank = r.halfWidth + 4;
    b.wall(-span, 0, -r.bridgeHalf, 0, bank);
    b.wall(r.bridgeHalf, 0, span, 0, bank);
    b.wall(-r.deckHalf, -bank, -r.deckHalf, bank, 4);
    b.wall(r.deckHalf, -bank, r.deckHalf, bank, 4);
    b.add("lamp", -r.deckHalf - 22, -64, 0.95, 1);
    b.add("lamp", r.deckHalf + 22, 70, 0.95, 2);
    b.add("stone", -150, 52, 0.9, 3);
    b.add("stone", 170, -50, 0.7, 4);
    b.add("bush", -210, -60, 0.9, 5);
    b.add("tuft", 120, 54, 1, 6);
    b.add("tuft", -110, -50, 1, 7);
  },
};
