/** The ink blob: a wobbling cut-paper drop of ink (drawn by craft-combat.ts). */
import type { EnemyArt } from "../../../render/art-registry.js";
import { drawCraftBlob } from "../../../render/craft-combat.js";
import { enemyMaxHp } from "../../../game/sim.js";
import { INK_BLOB } from "./def.js";

export const INK_BLOB_ART: EnemyArt = {
  id: "ink-blob",
  draw(ctx, e, time) {
    drawCraftBlob(
      ctx,
      e.x,
      e.y,
      time,
      e.id,
      (e.hp / enemyMaxHp(e)) * INK_BLOB.stats.hp,
      e.slowTime > 0,
      e.spawnTime,
    );
  },
  dissolve: { flakes: ["#2c2340", "#3d3156", "#5a4a74", "#e8d9bd"], count: 10 },
};
