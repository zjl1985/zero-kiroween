import type { ReactionDef } from "../types.js";

/** Shared effect of the tearing rows: durability loss scaled by tearability. */
export function tearRow(id: string, material: string, element: "cut" | "wind", scale: number): ReactionDef {
  return {
    id,
    material,
    element,
    result: "scraps",
    fx: "prop-tear",
    effect(state, hit, ctx) {
      ctx.damageProp(state, hit.prop, hit.power * hit.material.tearability * scale);
    },
  };
}
