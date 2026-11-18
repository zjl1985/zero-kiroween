import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { line, path, piece, type Ctx } from "../../../render/paper-material.js";
import { foldLine } from "../../../render/paper-kit.js";
import type { EnemyState } from "../../../game/types.js";

/** Fixed notched cuts hinge at the shoulders; the wing's two faces stay legible in motion. */
function drawBat(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#6d6283")) return;
  const flap = Math.sin(time * 15 + e.id * 1.3),
    y = e.y - 20 - Math.sin(time * 3 + e.id) * 2;
  enemyShadow(ctx, e.x, e.y, 9, 3);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(e.x + side * 3, y - 2);
    ctx.scale(side, 1);
    ctx.rotate(-0.16 - flap * 0.3);
    ctx.scale(1, 0.85 + flap * 0.2);
    enemyPart("bat-wing", 42, 36, (c) => {
      const wing = path([[0, 0], [6, -7], [16, -12], [13, 2], [10, -1], [8, 5], [5, 1], [1, 6]]);
      piece(c, wing, "#393046", { shadow: 1.2, edge: "#a395b7", texture: 0.6, thickness: 0.9 });
      c.fillStyle = "#766184";
      c.fill(path([[0, 0], [6, -7], [16, -12], [7, -1]]));
      c.fillStyle = "#211c2c";
      c.fill(path([[0, 0], [7, -1], [13, 2], [10, -1], [8, 5], [5, 1], [1, 6]]));
      foldLine(c, 0, 0, 15, -11, 0.75);
      foldLine(c, 1, 1, 8, 4, 0.4);
      // A turned-over wing tip and shoulder tab make the hinge read as folded card.
      piece(c, path([[8, -6], [16, -12], [14, -4], [11, -2]]), "#a291b0",
        { shadow: 0.3, edge: "#d6c7d9", texture: 0.3, thickness: 0.45 });
      line(c, 2, -1, 5, -3, "#cab8cd", 0.7, 0.75);
    }).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  }
  enemyPart("bat-body", 24, 34, (c) => {
    piece(c, path([[-4, -5], [-3, -10], [-1.5, -7], [1.5, -7], [3, -10], [4, -5], [4, 3], [0, 6], [-4, 3]]), "#282031", { shadow: 1, edge: "#a28eb7", texture: 0.55, thickness: 0.8 });
    c.fillStyle = "#51405e";
    c.fill(path([[0, -6], [3, -3], [2, 3], [0, 5]]));
    foldLine(c, 0, -6, 0, 5, 0.55);
    for (const side of [-1, 1]) {
      piece(c, path([[side * 2, -7], [side * 3, -9], [side * 3.2, -6]]), "#bd8d9d",
        { shadow: 0, edge: "#ddbec7", texture: 0.15, thickness: 0.3 });
      piece(c, path([[side * 1.2, 1.5], [side * 2.1, 1.5], [side * 1.5, 3.4]]), "#f0e2c7",
        { shadow: 0, texture: 0.1, thickness: 0.2 });
    }
    line(c, -1.5, 2, 1.5, 2, "#c5b4c4", 0.5);
  }).draw(ctx, { x: e.x, y });
  for (const dx of [-1.7, 1.7]) googly(ctx, e.x + dx, y - 3, 1.7, look, time, e.id + (dx > 0 ? 1 : 0));
  hpStrip(ctx, e, e.y + 6, 14);
}
export const PAPER_BAT_ART: EnemyArt = {
  id: "paper-bat", draw: drawBat,
  previewBounds: { l: -25, r: 25, t: -39, b: 10 },
  crownY: -32,
  dissolve: { flakes: ["#221c2c", "#372d42", "#4b3d55", "#c9a76f"], count: 10 },
};
