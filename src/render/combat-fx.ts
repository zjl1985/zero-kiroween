import {
  piece as paperPiece,
  path as paperPath,
  glow as light,
} from "./paper-material.js";
import type { SimState, Impact, ShotState } from "../game/types.js";
import { EFFECT_LIFE } from "../game/types.js";
import type { CatId } from "../cats/types.js";
import {
  activeWeaponArt,
  catArt,
  effectPainter,
  shotArt,
  type SkillIconKind,
} from "./art-registry.js";
import { orbitPositions } from "../game/sim.js";
import { rect, type Ctx } from "./pixel-art.js";
import { combatPart } from "./craft-combat.js";
import { foldLine } from "./paper-kit.js";
import { stroke } from "./paper-material.js";

export function ring(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  ratio = 1,
  progress = 1,
): void {
  if (r <= 0 || ratio <= 0 || progress <= 0) return;
  const end = Math.min(1, progress) * Math.PI * 2, cut = new Path2D();
  // Eight paper arcs leave room for actors, instead of 96 separately drawn dashes.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, b = Math.min(end, a + Math.PI / 4 - 0.065);
    if (a >= b) break;
    cut.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * ratio);
    cut.ellipse(x, y, r, r * ratio, 0, a, b);
  }
  stroke(ctx, cut, "#231c30", 2.8, 0.4);
  stroke(ctx, cut, color, 1.2);
}
export function star(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  angle = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  combatPart(`star:${color}`, 26, 26, (c) => {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rr = i % 2 ? 2.56 : 8;
      points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    paperPiece(c, paperPath(points), color, { shadow: 0.6, texture: 0.35, thickness: 0.65 });
    c.fillStyle = "#fff3d155";
    c.fill(paperPath([[0, -8], [0, 0], [-2.56, -2.56]]));
    foldLine(c, 0, -6, 0, 6, 0.45);
  }).draw(ctx, { x: 0, y: 0, scale: r / 8 });
  ctx.restore();
}
/** Flat marks under the cat: its own ground art, then each active weapon's. */
export function drawCombatGround(ctx: Ctx, state: SimState): void {
  catArt(state.player.id).ground?.(ctx, state);
  for (const w of activeWeaponArt(state)) w.ground?.(ctx, state);
}
export function drawOrbitStar(
  ctx: Ctx,
  x: number,
  y: number,
  time: number,
  index: number,
  full = false,
): void {
  light(ctx, x, y - 12, full ? 22 : 17, full ? "#f1dca6" : "#c2a6ee", 0.24, 1);
  paperTrail(ctx, x, y - 12, time * 1.2 + index, 18, full ? "#c5b58d" : "#9b84bf", 0.65);
  star(ctx, x, y - 12, full ? 8.5 : 7, full ? "#efe2bd" : "#d7c8f6", time * 1.2 + index);
  star(ctx, x, y - 12, full ? 4 : 3, "#fff1ce", time * 1.2 + index);
}
/** Two tapered paper ribbons separated by air, not an opaque glow over enemies. */
export function paperTrail(ctx: Ctx, x: number, y: number, angle: number, length: number, color: string, width = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(length / 28, width);
  combatPart(`trail:${color}`, 44, 18, (c) => {
    c.globalAlpha = 0.48;
    paperPiece(c, paperPath([[-19, -4], [9, -1.6], [-8, -1.2]]), color, { shadow: 0, texture: 0.2, thickness: 0.35 });
    c.globalAlpha = 0.27;
    paperPiece(c, paperPath([[-16, 3.5], [7, 1], [-6, 1.2]]), color, { shadow: 0, texture: 0.2, thickness: 0.35 });
  }).draw(ctx, { x: -9, y: 0 });
  ctx.restore();
}
/** Weapon art in front of the cat, then the moon shield. */
export function drawCombatFront(ctx: Ctx, state: SimState): void {
  const p = state.player;
  for (const w of activeWeaponArt(state)) w.front?.(ctx, state);
  if (p.shield > 0 && p.shieldTime > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, p.shieldTime * 2);
    light(ctx, p.x, p.y - 28, 45, "#8caccf", 0.09, 1);
    ring(ctx, p.x, p.y - 29, 34, "#b9c9ec", 1.22);
    ring(ctx, p.x, p.y - 29, 37, "#827ba9", 1.2, 0.65);
    for (let i = 0; i < p.shield; i++)
      star(ctx, p.x + (i - (p.shield - 1) / 2) * 10, p.y - 77, 3, "#e4ddff");
    ctx.restore();
  }
}
export function drawSkillEffect(ctx: Ctx, e: Impact, state?: SimState): void {
  if (e.kind in EFFECT_LIFE) {
    drawCelebration(ctx, e, state);
    return;
  }
  const duration =
      e.kind === "rescue"
        ? 0.8
        : e.kind === "fold"
          ? 0.6
          : e.kind === "hurt"
            ? 0.35
            : 0.4,
    t = 1 - e.life / duration;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  const color =
    e.kind === "hurt" ? "#e29789" : e.kind === "dash" ? "#e9bf72" : "#c0b5ef";
  light(ctx, e.x, e.y - 15, 50, color, (1 - t) * 0.19, 0.7);
  if (e.kind === "hurt") {
    for (let i = 0; i < 5; i++)
      rect(
        ctx,
        e.x + Math.cos(i * 1.25) * (15 + t * 12),
        e.y - 22 + Math.sin(i * 1.25) * (15 + t * 12),
        2,
        2,
        color,
      );
  } else {
    const r = e.kind === "fold" ? 18 + t * 60 : 14 + t * 35;
    ring(ctx, e.x, e.y, r, color, e.kind === "shield" ? 1 : 0.65);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      star(
        ctx,
        e.x + Math.cos(a) * r,
        e.y + Math.sin(a) * r * 0.65,
        2 + (1 - t) * 2,
        color,
        a,
      );
    }
  }
  ctx.restore();
}
/** Level-up, evolution, Echo burst, moon pulse and shard pickup feedback. */
function drawCelebration(ctx: Ctx, e: Impact, state?: SimState): void {
  const life = EFFECT_LIFE[e.kind as keyof typeof EFFECT_LIFE],
    t = Math.min(1, Math.max(0, 1 - e.life / life)),
    fade = 1 - t,
    ease = 1 - (1 - t) ** 3;
  ctx.save();
  if (e.kind === "collect") {
    ctx.globalAlpha = fade;
    light(ctx, e.x, e.y - 10, 12, "#f3cf82", 0.35 * fade, 1);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + t * 2;
      rect(
        ctx,
        e.x + Math.cos(a) * (3 + t * 9),
        e.y - 10 + Math.sin(a) * (3 + t * 9),
        1.5,
        1.5,
        "#ffe6a8",
      );
    }
  } else if (e.kind === "levelup" || e.kind === "evolve") {
    const evolve = e.kind === "evolve",
      look = catArt(state?.player.id).colors,
      color = evolve ? look.evolve : look.levelUp,
      count = evolve ? 14 : 9,
      reach = evolve ? 90 : 46;
    ctx.globalAlpha = fade;
    light(ctx, e.x, e.y - 22, reach + 30, color, 0.28 * fade, 0.8);
    ring(ctx, e.x, e.y, 16 + ease * reach, color, 0.5);
    if (evolve) ring(ctx, e.x, e.y, 8 + ease * reach * 0.6, "#fff1ce", 0.5);
    // Paper stars lift off like confetti cut from the same sheet.
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (evolve ? t * 1.5 : 0),
        r = 12 + ease * reach * 0.55,
        x = e.x + Math.cos(a) * r,
        y = e.y - 20 + Math.sin(a) * r * 0.5 - ease * (evolve ? 34 : 26);
      star(ctx, x, y, (evolve ? 4 : 3) * (0.6 + fade * 0.6), color, a + t * 4);
    }
  } else effectPainter(e.kind)?.(ctx, e, { t, fade, ease }, state);
  ctx.restore();
}
/** Tagged weapon shots (paper crane, pumpkin seed) drawn by their weapon's art. */
export function drawWeaponShot(ctx: Ctx, s: ShotState, time: number): void {
  if (!s.weapon) return;
  ctx.save();
  shotArt(s.weapon)?.shot?.(ctx, s, time);
  ctx.restore();
}
/** The title-screen aura of the cat on the playbill. */
export function drawHeroAura(ctx: Ctx, id: CatId, x: number, y: number, time: number): void {
  catArt(id).heroAura(ctx, x, y, time);
}
/** The same code-generated symbols appear in selection, HUD, and touch controls. */
export function paintSkillIcon(canvas: HTMLCanvasElement, id: CatId, kind: SkillIconKind): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 32);
  catArt(id).skillIcon(ctx, kind);
}
export { orbitPositions };
