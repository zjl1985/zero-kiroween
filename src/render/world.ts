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
import { landmarks, SCREEN } from "../game/world-gen.js";
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
import { actorBehind, footprintKey, ISO_DEPTH, isoOccludesActor, type Footprint } from "./iso/depth.js";
import { drawChunks, drawNavArrows, worldSprites, type VisibleLamp, type WorldSprite } from "./craft-world.js";
import { drawFireGround, drawPropEffect, fireSprites, propSprites } from "./craft-props.js";
import { townsfolkSprites } from "./craft-townsfolk.js";
import { drawFoldGuards, drawPaperRain, drawWashBlooms, drawWashEffect, drawWashGround, washFrame } from "./wash-art.js";
import { beginSketchFrame, drawSketchedParts, sketchAmount, sketchEnemyPick } from "./sprite-sketch.js";
import { ENEMY_DEFS } from "../defs/registries.js";
import { viewRect } from "./camera.js";
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
import { cueTremble, presentationZoom, type Cue } from "./timeline.js";
import { catWear } from "./cat-detail.js";
import type { Ctx } from "./paper-material.js";
import { drawCueScreen, drawCueWorld } from "./cue-fx.js";
import { withPaperMotion } from "./paper-motion.js";
import { drawIsoDebugGrid } from "./iso/debug-grid.js";
import {
  createIsoCamera,
  isoProjection,
  isoWorldCamera,
  projectToView,
  viewWorldPolygon,
  type IsoCamera,
} from "./iso/iso-camera.js";
import { isoInView } from "./iso/cull.js";
import { atFoot, depthSort, onGround } from "./iso/place.js";
import { groundPass } from "./iso/ground.js";
import { drawNorthVeil, drawOffMap, OFF_MAP } from "./iso/off-map.js";
import { depthKey, snap, toScreen, toWorld } from "./iso/projection.js";
export { VIEW_WIDTH, VIEW_HEIGHT } from "./viewport.js";
export interface ViewState {
  /** Optional developer CPU instrumentation; absent in normal gameplay. */
  profile?: { mask: number };
  time: number;
  reducedMotion?: boolean;
  /** Isometric follow camera from main.ts; defaults to framing the cat (or the start yard). */
  camera?: IsoCamera;
  /** For the navigation arrow labels. */
  locale?: Locale;
  /** Presentation cues (timeline.ts) from main.ts. */
  cues?: readonly Cue[];
  /** `?iso=grid` developer check view: the iso camera to draw the debug grid with. */
  isoGrid?: IsoCamera;
}
/** World units of margin around the view polygon for sprites, pickups and effects. */
const NEAR_PAD = 140;
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
  const camera = view.camera ?? createIsoCamera(SCREEN.width, SCREEN.height, sim?.player),
    // Zoom gathers on the cat's body, 20 view pixels above its projected foot.
    foot = sim ? toScreen(sim.player.x, sim.player.y) : { x: camera.x, y: camera.y + 20 },
    focus = toWorld(foot.x, foot.y - 20),
    projection = isoProjection(camera, focus, zoom, shake),
    { width, height } = projection,
    // World box around the view polygon for painters that still cull by a world rectangle.
    cam = isoWorldCamera(camera),
    seed = sim?.seed ?? 0,
    progress = sim ? sim.elapsed / sim.sessionSeconds : 0,
    session = sim?.sessionSeconds,
    viewPoly = viewWorldPolygon(camera),
    view0 = viewRect(cam),
    inNear = (x: number, y: number, pad = 0) => isoInView(viewPoly, x, y, NEAR_PAD + pad),
    warnings = sim ? enemyWarnings(sim) : [],
    // Cached chunk images stay under the projection's affine until FEAT-004 rebuilds the ground.
    affine = (paint: () => void) => onGround(ctx, paint),
    // Vector ground shapes: every vertex projected, line widths and images in screen space.
    ground = (paint: (g: Ctx) => void) => groundPass(ctx, paint),
    upright = (x: number, y: number, paint: () => void) => atFoot(ctx, x, y, paint);
  // Far fog behind everything, then the cached tree wall / night fog outside the projected WORLD.
  ctx.save();
  ctx.fillStyle = OFF_MAP.floor;
  ctx.fillRect(0, 0, width, height);
  ctx.translate(projection.x, projection.y);
  ctx.scale(zoom, zoom);
  drawOffMap(ctx, -projection.x / zoom, -projection.y / zoom, (width - projection.x) / zoom, (height - projection.y) / zoom,
    sim ? dawnAmount(progress, session) : 0);
  // Washed paper: chunks with lifted colour get their pencil layer (nothing runs when nothing was washed).
  const maskStart = view.profile ? performance.now() : 0;
  const wash = sim ? washFrame(sim) : null;
  if (view.profile) view.profile.mask = performance.now() - maskStart;
  beginSketchFrame();
  // Chunk ground and its wash masks share the cached tile lattice (placeholder ground).
  const washStart = view.profile ? performance.now() : 0;
  affine(() => {
    // Pixel wash owns a bounded dirty-tile overlay; no legacy pencil terrain bake.
    drawChunks(ctx, seed, cam, sim !== null);
    drawWashGround(ctx, cam, wash, false);
  });
  // Background strip north of WORLD.playTop: a quiet fog veil on the ground.
  drawNorthVeil(ctx, cam.x - cam.width / 2, cam.x + cam.width / 2);
  // Ground shapes from projected vertices: fire cells become 24-unit diamonds, rings 2:1 ellipses.
  ground((g) => {
    drawWashBlooms(g, cam, wash);
    if (view.profile) view.profile.mask += performance.now() - washStart;
    if (sim) drawFoldGuards(g, sim, cam);
    if (sim) drawDawnWash(g, progress, view0.x0, view0.y0, cam.width, cam.height, session);
    drawWind(g, view.time);
    if (sim) {
      drawCombatGround(g, sim);
      drawEnemyGround(g, sim);
      drawFireGround(g, sim, cam);
      for (const landmark of landmarks(seed)) if (inNear(landmark.x, landmark.y, landmark.radius))
        drawLandmarkActivity(g, sim, landmark);
    }
  });
  const town = worldSprites(ctx, seed, cam, view.time, {
    cat: sim?.player ?? null, reduced, activities: sim?.landmarkEvents,
    ...(wash && sim ? { sketch: (x: number, y: number) => sketchAmount(sim, x, y) } : {}),
  });
  const sprites: WorldSprite[] = [...town.sprites];
  type Foot = { x: number; y: number };
  const addSprite = (y: number, draw: () => void, occludesPlayer?: boolean, foot?: Foot) =>
    sprites.push({ y, draw, occludesPlayer, ...(foot ? { foot } : {}) });
  const addHook = (y: number, draw: () => void, foot?: Foot) => addSprite(y, draw, false, foot);
  propSprites(ctx, sim, seed, cam, view.time, addSprite);
  if (sim) fireSprites(ctx, sim, cam, view.time, addSprite);
  if (sim) townsfolkSprites(ctx, sim, cam, view.time, addHook,
    wash ? (x: number, y: number) => sketchAmount(sim, x, y) : undefined, reduced);
  const lamps: VisibleLamp[] = [...town.lamps];
  for (const l of LAMPS) {
    if (!inNear(l.x, l.y)) continue;
    lamps.push(l);
    addSprite(l.y, () => drawLamp(ctx, l, view.time),
      !!sim && isoOccludesActor(l.x, l.y, l.s, PIXEL_DECOR_BOUNDS.lamp, sim.player), l);
  }
  ground((g) => { for (const l of lamps) drawGroundLight(g, l.x, l.y, view.time, l.s); });
  for (const p of YARD_PROPS) {
    if (!inNear(p.x, p.y)) continue;
    addSprite(p.y, () => drawProp(ctx, p),
      !!sim && isoOccludesActor(p.x, p.y, p.s, PIXEL_DECOR_BOUNDS[p.kind], sim.player), p);
  }
  // Solid yard furniture stays opaque: drawn after the cat when the cat is behind it.
  const addSolid = (x: number, y: number, draw: () => void, footprint?: Footprint) => {
    if (!inNear(x, y)) return;
    sprites.push({ y, draw, foot: { x, y }, ...(footprint ? { footprint } : {}) });
  };
  for (const p of YARD_FURNITURE)
    addSolid(p.x, p.y, () => drawYardFurniture(ctx, p), {
      x0: p.x + p.left - p.radius, x1: p.x + p.right + p.radius,
      y0: p.y + p.contactY - p.radius, y1: p.y + p.contactY + p.radius,
    });
  for (const p of YARD_RAILS)
    addSolid(p.x, p.y, () => drawProp(ctx, { ...p, kind: "fence", seed: 0 }));
  // Depth of a sprite: the front-most corner of its footprint, or depthKey of
  // its foot plus the painter's small sort bias. Hooks without a foot point
  // fall back to the cat's column.
  const keyOf = (s: WorldSprite) => s.key ?? (s.footprint
    ? footprintKey(s.footprint)
    : s.foot
      ? depthKey(s.foot.x, s.foot.y) + (s.y - s.foot.y)
      : depthKey(sim?.player.x ?? 0, s.y));
  // The cat sorts at its own foot, after every multi-tile footprint it stands in front of.
  // Occluders it stands behind sort after it and fade (iso/depth.ts).
  const playerDepth = sprites.reduce((k, sprite) =>
    sim && sprite.footprint && !actorBehind(sprite.footprint, sim.player) ? Math.max(k, keyOf(sprite) + .01) : k,
  sim ? depthKey(sim.player.x, sim.player.y) : 0);
  for (const sprite of sprites)
    if (sprite.occludesPlayer) sprite.key = Math.max(keyOf(sprite), playerDepth + .01);
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
      ground((g) => {
        g.save();
        g.globalAlpha = 0.24;
        polygon(
          g,
          [
            [pose.x - 9, pose.y],
            [pose.x + 10, pose.y],
            [pose.x + (dx / len) * 25 + 9, pose.y + (dy / len) * 12],
            [pose.x + (dx / len) * 25 - 9, pose.y + (dy / len) * 12],
          ],
          "#101e28",
        );
        g.restore();
      });
    }
    sprites.push({
      y: pose.y,
      foot: pose,
      ...(pose.decoy ? {} : { key: playerDepth }),
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
    ground((g) => drawPixelStroke(
      g,
      sim.stroke.points,
      sim.stroke.ink,
      sim.stroke.ink <= 0 && sim.stroke.blankTime > 0,
      sim.stroke.thickness,
      view.time,
    ));
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
      upright(sim.decoy.x, sim.decoy.y, () => light(ctx, sim.decoy.x, sim.decoy.y - 18, 35, "#91bacf", 0.12, 1));
    }
    const reach = playerStats(sim).pickupRadius;
    for (const s of sim.pickups)
      if (s.alive && inNear(s.x, s.y))
        sprites.push({
          y: s.y,
          foot: s,
          draw: () => {
            drawShardTrail(ctx, s, sim, reach, view.time);
            drawInkShard(ctx, s.x, s.y, view.time, s.id, s.value);
          },
        });
    for (const o of sim.interactables)
      if (inNear(o.x, o.y)) sprites.push({ y: o.y + 0.1, foot: o, draw: () => drawInteractable(ctx, o, view.time) });
    for (const t of sim.treats)
      if (t.alive && inNear(t.x, t.y)) sprites.push({ y: t.y, foot: t, draw: () => drawTreat(ctx, t, view.time) });
    for (const c of sim.chests)
      if (c.alive && inNear(c.x, c.y)) sprites.push({ y: c.y, foot: c, draw: () => drawChest(ctx, c, view.time) });
    // Weapon pieces that stand in the world (orbit stars, echo shards).
    for (const w of activeWeaponArt(sim)) w.sprites?.(ctx, sim, view.time, addHook);
    // Standing pieces of the worn costume's skill (paper turret, go stones).
    if (sim.costume) costumeArt(sim)?.sprites?.(ctx, sim, view.time, addHook);
    // Googly eyes follow the cat.
    const look = { x: sim.player.x, y: sim.player.y - 20 };
    // Off-screen ink is culled; the Eraser is large, so it gets a wider margin.
    const shown = sim.enemies.filter((e) => e.alive && inNear(e.x, e.y, ENEMY_ART.find(e.kind)?.cullMargin ?? 0)),
      sketchOf = (e: (typeof shown)[number]) =>
        wash && ENEMY_DEFS.find(e.kind)?.wakesOn !== "colourless" ? sketchAmount(sim, e.x, e.y) : 0,
      // Over budget, the oldest pencil enemies keep the look (stable across frames, not draw order).
      pick = wash ? sketchEnemyPick(shown.filter((e) => sketchOf(e) > 0.25).map((e) => e.id)) : null;
    for (const e of shown)
        sprites.push({
          y: e.y,
          foot: e,
          draw: () => {
            // Pencil enemies stamp cached pencil variants of their parts (one drawImage per part).
            drawSketchedParts(ctx, pick && !pick.has(e.id) ? 0 : sketchOf(e), (ctx) => drawCraftEnemy(ctx, e, view.time, look));
            if (!enemyContact(e)) drawHitFlash(ctx, e);
            if (e.spawnTime <= 0) drawActorPaperStatus(ctx, e, view.time, enemyRadius(e));
            drawStun(ctx, e, view.time);
          },
        });
    for (const s of sim.enemyShots)
      if (s.alive) {
        const k = Math.min(1, s.t / s.flight), at = { x: s.x0 + (s.tx - s.x0) * k, y: s.y0 + (s.ty - s.y0) * k };
        sprites.push({ y: at.y, foot: at, draw: () => drawEnemyShot(ctx, s) });
      }
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
      if (!shot.alive || !inNear(shot.x, shot.y)) continue;
      addSprite(shot.y, () => shot.weapon
        ? drawWeaponShot(ctx, shot, view.time)
        : drawBoltFlight(ctx, shot, sim.elapsed), false, shot);
    }
  }
  ground((g) => drawWarningGround(g, warnings));
  for (const sprite of sprites) sprite.key = keyOf(sprite);
  for (const sprite of depthSort(sprites as (WorldSprite & { key: number })[])) {
    const paint = () => sprite.foot ? upright(sprite.foot.x, sprite.foot.y, sprite.draw) : affine(sprite.draw);
    if (!sprite.occludesPlayer) {
      paint();
      continue;
    }
    ctx.save();
    ctx.globalAlpha *= ISO_DEPTH.fade;
    paint();
    ctx.restore();
  }
  if (sim) upright(cam.x, cam.y, () => drawPaperRain(ctx, sim, cam, view.time, reduced));
  if (sim) {
    upright(sim.player.x, sim.player.y, () => drawCombatFront(ctx, sim));
    for (const effect of sim.impacts) {
      // Off-screen effects are culled; the moon pulse spreads over the whole view.
      if (effect.kind !== "moon-stun" && !inNear(effect.x, effect.y, 60)) continue;
      upright(effect.x, effect.y, () => {
        if (drawPaperStatusEffect(ctx, effect)) return;
        if (drawWashEffect(ctx, effect, sim)) return;
        if (drawPropEffect(ctx, effect)) return;
        if (drawCombatFeedback(ctx, effect)) return;
        if (drawJuiceEffect(ctx, effect)) return;
        if (effect.kind === "hit" || effect.kind === "defeat")
          drawPaperImpact(ctx, { ...effect, kind: effect.kind, y: effect.y - 7 });
        else if (!drawEnemyEffect(ctx, effect)) drawSkillEffect(ctx, effect, sim);
      });
    }
    for (const c of cues) {
      const x = c.kind === "evolution" ? sim.player.x : c.x ?? sim.player.x,
        y = c.kind === "evolution" ? sim.player.y : c.y ?? sim.player.y;
      upright(x, y, () => drawCueWorld(ctx, [c], sim, view.time, reduced));
    }
  }
  ground((g) => drawAtmosphere(g, view.time, sim ? dawnAmount(progress, session) : 0, lamps));
  if (sim && warnings.length) {
    // Project just the hostile keylines over the effects and foreground. Keep the cat's face clear.
    const exposed = new Path2D(), p = toScreen(sim.player.x, sim.player.y);
    exposed.rect(camera.x - camera.width / 2 - NEAR_PAD, camera.y - camera.height / 2 - NEAR_PAD,
      camera.width + NEAR_PAD * 2, camera.height + NEAR_PAD * 2);
    exposed.roundRect(snap(p.x) - 26, snap(p.y) - 72, 52, 49, 10);
    ctx.save();
    ctx.clip(exposed, "evenodd");
    ground((g) => drawWarningEdges(g, warnings));
    ctx.restore();
  }
  if (!sim && titleCat) upright(titleCat.x, titleCat.y, () => drawPlaybillStage(ctx, titleCat));
  ctx.restore();
  if (sim && cues.length) drawCueScreen(ctx, cues, sim, camera, view.time, reduced, projection);
  // Screen space: navigation tabs, the diorama's foreground leaves, the frame.
  if (sim) drawNavArrows(ctx, sim, camera, view.locale ?? "zh", view.time, projection);
  drawForeground(ctx, sim ? projectToView(projection, sim.player.x, sim.player.y) : undefined, false, width, height);
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
