/**
 * Twelve-Notes Cat: a little yellow sticky note on the ear, two more stuck on
 * the chest and a twelve-cell folded notebook in the paw. The skill drops
 * sticky-note pads on the ground.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { LEVELS_SKILL } from "./def.js";

const COLORS = { tag: "#ecd062", ink: "#fff6c8" } as const;
const LOOK: ZoneLook = { aura: LEVELS_SKILL.burst };
const NOTE = "#ecd062";

export const LEVELS_ART: CostumeArt = {
  id: "levels",
  colors: COLORS,
  makeup: { accessories: ["sticky-note"] },
  outfit: {
    parts: [
      {
        // Two little notes stuck on the chest, one with a lifted corner.
        layer: "torso",
        box: [-10, -29, 10, -12],
        at: [0, 0],
        paint(c) {
          cut(c, [[-8, -22], [-3.4, -22.6], [-2.8, -18], [-7.4, -17.4]], NOTE, 0.35, 0.4);
          cut(c, [[2.6, -26.4], [7.2, -26], [7, -21.4], [2.4, -21.8]], "#e9a3b0", 0.35, 0.4);
          cut(c, [[-2.8, -18], [-4.4, -17.6], [-3.2, -19.4]], "#b89c3c", 0.2, 0.3);
        },
      },
      {
        // A folded notebook: cover flap and a 3 x 4 grid of note cells.
        layer: "hand",
        box: [-10, -12, 11, 10],
        at: [1, 0],
        paint(c) {
          cut(c, [[-8, -9], [8, -9.4], [8.4, 7], [-7.6, 7.4]], "#efe2c4");
          for (let i = 1; i < 3; i++) outfitLine(c, -8 + i * 5.4, -8.8, -7.8 + i * 5.4, 7, "#a99a7c", 0.35, 0.8);
          for (let j = 1; j < 4; j++) outfitLine(c, -7.8, -9 + j * 4.1, 8.2, -9.4 + j * 4.1, "#a99a7c", 0.35, 0.8);
          cut(c, [[-8, -9], [-5, -9.2], [-5, -5], [-8, -4.8]], NOTE, 0.2, 0.3);
          cut(c, [[-8.4, -9.8], [-6.4, -9.8], [-6.4, 7.8], [-8.4, 7.8]], "#5876a8", 0.3, 0.35);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [-40, 0, 40].map((x, i) => ({ kind: "pad" as const, x, y: i % 2 ? -8 : 8, radius: LEVELS_SKILL.radius, until: 1, power: 1, armed: 0 })), 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[10, 12], [22, 11], [23, 23], [11, 24]]);
  },
};
