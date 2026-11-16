import {
  piece as paperPiece,
  path as paperPath,
  glow as light,
} from "./paper-material.js";
import { ellipse } from "./pixel-art.js";
import type { SimState, Impact } from "../game/types.js";
import type { CatId } from "../cats/types.js";
import { CHARACTERS } from "../game/characters.js";
import { orbitPositions } from "../game/sim.js";
import { line, polygon, rect, type Ctx } from "./pixel-art.js";

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
export function drawCombatGround(ctx: Ctx, state: SimState): void {
  const n = CHARACTERS.nicole;
  for (const f of state.fields) {
    const remaining = f.life / n.fieldDuration;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life * 3);
    light(ctx, f.x, f.y, 100, "#7772c6", 0.13, 0.75);
    ctx.globalAlpha *= 0.065;
    ellipse(ctx, f.x, f.y, n.fieldRadius, n.fieldRadius, "#b49ee9");
    ctx.globalAlpha = Math.min(1, f.life * 3);
    ring(ctx, f.x, f.y, n.fieldRadius, "#80769e");
    ring(ctx, f.x, f.y, n.fieldRadius - 4, "#c0a8e5", 1, remaining);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x = f.x + Math.cos(a) * (n.fieldRadius - 10),
        y = f.y + Math.sin(a) * (n.fieldRadius - 10);
      star(ctx, x, y, 3, "#b3a7d6", a);
    }
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + state.elapsed * 0.45,
        r = 20 + i * 6;
      rect(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 1, 2, "#c8bcdf");
    }
    ctx.restore();
  }
  if (state.player.id === "nicole") {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ring(
      ctx,
      state.player.x,
      state.player.y,
      CHARACTERS.nicole.orbitRadius,
      "#a59bc4",
    );
    ctx.restore();
  }
  if (state.player.empowerTime > 0) {
    light(ctx, state.player.x, state.player.y, 38, "#d9a35b", 0.13, 0.45);
    ring(
      ctx,
      state.player.x,
      state.player.y,
      25,
      "#bca16e",
      0.3,
      state.player.empowerTime / CHARACTERS.zero.empowerDuration,
    );
  }
}
export function drawOrbitStar(
  ctx: Ctx,
  x: number,
  y: number,
  time: number,
  index: number,
): void {
  light(ctx, x, y - 12, 17, "#c2a6ee", 0.24, 1);
  for (let k = 1; k < 4; k++) rect(ctx, x - k * 2, y - 12 + k, 1, 1, "#8b79b7");
  star(ctx, x, y - 12, 7, "#d7c8f6", time * 1.2 + index);
  star(ctx, x, y - 12, 3, "#fff1ce", time * 1.2 + index);
}
export function drawCombatFront(ctx: Ctx, state: SimState): void {
  const p = state.player;
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
export function drawSkillEffect(ctx: Ctx, e: Impact): void {
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
export function drawHeroAura(
  ctx: Ctx,
  id: CatId,
  x: number,
  y: number,
  time: number,
): void {
  const color = id === "zero" ? "#d5a65d" : "#b39ad9";
  light(ctx, x, y, 100, color, 0.14, 0.35);
  ring(ctx, x, y, 55, color, 0.28);
  if (id === "nicole")
    for (let i = 0; i < CHARACTERS.nicole.orbitCount; i++) {
      const a = time * 1.3 + (i * Math.PI * 2) / CHARACTERS.nicole.orbitCount;
      drawOrbitStar(ctx, x + Math.cos(a) * 65, y + Math.sin(a) * 28, time, i);
    }
  else
    for (let i = 0; i < 5; i++) {
      const a = time * 0.3 + i * 1.25;
      rect(
        ctx,
        x + Math.cos(a) * 48,
        y - 5 - Math.sin(a) ** 2 * 20,
        2,
        1,
        "#bca26b",
      );
    }
}
/** The same code-generated symbols appear in selection, HUD, and touch controls. */
export function paintSkillIcon(
  canvas: HTMLCanvasElement,
  id: CatId,
  kind: "attack" | "active" | "passive",
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 32);
  const color = id === "zero" ? "#e5be7b" : "#c6b1ec";
  if (kind === "active" && id === "zero") {
    for (let i = 0; i < 3; i++) {
      line(ctx, 5 + i * 6, 9, 12 + i * 6, 16, color, 2);
      line(ctx, 12 + i * 6, 16, 5 + i * 6, 23, color, 2);
    }
  } else if (kind === "attack" && id === "zero") {
    line(ctx, 5, 25, 25, 5, color, 2);
    line(ctx, 13, 5, 25, 5, color, 2);
    line(ctx, 25, 5, 25, 17, color, 2);
    rect(ctx, 5, 15, 4, 2, "#9e8056");
  } else if (kind === "passive") {
    if (id === "nicole") {
      polygon(
        ctx,
        [
          [16, 4],
          [27, 9],
          [25, 20],
          [16, 29],
          [7, 20],
          [5, 9],
        ],
        "#64567a",
      );
      line(ctx, 16, 4, 27, 9, color);
      line(ctx, 27, 9, 25, 20, color);
      line(ctx, 25, 20, 16, 29, color);
      line(ctx, 16, 29, 7, 20, color);
      line(ctx, 7, 20, 5, 9, color);
      line(ctx, 5, 9, 16, 4, color);
      star(ctx, 16, 15, 6, color);
    } else {
      star(ctx, 16, 16, 12, color);
      line(ctx, 4, 26, 9, 21, "#927650");
      line(ctx, 23, 10, 28, 5, "#927650");
    }
  } else {
    ring(ctx, 16, 16, 11, color, kind === "active" ? 0.7 : 1);
    star(ctx, 24, 9, 5, color);
    star(ctx, 7, 23, 4, color);
    if (kind === "active") ring(ctx, 16, 16, 6, "#8d80b2", 0.7);
  }
}
export { orbitPositions };
