import { isoYardPieces } from "./iso/yard-models.js";
import { drawGen, drawGenShadow, genBounds, genGlows, type GenGlow } from "./iso/gen-sprites.js";
import { lampSprite, yardPropSprite } from "./iso/scenery.js";
import { activeWeaponArt, catArt, costumeArt, ENEMY_ART } from "./art-index.js";
import { enemyContact } from "../game/combat-observation.js";
import {
  drawCraftEnemy,
  drawEnemyGround,
  drawWarningEdges,
  drawWarningGround,
  enemyWarnings,
} from "./craft-enemies.js";
import { enemyRadius } from "../game/sim.js";
import { landmarks } from "../game/world-gen.js";
import { drawActorPaperStatus } from "./paper-status-art.js";
import { drawCombatGround } from "./combat-fx.js";
import type { SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import { drawPlaybillStage } from "./playbill-stage.js";
import { drawPixelStroke, drawFootDust } from "./pixel.js";
import {
  drawDawnWash,
  drawWind,
  drawGroundLight,
  drawFrame,
  dawnAmount,
  LAMPS,
  YARD_PROPS,
} from "./craft-scene.js";
import { footprintKey, ISO_DEPTH, liftInFront, modelFootprint, nativeOccludesActor, pointFootprint, type DepthOccluder } from "./iso/depth.js";
import { drawNavArrows, worldSprites, type VisibleLamp, type WorldSprite } from "./craft-world.js";
import { drawIsoGround, drawIsoWater } from "./iso/terrain-bake.js";
import { drawFireGround, propSprites } from "./craft-props.js";
import { townsfolkSprites } from "./craft-townsfolk.js";
import { drawFoldGuards, drawPaperRain, drawWashBlooms, washFrame } from "./wash-art.js";
import { drawIsoWashGround } from "./iso/wash-ground.js";
import { beginSketchFrame, drawSketchedParts, sketchAmount, sketchEnemyPick } from "./sprite-sketch.js";
import { ENEMY_DEFS } from "../defs/registries.js";
import { viewRect } from "./camera.js";
import type { Locale } from "../content/keys.js";
import {
  cameraShake,
  drawHitFlash,
  drawInteractable,
  drawStun,
  drawLandmarkActivity,
} from "./craft-juice.js";
import { light, polygon, line } from "./pixel-art.js";
import { cueTremble, presentationHitShake, presentationZoom, type Cue } from "./timeline.js";
import { catWear } from "./cat-detail.js";
import type { Ctx } from "./paper-material.js";
import { drawCueScreen } from "./cue-fx.js";
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
import { drawIsoCat, ISO_CAT } from "./iso/cat-sheet.js";
import { drawPuppetDust, PUPPET } from "./iso/puppet.js";
import { drawPuppetStatus } from "./iso/puppet-status.js";
import { drawEnemyDrop, drawEnemyPuppet } from "./iso/enemy-puppets.js";
import { beginIsoFx } from "./iso/fx-frame.js";
import { isoDirection } from "./iso/sprite-sheet.js";
import { groundPass } from "./iso/ground.js";
import { drawNorthVeil, drawOffMap, OFF_MAP } from "./iso/off-map.js";
import { ISO, depthKey, snap, toScreen, toWorld } from "./iso/projection.js";
import { drawLighting, frameLightBuffer, gatherLights, lightFrame } from "./iso/lighting.js";
import { drawRetro } from "./iso/retro.js";
import { drawFog, drawNearLayer, drawParticles, particles } from "./iso/post.js";
import { FIRE } from "../defs/fire.js";
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
  /** Seconds of presentation hit-stop remaining. */
  hitStop?: number;
  /** `?iso=grid` developer check view: the iso camera to draw the debug grid with. */
  isoGrid?: IsoCamera;
}
/** World units of margin around the view polygon for sprites, pickups and effects. */
const NEAR_PAD = 140;
/** Render-only hit memory of a run: the last drawn hp and when it last dropped. */
const hitMemory = new WeakMap<SimState, { hp: number; at: number }>();
/** Acting of the cat's puppet for the frame at `time`: a flash right after its hp dropped, a squash easing back. */
function catHitAct(sim: SimState, time: number): { flash: boolean; squash: number } {
  const p = sim.player, seen = hitMemory.get(sim);
  const at = seen && p.hp < seen.hp ? time : seen?.at ?? -Infinity;
  hitMemory.set(sim, { hp: p.hp, at });
  const since = time - at;
  return {
    flash: seen !== undefined && since >= 0 && since < PUPPET.flash,
    squash: since < PUPPET.squash.time ? 1 - since / PUPPET.squash.time : 0,
  };
}
/** Render-only direction memory keys of the chosen cat and its decoy. */
const CAT_DIR = "chosen-cat", CAT_DECOY_DIR = "chosen-cat-decoy";
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  withPaperMotion(!!view.reducedMotion, () => drawWorldFrame(ctx, sim, view, titleCat));
}

/**
 * Finishes a frame on the display canvas. The live game draws the scene on
 * this canvas directly so the reference cat art can use its full backing.
 * Offline callers can supply a separate frame for nearest-neighbour enlargement.
 * Then draw the retro layer and the screen UI at display resolution. UI painters were
 * authored for the k = 1 view, so they get the frame's projection and camera
 * expressed in k = 1 pixels and a transform that maps those onto the display.
 */
export function presentWorld(
  ctx: CanvasRenderingContext2D,
  native: CanvasImageSource & { width: number; height: number },
  sim: SimState | null,
  view: ViewState,
  width: number,
  height: number,
): void {
  const { reduced, cues, camera, projection } = frameView(sim, view), k = ISO.k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (native !== ctx.canvas) ctx.drawImage(native, 0, 0, width, height);
  drawRetro(ctx, width, height, { time: view.time, reduced, light: frameLightBuffer() });
  // UI in k = 1 view pixels: (native / k) units across the display.
  const uw = projection.width / k, uh = projection.height / k;
  ctx.setTransform(width / uw, 0, 0, height / uh, 0, 0);
  const ui = { ...projection, width: uw, height: uh, zoom: projection.zoom / k, x: projection.x / k, y: projection.y / k },
    uiCamera = { x: camera.x / k, y: camera.y / k, width: uw, height: uh };
  if (sim && cues.length) drawCueScreen(ctx, cues, sim, uiCamera, view.time, reduced, ui);
  if (sim) drawNavArrows(ctx, sim, uiCamera, view.locale ?? "zh", view.time, ui);
  drawFrame(ctx, uw, uh);
  ctx.restore();
}

/** The camera, projection and cues of one frame (shared by the native scene and the presentation pass). */
function frameView(sim: SimState | null, view: ViewState) {
  const reduced = !!view.reducedMotion,
    cues = sim ? (view.cues ?? []) : [],
    base = sim ? cameraShake(sim, view.time, reduced) : { x: 0, y: 0 },
    tremble = cueTremble(cues, view.time, reduced),
    hit = presentationHitShake(view.hitStop ?? 0, view.time, reduced),
    // Shake and tremble were authored in k = 1 view pixels.
    shake = { x: (base.x + tremble.x + hit.x) * ISO.k, y: (base.y + tremble.y + hit.y) * ISO.k },
    zoom = presentationZoom(cues, reduced);
  const camera = view.camera ?? createIsoCamera(undefined, undefined, sim?.player),
    // Zoom gathers on the cat's body, a little above its projected foot.
    lift = CAT_BODY * ISO.k,
    foot = sim ? toScreen(sim.player.x, sim.player.y) : { x: camera.x, y: camera.y + lift },
    focus = toWorld(foot.x, foot.y - lift),
    projection = isoProjection(camera, focus, zoom, shake);
  return { reduced, cues, zoom, camera, projection };
}
/** Height of the cat's body centre over its foot in k = 1 art pixels. */
const CAT_BODY = 20;
function drawWorldFrame(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCat?: CatPose,
): void {
  ctx.imageSmoothingEnabled = false;
  const { reduced, cues, zoom, camera, projection } = frameView(sim, view),
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
    fx = sim ? beginIsoFx(projection, view.time, reduced) : undefined,
    // Compatibility for registry ground painters with no explicit foot.
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
  // Isometric ground: baked screen-space blocks from the terrain field (projected pixels, no affine).
  const washStart = view.profile ? performance.now() : 0;
  const groundRect = {
    x0: -projection.x / zoom, y0: -projection.y / zoom,
    x1: (width - projection.x) / zoom, y1: (height - projection.y) / zoom,
  };
  drawIsoGround(ctx, seed, groundRect, sim !== null);
  // Cached ripple overlay frame of the visible water blocks (frame by time; reduced motion keeps frame 0).
  drawIsoWater(ctx, seed, groundRect, view.time, reduced);
  drawIsoWashGround(ctx, groundRect, wash);
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
      drawCombatGround(g, sim, true);
      drawEnemyGround(g, sim);
      drawFireGround(g, sim, cam);
      for (const landmark of landmarks(seed)) if (inNear(landmark.x, landmark.y, landmark.radius))
        drawLandmarkActivity(g, sim, landmark);
    }
  });
  if (sim && fx) fx.ground(ctx, sim);
  const town = worldSprites(ctx, seed, cam, view.time, {
    cat: sim?.player ?? null, reduced, activities: sim?.landmarkEvents,
    ...(wash && sim ? { sketch: (x: number, y: number) => sketchAmount(sim, x, y) } : {}),
  });
  const sprites: WorldSprite[] = [...town.sprites];
  const glows: GenGlow[] = [...town.glows];
  // Landmark ground bases, then the baked hard shadows on the ground under every sprite.
  for (const g of town.grounds) g();
  for (const shadow of town.shadows) shadow();
  type Foot = { x: number; y: number };
  const addSprite = (y: number, draw: () => void, occludesPlayer?: boolean, foot?: Foot, native?: boolean) =>
    sprites.push({ y, draw, occludesPlayer, ...(foot ? { foot } : {}), ...(native ? { native } : {}) });
  const addHook = (y: number, draw: () => void, foot?: Foot, native?: boolean) => addSprite(y, draw, false, foot, native);
  propSprites(ctx, sim, seed, cam, view.time, addSprite, glows);
  if (sim && fx) fx.fireSprites(ctx, sim, addSprite);
  if (sim) townsfolkSprites(ctx, sim, cam, view.time, addHook,
    wash ? (x: number, y: number) => sketchAmount(sim, x, y) : undefined, reduced, glows);
  /** A baked voxel sprite at its world foot: ground shadow now, the sprite in the depth sort, its emissive anchors as lights. */
  const baked = (id: string, x: number, y: number, extra: Partial<WorldSprite> & { fades?: boolean } = {}) => {
    drawGenShadow(ctx, id, x, y);
    genGlows(id, x, y, glows);
    const { fades = true, ...rest } = extra;
    sprites.push({
      y,
      foot: { x, y },
      native: true,
      occludesPlayer: fades && !!sim && nativeOccludesActor(x, y, genBounds(id), sim.player, rest.footprint),
      draw: () => drawGen(ctx, id, x, y),
      ...rest,
    });
  };
  const lamps: VisibleLamp[] = [...town.lamps];
  for (const l of LAMPS) {
    if (!inNear(l.x, l.y)) continue;
    lamps.push(l);
    baked(lampSprite(l.s), l.x, l.y);
  }
  ground((g) => { for (const l of lamps) drawGroundLight(g, l.x, l.y, view.time, l.s); });
  let fence = 0;
  for (const p of YARD_PROPS) {
    const id = yardPropSprite(p, p.kind === "fence" ? fence++ : 0);
    if (!id || !inNear(p.x, p.y)) continue;
    baked(id, p.x, p.y);
  }
  // The opening yard as baked voxel sprites (iso/yard-models.ts). Buildings fade over a cat
  // behind them; low furniture and rails stay opaque, drawn after the cat when it is behind.
  for (const p of isoYardPieces()) {
    if (!inNear(p.x, p.y, p.reach)) continue;
    const footprint = p.kind === "crop" || p.kind === "tree" ? undefined : modelFootprint(p.base, p.x, p.y);
    baked(p.sprite, p.x, p.y, { fades: p.fades, ...(footprint ? { footprint } : {}) });
  }
  // Depth of a sprite: the front-most corner of its footprint, or depthKey of
  // its foot plus the painter's small sort bias. Hooks without a foot point
  // fall back to the cat's column.
  const keyOf = (s: WorldSprite) => s.key ?? (s.footprint
    ? footprintKey(s.footprint)
    : s.foot
      ? depthKey(s.foot.x, s.foot.y) + (s.y - s.foot.y)
      : depthKey(sim?.player.x ?? 0, s.y));
  // Foreground buildings fade in place. A tree or post that covers the cat
  // recedes as a whole so the cat can keep its full silhouette and face.
  const footprints: DepthOccluder[] = [];
  for (const sprite of sprites) if (sprite.footprint) footprints.push({ footprint: sprite.footprint, key: keyOf(sprite) });
  const playerDepth = sim ? liftInFront(depthKey(sim.player.x, sim.player.y), sim.player, footprints) : 0;
  const isPointCover = (sprite: WorldSprite) => sprite.native && !sprite.footprint;
  for (const sprite of sprites) {
    if (!sprite.occludesPlayer) continue;
    sprite.key = isPointCover(sprite)
      ? Math.min(keyOf(sprite), playerDepth - .01)
      : Math.max(keyOf(sprite), playerDepth + .01);
  }
  const cat = (pose: CatPose) => {
    const art = catArt(pose.id);
    const act = sim && !pose.decoy ? catHitAct(sim, view.time) : { flash: false, squash: 0 };
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
      // The baked puppet draws natively; the old paper cat keeps the upright half-size transform.
      native: !!art.iso,
      ...(pose.decoy ? {} : { key: playerDepth }),
      draw: () => {
        if (art.iso) {
          // Direction from the projected velocity; a still cat (or its decoy) keeps its last one.
          const dir = pose.decoy || !sim
            ? isoDirection(CAT_DECOY_DIR, 0, 0, pose.facing)
            : isoDirection(CAT_DIR, sim.player.vx, sim.player.vy, sim.player.facing);
          if (sim) drawPuppetDust(ctx, pose.x, pose.y, pose.moving ? sim.player.vx : 0, pose.moving ? sim.player.vy : 0, view.time, reduced);
          drawIsoCat(ctx, art.iso, pose, dir, act);
          if (sim && !pose.decoy) drawPuppetStatus(ctx, sim.player, view.time, ISO_CAT.box, fx);
          return;
        }
        drawFootDust(ctx, pose);
        // Keep the printed colours and the face readable on every paper tone.
        const paintCat = (c: Ctx) => art.draw(c, pose);
        paintCat(ctx);
        if (sim && !pose.decoy) drawActorPaperStatus(ctx, sim.player, view.time, 17, 58);
      },
    });
  };
  if (sim && fx) {
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
    for (const s of sim.pickups)
      if (s.alive && inNear(s.x, s.y)) addSprite(s.y, () => fx.pickup(ctx, "shard", s), false, s, true);
    for (const o of sim.interactables)
      if (inNear(o.x, o.y)) sprites.push({ y: o.y + 0.1, foot: o, draw: () => drawInteractable(ctx, o, view.time) });
    for (const t of sim.treats)
      if (t.alive && inNear(t.x, t.y)) addSprite(t.y, () => fx.pickup(ctx, "treat", t), false, t, true);
    for (const c of sim.chests)
      if (c.alive && inNear(c.x, c.y)) addSprite(c.y, () => fx.pickup(ctx, "chest", c), false, c, true);
    fx.weaponSprites(ctx, sim, addSprite);
    for (const w of activeWeaponArt(sim))
      if (w.id !== "moon-stars" && w.id !== "echo-legion") w.sprites?.(ctx, sim, view.time, addHook);
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
    for (const e of shown) {
      const puppet = ENEMY_ART.find(e.kind)?.puppet;
      const pencil = pick && !pick.has(e.id) ? 0 : sketchOf(e);
      addSprite(e.y, () => {
        if (puppet && e.spawnTime > 0) {
          fx.spawn(ctx, e);
          return;
        }
        if (puppet) {
          drawEnemyPuppet(ctx, puppet, e, view.time, look, pencil > 0.25, fx);
          return;
        }
        drawSketchedParts(ctx, pencil, (ctx) => drawCraftEnemy(ctx, e, view.time, look));
        if (!enemyContact(e)) drawHitFlash(ctx, e);
        if (e.spawnTime <= 0) drawActorPaperStatus(ctx, e, view.time, enemyRadius(e));
        drawStun(ctx, e, view.time);
      }, false, e, !!puppet);
    }
    for (const s of sim.enemyShots)
      if (s.alive) {
        const k = Math.min(1, s.t / s.flight), at = { x: s.x0 + (s.tx - s.x0) * k, y: s.y0 + (s.ty - s.y0) * k };
        if (inNear(at.x, at.y, 70)) addSprite(at.y, () => drawEnemyDrop(ctx, s, at.x, at.y, k), false, at, true);
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
      addSprite(shot.y, () => fx.shot(ctx, shot), false, shot, true);
    }
  }
  ground((g) => drawWarningGround(g, warnings));
  // Every other point actor (enemies, pickups, shots, townsfolk, the decoy) gets the cat's
  // separating-axis lift over nearby footprints and over occluders raised above the cat,
  // so a long rail or a faded building never paints over an actor standing in front of it.
  const occluders: DepthOccluder[] = [];
  for (const sprite of sprites)
    if (sprite.footprint || sprite.occludesPlayer)
      occluders.push({ footprint: sprite.footprint ?? pointFootprint(sprite.foot?.x ?? 0, sprite.foot?.y ?? sprite.y), key: keyOf(sprite) });
  for (const sprite of sprites) {
    if (sprite.key !== undefined || sprite.footprint || sprite.occludesPlayer || !sprite.foot) continue;
    sprite.key = liftInFront(keyOf(sprite), sprite.foot, occluders);
  }
  for (const sprite of sprites) sprite.key = keyOf(sprite);
  for (const sprite of depthSort(sprites as (WorldSprite & { key: number })[])) {
    const paint = () => sprite.native ? sprite.draw() : sprite.foot ? upright(sprite.foot.x, sprite.foot.y, sprite.draw) : affine(sprite.draw);
    if (!sprite.occludesPlayer) {
      paint();
      continue;
    }
    ctx.save();
    ctx.globalAlpha *= isPointCover(sprite) ? ISO_DEPTH.pointFade : ISO_DEPTH.fade;
    paint();
    ctx.restore();
  }
  if (sim) upright(cam.x, cam.y, () => drawPaperRain(ctx, sim, cam, view.time, reduced));
  if (sim && fx) fx.front(ctx, sim, cues);
  if (sim && warnings.length) {
    // Project just the hostile keylines over the effects and foreground. Keep the cat's face clear.
    const exposed = new Path2D(), p = toScreen(sim.player.x, sim.player.y);
    exposed.rect(camera.x - camera.width / 2 - NEAR_PAD, camera.y - camera.height / 2 - NEAR_PAD,
      camera.width + NEAR_PAD * 2, camera.height + NEAR_PAD * 2);
    const k = ISO.k;
    exposed.roundRect(snap(p.x) - 26 * k, snap(p.y) - 72 * k, 52 * k, 49 * k, 10 * k);
    ctx.save();
    ctx.clip(exposed, "evenodd");
    ground((g) => drawWarningEdges(g, warnings));
    ctx.restore();
  }
  if (!sim && titleCat) upright(titleCat.x, titleCat.y, () => drawPlaybillStage(ctx, titleCat));
  ctx.restore();
  // Post, in native view pixels: additive light buffer (+ dawn tint) -> fog -> particles -> near layer.
  // The retro layer and the screen UI follow on the presentation canvas (presentWorld).
  const dawn = sim ? dawnAmount(progress, session) : 0;
  // Every lamp, window, candle and carved pumpkin of the scenery is a baked sprite whose emissive anchors light the frame.
  drawLighting(ctx, lightFrame(gatherLights({ lamps: [], windows: [], decor: [], glows, sim, nativeEffects: true }), {
    project: (x, y) => projectToView(projection, x, y), zoom, width, height,
    focus: sim?.player ?? toWorld(camera.x, camera.y), dawn, time: view.time, reduced,
  }), width, height, { effects: fx?.lightImage() });
  // Two parallax ground-fog layers (iso/post.ts).
  drawFog(ctx, width, height, camera.x, camera.y, view.time, reduced, dawn);
  // Fireflies, falling leaves, and ash over the first burning cells (render hash, capped).
  const fires: { x: number; y: number }[] = [];
  if (sim) for (const [key, left] of Object.entries(sim.fire.cells)) {
    if (!(left > 0) || fires.length >= 8) continue;
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    fires.push(projectToView(projection, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell));
  }
  drawParticles(ctx, particles({ width, height, cameraX: camera.x, cameraY: camera.y, time: view.time, reduced, dawn, fires }));
  // Pre-blurred foreground leaves at the bottom corners; a corner fades over the cat,
  // a hostile, a pickup or a chest standing in it.
  const watched: { x: number; y: number }[] = [];
  if (sim) {
    const watch = (p: { x: number; y: number }) => watched.push(projectToView(projection, p.x, p.y));
    watch(sim.player);
    for (const e of sim.enemies) if (e.alive) watch(e);
    for (const s of sim.pickups) if (s.alive) watch(s);
    for (const c of sim.chests) if (c.alive) watch(c);
    for (const t of sim.treats) if (t.alive) watch(t);
  }
  drawNearLayer(ctx, width, height, watched, view.time, reduced);
  // Developer-only ?iso=grid check view over the frame.
  if (sim && view.isoGrid) drawIsoDebugGrid(ctx, sim, view.isoGrid);
}
