/**
 * The content registries and the sim event bus. Empty until src/defs/index.ts
 * registers every def; import that index (src/game/sim.ts does) before use.
 * This module imports no def file, so defs and facades can share it without
 * import cycles.
 */
import { createEventBus } from "../engine/events.js";
import { createRegistry } from "../engine/registry.js";
import type { SimState } from "../game/types.js";
import type {
  CharacterDef,
  EnemyBehaviour,
  EnemyDef,
  EvolutionDef,
  LandmarkDef,
  MaterialDef,
  PassiveDef,
  PropDef,
  ReactionDef,
  SimContext,
  SimEvents,
  WeaponDef,
} from "./types.js";

export const CATS = createRegistry<CharacterDef>("cat");
/** Weapons and evolved weapons, in step order within each timing. */
export const WEAPON_DEFS = createRegistry<WeaponDef>("weapon");
export const PASSIVE_DEFS = createRegistry<PassiveDef>("passive");
export const EVOLUTION_DEFS = createRegistry<EvolutionDef>("evolution");
export const ENEMY_DEFS = createRegistry<EnemyDef>("enemy");
// Each behaviour checks its own params shape; the registry stores them untyped.
export const BEHAVIOURS = createRegistry<EnemyBehaviour<any>>("enemy behaviour");
/** Paper materials, the material x element reaction rows and the world props. */
export const MATERIALS = createRegistry<MaterialDef>("material");
export const REACTIONS = createRegistry<ReactionDef>("reaction");
export const PROP_DEFS = createRegistry<PropDef>("prop");
/** Landmark kinds, in the order world-gen hands them out. */
export const LANDMARK_DEFS = createRegistry<LandmarkDef>("landmark");
export const SIM_EVENTS = createEventBus<SimState, SimEvents, SimContext>();
