import {
  piece as paperPiece,
  path as paperPath,
  oval as paperOval,
  glow as light,
} from "./paper-material.js";
import { ellipse } from "./pixel-art.js";
import type { SimState, Impact, ShotState } from "../game/types.js";
import { EFFECT_LIFE } from "../game/types.js";
import { playerStats, UPGRADE_VALUES } from "../game/upgrades.js";
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
  const n = CHARACTERS.nicole,
    ps = playerStats(state);
  for (const f of state.fields) {
    const radius = f.radius ?? n.fieldRadius,
      remaining = f.life / (f.duration ?? n.fieldDuration);
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life * 3);
    light(ctx, f.x, f.y, radius + 22, "#7772c6", 0.13, 0.75);
    ctx.globalAlpha *= 0.065;
    ellipse(ctx, f.x, f.y, radius, radius, "#b49ee9");
    ctx.globalAlpha = Math.min(1, f.life * 3);
    ring(ctx, f.x, f.y, radius, "#80769e");
    ring(ctx, f.x, f.y, radius - 4, "#c0a8e5", 1, remaining);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x = f.x + Math.cos(a) * (radius - 10),
        y = f.y + Math.sin(a) * (radius - 10);
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
      ps.orbitRadius,
      ps.fullMoon ? "#e3d3a8" : "#a59bc4",
    );
    if (ps.fullMoon) {
      // The moon pulse charge, read straight from the sim timer.
      const moon = UPGRADE_VALUES["full-moon"],
        charge = 1 - Math.max(0, state.pulseTimer) / moon.pulseInterval;
      ctx.globalAlpha = 0.5;
      ring(
        ctx,
        state.player.x,
        state.player.y,
        ps.orbitRadius + moon.pulseReach,
        "#d9c79c",
        0.55,
        charge,
      );
    }
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
  full = false,
): void {
  light(ctx, x, y - 12, full ? 22 : 17, full ? "#f1dca6" : "#c2a6ee", 0.24, 1);
  for (let k = 1; k < 4; k++) rect(ctx, x - k * 2, y - 12 + k, 1, 1, "#8b79b7");
  star(ctx, x, y - 12, full ? 8.5 : 7, full ? "#efe2bd" : "#d7c8f6", time * 1.2 + index);
  star(ctx, x, y - 12, full ? 4 : 3, "#fff1ce", time * 1.2 + index);
}
/** Echo Legion: paper shards circle the evolved afterimage and mark its burst. */
export function drawEchoDecoy(ctx: Ctx, state: SimState, time: number): void {
  const d = state.decoy;
  if (!d.live || state.player.id !== "zero" || !playerStats(state).echo)
    return;
  const echo = UPGRADE_VALUES["echo-legion"];
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.min(0.4, d.time);
  light(ctx, d.x, d.y - 18, 46, "#9fcde0", 0.18, 1);
  ctx.globalAlpha *= 0.55;
  ring(ctx, d.x, d.y, echo.burstRadius, "#8fb7c8", 0.5, Math.min(1, d.time / 1.2));
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 4; i++) {
    const a = time * 2.6 + (i * Math.PI) / 2,
      x = d.x + Math.cos(a) * 20,
      y = d.y - 20 + Math.sin(a) * 9;
    paperPiece(
      ctx,
      paperPath([
        [x, y - 4],
        [x + 2.4, y],
        [x, y + 4],
        [x - 2.4, y],
      ]),
      i % 2 ? "#e9c27a" : "#a9d0de",
      { shadow: 0.6, texture: 0.3, thickness: 0.4 },
    );
  }
  ctx.restore();
}
export function drawCombatFront(ctx: Ctx, state: SimState): void {
  const p = state.player;
  if (p.id === "nicole" && playerStats(state).fullMoon) {
    // A small paper full moon floats at her shoulder and swells before each pulse.
    const moon = UPGRADE_VALUES["full-moon"],
      charge = 1 - Math.max(0, state.pulseTimer) / moon.pulseInterval,
      mx = p.x - p.facing * 22,
      my = p.y - 64,
      r = 5 + charge * 2.2;
    light(ctx, mx, my, 22 + charge * 10, "#f3dfa6", 0.2 + charge * 0.15, 1);
    paperPiece(ctx, paperOval(mx, my, r, r, 7, 0.06), "#efe0b4", {
      shadow: 1.2,
      edge: "#fff6d8",
      texture: 0.6,
      thickness: 0.6,
    });
    ctx.fillStyle = "#c8b98f";
    ctx.fill(paperOval(mx - r * 0.3, my - r * 0.15, r * 0.22, r * 0.2, 3));
    ctx.fill(paperOval(mx + r * 0.35, my + r * 0.3, r * 0.16, r * 0.14, 5));
  }
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
      cat = state?.player.id ?? "zero",
      color = evolve
        ? cat === "zero"
          ? "#a9d4e4"
          : "#efe0b4"
        : cat === "zero"
          ? "#e9bf72"
          : "#c9b6f0",
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
  } else if (e.kind === "echo-burst") {
    const r = 10 + ease * (e.radius ?? UPGRADE_VALUES["echo-legion"].burstRadius);
    ctx.globalAlpha = fade;
    light(ctx, e.x, e.y - 12, r + 20, "#a9d4e4", 0.3 * fade, 0.7);
    ring(ctx, e.x, e.y, r, "#cfe8ee", 0.55);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      paperPiece(
        ctx,
        paperPath([
          [e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.55 - 6],
          [e.x + Math.cos(a + 0.12) * (r - 8), e.y + Math.sin(a + 0.12) * (r - 8) * 0.55 - 6],
          [e.x + Math.cos(a - 0.12) * (r - 8), e.y + Math.sin(a - 0.12) * (r - 8) * 0.55 - 6],
        ]),
        i % 2 ? "#e9c27a" : "#a9d0de",
        { shadow: 0.5, texture: 0.3, thickness: 0.4 },
      );
    }
  } else if (e.kind === "moon-pulse") {
    const reach =
        e.radius ??
        (state ? playerStats(state).orbitRadius : CHARACTERS.nicole.orbitRadius) +
          UPGRADE_VALUES["full-moon"].pulseReach,
      r = 14 + ease * reach;
    ctx.globalAlpha = fade;
    light(ctx, e.x, e.y, r + 18, "#efe0b4", 0.22 * fade, 0.6);
    ctx.globalAlpha = fade * 0.12;
    ellipse(ctx, e.x, e.y, r, r * 0.6, "#efe0b4");
    ctx.globalAlpha = fade;
    ring(ctx, e.x, e.y, r, "#f3e6c4", 0.6);
    ring(ctx, e.x, e.y, r * 0.82, "#bda5ef", 0.6, fade);
  } else if (e.kind === "claw") {
    // Three cut-paper slashes sweeping across the arc toward the target.
    const reach = e.radius ?? 58,
      a = e.angle ?? 0;
    ctx.globalAlpha = fade;
    for (let i = -1; i <= 1; i++) {
      const sweep = a + i * 0.32 + (ease - 0.5) * 0.7,
        r0 = reach * 0.35,
        r1 = reach * (0.75 + ease * 0.25),
        ox = -Math.sin(sweep) * i * 5,
        oy = Math.cos(sweep) * i * 5 * 0.6;
      paperPiece(
        ctx,
        paperPath([
          [e.x + ox + Math.cos(sweep) * r0, e.y - 10 + oy + Math.sin(sweep) * r0 * 0.6],
          [e.x + ox + Math.cos(sweep + 0.05) * r1, e.y - 10 + oy + Math.sin(sweep + 0.05) * r1 * 0.6 - 2],
          [e.x + ox + Math.cos(sweep - 0.04) * r1, e.y - 10 + oy + Math.sin(sweep - 0.04) * r1 * 0.6 + 2],
        ]),
        i === 0 ? "#f3dca2" : "#d9b878",
        { shadow: 0.6, texture: 0.3, thickness: 0.5 },
      );
    }
  } else if (e.kind === "star-fall") {
    // A paper star drops from above, then lands in a soft ring.
    const r = e.radius ?? 34,
      drop = 1 - Math.min(1, t * 2.4),
      land = Math.max(0, t * 2.4 - 1) / 1.4;
    ctx.globalAlpha = fade;
    if (drop > 0) {
      line(ctx, e.x + 18 * drop, e.y - 90 * drop - 30, e.x + 6 * drop, e.y - 50 * drop - 10, "#cdb8f2");
      star(ctx, e.x + 10 * drop, e.y - 70 * drop - 8, 7, "#fff1ce", t * 6);
    } else {
      light(ctx, e.x, e.y - 6, r + 14, "#efe0b4", 0.3 * fade, 0.7);
      ring(ctx, e.x, e.y, 6 + land * r, "#e6dafc", 0.6);
      star(ctx, e.x, e.y - 6, 6 * fade + 2, "#fff1ce", t * 3);
    }
  } else if (e.kind === "seed-burst") {
    const r = 6 + ease * (e.radius ?? 40);
    ctx.globalAlpha = fade;
    light(ctx, e.x, e.y - 8, r + 16, "#ffb45c", 0.32 * fade, 0.7);
    ring(ctx, e.x, e.y, r, "#f5c27a", 0.6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (e.seed ?? 0),
        x = e.x + Math.cos(a) * r * 0.8,
        y = e.y - 6 + Math.sin(a) * r * 0.5;
      paperPiece(ctx, paperOval(x, y, 2.6, 1.6, i, 0.1), i % 2 ? "#e7a35a" : "#f0dfb4", {
        shadow: 0.4,
        texture: 0.2,
        thickness: 0.3,
      });
    }
  }
  ctx.restore();
}
/** Paper crane (folded, nose first) and pumpkin seed (glowing, spinning) weapon shots. */
export function drawWeaponShot(ctx: Ctx, s: ShotState, time: number): void {
  const a = Math.atan2(s.vy, s.vx),
    x = s.x,
    y = s.y - 14;
  ctx.save();
  if (s.weapon === "crane") {
    const flap = Math.sin(time * 14 + s.id) * 3,
      c = Math.cos(a),
      n = Math.sin(a),
      p = (fx: number, fy: number): [number, number] => [x + fx * c - fy * n, y + fx * n + fy * c];
    ellipse(ctx, s.x, s.y, 6, 2, "#0b101c55");
    paperPiece(ctx, paperPath([p(9, 0), p(-2, -6 - flap), p(-7, 0), p(-2, 6 + flap)]), "#efe6d2", {
      shadow: 0.8,
      texture: 0.3,
      thickness: 0.5,
    });
    paperPiece(ctx, paperPath([p(9, 0), p(-2, -6 - flap), p(-1, 0)]), "#d8cdb5", {
      shadow: 0,
      texture: 0.2,
      thickness: 0.3,
    });
  } else {
    ellipse(ctx, s.x, s.y, 5, 2, "#0b101c55");
    light(ctx, x, y, 12, "#ffb45c", 0.35, 0.8);
    paperPiece(ctx, paperOval(x, y, 3, 4.5, s.id, 0.06), "#f0dfb4", {
      shadow: 0.6,
      texture: 0.3,
      thickness: 0.5,
      edge: "#e7a35a",
    });
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
