import { activeWeaponArt, catArt, ENEMY_ART } from "./art-index.js";
import { drawCraftShot, drawInkShard, drawPaperImpact } from "./craft-combat.js";
import {
  drawCraftEnemy,
  drawEnemyEffect,
  drawEnemyGround,
  drawEnemyShot,
} from "./craft-enemies.js";
import { playerStats } from "../game/upgrades.js";
import { enemyRadius } from "../game/sim.js";
import { landmarks } from "../game/world-gen.js";
import { decorPiece, type ArtBounds } from "./art-registry.js";
import { drawActorPaperStatus, drawPaperStatusEffect } from "./paper-status-art.js";
import {
  drawCombatGround,
  drawCombatFront,
  drawSkillEffect,
  drawHeroAura,
  drawWeaponShot,
} from "./combat-fx.js";
import type { SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import { drawPixelStroke, drawFootDust } from "./pixel.js";
import {
  drawSky,
  drawNightShift,
  drawDawnWash,
  drawForeground,
  drawProp,
  drawLamp,
  drawAtmosphere,
  drawWind,
  drawGroundLight,
  drawFrame,
  dawnAmount,
  LAMPS,
  YARD_PROPS,
} from "./craft-scene.js";
import { drawChunks, drawNavArrows, worldSprites, type VisibleLamp } from "./craft-world.js";
import { drawFireGround, drawPropEffect, fireSprites, propSprites } from "./craft-props.js";
import { createCamera, inView, viewRect, type Camera } from "./camera.js";
import type { Locale } from "../content/keys.js";
import {
  cameraShake,
  drawHitFlash,
  drawInteractable,
  drawInteractGround,
  drawJuiceEffect,
  drawShardTrail,
  drawStun,
  drawTreat,
  drawChest,
  drawLandmarkActivity,
} from "./craft-juice.js";
import { viewport, VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
import { light, polygon, line } from "./pixel-art.js";
import { cueTremble, presentationZoom, type Cue } from "./timeline.js";
import { drawCueScreen, drawCueWorld } from "./cue-fx.js";
export { VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
export interface ViewState {
  time: number;
  reducedMotion?: boolean;
  /** Follow camera from main.ts; defaults to the start-yard framing. */
  camera?: Camera;
  /** For the navigation arrow labels. */
  locale?: Locale;
  /** Presentation cues (timeline.ts) from main.ts. */
  cues?: readonly Cue[];
}
interface Sprite {
  y: number;
  draw: () => void;
}
/** Sprite bounds overlap the cat's visible body, while their base sorts in front. */
export function paperOccludesActor(x: number, y: number, s: number, bounds: ArtBounds, actor: { x: number; y: number }): boolean {
  return actor.y <= y + 5 && actor.x + 20 > x + bounds.l * s && actor.x - 20 < x + bounds.r * s &&
    actor.y > y + bounds.t * s && actor.y - 65 < y + bounds.b * s;
}
const COMMON_BOUNDS: Readonly<Record<string, ArtBounds>> = {
  tree: { l: -82, r: 82, t: -158, b: 16 },
  cottage: { l: -120, r: 100, t: -144, b: 16 },
};
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  ctx.imageSmoothingEnabled = true;
  const reduced = !!view.reducedMotion,
    cues = sim ? (view.cues ?? []) : [],
    base = sim ? cameraShake(sim, view.time, reduced) : { x: 0, y: 0 },
    tremble = cueTremble(cues, view.time, reduced),
    shake = { x: base.x + tremble.x, y: base.y + tremble.y },
    zoom = presentationZoom(cues, reduced);
  const cam = view.camera ?? createCamera(),
    seed = sim?.seed ?? 0,
    progress = sim ? sim.elapsed / sim.sessionSeconds : 0,
    session = sim?.sessionSeconds,
    view0 = viewRect(cam),
    near = viewRect(cam, 140);
  // Screen-space sky behind the world; hidden once the camera is far south.
  ctx.save();
  ctx.translate(shake.x, shake.y);
  // Cue zoom (presentation only) centres on the cat so it stays in place.
  if (sim && zoom !== 1) {
    const fx = sim.player.x - view0.x0,
      fy = sim.player.y - 20 - view0.y0;
    ctx.translate(fx, fy);
    ctx.scale(zoom, zoom);
    ctx.translate(-fx, -fy);
  }
  if (view0.y0 < 250) {
    drawSky(ctx);
    if (sim) drawNightShift(ctx, progress, session);
  }
  // World space, snapped to device pixels so cached chunks stay crisp.
  ctx.translate(
    Math.round((VIEW_WIDTH / 2 - cam.x) * 2) / 2,
    Math.round((VIEW_HEIGHT / 2 - cam.y) * 2) / 2,
  );
  drawChunks(ctx, seed, cam);
  if (sim) drawDawnWash(ctx, progress, view0.x0, view0.y0, VIEW_WIDTH, VIEW_HEIGHT, session);
  drawWind(ctx, view.time);
  if (sim) {
    drawCombatGround(ctx, sim);
    drawEnemyGround(ctx, sim);
    drawInteractGround(ctx, sim, view.time);
    drawFireGround(ctx, sim, cam);
    for (const landmark of landmarks(seed)) if (inView(near, landmark.x, landmark.y, landmark.radius))
      drawLandmarkActivity(ctx, sim, landmark);
  }
  const town = worldSprites(ctx, seed, cam, view.time, (d) =>
    !!sim && paperOccludesActor(d.x, d.y, d.s,
      decorPiece(d.kind)?.bounds ?? COMMON_BOUNDS[d.kind] ?? { l: -36, r: 36, t: -28, b: 5 }, sim.player),
    { cat: sim ? { x: sim.player.x, y: sim.player.y } : null, reduced, activities: sim?.landmarkEvents },
  );
  const sprites: Sprite[] = [...town.sprites];
  const addSprite = (y: number, draw: () => void) => sprites.push({ y, draw });
  propSprites(ctx, sim, seed, cam, view.time, addSprite);
  if (sim) fireSprites(ctx, sim, cam, view.time, addSprite);
  const lamps: VisibleLamp[] = [...town.lamps];
  for (const l of LAMPS) {
    if (!inView(near, l.x, l.y)) continue;
    lamps.push(l);
    sprites.push({ y: l.y, draw: () => drawLamp(ctx, l, view.time) });
  }
  for (const l of lamps) drawGroundLight(ctx, l.x, l.y, view.time, l.s);
  for (const p of YARD_PROPS) {
    if (!inView(near, p.x, p.y)) continue;
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
      const nearest = (lamps.length ? lamps : LAMPS).reduce((a, b) =>
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
        catArt(pose.id).draw(ctx, pose);
        if (sim && !pose.decoy) drawActorPaperStatus(ctx, sim.player, view.time, 17, 58);
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
    const reach = playerStats(sim).pickupRadius;
    for (const s of sim.pickups)
      if (s.alive && inView(near, s.x, s.y))
        sprites.push({
          y: s.y,
          draw: () => {
            drawShardTrail(ctx, s, sim, reach, view.time);
            drawInkShard(ctx, s.x, s.y, view.time, s.id, s.value);
          },
        });
    for (const o of sim.interactables)
      if (inView(near, o.x, o.y)) sprites.push({ y: o.y + 0.1, draw: () => drawInteractable(ctx, o, view.time) });
    for (const t of sim.treats)
      if (t.alive && inView(near, t.x, t.y)) sprites.push({ y: t.y, draw: () => drawTreat(ctx, t, view.time) });
    for (const c of sim.chests)
      if (c.alive && inView(near, c.x, c.y)) sprites.push({ y: c.y, draw: () => drawChest(ctx, c, view.time) });
    // Weapon pieces that stand in the world (orbit stars, echo shards).
    for (const w of activeWeaponArt(sim))
      w.sprites?.(ctx, sim, view.time, (y, draw) => sprites.push({ y, draw }));
    // Googly eyes follow the cat.
    const look = { x: sim.player.x, y: sim.player.y - 20 };
    // Off-screen ink is culled; the Eraser is large, so it gets a wider margin.
    for (const e of sim.enemies)
      if (e.alive && inView(near, e.x, e.y, ENEMY_ART.find(e.kind)?.cullMargin ?? 0))
        sprites.push({
          y: e.y,
          draw: () => {
            drawCraftEnemy(ctx, e, view.time, look);
            drawHitFlash(ctx, e);
            if (e.spawnTime <= 0) drawActorPaperStatus(ctx, e, view.time, enemyRadius(e));
            drawStun(ctx, e, view.time);
          },
        });
    for (const s of sim.enemyShots)
      if (s.alive)
        sprites.push({
          y: s.y0 + (s.ty - s.y0) * Math.min(1, s.t / s.flight),
          draw: () => drawEnemyShot(ctx, s),
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
      if (s.alive && inView(near, s.x, s.y)) {
        if (s.weapon) drawWeaponShot(ctx, s, view.time);
        else drawCraftShot(ctx, s.x, s.y - 12, s.vx, s.vy, s.empowered, s.echo);
      }
    drawCombatFront(ctx, sim);
    for (const effect of sim.impacts) {
      // Off-screen effects are culled; the moon pulse spreads over the whole view.
      if (effect.kind !== "moon-stun" && !inView(near, effect.x, effect.y, 60)) continue;
      if (drawPaperStatusEffect(ctx, effect)) continue;
      if (drawPropEffect(ctx, effect)) continue;
      if (drawJuiceEffect(ctx, effect)) continue;
      if (effect.kind === "hit" || effect.kind === "defeat")
        drawPaperImpact(ctx, { ...effect, kind: effect.kind, y: effect.y - 7 });
      else if (!drawEnemyEffect(ctx, effect)) drawSkillEffect(ctx, effect, sim);
    }
    if (cues.length) drawCueWorld(ctx, cues, sim, view.time, reduced);
  }
  drawAtmosphere(ctx, view.time, sim ? dawnAmount(progress, session) : 0, lamps);
  ctx.restore();
  if (sim && cues.length) drawCueScreen(ctx, cues, sim, cam, view.time, reduced);
  // Screen space: navigation tabs, the diorama's foreground leaves, the frame.
  if (sim) drawNavArrows(ctx, sim, cam, view.locale ?? "zh", view.time);
  drawForeground(
    ctx,
    sim
      ? { x: sim.player.x - view0.x0, y: sim.player.y - view0.y0 }
      : undefined,
    false,
  );
  drawFrame(ctx);
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
