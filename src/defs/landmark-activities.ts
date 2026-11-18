import { EFFECT_LIFE } from "../game/types.js";
import type { LandmarkActivity, LandmarkPlace, Point } from "./types.js";

/** Court anchors are shared by simulation and art; none are inside a solid building. */
export const TEA = { point: { x: 46, y: 100 }, radius: 44, seconds: 2.5, cooldown: 32, heal: 1 } as const;
export const GREENHOUSE = {
  point: { x: 48, y: 70 }, radius: 48, seconds: 2, cooldown: 45,
  renewal: { radius: 320, maxProps: 10 },
} as const;
export const OBSERVATORY = {
  point: { x: 0, y: 38 }, radius: 44, seconds: 3, cooldown: 48,
  pulseRadius: 240, freeze: 3, shardValue: 4,
} as const;
export const WINDMILL = {
  point: { x: -4, y: 48 }, radius: 100, seconds: 3, cooldown: 24,
  pulseRadius: 210, freeze: 1.6, damage: 1.5, shardValue: 2,
} as const;
export const LANDMARK_ACTIONS = { maxHitCharge: 2, windSeconds: 6, idleTurn: 0.25, windTurn: 2.6 } as const;

interface ActivitySite {
  readonly point: Point;
  readonly renewal?: { readonly radius: number; readonly maxProps: number };
}
export const LANDMARK_ACTIVITY_SITES: Readonly<Record<string, ActivitySite>> = {
  "paper-teahouse": TEA,
  "fold-greenhouse": GREENHOUSE,
  "star-observatory": OBSERVATORY,
  "paper-windmill": WINDMILL,
};

export function landmarkActivityPoint(l: LandmarkPlace): Point {
  const point = LANDMARK_ACTIVITY_SITES[l.kind]?.point;
  return { x: l.x + (point?.x ?? 0), y: l.y + (point?.y ?? 0) };
}

export const TEAHOUSE_ACTIVITY: LandmarkActivity = {
  radius: TEA.radius, seconds: TEA.seconds, cooldown: TEA.cooldown, notice: "landmark-tea",
  activate(state, l, ctx) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + TEA.heal);
    state.player.healAt = state.elapsed;
    const p = landmarkActivityPoint(l);
    ctx.effect(state, p.x, p.y, "steam", EFFECT_LIFE.steam, { radius: TEA.radius });
    ctx.effect(state, state.player.x, state.player.y, "treat", EFFECT_LIFE.treat);
  },
};

export const GREENHOUSE_ACTIVITY: LandmarkActivity = {
  radius: GREENHOUSE.radius, seconds: GREENHOUSE.seconds, cooldown: GREENHOUSE.cooldown,
  notice: "landmark-greenhouse", element: "fold",
  activate(state, l, ctx) {
    // The runner advances nearby flora's existing regrowth clocks; it never resurrects props here.
    const p = landmarkActivityPoint(l);
    ctx.dropTreat(state, p.x, p.y);
    ctx.effect(state, p.x, p.y, "regrow", EFFECT_LIFE.regrow, { radius: GREENHOUSE.radius });
  },
};

export const OBSERVATORY_ACTIVITY: LandmarkActivity = {
  radius: OBSERVATORY.radius, seconds: OBSERVATORY.seconds, cooldown: OBSERVATORY.cooldown,
  notice: "landmark-observatory",
  activate(state, l, ctx) {
    const p = landmarkActivityPoint(l);
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0 || Math.hypot(e.x - p.x, e.y - p.y) > OBSERVATORY.pulseRadius) continue;
      e.stun = Math.max(e.stun ?? 0, OBSERVATORY.freeze);
    }
    ctx.dropShard(state, p.x, p.y, OBSERVATORY.shardValue);
    ctx.effect(state, p.x, p.y, "moon-stun", EFFECT_LIFE["moon-stun"], { radius: OBSERVATORY.pulseRadius });
  },
};

export const WINDMILL_ACTIVITY: LandmarkActivity = {
  radius: WINDMILL.radius, seconds: WINDMILL.seconds, cooldown: WINDMILL.cooldown,
  notice: "landmark-windmill", element: "wind",
  activate(state, l, ctx) {
    const p = landmarkActivityPoint(l);
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0 || Math.hypot(e.x - p.x, e.y - p.y) > WINDMILL.pulseRadius) continue;
      e.stun = Math.max(e.stun ?? 0, WINDMILL.freeze);
      ctx.hurtEnemy(state, e, WINDMILL.damage);
    }
    ctx.dropShard(state, p.x, p.y, WINDMILL.shardValue);
    ctx.effect(state, p.x, p.y, "moon-pulse", EFFECT_LIFE["moon-pulse"], { radius: WINDMILL.pulseRadius });
  },
};
