import type { EnemyArt } from "../../../render/art-registry.js";
import { dangerRing, enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { crease, flatLayer } from "../../../render/paper-kit.js";
import { line, oval, type Ctx } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";
import { WASH_DRIP } from "./def.js";

const DYE = "#4f86a8", DYE_SHADE = "#386a8c", RIM = "#cfe6ef", WATER = "#a9cfdc";

/** One teardrop of blue-dyed paper; the half away from the moon folds into shade. */
function dropCut(): Path2D {
  return new Path2D("M 0 -17 C 4 -10 12 -3 12 5 C 12 12 6 15 0 15 C -6 15 -12 12 -12 5 C -12 -3 -4 -10 0 -17 Z");
}
function bodyPart() {
  return enemyPart("wash:body", 40, 44, (c) => {
    const drop = flatLayer(c, { shape: dropCut(), color: DYE, rim: RIM, texture: 0.35, lift: 1.2, thickness: 1.1 });
    c.save();
    c.clip(drop);
    c.fillStyle = DYE_SHADE;
    c.fill(new Path2D("M 0 -17 C -4 -10 -12 -3 -12 5 C -12 12 -6 15 0 15 L 0 -17 Z"));
    c.restore();
    crease(c, 0, -16, 0, 14, 0.55);
    // A pale water window: the paper is soaked through on its belly.
    flatLayer(c, { shape: oval(2, 6, 6.5, 5, 3, 0.2), color: WATER, rim: "#eef8fa", texture: 0.25, lift: 0.3, thickness: 0.5 });
    line(c, -1, 4, 3, 3, "#eef8fa", 0.8, 0.8);
  });
}
function dripPart() {
  return enemyPart("wash:drip", 16, 18, (c) => {
    flatLayer(c, { shape: new Path2D("M 0 -5 Q 4 1 3 3 Q 0 6 -3 3 Q -4 1 0 -5 Z"), color: DYE, rim: RIM, texture: 0.2, lift: 0.6 });
  });
}

function drawWash(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#8fbcd0")) return;
  const wind = (e.windup ?? 0) > 0 ? 1 - (e.windup ?? 0) / WASH_DRIP.windup : 0,
    bob = Math.sin(time * 2.6 + e.id) * 1.2,
    y = e.y - 15 + bob - wind * 2;
  enemyShadow(ctx, e.x, e.y, 11, 3.5);
  ctx.save();
  ctx.translate(e.x, y);
  // Swells up before it spits, then relaxes.
  ctx.scale(1 + wind * 0.08, 1 - wind * 0.06);
  bodyPart().draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  // A drop leaks from the hem on a slow beat.
  const leak = (time * 0.7 + (e.id % 5) * 0.2) % 1;
  dripPart().draw(ctx, { x: e.x - 4, y: e.y - 1 + leak * 4, scale: 0.55 * (1 - leak * 0.5) });
  googly(ctx, e.x - 3.6, y + 1, 2.3, look, time, e.id, wind > 0);
  googly(ctx, e.x + 3.8, y + 0.5, 2.1, look, time, e.id + 1, wind > 0);
  if (wind > 0) dripPart().draw(ctx, { x: e.x, y: y - 20 - wind * 3, scale: 0.6 + wind * 0.6 });
  hpStrip(ctx, e, e.y + 5, 18);
}

export const WASH_ART: EnemyArt = {
  id: "wash",
  draw: drawWash,
  ground(ctx, e) {
    if ((e.windup ?? 0) > 0 && e.tx !== undefined && e.ty !== undefined)
      dangerRing(ctx, e.tx, e.ty, WASH_DRIP.splashRadius, 1 - e.windup! / WASH_DRIP.windup);
  },
  dissolve: { flakes: [DYE, DYE_SHADE, WATER, "#e8f2f4"], count: 10 },
};
