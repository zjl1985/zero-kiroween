import { impactContact, type CombatContact } from "../game/combat-observation.js";
import { EFFECT_LIFE, type Impact } from "../game/types.js";
import { visHash } from "./hash.js";
import { reducedPaperMotion } from "./paper-motion.js";
import { line, polygon, rect, type Point, type Ctx } from "./pixel-art.js";
import { PIXEL_PAPER as paper } from "./pixel-paper-colors.js";
import { screenAngle } from "./iso/projection.js";

function drawContact(ctx: Ctx, hit: CombatContact, t: number): void {
  const calm = reducedPaperMotion();
  const dx = hit.dx || (hit.dy === 0 ? 1 : 0), dy = hit.dy;
  const x = hit.x, y = hit.y - Math.min(16, Math.round(hit.radius * 1.2));
  const spread = calm ? 3 : t * 9;
  const p = (forward: number, side: number): Point => [x + dx * forward - dy * side, y + dy * forward + dx * side];
  const seam = (ax: number, ay: number, bx: number, by: number, color: string, w = 1) => {
    const a = p(ax, ay), b = p(bx, by);
    line(ctx, a[0], a[1], b[0], b[1], color, w);
  };
  ctx.save();
  ctx.globalAlpha *= (1 - t) * .94;
  switch (hit.family) {
    case "bolt":
      // The pulse splits forward across the surface instead of stopping as a line.
      for (const side of [-1, 1]) {
        polygon(ctx, [p(-4,0), p(3,side * 3), p(9 + spread, side * (6 + spread * .42)), p(4,side * 1)], side < 0 ? "#dff0d6" : "#8dbeb5");
      }
      seam(-5, 0, 5, 0, paper.fiber, 2);
      break;
    case "orbit":
    case "star-fall":
      polygon(ctx, [p(-5,0), p(1,-5), p(7 + spread,0), p(1,4)], hit.family === "orbit" ? "#b8acf0" : "#e1b46e");
      seam(-3, 0, 4 + spread * .4, 0, paper.fiber, 2);
      polygon(ctx, [p(5,5), p(10 + spread,8), p(7,3)], paper.reverse);
      break;
    case "seed":
    case "fire":
      polygon(ctx, [[x-5,y+2],[x-4,y-3],[x+3,y-4],[x+5,y+1],[x+1,y+4]], "#54434c");
      polygon(ctx, [[x-3,y],[x,y-8-spread],[x+2,y-2],[x+4,y+1],[x,y+2]], "#d08a59");
      rect(ctx, x, y-2, 1, 2, "#f1cb8b");
      break;
    case "wash":
    case "brush":
      polygon(ctx, [p(-5,-2), p(0,-5), p(6,-2), p(9 + spread,3), p(0,5)], "#6d8397");
      seam(-2, -1, 6 + spread * .52, 1, "#aac4c1", 2);
      seam(1, 3, 6 + spread * .52, 4, "#b598bc");
      break;
    default:
      // A small pressure fold with a cool reverse and broken cream edge.
      polygon(ctx, [p(-3,-5),p(4,0),p(9 + spread,-5),p(4,-6)], paper.reverseShade);
      polygon(ctx, [p(-3,4),p(4,0),p(7 + spread,6),p(3,5)], paper.reverse);
      seam(-3, -5, 4, 0, paper.fiber);
      seam(4, 0, 0, 4, paper.fiber, 2);
      break;
  }
  ctx.restore();
}

const INK_FACE: Record<string, string> = {
  "ink-blob": "#695076", smudge: "#72506b", "paper-bat": "#685e83",
  wash: "#7198a6", sketch: "#92928a", crumple: "#bbab87", "kiro-ghost": "#a38dae", "eraser-boss": "#905f6c",
};

function drawRemnants(ctx: Ctx, e: Impact, hit: CombatContact | undefined): void {
  const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE.dissolve));
  const calm = reducedPaperMotion();
  const scorched = hit?.family === "seed" || hit?.family === "fire";
  const wet = e.src === "wash" || hit?.family === "brush" || hit?.family === "wash";
  const face = INK_FACE[e.src ?? ""] ?? "#807293", seed = e.seed ?? 0;
  const pieces = scorched ? 3 : 4;
  const originX = e.x, originY = e.y - 8;
  // Hit direction is a world vector; scatter along its projected screen direction.
  const heading = hit ? screenAngle(hit.dx, hit.dy) : 0;
  ctx.save();
  ctx.globalAlpha *= 1 - t;
  if (wet) {
    // A damp print collapses into a shallow puddle with two pale paper edges.
    const rx = 5 + (calm ? 5 : t * 12);
    polygon(ctx, [[originX-rx,e.y],[originX-rx*.5,e.y-3],[originX+rx*.55,e.y-2],[originX+rx,e.y+1],[originX+1,e.y+4],[originX-rx*.6,e.y+3]], "#798f9b");
    line(ctx, originX - rx * .52, e.y + 1, originX + rx * .28, e.y + 1, "#b8c5bb");
  }
  for (let i = 0; i < pieces; i++) {
    const angle = heading + (i - (pieces - 1) / 2) * .88 + (visHash(seed + i * 13) - .5) * .4;
    const distance = 5 + (calm ? 10 : t * (15 + i * 4));
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = originX + dx * distance, y = originY + dy * distance * .62 - (calm ? 2 : (scorched ? t * 20 : t * (1 - t) * 25));
    const sz = Math.max(2, (7 - i * .8) * (1 - t * .56));
    const a: Point = [x - sz,y], b: Point = [x + sz*.65,y - sz*.62];
    const c: Point = [x + sz*.7,y + sz*.27], d: Point = [x - sz*.35,y + sz*.55];
    polygon(ctx, [a,b,c,d], scorched ? "#4e444b" : wet ? "#9fadb2" : face);
    polygon(ctx, [a,b,[x,y + sz*.32]], scorched ? "#79574e" : wet ? "#c0cbc1" : paper.reverse);
    line(ctx, a[0], a[1], b[0], b[1], scorched ? "#af764f" : paper.fiber);
    if (scorched && t < .55) rect(ctx, x + 1, y - 3, 2, 1, "#df995c");
  }
  ctx.restore();
}

export function drawCombatFeedback(ctx: Ctx, impact: Impact): boolean {
  if (impact.kind === "dissolve") {
    drawRemnants(ctx, impact, impactContact(impact));
    return true;
  }
  if (impact.kind !== "hit" && impact.kind !== "defeat") return false;
  const contact = impactContact(impact);
  if (!contact) return false;
  const life = impact.kind === "hit" ? .16 : .32;
  drawContact(ctx, contact, Math.max(0, Math.min(1, 1 - impact.life / life)));
  return true;
}
