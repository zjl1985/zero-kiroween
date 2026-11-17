import type { EnemyDef } from "../../types.js";
import { ENEMY_FX_LIFE } from "../fx-life.js";

/** Eraser Boss timing, attacks and reward. */
export const BOSS = {
  /** Fraction of the session at which the Boss arrives (540 s of 600). */
  spawnAt: 0.9,
  spawnTime: 1.2,
  /** Farther than this from the cat, the Eraser hunts at huntSpeed. */
  huntRange: 360,
  huntSpeed: 92,
  /** Zero's decoy only pulls the Boss when it is this close. */
  lureRange: 50,
  /** Slow effects bite less on the heavy eraser. */
  slowMultiplier: 0.8,
  firstAttack: 2.4,
  attackGap: 2.3,
  sweep: { telegraph: 0.9, length: 300, width: 70, damage: 1 },
  summon: { telegraph: 0.7, count: 5, distance: 38 },
  charge: { telegraph: 0.75, speed: 230, time: 0.7 },
  rewardShards: 8,
  rewardValue: 6,
} as const;
export type BossAttack = "sweep" | "summon" | "charge";
export const BOSS_ATTACKS: readonly BossAttack[] = ["sweep", "summon", "charge"];
export const ERASER_STATS = { hp: 420, speed: 30, radius: 26, contactDamage: 1, xp: 0, knockback: 0.08 };

/** The Eraser: hunts the cat across the map and rotates telegraphed attacks. */
export const ERASER_BOSS: EnemyDef = {
  id: "eraser-boss",
  stats: ERASER_STATS,
  behaviours: [{ id: "boss-hunt", params: BOSS }],
  boss: true,
  eliteable: false,
  crowd: false,
  // It rubs straight through scenery (no pathfinding); it only keeps to the map.
  throughScenery: true,
  contactPush: 16,
  lureRange: BOSS.lureRange,
  slowMultiplier: BOSS.slowMultiplier,
  dropsShard: false,
  arrival: { at: BOSS.spawnAt, spawnTime: BOSS.spawnTime },
  onSpawn(e) {
    e.timer = BOSS.firstAttack;
    e.act = null;
    e.combo = 0;
  },
  onDeath: [
    (state, e, ctx) => {
      state.boss.defeated = true;
      state.stats.bossDefeated = true;
      e.act = null;
      ctx.effect(state, e.x, e.y, "boss-down", ENEMY_FX_LIFE["boss-down"]);
      ctx.notify(state, "boss-defeated");
      // A ring of heavy shards, placed without RNG.
      for (let i = 0; i < BOSS.rewardShards; i++) {
        const a = (i / BOSS.rewardShards) * Math.PI * 2;
        ctx.dropShard(state, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 14, BOSS.rewardValue);
      }
      ctx.dropChest(state, e.x, e.y, true);
    },
  ],
};
