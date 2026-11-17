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
import { line, rect, type Ctx } from "./pixel-art.js";

export function ring(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  ratio = 1,
  progress = 1,
): void {
  const segments = 96;
  for (let i = 0; i < segments * progress; i++) {
    if (i % 12 === 11) continue;
    const a = (i / segments) * Math.PI * 2,
      b = ((i + 1) / segments) * Math.PI * 2;
    line(
      ctx,
      x + Math.cos(a) * r,
      y + Math.sin(a) * r * ratio,
      x + Math.cos(b) * r,
      y + Math.sin(b) * r * ratio,
      color,
    );
  }
}
export function star(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  angle = 0,
): void {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const a = angle + (i * Math.PI) / 4,
      rr = i % 2 ? r * 0.32 : r;
    points.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  paperPiece(ctx, paperPath(points), color, {
    shadow: 0.4,
    texture: 0.35,
    thickness: 0.3,
  });
  rect(ctx, x - 1, y - 1, 2, 2, "#fff3d1");
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
  for (let k = 1; k < 4; k++) rect(ctx, x - k * 2, y - 12 + k, 1, 1, "#8b79b7");
  star(ctx, x, y - 12, full ? 8.5 : 7, full ? "#efe2bd" : "#d7c8f6", time * 1.2 + index);
  star(ctx, x, y - 12, full ? 4 : 3, "#fff1ce", time * 1.2 + index);
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
