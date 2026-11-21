import { reducedPaperMotion } from "./paper-motion.js";
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
  costumeArt,
  effectPainter,
  shotArt,
  type SkillIconKind,
} from "./art-registry.js";
import { orbitPositions } from "../game/sim.js";
import { rect, type Ctx } from "./pixel-art.js";
import { combatPart, paperFleck, shotCut } from "./craft-combat.js";
import { foldLine, crease, starPoints, PAPER_SHADOW, PAPER_STOCK } from "./paper-kit.js";
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
    // Solid colour on a dark paper outline (the shot rule), with one flat lit facet.
    shotCut(c, paperPath(points), color);
    c.fillStyle = "#fff3d155";
    c.fill(paperPath([[0, -8], [0, 0], [-2.56, -2.56]]));
    foldLine(c, 0, -6, 0, 6, 0.45);
  }).draw(ctx, { x: 0, y: 0, scale: r / 8 });
  ctx.restore();
}
/** Flat marks under the cat: its own ground art, each active weapon's, then the worn costume's zones. */
export function drawCombatGround(ctx: Ctx, state: SimState): void {
  catArt(state.player.id).ground?.(ctx, state);
  for (const w of activeWeaponArt(state)) w.ground?.(ctx, state);
  if (state.costume) costumeArt(state)?.ground?.(ctx, state);
}
/** Two finite faces, with a live squash around the orbit star's own centre. */
export function drawOrbitStar(ctx: Ctx, x: number, y: number, time: number, index: number, full = false): void {
  const calm = reducedPaperMotion(),
    angle = calm ? index : time * 1.2 + index, turn = calm ? 1 : Math.cos(time * 2.8 + index * 1.7),
    back = turn < 0, r = full ? 8.5 : 7;
  paperTrail(ctx, x, y - 12, angle, 18, full ? "#c5b58d" : "#9b84bf", 0.65);
  // A grounded shadow stays down-right while the paper turns above it.
  ctx.save();
  ctx.globalAlpha *= 0.28;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(paperPath(starPoints(x + PAPER_SHADOW.dx * 2, y + PAPER_SHADOW.dy, r * 0.8, 5, 0.46, angle)
    .map(([px, py]) => [px, y + (py - y) * 0.42])));
  ctx.restore();
  ctx.save();
  ctx.translate(x, y - 12);
  ctx.rotate(angle);
  // Keep a readable cut edge even when the face turns edge-on.
  ctx.scale(0.22 + Math.abs(turn) * 0.78, 1);
  combatPart(`orbit-fold:${full ? "gold" : "lilac"}:${back ? "back" : "face"}`, 28, 28, (c) => {
    const cut = paperPath(starPoints(0, 0, 8.5, 5, 0.46)),
      color = back ? (full ? "#c6af7f" : "#aa98be") : (full ? "#efe2bd" : "#d7c8f6");
    shotCut(c, cut, color);
    c.save();
    c.clip(cut);
    c.fillStyle = back ? "#8b799d" : "#fff1ce";
    c.globalAlpha *= 0.34;
    c.fill(paperPath([[0, -8.5], [0, 0], [8.5, 4], [8.5, -8.5]]));
    c.restore();
    crease(c, 0, -7.5, 0, 5.8, 0.65);
    c.strokeStyle = "#fff2d6";
    c.lineWidth = PAPER_STOCK.thin.thickness;
    c.stroke(cut);
  }).draw(ctx, { x: 0, y: 0, scale: r / 8.5 });
  ctx.restore();
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
    light(ctx, p.x, p.y - 28, 42, "#8caccf", 0.07, 1);
    ring(ctx, p.x, p.y - 29, 35, "#b9c9ec", 1.22);
    const guard = combatPart("shield-paper-fold", 26, 38, (c) => {
      paperPiece(c, paperPath([[-5, -12], [3, -9], [7, 8], [-1, 14], [1, 5]]), "#9a95c7",
        { shadow: 0.5, edge: "#e1d7f1", thickness: 0.62, texture: 0.35 });
      paperPiece(c, paperPath([[-5, -12], [3, -9], [3, 2], [0, 0]]), "#ded4ed",
        { shadow: 0.25, edge: "#f1e7f6", thickness: 0.38, texture: 0.3 });
      foldLine(c, 0, -7, 4, 8, 0.55);
    });
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(p.x + side * 35, p.y - 24);
      ctx.scale(side, 1);
      guard.draw(ctx, { x: 0, y: 0 });
      ctx.restore();
    }
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
      paperFleck(ctx, e.x + Math.cos(i * 1.25) * (15 + t * 12),
        e.y - 22 + Math.sin(i * 1.25) * (15 + t * 12) + t * t * 9,
        2.4 * (1 - t) + 0.8, color, i * 1.25 + t * 2);
  } else if (e.kind === "dash") {
    const facing = state?.player.facing ?? 1;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(e.x - facing * (8 + i * 12 + t * 16), e.y - 18);
      ctx.scale(facing, 1);
      combatPart("dash-chevron", 28, 36, (c) => {
        paperPiece(c, paperPath([[-6, -11], [7, 0], [-6, 11], [-3, 0]]), "#e9bf72",
          { shadow: 0.4, edge: "#fff0c5", texture: 0.25, thickness: 0.6 });
        foldLine(c, -3, -6, 3, 0, 0.5);
      }).draw(ctx, { x: 0, y: 0, scale: 1 - i * 0.16 });
      ctx.restore();
    }
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
      if (i % 2) paperFleck(ctx, x, y + t * t * 18, (evolve ? 4 : 3) * (0.6 + fade * 0.6), color, a + t * 4);
      else star(ctx, x, y, (evolve ? 4 : 3) * (0.6 + fade * 0.6), color, a + t * 4);
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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvas.width / 32, 0, 0, canvas.height / 32, 0, 0);
  catArt(id).skillIcon(ctx, kind);
}
export { orbitPositions };
