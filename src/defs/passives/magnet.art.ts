/** Card art for magnet. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece } from "../../render/paper-material.js";
import { star } from "../../render/combat-fx.js";
import { crescent } from "../../render/craft-combat.js";

export const MAGNET_ART: PassiveArt = {
  id: "magnet",
  icon(ctx, ink) {
    piece(ctx, crescent(14, 16, 9, Math.PI), ink, { shadow: 1, thickness: 0.6 });
    for (const [x, y] of [[24, 10], [27, 17], [23, 23]] as const) star(ctx, x, y, 2.5, "#f3cf82");
  },
};
