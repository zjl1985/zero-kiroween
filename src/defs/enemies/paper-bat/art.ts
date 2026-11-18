import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { line, path, type Ctx, type Point } from "../../../render/paper-material.js";
import { crease, flatLayer } from "../../../render/paper-kit.js";
import type { EnemyState } from "../../../game/types.js";

// One origami wing, shoulder at (0, 0), spreading to +x: a leading spar, then
// pleated facets between finger tips, with scalloped cuts between the tips.
const SPAR: Point = [7, -9];
const TIPS: readonly Point[] = [[17, -13], [19.5, -3.5], [15, 4.5], [7, 7]];
/** Mountain facets catch the moon; valley facets fall into shadow. */
const FACETS = ["#77688f", "#3a3049", "#5e5174", "#2c2438"] as const;

function wingPoints(side: number): Point[] {
  const out: Point[] = [[0, 0], SPAR];
  TIPS.forEach(([x, y], i) => {
    out.push([x, y]);
    const next = TIPS[i + 1];
    // Scallop between two finger tips: cut back toward the shoulder.
    if (next) out.push([(x + next[0]) * 0.36, (y + next[1]) * 0.36 + 1]);
  });
  out.push([1.5, 4.5]);
  return out.map(([x, y]) => [x * side, y] as Point);
}

/** A cached wing per side, so the folds keep their light from the top-right instead of mirroring it. */
function wing(side: number) {
  return enemyPart(`bat-wing:${side}`, 46, 38, (c) => {
    const outline = wingPoints(side), cut = path(outline);
    flatLayer(c, { shape: cut, color: "#2f273b", rim: "#a395b7", texture: 0.45, lift: 1, thickness: 1.1 });
    c.save();
    c.clip(cut);
    const fan: Point[] = [SPAR, ...TIPS];
    for (let i = 0; i < fan.length - 1; i++) {
      const a = fan[i]!, b = fan[i + 1]!,
        // Light from the top-right: on the right wing the upper facets face it; on the left they turn away.
        lit = side > 0 ? FACETS[i]! : FACETS[(i + 1) % 4]!;
      c.fillStyle = lit;
      c.fill(path([[0, 0], [a[0] * side * 1.15, a[1] * 1.15], [b[0] * side * 1.15, b[1] * 1.15]]));
    }
    c.restore();
    // Valley and mountain creases fan out from the shoulder.
    for (const [i, [x, y]] of TIPS.entries()) crease(c, 0.5 * side, 0, x * side * 0.97, y * 0.97, i % 2 ? 0.45 : 0.8);
    crease(c, 0, 0, SPAR[0] * side, SPAR[1], 0.6);
    // The leading spar is a doubled-over strip of paper.
    flatLayer(c, { shape: path([[0, -0.5], [SPAR[0] * side, SPAR[1]], [TIPS[0]![0] * side, TIPS[0]![1]], [4 * side, -3]].map(([x, y]) => [x, y] as Point)),
      color: "#8f80a6", rim: "#d6c7e4", lift: 0.35, texture: 0.25, thickness: 0.6 });
  });
}

/** Two folded wings hinge at the shoulders around a kite-folded body with pointed ears. */
function drawBat(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#6d6283")) return;
  const flap = Math.sin(time * 15 + e.id * 1.3),
    y = e.y - 20 - Math.sin(time * 3 + e.id) * 2;
  enemyShadow(ctx, e.x, e.y, 10, 3.2);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(e.x + side * 3, y - 2);
    ctx.rotate(side * (-0.16 - flap * 0.3));
    ctx.scale(1, 0.85 + flap * 0.2);
    wing(side).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  }
  enemyPart("bat-body", 26, 34, (c) => {
    const body = path([[-4.4, -5], [-3.6, -11], [-1.4, -7.4], [1.4, -7.4], [3.6, -11], [4.4, -5], [4.2, 3], [0, 7.5], [-4.2, 3]]);
    flatLayer(c, { shape: body, color: "#2a2233", rim: "#a28eb7", texture: 0.45, lift: 0.9, thickness: 1 });
    c.save();
    c.clip(body);
    // A mountain fold down the middle: the moon side is lighter.
    c.fillStyle = "#52445f";
    c.fill(path([[0, -8], [5, -12], [5, 4], [0, 8]]));
    c.fillStyle = "#3b3047";
    c.fill(path([[0, -2], [5, -1], [5, 1], [0, 1.5]]));
    c.restore();
    crease(c, 0, -7.4, 0, 7.2, 0.7);
    crease(c, -4, -1.5, 4, -1.2, 0.35);
    for (const side of [-1, 1]) {
      // Inner ear flaps folded forward.
      flatLayer(c, { shape: path([[side * 1.8, -7.2], [side * 3.3, -9.8], [side * 3.4, -6.4]]), color: "#b98a9a", rim: "#e4c3cc", lift: 0.2, texture: 0.1, thickness: 0.4 });
      flatLayer(c, { shape: path([[side * 1.1, 1.6], [side * 2.1, 1.6], [side * 1.5, 3.6]]), color: "#f0e2c7", lift: 0, texture: 0.1, thickness: 0.3 });
    }
    line(c, -1.5, 2, 1.5, 2, "#c5b4c4", 0.5);
  }).draw(ctx, { x: e.x, y });
  for (const dx of [-1.7, 1.7]) googly(ctx, e.x + dx, y - 3, 1.7, look, time, e.id + (dx > 0 ? 1 : 0));
  hpStrip(ctx, e, e.y + 6, 14);
}
export const PAPER_BAT_ART: EnemyArt = {
  id: "paper-bat", draw: drawBat,
  previewBounds: { l: -27, r: 27, t: -40, b: 10 },
  crownY: -32,
  dissolve: { flakes: ["#221c2c", "#372d42", "#77688f", "#c9a76f"], count: 10 },
};
