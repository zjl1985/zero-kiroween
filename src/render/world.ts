import { drawCraftCat } from "./craft-cat.js";
import { drawCraftBlob, drawCraftShot } from "./craft-combat.js";
import {
  drawCombatGround,
  drawCombatFront,
  drawSkillEffect,
  drawOrbitStar,
  drawHeroAura,
  orbitPositions,
} from "./combat-fx.js";
import type { SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import { drawPixelStroke, drawImpact, drawFootDust } from "./pixel.js";
import {
  drawScene,
  drawNightShift,
  drawForeground,
  drawProp,
  drawLamp,
  drawAtmosphere,
  drawWind,
  drawGroundLight,
  LAMPS,
  YARD_PROPS,
} from "./craft-scene.js";
import { viewport, VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
import { light, polygon, line } from "./pixel-art.js";
export { VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
export interface ViewState {
  time: number;
  reducedMotion?: boolean;
}
interface Sprite {
  y: number;
  draw: () => void;
}
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  ctx.imageSmoothingEnabled = true;
  drawScene(ctx);
  if (sim) drawNightShift(ctx, sim.elapsed / sim.sessionSeconds);
  drawWind(ctx, view.time);
  if (sim) drawCombatGround(ctx, sim);
  const sprites: Sprite[] = [];
  for (const l of LAMPS) {
    drawGroundLight(ctx, l.x, l.y, view.time, l.s);
    sprites.push({ y: l.y, draw: () => drawLamp(ctx, l, view.time) });
  }
  for (const p of YARD_PROPS) {
    if (p.kind === "pumpkin" || p.kind === "candles")
      drawGroundLight(ctx, p.x, p.y, view.time, p.s * 0.6);
    sprites.push({
      y: p.y,
      draw: () => {
        ctx.save();
        // Foreground props yield when a cat passes behind them.
        if (
          sim &&
          Math.abs(sim.player.x - p.x) < 36 * p.s &&
          sim.player.y < p.y + 5 &&
          sim.player.y > p.y - 28 * p.s
        )
          ctx.globalAlpha = 0.48;
        drawProp(ctx, p);
        ctx.restore();
      },
    });
  }
  const cat = (pose: CatPose) => {
    if (!pose.decoy) {
      drawGroundLight(ctx, pose.x + pose.facing * 21, pose.y, view.time, 0.7);
      const nearest = LAMPS.reduce((a, b) =>
        Math.hypot(a.x - pose.x, a.y - pose.y) <
        Math.hypot(b.x - pose.x, b.y - pose.y)
          ? a
          : b,
      );
      const dx = pose.x - nearest.x,
        dy = pose.y - nearest.y,
        len = Math.hypot(dx, dy) || 1;
      ctx.save();
      ctx.globalAlpha = 0.24;
      polygon(
        ctx,
        [
          [pose.x - 9, pose.y],
          [pose.x + 10, pose.y],
          [pose.x + (dx / len) * 25 + 9, pose.y + (dy / len) * 12],
          [pose.x + (dx / len) * 25 - 9, pose.y + (dy / len) * 12],
        ],
        "#101e28",
      );
      ctx.restore();
    }
    sprites.push({
      y: pose.y,
      draw: () => {
        drawFootDust(ctx, pose);
        drawCraftCat(ctx, pose);
      },
    });
  };
  if (!sim && titleCat) {
    drawHeroAura(ctx, titleCat.id, titleCat.x, titleCat.y, view.time);
    cat(titleCat);
  }
  if (sim) {
    if (sim.player.dashTime > 0) {
      const len = Math.hypot(sim.player.vx, sim.player.vy) || 1,
        dx = sim.player.vx / len,
        dy = sim.player.vy / len;
      ctx.save();
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.45 - i * 0.09;
        const x = sim.player.x - dx * (12 + i * 8),
          y = sim.player.y - 20 - dy * (12 + i * 8);
        line(
          ctx,
          x - dy * 5,
          y + dx * 5,
          x - dx * 14 - dy * 5,
          y - dy * 14 + dx * 5,
          "#b8d3cc",
          2,
        );
      }
      ctx.restore();
    }
    drawPixelStroke(
      ctx,
      sim.stroke.points,
      sim.stroke.ink,
      sim.stroke.ink <= 0 && sim.stroke.blankTime > 0,
      sim.stroke.thickness,
      view.time,
    );
    if (sim.decoy.live) {
      cat({
        id: sim.player.id,
        x: sim.decoy.x,
        y: sim.decoy.y,
        facing: sim.player.facing,
        moving: false,
        dashing: false,
        hurt: false,
        decoy: true,
        time: view.time,
      });
      light(ctx, sim.decoy.x, sim.decoy.y - 18, 35, "#91bacf", 0.12, 1);
    }
    if (sim.player.id === "nicole")
      orbitPositions(sim).forEach((p, i) =>
        sprites.push({
          y: p.y,
          draw: () => drawOrbitStar(ctx, p.x, p.y, view.time, i),
        }),
      );
    for (const e of sim.enemies)
      if (e.alive)
        sprites.push({
          y: e.y,
          draw: () =>
            drawCraftBlob(
              ctx,
              e.x,
              e.y,
              view.time,
              e.id,
              e.hp,
              e.slowTime > 0,
              e.spawnTime,
            ),
        });
    cat({
      id: sim.player.id,
      x: sim.player.x,
      y: sim.player.y,
      facing: sim.player.facing,
      moving: Math.hypot(sim.player.vx, sim.player.vy) > 8,
      dashing: sim.player.dashTime > 0,
      hurt:
        sim.impacts.some((e) => e.kind === "hurt") &&
        sim.player.dashTime <= 0 &&
        Math.floor(view.time * 16) % 2 === 0,
      time: view.time,
    });
  }
  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) sprite.draw();
  if (sim) {
    for (const s of sim.shots)
      if (s.alive) drawCraftShot(ctx, s.x, s.y - 12, s.vx, s.vy, s.empowered);
    drawCombatFront(ctx, sim);
    for (const effect of sim.impacts) {
      if (effect.kind === "hit" || effect.kind === "defeat")
        drawImpact(ctx, { ...effect, kind: effect.kind, y: effect.y - 7 });
      else drawSkillEffect(ctx, effect);
    }
  }
  drawAtmosphere(ctx, view.time);
  drawForeground(ctx, sim?.player);
  // Subtle four-sided depth, leaving all gameplay visible.
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "#070e20";
    ctx.fillRect(i, 0, 1, VIEW_HEIGHT);
    ctx.fillRect(VIEW_WIDTH - 1 - i, 0, 1, VIEW_HEIGHT);
    ctx.fillRect(0, i, VIEW_WIDTH, 1);
    ctx.fillRect(0, VIEW_HEIGHT - 1 - i, VIEW_WIDTH, 1);
  }
  ctx.restore();
}
export function present(
  source: HTMLCanvasElement,
  dest: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  overlay?: HTMLElement,
): void {
  const v = viewport(cssWidth, cssHeight, dpr, false);
  dest.setTransform(1, 0, 0, 1, 0, 0);
  dest.fillStyle = "#181622";
  dest.fillRect(0, 0, cssWidth * dpr, cssHeight * dpr);
  dest.imageSmoothingEnabled = true;
  dest.drawImage(source, v.x, v.y, v.w, v.h);
  if (overlay) {
    overlay.style.left = `${v.cssX}px`;
    overlay.style.top = `${v.cssY}px`;
    overlay.style.width = `${v.cssW}px`;
    overlay.style.height = `${v.cssH}px`;
  }
}
