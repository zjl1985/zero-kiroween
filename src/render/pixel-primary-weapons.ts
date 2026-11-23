import { cachedSprite } from "../engine/sprite.js";
import { shotLaunch } from "../game/combat-observation.js";
import type { Impact, ShotState } from "../game/types.js";
import type { EffectProgress } from "./art-registry.js";
import { reducedPaperMotion } from "./paper-motion.js";
import { rect, line, polygon, type Point, type Ctx } from "./pixel-art.js";
import { PIXEL_PAPER as paper } from "./pixel-paper-colors.js";
import { ISO, toScreen } from "./iso/projection.js";

const BOLT = [
  { face: "#97cbbf", shade: "#567e85", tip: "#dff0d6" },
  { face: "#c8c9ee", shade: "#676f9d", tip: "#efe3f7" },
  { face: "#e4b77b", shade: "#94624f", tip: "#fff0c5" },
] as const;
const HEADINGS = 16;
function boltSprite(vx: number, vy: number, tone: number) {
  const heading = (Math.round(Math.atan2(vy, vx) * HEADINGS / (Math.PI * 2)) + HEADINGS) % HEADINGS;
  const p = BOLT[tone];
  return cachedSprite(`sound-blade:${heading}:${tone}`, 42, 42, 1, ctx => {
    const angle = heading / HEADINGS * Math.PI * 2, dx = Math.cos(angle), dy = Math.sin(angle);
    const face = (points: readonly Point[], color: string) => polygon(ctx,
      points.map(([x, y]) => [21 + dx * x - dy * y, 21 + dy * x + dx * y]), color);
    // A curved pulse head and its open throat read at normal speed. The
    // second, much smaller wave stays detached behind the head.
    face([[-6,-10],[3,-8],[10,-3],[12,0],[10,4],[3,9],[-6,11],[-1,6],[2,2],[2,-2],[-1,-6]], paper.edge);
    face([[-4,-9],[3,-7],[9,-3],[10,0],[8,3],[2,8],[-4,9],[1,5],[5,1],[4,-3],[0,-6]], p.face);
    face([[1,-7],[7,-4],[10,0],[7,2],[5,0],[4,-3]], p.tip);
    face([[-3,9],[3,6],[8,2],[9,4],[2,8]], p.shade);
    face([[-14,-5],[-10,-3],[-8,0],[-10,3],[-14,5],[-11,0]], p.shade);
  }, { x: .5, y: .5 });
}
export function paintSoundBlade(ctx: Ctx, x: number, y: number, vx: number, vy: number, empowered = false, echo = false): void {
  boltSprite(vx, vy, empowered ? 2 : echo ? 1 : 0).draw(ctx, { x: Math.round(x), y: Math.round(y) });
}

/**
 * The launch mark remains at the real muzzle while the pulse travels. Drawn
 * atFoot(shot) in the iso view: the blade sits on the shot's own point and
 * turns with the screen direction of its projected velocity; the launch mark
 * is placed at the projection of its world muzzle relative to the shot.
 */
export function drawBoltFlight(ctx: Ctx, shot: ShotState, elapsed: number): void {
  const heading = toScreen(shot.vx, shot.vy), here = toScreen(shot.x, shot.y);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, Math.max(.15, shot.life / .075));
  paintSoundBlade(ctx, shot.x, shot.y - 14, heading.x, heading.y, shot.empowered, shot.echo);
  ctx.restore();
  const start = shotLaunch(shot);
  if (!start) return;
  const age = elapsed - start.at;
  if (age < 0 || age >= .105) return;
  const p = BOLT[shot.empowered ? 2 : shot.echo ? 1 : 0];
  const muzzle = toScreen(start.x, start.y), aim = toScreen(start.dx, start.dy), len = Math.hypot(aim.x, aim.y) || 1;
  // The painter runs under the upright scale (ISO.k), so screen offsets are divided by it.
  const x = shot.x + (muzzle.x - here.x) / ISO.k, y = shot.y + (muzzle.y - here.y) / ISO.k - 14, dx = aim.x / len, dy = aim.y / len;
  const fade = 1 - age / .105, spread = 3 + fade * 2;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, fade * 1.65);
  for (const side of [-1, 1]) {
    const sx = x - dy * spread * side, sy = y + dx * spread * side;
    line(ctx, sx - dx * 6, sy - dy * 6, sx + dx * 1.5, sy + dy * 1.5, p.face, 2);
  }
  line(ctx, x - dx * 4, y - dy * 4, x + dx * 3, y + dy * 3, p.tip, 2);
  ctx.restore();
}

// Four widths expose a real reverse and narrow cut edge as the paper turns.
const STAR_PITCH = [1, .68, .27, .67, 1, .67, .25, .68] as const;
const STAR_FACE = ["#c2b0de", "#e3bf7e", "#e8c87f"] as const;
function paperStar(frame: number, tone: number) {
  return cachedSprite(`folded-star:${tone}:${frame}`, 30, 30, 1, ctx => {
    const pitch = STAR_PITCH[frame]!, back = frame >= 3 && frame <= 5;
    const face = back ? paper.reverse : STAR_FACE[tone]!;
    const shade = back ? paper.reverseShade : tone === 0 ? "#887ba8" : "#a47756";
    const points = (r: number): Point[] => Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 5, reach = i % 2 ? r * .48 : r;
      return [15 + Math.cos(a) * reach * pitch, 15 + Math.sin(a) * reach];
    });
    polygon(ctx, points(13), paper.edge);
    const inner = points(11.4);
    polygon(ctx, inner, face);
    polygon(ctx, [[15,15], inner[2]!, inner[3]!, inner[4]!, inner[5]!], shade);
    polygon(ctx, [inner[0]!, inner[1]!, [15,15], inner[9]!, inner[8]!], back ? "#c6c4c2" : paper.fiber);
    line(ctx, inner[8]![0], inner[8]![1], inner[9]![0], inner[9]![1], paper.fiber);
  }, { x: .5, y: .5 });
}

export function drawOrbitPaperStar(ctx: Ctx, x: number, y: number, index: number, time: number, full: boolean): void {
  const pose = reducedPaperMotion() ? 0 : Math.floor(time * 13 + index * 2) % STAR_PITCH.length;
  const scale = full ? .93 : .78;
  // The anchor is the star's actual y-sort key. The shadow is a brief, small
  // contact reference to the collision plane underneath the flying paper.
  ctx.save();
  ctx.globalAlpha *= .38;
  rect(ctx, x - 4, y, 8, 2, paper.shadow);
  ctx.restore();
  paperStar(pose, index % 2).draw(ctx, { x: Math.round(x), y: Math.round(y - 14), scale });
}

/** This is called on the damage step. The leading point is already at the
 * impact; the visible line above it is the remnant of its approach. */
export function drawStarFallStrike(ctx: Ctx, impact: Impact, { t, fade }: EffectProgress): void {
  const { x, y } = impact;
  const calm = reducedPaperMotion();
  ctx.save();
  ctx.globalAlpha *= fade;
  if (t < .27) {
    if (!calm) {
      const trail = 54 * (1 - t / .27);
      polygon(ctx, [[x + 9,y - 20 - trail],[x + 12,y - 20 - trail], [x + 2,y - 15],[x - 3,y - 15]], '#c5a479');
      line(ctx, x + 9, y - 18 - trail * .76, x - 1, y - 13, paper.fiber, 2);
    }
    rect(ctx, x - 7, y, 14, 2, paper.shadow);
    paperStar(calm ? 0 : t < .12 ? 0 : 2, 2).draw(ctx, { x: Math.round(x), y: Math.round(y - 10) });
    // Contact is a pair of sharp paper impressions, not a ground ring.
    line(ctx, x - 10, y - 1, x - 3, y + 1, paper.fiber, 2);
    line(ctx, x + 3, y + 1, x + 10, y - 1, paper.fiber, 2);
  }
  const spread = calm ? 7 : 3 + t * 18, lift = calm ? 3 : t * (1 - t) * 36;
  for (const side of [-1, 1]) {
    const xx = x + side * spread, yy = y - 2 - lift;
    polygon(ctx, [[xx,yy],[xx + side * 5, yy - 3],[xx + side * 7, yy - 1],[xx + side * 4,yy + 1]], side > 0 ? '#d0a16c' : paper.fiber);
  }
  ctx.restore();
}
