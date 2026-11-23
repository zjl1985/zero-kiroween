import { PIXEL_DECOR_BOUNDS } from "./pixel-decor-bounds.js";
import { YARD_FURNITURE, YARD_RAILS } from "../game/scenery.js";
import { drawYardFurniture } from "./pixel-yard-props.js";
import { activeWeaponArt, catArt, costumeArt, ENEMY_ART } from "./art-index.js";
import { drawInkShard, drawPaperImpact } from "./craft-combat.js";
import { enemyContact } from "../game/combat-observation.js";
import { drawBoltFlight } from "./pixel-primary-weapons.js";
import { drawCombatFeedback } from "./pixel-combat-feedback.js";
import {
  drawCraftEnemy,
  drawEnemyEffect,
  drawEnemyGround,
  drawEnemyShot,
  drawWarningEdges,
  drawWarningGround,
  enemyWarnings,
} from "./craft-enemies.js";
import { playerStats } from "../game/upgrades.js";
import { enemyRadius } from "../game/sim.js";
import { landmarks } from "../game/world-gen.js";
import { drawActorPaperStatus, drawPaperStatusEffect } from "./paper-status-art.js";
import {
  drawCombatGround,
  drawCombatFront,
  drawSkillEffect,
  drawWeaponShot,
} from "./combat-fx.js";
import type { SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import { drawPlaybillStage } from "./playbill-stage.js";
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
import { drawChunks, drawNavArrows, paperOccludesActor, worldSprites, type VisibleLamp, type WorldSprite } from "./craft-world.js";
import { drawFireGround, drawPropEffect, fireSprites, propSprites } from "./craft-props.js";
import { townsfolkSprites } from "./craft-townsfolk.js";
import { drawFoldGuards, drawPaperRain, drawWashEffect, drawWashGround, washFrame } from "./wash-art.js";
import { beginSketchFrame, drawSketchedParts, sketchAmount, sketchEnemyPick } from "./sprite-sketch.js";
import { ENEMY_DEFS } from "../defs/registries.js";
import { cameraProjection, createCamera, inView, viewRect, type Camera } from "./camera.js";
import type { Locale } from "../content/keys.js";
import {
  cameraShake,
  drawHitFlash,
  drawInteractable,
  drawJuiceEffect,
  drawShardTrail,
  drawStun,
  drawTreat,
  drawChest,
  drawLandmarkActivity,
} from "./craft-juice.js";
import { light, polygon, line } from "./pixel-art.js";
import { VIEW_WIDTH } from "./viewport.js";
import { cueTremble, presentationZoom, type Cue } from "./timeline.js";
import { catWear } from "./cat-detail.js";
import type { Ctx } from "./paper-material.js";
import { drawCueScreen, drawCueWorld } from "./cue-fx.js";
import { withPaperMotion } from "./paper-motion.js";
import { drawIsoDebugGrid } from "./iso/debug-grid.js";
import type { IsoCamera } from "./iso/iso-camera.js";
export { VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
export interface ViewState {
  /** Optional developer CPU instrumentation; absent in normal gameplay. */
  profile?: { mask: number };
  time: number;
  reducedMotion?: boolean;
  /** Follow camera from main.ts; defaults to the start-yard framing. */
  camera?: Camera;
  /** For the navigation arrow labels. */
  locale?: Locale;
  /** Presentation cues (timeline.ts) from main.ts. */
  cues?: readonly Cue[];
  /** `?iso=grid` developer check view: the iso camera to draw the debug grid with. */
  isoGrid?: IsoCamera;
}
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  withPaperMotion(!!view.reducedMotion, () => drawWorldFrame(ctx, sim, view, titleCat));
}

function drawWorldFrame(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  ctx.imageSmoothingEnabled = false;
  const reduced = !!view.reducedMotion,
    cues = sim ? (view.cues ?? []) : [],
    base = sim ? cameraShake(sim, view.time, reduced) : { x: 0, y: 0 },
    tremble = cueTremble(cues, view.time, reduced),
    shake = { x: base.x + tremble.x, y: base.y + tremble.y },
    zoom = presentationZoom(cues, reduced);
  const camera = view.camera ?? createCamera(),
    focus = sim ? { x: sim.player.x, y: sim.player.y - 20 } : camera,
    projection = cameraProjection(camera, focus, zoom, shake),
    { width, height } = projection,
    cam = {
      x: (width / 2 - projection.x) / zoom,
      y: (height / 2 - projection.y) / zoom,
      width: width / zoom, height: height / zoom,
    },
    seed = sim?.seed ?? 0,
    progress = sim ? sim.elapsed / sim.sessionSeconds : 0,
    session = sim?.sessionSeconds,
    view0 = viewRect(cam),
    near = viewRect(cam, 140),
    warnings = sim ? enemyWarnings(sim) : [];
  // Screen-space sky behind the world; hidden once the camera is far south.
  ctx.save();
  if (view0.y0 < 250) {
    // The moon keeps its shape and its place on the right as the screen narrows.
    const skyWidth = Math.max(VIEW_WIDTH, width);
    ctx.save();
    ctx.translate((width - skyWidth) * 0.8, 0);
    ctx.scale(skyWidth / VIEW_WIDTH, skyWidth / VIEW_WIDTH);
    drawSky(ctx);
    if (sim) drawNightShift(ctx, progress, session);
    ctx.restore();
  }
  ctx.translate(projection.x, projection.y);
  ctx.scale(zoom, zoom);
  // Washed paper: chunks with lifted colour get their pencil layer (nothing runs when nothing was washed).
  const maskStart = view.profile ? performance.now() : 0;
  const wash = sim ? washFrame(sim) : null;
  if (view.profile) view.profile.mask = performance.now() - maskStart;
  beginSketchFrame();
  // Pixel wash owns a bounded dirty-tile overlay; no legacy pencil terrain bake.
  drawChunks(ctx, seed, cam, sim !== null);
  const washStart = view.profile ? performance.now() : 0;
  drawWashGround(ctx, cam, wash);
  if (view.profile) view.profile.mask += performance.now() - washStart;
  if (sim) drawFoldGuards(ctx, sim, cam);
  if (sim) drawDawnWash(ctx, progress, view0.x0, view0.y0, cam.width, cam.height, session);
  drawWind(ctx, view.time);
  if (sim) {
    drawCombatGround(ctx, sim);
    drawEnemyGround(ctx, sim);
    drawFireGround(ctx, sim, cam);
    for (const landmark of landmarks(seed)) if (inView(near, landmark.x, landmark.y, landmark.radius))
      drawLandmarkActivity(ctx, sim, landmark);
  }
  const town = worldSprites(ctx, seed, cam, view.time, {
    cat: sim?.player ?? null, reduced, activities: sim?.landmarkEvents,
    ...(wash && sim ? { sketch: (x: number, y: number) => sketchAmount(sim, x, y) } : {}),
  });
  const sprites: WorldSprite[] = [...town.sprites];
  const addSprite = (y: number, draw: () => void, occludesPlayer?: boolean) => sprites.push({ y, draw, occludesPlayer });
  propSprites(ctx, sim, seed, cam, view.time, addSprite);
  if (sim) fireSprites(ctx, sim, cam, view.time, addSprite);
  if (sim) townsfolkSprites(ctx, sim, cam, view.time, addSprite,
    wash ? (x: number, y: number) => sketchAmount(sim, x, y) : undefined, reduced);
  const lamps: VisibleLamp[] = [...town.lamps];
  for (const l of LAMPS) {
    if (!inView(near, l.x, l.y)) continue;
    lamps.push(l);
    addSprite(l.y, () => drawLamp(ctx, l, view.time),
      !!sim && paperOccludesActor(l.x, l.y, l.s, PIXEL_DECOR_BOUNDS.lamp, sim.player));
  }
  for (const l of lamps) drawGroundLight(ctx, l.x, l.y, view.time, l.s);
  for (const p of YARD_PROPS) {
    if (!inView(near, p.x, p.y)) continue;
    addSprite(p.y, () => drawProp(ctx, p),
      !!sim && paperOccludesActor(p.x, p.y, p.s, PIXEL_DECOR_BOUNDS[p.kind], sim.player));
  }
  let solidForeground = Infinity;
  const addSolid = (x: number, y: number, s: number, bounds: { l: number; r: number; t: number; b: number }, draw: () => void) => {
    if (!inView(near, x, y)) return;
    addSprite(y, draw);
    if (sim && paperOccludesActor(x, y, s, bounds, sim.player)) solidForeground = Math.min(solidForeground, y);
  };
  for (const p of YARD_FURNITURE)
    addSolid(p.x, p.y, 1, { l: p.left - p.radius, r: p.right + p.radius, t: -44, b: 12 }, () => drawYardFurniture(ctx, p));
  for (const p of YARD_RAILS)
    addSolid(p.x, p.y, p.s, PIXEL_DECOR_BOUNDS.fence, () => drawProp(ctx, { ...p, kind: "fence", seed: 0 }));
  // The selected cat sorts just after the last scenery cut that could cover it.
  // Solid furniture stays opaque and keeps the cat behind it when seen from the north.
  const playerDepth = Math.min(solidForeground - .01,
    sprites.reduce((y, sprite) => sprite.occludesPlayer ? Math.max(y, sprite.y) : y, sim?.player.y ?? 0));
  const cat = (pose: CatPose) => {
    if (!pose.decoy) {
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
      y: pose.decoy ? pose.y : playerDepth,
      draw: () => {
        drawFootDust(ctx, pose);
        // Keep the printed colours and the face readable on every paper tone.
        const paintCat = (c: Ctx) => catArt(pose.id).draw(c, pose);
        paintCat(ctx);
        if (sim && !pose.decoy) drawActorPaperStatus(ctx, sim.player, view.time, 17, 58);
      },
    });
  };
  if (sim) {
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
        ...(sim.costume ? { costume: sim.costume.id } : {}),
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
    // Standing pieces of the worn costume's skill (paper turret, go stones).
    if (sim.costume) costumeArt(sim)?.sprites?.(ctx, sim, view.time, (y, draw) => sprites.push({ y, draw }));
    // Googly eyes follow the cat.
    const look = { x: sim.player.x, y: sim.player.y - 20 };
    // Off-screen ink is culled; the Eraser is large, so it gets a wider margin.
    const shown = sim.enemies.filter((e) => e.alive && inView(near, e.x, e.y, ENEMY_ART.find(e.kind)?.cullMargin ?? 0)),
      sketchOf = (e: (typeof shown)[number]) =>
        wash && ENEMY_DEFS.find(e.kind)?.wakesOn !== "colourless" ? sketchAmount(sim, e.x, e.y) : 0,
      // Over budget, the oldest pencil enemies keep the look (stable across frames, not draw order).
      pick = wash ? sketchEnemyPick(shown.filter((e) => sketchOf(e) > 0.25).map((e) => e.id)) : null;
    for (const e of shown)
        sprites.push({
          y: e.y,
          draw: () => {
            // Pencil enemies stamp cached pencil variants of their parts (one drawImage per part).
            drawSketchedParts(ctx, pick && !pick.has(e.id) ? 0 : sketchOf(e), (ctx) => drawCraftEnemy(ctx, e, view.time, look));
            if (!enemyContact(e)) drawHitFlash(ctx, e);
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
      dashing: false,
      hurt:
        sim.impacts.some((e) => e.kind === "hurt") &&
        Math.floor(view.time * 16) % 2 === 0,
      time: view.time,
      wear: catWear(sim.player.hp / Math.max(1, sim.player.maxHp), sim.player.healAt, sim.elapsed),
      ...(sim.costume ? { costume: sim.costume.id } : {}),
    });
    for (const shot of sim.shots) {
      if (!shot.alive || !inView(near, shot.x, shot.y)) continue;
      addSprite(shot.y, () => shot.weapon
        ? drawWeaponShot(ctx, shot, view.time)
        : drawBoltFlight(ctx, shot, sim.elapsed));
    }
  }
  drawWarningGround(ctx, warnings);
  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) {
    if (!sprite.occludesPlayer) {
      sprite.draw();
      continue;
    }
    ctx.save();
    ctx.globalAlpha *= 0.48;
    sprite.draw();
    ctx.restore();
  }
  if (sim) drawPaperRain(ctx, sim, cam, view.time, reduced);
  if (sim) {
    drawCombatFront(ctx, sim);
    for (const effect of sim.impacts) {
      // Off-screen effects are culled; the moon pulse spreads over the whole view.
      if (effect.kind !== "moon-stun" && !inView(near, effect.x, effect.y, 60)) continue;
      if (drawPaperStatusEffect(ctx, effect)) continue;
      if (drawWashEffect(ctx, effect, sim)) continue;
      if (drawPropEffect(ctx, effect)) continue;
      if (drawCombatFeedback(ctx, effect)) continue;
      if (drawJuiceEffect(ctx, effect)) continue;
      if (effect.kind === "hit" || effect.kind === "defeat")
        drawPaperImpact(ctx, { ...effect, kind: effect.kind, y: effect.y - 7 });
      else if (!drawEnemyEffect(ctx, effect)) drawSkillEffect(ctx, effect, sim);
    }
    if (cues.length) drawCueWorld(ctx, cues, sim, view.time, reduced);
  }
  drawAtmosphere(ctx, view.time, sim ? dawnAmount(progress, session) : 0, lamps);
  if (sim && warnings.length) {
    // Project just the hostile keylines over the effects and foreground. Keep the cat's face clear.
    const exposed = new Path2D(), p = sim.player;
    exposed.rect(near.x0, near.y0, near.x1 - near.x0, near.y1 - near.y0);
    exposed.roundRect(p.x - 26, p.y - 72, 52, 49, 10);
    ctx.save();
    ctx.clip(exposed, "evenodd");
    drawWarningEdges(ctx, warnings);
    ctx.restore();
  }
  if (!sim && titleCat) drawPlaybillStage(ctx, titleCat);
  ctx.restore();
  if (sim && cues.length) drawCueScreen(ctx, cues, sim, camera, view.time, reduced, projection);
  // Screen space: navigation tabs, the diorama's foreground leaves, the frame.
  if (sim) drawNavArrows(ctx, sim, camera, view.locale ?? "zh", view.time, projection);
  drawForeground(
    ctx,
    sim
      ? { x: sim.player.x * zoom + projection.x, y: sim.player.y * zoom + projection.y }
      : undefined,
    false, width, height,
  );
  drawFrame(ctx, width, height);
  // Subtle four-sided depth, leaving all gameplay visible.
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "#070e20";
    ctx.fillRect(i, 0, 1, height);
    ctx.fillRect(width - 1 - i, 0, 1, height);
    ctx.fillRect(0, i, width, 1);
    ctx.fillRect(0, height - 1 - i, width, 1);
  }
  ctx.restore();
  // Developer-only ?iso=grid check view over the frame.
  if (sim && view.isoGrid) drawIsoDebugGrid(ctx, sim, view.isoGrid);
}
