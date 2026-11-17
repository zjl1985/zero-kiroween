/**
 * Registers every simulation def. Importing this module once (src/game/sim.ts
 * and the facades do) fills the registries in a fixed order, and that order is
 * part of the behaviour:
 * - weapons: card order of plain weapons, and step order within a timing
 *   (aura: Echo Legion, Moon Stars, then Full Moon after the stars it adds to);
 * - passives: card order and stat-fold order;
 * - enemies: renderer / test listing order.
 * Adding content means adding a def file and one line here.
 */
import type { SimState } from "../game/types.js";
import { NICOLE } from "./cats/nicole/def.js";
import { ZERO } from "./cats/zero/def.js";
import { BOSS_HUNT, CHASE, KITE_LOB, SWOOP } from "./enemies/behaviours.js";
import { CRUMPLE_DEF } from "./enemies/crumple/def.js";
import { ERASER_BOSS } from "./enemies/eraser-boss/def.js";
import { INK_BLOB } from "./enemies/ink-blob/def.js";
import { PAPER_BAT } from "./enemies/paper-bat/def.js";
import { SMUDGE_DEF } from "./enemies/smudge/def.js";
import { ECHO_LEGION_EVOLUTION } from "./evolutions/echo-legion.js";
import { FULL_MOON_EVOLUTION } from "./evolutions/full-moon.js";
import { DEEP_FOLD } from "./passives/deep-fold.js";
import { FOCUS } from "./passives/focus.js";
import { LONG_SHADOW } from "./passives/long-shadow.js";
import { MAGNET } from "./passives/magnet.js";
import { MOON_SHIELD } from "./passives/moon-shield.js";
import { NIGHT_EYES } from "./passives/night-eyes.js";
import { PAPER_ARMOR } from "./passives/paper-armor.js";
import { SCHOLAR } from "./passives/scholar.js";
import { SNACK } from "./passives/snack.js";
import { SWIFT } from "./passives/swift.js";
import { VITALITY } from "./passives/vitality.js";
import {
  BEHAVIOURS,
  CATS,
  ENEMY_DEFS,
  EVOLUTION_DEFS,
  PASSIVE_DEFS,
  SIM_EVENTS,
  WEAPON_DEFS,
} from "./registries.js";
import type { SimEvents, SimHandler, SimHooks } from "./types.js";
import { ECHO_LEGION } from "./weapons/echo-legion.js";
import { FULL_MOON } from "./weapons/full-moon.js";
import { MEOW_BOLT } from "./weapons/meow-bolt.js";
import { MOON_STARS } from "./weapons/moon-stars.js";
import { NIGHT_CLAW } from "./weapons/night-claw.js";
import { PAPER_CRANE } from "./weapons/paper-crane.js";
import { PUMPKIN_SEED } from "./weapons/pumpkin-seed.js";
import { STAR_FALL } from "./weapons/star-fall.js";

export * from "./registries.js";

for (const cat of [ZERO, NICOLE]) CATS.register(cat);
for (const w of [
  MEOW_BOLT,
  NIGHT_CLAW,
  ECHO_LEGION,
  MOON_STARS,
  STAR_FALL,
  FULL_MOON,
  PAPER_CRANE,
  PUMPKIN_SEED,
])
  WEAPON_DEFS.register(w);
for (const p of [
  VITALITY,
  SWIFT,
  MAGNET,
  FOCUS,
  SCHOLAR,
  PAPER_ARMOR,
  NIGHT_EYES,
  LONG_SHADOW,
  DEEP_FOLD,
  MOON_SHIELD,
  SNACK,
])
  PASSIVE_DEFS.register(p);
for (const e of [ECHO_LEGION_EVOLUTION, FULL_MOON_EVOLUTION]) EVOLUTION_DEFS.register(e);
for (const b of [CHASE, SWOOP, KITE_LOB, BOSS_HUNT]) BEHAVIOURS.register(b);
for (const e of [INK_BLOB, PAPER_BAT, CRUMPLE_DEF, SMUDGE_DEF, ERASER_BOSS]) ENEMY_DEFS.register(e);

/** Subscribes a def's hooks so they only run while `active(state)` holds. */
function subscribe(hooks: SimHooks | undefined, active: (state: SimState) => boolean): void {
  if (!hooks) return;
  for (const name of Object.keys(hooks) as (keyof SimEvents)[]) {
    const handler = hooks[name] as SimHandler<typeof name>;
    SIM_EVENTS.on(name, (state, payload, ctx) => {
      if (active(state)) handler(state, payload, ctx);
    });
  }
}
const owned = (id: string) => (state: SimState) => (state.upgrades[id] ?? 0) > 0;
for (const cat of CATS.all()) subscribe(cat.hooks, (state) => state.player.id === cat.id);
for (const w of WEAPON_DEFS.all())
  subscribe(w.hooks, (state) => owned(w.id)(state) || CATS.get(state.player.id).startWeapon === w.id);
for (const p of PASSIVE_DEFS.all()) subscribe(p.hooks, owned(p.id));
