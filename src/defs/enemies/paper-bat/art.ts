import type { EnemyArt } from "../../../render/art-registry.js";
import { dashed, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";

/** Folded black paper with notched wings and a centre crease. */
function drawBat(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#6d6283")) return;
  const flap = Math.sin(time * 15 + e.id * 1.3),
    hover = 20 + Math.sin(time * 3 + e.id) * 2,
    x = e.x,
    y = e.y - hover,
    face = look.x < x ? -1 : 1;
  shadow(ctx, x, e.y, 9, 3);
  for (const side of [-1, 1]) {
    const tip = y - 6 - flap * 7,
      pts: Point[] = [
        [x + side * 3, y - 2],
        [x + side * 9, y - 7 - flap * 3],
        [x + side * 17, tip],
        [x + side * 15, y + 2 - flap * 2],
        [x + side * 12, y - 1 - flap * 2],
        [x + side * 10, y + 4 - flap],
        [x + side * 7, y + 1],
        [x + side * 4, y + 5],
      ];
    piece(ctx, path(pts), side === face ? "#2d2638" : "#25202f", {
      shadow: 1.6,
      edge: "#6c5f86",
      texture: 0.7,
      thickness: 0.7,
    });
    // The fold that turns a flat cutout into a wing.
    line(ctx, x + side * 4, y, x + side * 15, tip + 2, "#5a4e70", 0.7, 0.8);
  }
  const body = path([
    [x - 4, y - 5],
    [x - 3, y - 10],
    [x - 1.5, y - 7],
    [x + 1.5, y - 7],
    [x + 3, y - 10],
    [x + 4, y - 5],
    [x + 4, y + 3],
    [x, y + 6],
    [x - 4, y + 3],
  ]);
  piece(ctx, body, "#1f1a28", {
    shadow: 1,
    edge: "#7b6d93",
    texture: 0.6,
    thickness: 0.6,
  });
  line(ctx, x, y - 6, x, y + 5, "#4c4160", 0.6);
  for (const dx of [-1.7, 1.7]) googly(ctx, x + dx, y - 3, 1.7, look, time, e.id + (dx > 0 ? 1 : 0));
  hpStrip(ctx, e, e.y + 6, 14);
}

export const PAPER_BAT_ART: EnemyArt = {
  id: "paper-bat",
  draw: drawBat,
  dissolve: { flakes: ["#221c2c", "#372d42", "#4b3d55", "#c9a76f"], count: 10 },
};
