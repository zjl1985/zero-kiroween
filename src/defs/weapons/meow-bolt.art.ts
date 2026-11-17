/** Card art for meow-bolt. */
import type { WeaponArt } from "../../render/art-registry.js";
import { glow } from "../../render/paper-material.js";
import { star } from "../../render/combat-fx.js";
import { bolt } from "../../render/upgrade-icons.js";

export const MEOW_BOLT_ART: WeaponArt = {
  id: "meow-bolt",
  icon(ctx, ink) {
    bolt(ctx, 15, 17, -0.75, 9, ink);
    glow(ctx, 22, 10, 9, "#ffce7d", 0.6);
    star(ctx, 22, 10, 4, "#fff1c6");
  },
};
