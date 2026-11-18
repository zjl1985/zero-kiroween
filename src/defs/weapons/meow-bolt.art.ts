/** Card art for meow-bolt. */
import type { WeaponArt } from "../../render/art-registry.js";
import { paperEmblem, starPoints } from "../../render/paper-kit.js";
import { boltPoints } from "../../render/upgrade-icons.js";

export const MEOW_BOLT_ART: WeaponArt = {
  id: "meow-bolt",
  /** A warm paper burst behind a bent meowline shard, with a small cut star at the tip. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: starPoints(22, 10, 8.5, 8, 0.52, -0.2), color: "#e2a35a", lift: 0.8 },
      { shape: boltPoints(14, 18, -0.72, 12), color: ink, fold: { from: [5, 25], to: [23, 9], depth: 0.22, side: 1 } },
      { shape: starPoints(23, 9, 4, 4, 0.42, 0), color: "#fff1c6", lift: 1.2 },
    ]);
  },
};
