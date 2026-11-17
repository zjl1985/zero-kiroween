import type { PropState, SimState } from "../../game/types.js";
import type { PropHit, ReactionDef } from "../types.js";

/** Absolute expiry times survive chunk unloading; reapplication refreshes, never stacks. */
export const PAPER_ELEMENTS = {
  inkSeconds: 9,
  foldSeconds: 5,
  inkSpreadRadius: 76,
  waxHeatScale: 0.8,
} as const;

/** No game/props import: reaction defs are loaded while the world registry is being built. */
export function touchedPaper(state: SimState, hit: PropHit): PropState {
  return state.props[hit.prop.id] ??= {
    hp: hit.def.durability * hit.material.durability,
    phase: 0,
    hitAt: -1e9,
  };
}

export function inkRow(id: string, material: string): ReactionDef {
  return {
    id, material, element: "ink", result: "intact", fx: "ink-wash",
    effect(state, hit) {
      if (!Number.isFinite(hit.power) || hit.power <= 0) return;
      const m = touchedPaper(state, hit);
      if (m.phase === 2) return;
      m.inkedUntil = Math.max(m.inkedUntil ?? 0, state.elapsed + PAPER_ELEMENTS.inkSeconds);
    },
  };
}

export function foldRow(id: string, material: string): ReactionDef {
  return {
    id, material, element: "fold", result: "intact", fx: "fold",
    effect(state, hit) {
      if (!Number.isFinite(hit.power) || hit.power <= 0) return;
      if (!hit.def.colliders?.(state.seed, hit.prop.x, hit.prop.y, hit.prop.s).length) return;
      const m = touchedPaper(state, hit);
      if (m.phase === 2) return;
      // Folding is reversible passage, not damage or destruction: it never pays loot.
      m.foldedUntil = Math.max(m.foldedUntil ?? 0, state.elapsed + PAPER_ELEMENTS.foldSeconds);
    },
  };
}

/** A struck vat splashes its contents even before it breaks; it cannot react to its own ink. */
export function spillInkRow(id: string, element: "cut" | "wind"): ReactionDef {
  return {
    id, material: "ink", element, result: "scraps", fx: "ink-wash",
    effect(state, hit, ctx) {
      if (!Number.isFinite(hit.power) || hit.power <= 0 || state.props[hit.prop.id]?.phase === 2) return;
      ctx.damageProp(state, hit.prop, hit.power * hit.material.tearability);
      ctx.elementHit(state, hit.prop.x, hit.prop.y, PAPER_ELEMENTS.inkSpreadRadius * hit.prop.s, "ink", hit.power);
    },
  };
}
