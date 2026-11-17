/**
 * Facade over the registered enemies (src/defs/enemies/<id>/) and the horde
 * pacing (src/defs/horde.ts). Numbers live in those def files.
 */
import "../defs/index.js";
import { ENEMY_DEFS } from "../defs/registries.js";
import type { EnemyKind, EnemyStats } from "../defs/types.js";

export type { EnemyKind } from "../defs/types.js";
/** Per-kind numbers shared by every enemy (hp, speed, radius, contact damage, xp, knockback). */
export type EnemyDef = EnemyStats;
export {
  ELITE,
  FILLER_KIND,
  HORDE,
  KIND_CAP,
  PHASE_AT,
  SPAWN_TABLE,
  WAVES,
  WAVE_RING,
  type WaveDef,
  type WavePattern,
} from "../defs/horde.js";
export { BAT } from "../defs/enemies/paper-bat/def.js";
export { CRUMPLE } from "../defs/enemies/crumple/def.js";
export { SMUDGE } from "../defs/enemies/smudge/def.js";
export { BOSS, BOSS_ATTACKS, type BossAttack } from "../defs/enemies/eraser-boss/def.js";
export { ENEMY_FX_LIFE } from "../defs/enemies/fx-life.js";

/** Every registered enemy's numbers by kind, in registration order. */
export const ENEMIES: Readonly<Record<EnemyKind, EnemyStats>> = Object.fromEntries(
  ENEMY_DEFS.all().map((d) => [d.id, d.stats]),
);
