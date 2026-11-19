/**
 * Branch Gatekeeper Cat: a collar with an original folded blue-grey paper bird
 * tag (round body, cream belly, side beak; not any project mascot) and a
 * forked paper tree in the paw. The skill shows two twig branches meeting
 * at a safe merge ring.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, oval } from "../../../render/costume-outfit.js";
import { LINUS_SKILL } from "./def.js";

const COLORS = { tag: "#8fb07a", ink: "#eef6e0" } as const;
const LOOK: ZoneLook = { lane: "branch", circle: "safe" };

export const LINUS_ART: CostumeArt = {
  id: "linus",
  colors: COLORS,
  makeup: { accessories: ["bird-tag"] },
  outfit: {
    parts: [
      {
        // A forked paper sapling: one trunk, two branches, a leaf cluster at each tip.
        layer: "hand",
        box: [-13, -23, 14, 9],
        at: [0, 0],
        paint(c) {
          cut(c, [[-1, 5], [1, 5], [1.2, -5], [6, -12], [4.6, -13], [0, -7.4], [-4.4, -13.6], [-5.8, -12.4], [-1.2, -5]], "#7b5a3f", 0.5);
          for (const [x, y] of [[-6, -15], [6, -14], [-8.4, -11.6], [8.6, -11]] as const) cut(c, oval(x, y, 3.6, 2.8), "#6f9b5a", 0.45);
          cut(c, oval(0, -9.6, 2.2, 1.8), "#8db876", 0.2, 0.3);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [
      { kind: "lane", x: -70, y: -24, x2: 40, y2: 0, radius: LINUS_SKILL.width, until: 1, power: 0 },
      { kind: "lane", x: -70, y: 24, x2: 40, y2: 0, radius: LINUS_SKILL.width, until: 1, power: 0 },
      { kind: "circle", x: 48, y: 0, radius: LINUS_SKILL.radius * 0.4, until: 1, power: 1 },
    ], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[15.6, 25], [17.4, 25], [17.4, 18], [22, 12], [20.6, 11], [16.5, 16], [12.4, 11], [11, 12], [15.6, 18]]);
  },
};
