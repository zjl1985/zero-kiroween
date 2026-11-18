import { washWetAt } from "../../game/wash.js";
import { WASH } from "../wash.js";
import type { PropHit, ReactionDef } from "../types.js";
import type { SimState } from "../../game/types.js";

/** Soaked props and props standing on wet washed paper tear more easily. */
export function tearEase(state: SimState, hit: PropHit): number {
  const soaked = (state.props[hit.prop.id]?.soakedUntil ?? 0) > state.elapsed;
  return soaked || washWetAt(state, hit.prop.x, hit.prop.y) ? WASH.tearEase : 1;
}

/** Shared effect of the tearing rows: durability loss scaled by tearability. */
export function tearRow(id: string, material: string, element: "cut" | "wind", scale: number): ReactionDef {
  return {
    id,
    material,
    element,
    result: "scraps",
    fx: "prop-tear",
    effect(state, hit, ctx) {
      ctx.damageProp(state, hit.prop, hit.power * hit.material.tearability * scale * tearEase(state, hit));
    },
  };
}
