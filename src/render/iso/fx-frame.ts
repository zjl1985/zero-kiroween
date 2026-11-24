import { FIRE } from "../../defs/fire.js";
import { ENEMY_DEFS } from "../../defs/registries.js";
import { surface, type CanvasContext, type CanvasSurface } from "../../engine/surface.js";
import { impactContact, shotLaunch } from "../../game/combat-observation.js";
import { enemyRadius, orbitPositions } from "../../game/sim.js";
import type { ChestState, EnemyState, Impact, PickupState, ShotState, SimState, TreatState } from "../../game/types.js";
import { playerStats, UPGRADE_VALUES } from "../../game/upgrades.js";
import {
  Painter, TAU, clamp, createFrame, hex, rand, sparkle, type Frame,
} from "../pixelfx/index.js";
import { cueEnvelope, cuePhase, type Cue } from "../timeline.js";
import {
  paintFire, paintFlight, paintGroundRing, paintImpact, paintLoot, paintOrbit, paintSpawn,
  paintStatus, type LootKind, type StatusLook,
} from "./fx-paint.js";
import { projectToView, type IsoProjection } from "./iso-camera.js";
import { ISO, toScreen, type Vec } from "./projection.js";

type Ctx = CanvasContext;
type Add = (y: number, draw: () => void, occludesPlayer?: boolean, foot?: Vec, native?: boolean) => void;
type Loot = PickupState | ChestState | TreatState;
type Box = { x: number; y: number; w: number; h: number };

export const ISO_FX_LIMIT = { impacts: 72, fires: FIRE.maxCells, shots: 96, loot: 112, spawns: 100 } as const;
const WARM = hex("#eac27b"), COLD = hex("#c6dbf5"), VIOLET = hex("#8e8abc"), SHADE = hex("#543e65");
const seenImpacts = new WeakMap<Impact, { time: number; life: number }>();

/** Fade impacts with the presentation clock while the actors are held.
 * Weak keys let observations disappear when the sim releases their impacts. */
function impactLife(e: Impact, now: number): number {
  const seen = seenImpacts.get(e);
  if (seen) return Math.min(e.life, seen.life - Math.max(0, now - seen.time));
  seenImpacts.set(e, { time: now, life: e.life });
  return e.life;
}

class FxPainter extends Painter {
  lit = false;

  override add(x: number, y: number, c: number, k = 1): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h && k * this.fade * this.lightK > .004)
      this.lit = true;
    super.add(x, y, c, k);
  }
}

interface Images {
  readonly canvas: CanvasSurface;
  readonly ctx: Ctx;
  readonly data: ImageData;
}

function images(w: number, h: number): Images | undefined {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return;
  const canvas = surface(w, h), ctx = canvas.getContext("2d") as Ctx | null;
  return ctx ? { canvas, ctx, data: ctx.createImageData(w, h) } : undefined;
}

function upload(images: Images, pixels: Uint32Array, w: number, b: Box): void {
  const bytes = new Uint8ClampedArray(pixels.buffer);
  for (let y = b.y; y < b.y + b.h; y++) {
    const start = (y * w + b.x) * 4;
    images.data.data.set(bytes.subarray(start, start + b.w * 4), start);
  }
  images.ctx.putImageData(images.data, 0, 0, b.x, b.y, b.w, b.h);
}

function inView(p: Vec, w: number, h: number, pad: number): boolean {
  return p.x >= -pad && p.x < w + pad && p.y >= -pad && p.y < h + pad;
}

/** A reused native color/light buffer. Color stamps are consumed in depth
 * order, while light accumulates across the ground, actors and front pass. */
export class IsoFxFrame {
  private readonly frame: Frame;
  private readonly painter: FxPainter;
  private color?: Images;
  private light?: Images;
  private projection: IsoProjection;
  private time = 0;
  private reduced = false;
  private ms = 0;
  private counts = { shots: 0, loot: 0, spawns: 0 };

  constructor(projection: IsoProjection) {
    this.frame = createFrame(Math.round(projection.width), Math.round(projection.height));
    this.painter = new FxPainter(this.frame);
    this.projection = projection;
  }

  get width(): number { return this.frame.w; }
  get height(): number { return this.frame.h; }

  reset(projection: IsoProjection, time: number, reduced: boolean): this {
    const start = performance.now();
    this.projection = projection;
    this.time = time;
    this.reduced = reduced;
    this.counts.shots = this.counts.loot = this.counts.spawns = 0;
    this.frame.color.fill(0);
    this.frame.light.fill(0);
    this.painter.reset();
    this.painter.lit = false;
    this.ms = performance.now() - start;
    return this;
  }

  private pixel(at: Vec): Vec {
    return projectToView(this.projection, at.x, at.y);
  }

  private layColor(ctx: Ctx, box: Box): void {
    if (box.w <= 0 || box.h <= 0) return;
    const color = this.color ??= images(this.width, this.height);
    if (!color) return;
    upload(color, this.frame.color, this.width, box);
    // Undo the world projection and keep the caller's normal view backing
    // transform and clip. Each stamp occupies just its dirty rectangle.
    const { x, y, zoom } = this.projection;
    ctx.save();
    ctx.scale(1 / zoom, 1 / zoom);
    ctx.translate(-x, -y);
    if (box.x === 0 && box.y === 0 && box.w === this.width && box.h === this.height)
      ctx.drawImage(color.canvas, 0, 0);
    else
      ctx.drawImage(color.canvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    ctx.restore();
    for (let row = box.y; row < box.y + box.h; row++) {
      const start = row * this.width + box.x;
      this.frame.color.fill(0, start, start + box.w);
    }
  }

  private stamp(ctx: Ctx, at: Vec, pad: number, paint: (p: Painter) => void): void {
    const start = performance.now(), s = this.pixel(at);
    if (!inView(s, this.width, this.height, pad)) return;
    this.painter.place(s.x, s.y);
    paint(this.painter);
    const x = Math.max(0, s.x - pad), y = Math.max(0, s.y - pad);
    this.layColor(ctx, { x, y, w: Math.min(this.width, s.x + pad + 1) - x, h: Math.min(this.height, s.y + pad + 1) - y });
    this.ms += performance.now() - start;
  }

  private whole(ctx: Ctx): void {
    this.layColor(ctx, { x: 0, y: 0, w: this.width, h: this.height });
  }

  ground(ctx: Ctx, sim: SimState): void {
    const start = performance.now();
    const stats = playerStats(sim), { x, y } = this.pixel(sim.player);
    const scale = ISO.k * Math.SQRT2 * this.projection.zoom, p = this.painter;
    let drawn = false;
    if (stats.orbitCount > 0) {
      p.place(x, y);
      paintGroundRing(p, stats.orbitRadius * scale, stats.fullMoon ? WARM : VIOLET, .42);
      if (stats.fullMoon) {
        const moon = UPGRADE_VALUES["full-moon"];
        const charge = clamp(1 - sim.pulseTimer / (moon.pulseInterval * stats.attackIntervalScale));
        paintGroundRing(p, (stats.orbitRadius + stats.pulseReach) * scale, WARM, .55, charge);
      }
      drawn = true;
    }
    if (sim.decoy.live && stats.echo) {
      const at = this.pixel(sim.decoy), r = UPGRADE_VALUES["echo-legion"].burstRadius * scale;
      if (inView(at, this.width, this.height, r)) {
        p.place(at.x, at.y);
        paintGroundRing(p, r, COLD, .38);
        drawn = true;
      }
    }
    if (drawn) this.whole(ctx);
    this.ms += performance.now() - start;
  }

  fire(ctx: Ctx, x: number, y: number, left: number): void {
    if (left <= 0) return;
    const power = Math.max(.25, Math.min(1, (FIRE.burnTime - left) / .4, left / .6));
    this.stamp(ctx, { x, y }, 17, (p) => paintFire(p, this.time, Math.round(x * 3 + y * 5), this.reduced, power));
  }

  fireSprites(ctx: Ctx, sim: SimState, add: Add): void {
    const start = performance.now();
    let count = 0;
    for (const [key, left] of Object.entries(sim.fire.cells)) {
      if (!(left > 0)) continue;
      const [ix, iy] = key.split(",").map(Number), x = (ix + .5) * FIRE.cell, y = (iy + .5) * FIRE.cell;
      const foot = { x, y };
      if (!inView(this.pixel(foot), this.width, this.height, 17)) continue;
      add(y + FIRE.cell * .3, () => this.fire(ctx, x, y, left), false, foot, true);
      if (++count >= ISO_FX_LIMIT.fires) break;
    }
    this.ms += performance.now() - start;
  }

  pickup(ctx: Ctx, kind: LootKind, item: Loot): void {
    if (this.counts.loot >= ISO_FX_LIMIT.loot) return;
    this.counts.loot++;
    const big = "big" in item ? item.big : "value" in item && item.value >= 4;
    this.stamp(ctx, item, 22, (p) => paintLoot(p, kind, item.id, this.time, this.reduced, big));
  }

  shot(ctx: Ctx, s: ShotState): void {
    if (this.counts.shots >= ISO_FX_LIMIT.shots) return;
    this.counts.shots++;
    this.stamp(ctx, s, 29, (p) => paintFlight(p, s, this.time, this.reduced));
  }

  /** Muzzle flashes stay on the true launch point, not at the projectile's new position. */
  private launch(p: Painter, s: ShotState, elapsed: number): boolean {
    const o = shotLaunch(s);
    if (!s.alive || !o) return false;
    const age = elapsed - o.at, span = .1;
    if (age < 0 || age >= span) return false;
    const at = this.pixel(o);
    if (!inView(at, this.width, this.height, 14)) return false;
    const { x, y } = toScreen(o.dx, o.dy);
    p.place(at.x, at.y - 8, false, Math.atan2(y, x));
    p.fade = Math.min(1, (1 - age / span) * 1.6);
    p.line(-4, -2, 3, -2, s.echo ? COLD : WARM, .75);
    p.line(-4, 2, 3, 2, s.echo ? COLD : WARM, .75);
    sparkle(p, 1, 0, 3, s.echo ? COLD : WARM, SHADE, .14);
    p.fade = 1;
    return true;
  }

  weaponSprites(ctx: Ctx, sim: SimState, add: Add): void {
    const stats = playerStats(sim);
    orbitPositions(sim).forEach((foot, i) => {
      add(foot.y, () => this.stamp(ctx, foot, 19, (p) => paintOrbit(p, i, this.time, this.reduced, stats.fullMoon)),
        false, foot, true);
    });
    if (stats.echo && sim.decoy.live) {
      const foot = sim.decoy;
      add(foot.y + .5, () => this.stamp(ctx, foot, 29, (p) => {
        for (let i = 0; i < 4; i++) {
          const a = i * TAU / 4 + (this.reduced ? 0 : this.time * 2.6);
          sparkle(p, Math.cos(a) * 14, -11 + Math.sin(a) * 6, 2, i % 2 ? COLD : WARM, VIOLET, .15);
        }
      }), false, foot, true);
    }
  }

  spawn(ctx: Ctx, e: EnemyState): void {
    if (this.counts.spawns >= ISO_FX_LIMIT.spawns) return;
    this.counts.spawns++;
    this.stamp(ctx, e, 49, (p) => paintSpawn(p, e.spawnTime, e.id, enemyRadius(e), !!e.elite, this.reduced));
  }

  actorStatus(ctx: Ctx, actor: Vec & { burnTime?: number; wetTime?: number }, box: Pick<StatusLook, "halfWidth" | "top">): void {
    this.stamp(ctx, actor, Math.ceil(Math.max(box.top, box.halfWidth) + 10),
      (p) => paintStatus(p, { ...box, burnTime: actor.burnTime, wetTime: actor.wetTime }, this.time, this.reduced));
  }

  front(ctx: Ctx, sim: SimState, cues: readonly Cue[]): void {
    const start = performance.now(), p = this.painter;
    let shown = 0, drawn = false;
    // The oldest observations fall out first and off-screen effects cost no pixels.
    for (let i = sim.impacts.length - 1; i >= 0; i--) {
      const e = sim.impacts[i]!, life = impactLife(e, this.time);
      if (!(life > 0)) continue;
      const contact = e.kind === "hit" ? impactContact(e) : undefined;
      const source = e.src && ENEMY_DEFS.find(e.src), baseRadius = source ? source.stats.radius : 0;
      // Damage counters store the old upright y offset. Recover the world foot
      // before projecting the tag, then lift it in screen space.
      const at = this.pixel(contact ?? (e.kind === "damage" ? { x: e.x, y: e.y + baseRadius * 2 } : e));
      if (!inView(at, this.width, this.height, e.radius ? Math.min(178, e.radius) : 64)) continue;
      if (shown >= ISO_FX_LIMIT.impacts) {
        seenImpacts.set(e, { time: this.time, life: 0 });
        continue;
      }
      p.place(at.x, at.y - (e.kind === "damage" ? baseRadius * .72 : 0));
      paintImpact(p, e, this.reduced, this.projection.zoom, life);
      shown++;
      drawn = true;
    }
    for (let i = Math.max(0, sim.shots.length - ISO_FX_LIMIT.shots); i < sim.shots.length; i++)
      drawn = this.launch(p, sim.shots[i]!, sim.elapsed) || drawn;
    for (const c of cues) drawn = this.cue(p, c, sim) || drawn;
    if (sim.player.shield > 0 && sim.player.shieldTime > 0) {
      const at = this.pixel(sim.player);
      p.place(at.x, at.y);
      const opacity = Math.min(.9, sim.player.shieldTime * 3);
      for (let i = 0; i < sim.player.shield; i++) {
        const x = (i - (sim.player.shield - 1) / 2) * 6;
        p.poly([[x - 2, -37], [x + 2, -37], [x + 2, -34], [x, -32], [x - 2, -34]], COLD, opacity);
        p.dot(x, -36, WARM, opacity);
      }
      drawn = true;
    }
    if (playerStats(sim).fullMoon) {
      const at = this.pixel(sim.player);
      p.place(at.x - 13 * sim.player.facing, at.y - 27);
      const charge = clamp(1 - sim.pulseTimer / UPGRADE_VALUES["full-moon"].pulseInterval), r = 3 + charge * 3;
      p.circle(0, 0, r + 1, SHADE);
      p.circle(0, 0, r, COLD);
      p.dot(-1, 0, VIOLET);
      p.dot(1, 1, VIOLET);
      p.glow(0, 0, 10, WARM, .1 + charge * .15);
      drawn = true;
    }
    if (drawn) this.whole(ctx);
    this.ms += performance.now() - start;
  }

  private cue(p: Painter, c: Cue, sim: SimState): boolean {
    const phase = cuePhase(c, this.reduced), strength = cueEnvelope(c, this.reduced);
    if (!phase.phase || strength <= 0) return false;
    const at = this.pixel(c.x !== undefined && c.y !== undefined && c.kind !== "evolution" ? { x: c.x, y: c.y } : sim.player);
    if (!inView(at, this.width, this.height, 94)) return false;
    p.place(at.x, at.y);
    const hostile = c.kind === "boss", color = hostile ? hex("#dd777e") : c.kind === "dawn" || c.kind === "finale" ? COLD : WARM;
    const r = hostile ? 51 : c.kind === "boss-down" ? 47 : 33;
    const reach = this.reduced ? r : r * (.56 + phase.total * .64);
    paintGroundRing(p, reach, color, strength * .8);
    if (!this.reduced) {
      paintGroundRing(p, reach * .87, color, strength * .37);
      for (let i = 0; i < 10; i++) {
        const a = rand(i, 1237) * TAU, k = .43 + rand(i, 927) * .57;
        const x = Math.cos(a) * reach * k, y = Math.sin(a) * reach * k / 2 - phase.total * (5 + k * 18);
        p.dot(x, y, color, strength);
      }
    }
    if (phase.phase === "burst") p.glow(0, -14, 20, color, .2 * strength);
    return true;
  }

  lightImage(): CanvasImageSource | undefined {
    const start = performance.now();
    const lit = this.painter.lit, light = lit ? this.light ??= images(this.width, this.height) : undefined;
    if (light) upload(light, this.frame.light, this.width, { x: 0, y: 0, w: this.width, h: this.height });
    lastCost = this.ms + performance.now() - start;
    return light?.canvas;
  }
}

let shared: IsoFxFrame | undefined;
let lastCost = 0;
export function beginIsoFx(projection: IsoProjection, time: number, reduced: boolean): IsoFxFrame {
  if (!shared || shared.width !== Math.round(projection.width) || shared.height !== Math.round(projection.height))
    shared = new IsoFxFrame(projection);
  return shared.reset(projection, time, reduced);
}

/** CPU milliseconds measured inside the FX frame only, for the review harness. */
export function lastIsoFxCost(): number {
  return lastCost;
}
