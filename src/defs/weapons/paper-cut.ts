import { EFFECT_LIFE, type SimState } from "../../game/types.js";
import { ENEMY_DEFS } from "../registries.js";
import type { SimContext, WeaponDef } from "../types.js";
import { centroid, closeLoop, insidePolygon, polygonArea, segmentDistance, type Pt } from "./paper-geometry.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = {
  /** Damage to every enemy inside a closed loop. */
  damage: 7,
  /** Seconds a stretch of the cut line stays open behind the cat. */
  life: 1.8,
  /** Closing distance: coming back this close to the line closes the loop. */
  close: 24,
  /** Smallest loop (world units squared) that cuts a piece out. */
  minArea: 1800,
  /** Damage of the open slit to ink that brushes it, every edgeInterval seconds. */
  edgeDamage: 0.6,
  edgeInterval: 0.45,
} as const;
/** Line sampling and safety numbers that never show on the card. */
export const PAPER_CUT = {
  /** World units between two samples of the line. */
  spacing: 12,
  /** Most samples kept; the oldest go first. */
  maxPoints: 40,
  /** Reach of the open slit around its segments. */
  edgeRadius: 7,
  /** Bosses are thick card: a loop cuts them for this share of the damage. */
  bossFactor: 0.35,
  /** Tear power applied to props inside the loop. */
  tearPower: 4,
  /** Seconds a cut-out piece stays drawn (lifting off, then the hole closes). */
  outLife: 1.4,
  /** Most cut-out pieces kept for the renderer. */
  maxOuts: 3,
  /** Most loop vertices kept on a cut-out piece. */
  outPoints: 40,
} as const;
const STEPS = [{ damage: 3 }, { area: 10 }, { damage: 3 }, { area: 12, damage: 4 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    paperCut:
      | false
      | {
          damage: number;
          life: number;
          close: number;
          minArea: number;
          edgeDamage: number;
          edgeInterval: number;
        };
  }
  interface WeaponBaseMap {
    "paper-cut": typeof BASE;
  }
}

/** Cuts the closed loop out of the page: ink inside is cut, props inside tear, the paper turns to a white hole. */
export function cutOutLoop(state: SimState, loop: readonly Pt[], damage: number, ctx: SimContext): number {
  let hit = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0 || !insidePolygon(loop, e.x, e.y)) continue;
    ctx.hurtEnemy(state, e, damage * (ENEMY_DEFS.get(e.kind).boss ? PAPER_CUT.bossFactor : 1));
    hit++;
  }
  const c = centroid(loop);
  let reach = 0;
  for (const q of loop) reach = Math.max(reach, Math.hypot(q.x - c.x, q.y - c.y));
  // Only props and wash cells inside the loop: props tear, cells become a white cut hole.
  ctx.elementHit(state, c.x, c.y, reach, "cut", PAPER_CUT.tearPower, (x, y) => insidePolygon(loop, x, y));
  ctx.effect(state, c.x, c.y, "paper-cut", EFFECT_LIFE["paper-cut"], { radius: Math.sqrt(polygonArea(loop) / Math.PI) });
  const cut = state.cut,
    step = Math.max(1, Math.ceil(loop.length / PAPER_CUT.outPoints));
  cut.outs.push({
    id: cut.nextId++,
    points: loop.filter((_, i) => i % step === 0).map((p) => ({ x: p.x, y: p.y })),
    at: state.elapsed,
  });
  if (cut.outs.length > PAPER_CUT.maxOuts) cut.outs.splice(0, cut.outs.length - PAPER_CUT.maxOuts);
  cut.cuts++;
  return hit;
}

/**
 * Zero's paper cut: walking and dashing slit a short-lived cut line through
 * the page. Close the line into a loop and the piece inside drops out of the
 * paper, cutting every ink blot on it (the Boss only partly), tearing props
 * and leaving a white cut hole. The open slit nicks ink that brushes it.
 */
export const PAPER_CUT_WEAPON: WeaponDef = {
  id: "paper-cut",
  pool: "zero",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "move",
  elements: ["cut"],
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.paperCut = level > 0 && {
      damage: BASE.damage + b.damage,
      life: BASE.life * (1 + b.area / 30),
      close: (BASE.close + b.area * 0.5) * s.area,
      minArea: BASE.minArea,
      edgeDamage: BASE.edgeDamage,
      edgeInterval: BASE.edgeInterval,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    const c = ps.paperCut;
    if (!c) return;
    const cut = state.cut,
      p = state.player,
      now = state.elapsed,
      pts = cut.points;
    cut.close = c.close;
    // The oldest stretch of the slit closes up behind the cat.
    let drop = 0;
    while (drop < pts.length && now - pts[drop]!.t > c.life) drop++;
    if (drop) pts.splice(0, drop);
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= PAPER_CUT.spacing) {
      pts.push({ x: p.x, y: p.y, t: now });
      if (pts.length > PAPER_CUT.maxPoints) pts.splice(0, pts.length - PAPER_CUT.maxPoints);
      const loop = closeLoop(pts, c.close, c.minArea);
      if (loop) {
        cutOutLoop(state, loop, c.damage, ctx);
        // The cut is spent: a fresh line starts where the cat stands.
        pts.length = 0;
        pts.push({ x: p.x, y: p.y, t: now });
      }
    }
    if (pts.length < 2 || !weaponReady(state, "paper-cut", dt)) return;
    let nicked = false;
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0) continue;
      const reach = PAPER_CUT.edgeRadius + ctx.enemyRadius(e);
      for (let i = 1; i < pts.length; i++)
        if (segmentDistance(pts[i - 1]!, pts[i]!, e.x, e.y) <= reach) {
          ctx.hurtEnemy(state, e, c.edgeDamage);
          nicked = true;
          break;
        }
    }
    if (nicked) state.weaponTimers["paper-cut"] = c.edgeInterval;
  },
};
