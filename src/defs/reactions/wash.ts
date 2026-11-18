import { FIRE } from "../fire.js";
import { WASH } from "../wash.js";
import type { ReactionDef } from "../types.js";
import { EFFECT_LIFE } from "../../game/types.js";
import { touchedPaper } from "./paper-status.js";

/**
 * Water on paper: the prop soaks (it cannot burn and tears more easily for
 * WASH.soakSeconds), flames on it go out and any ink coating runs off.
 * No durability is lost and no loot is paid. The colour of the ground is
 * washed by the water source itself (SimContext.wash), not by this row.
 */
export function washRow(id: string, material: string): ReactionDef {
  return {
    id, material, element: "water", result: "intact", fx: "steam",
    effect(state, hit, ctx) {
      if (!Number.isFinite(hit.power) || hit.power <= 0) return;
      const m = touchedPaper(state, hit);
      if (m.phase === 2) return;
      m.soakedUntil = Math.max(m.soakedUntil ?? 0, state.elapsed + WASH.soakSeconds);
      delete m.inkedUntil;
      // Burning cells over the footprint go out (fire cells are FIRE.cell squares).
      const rx = (hit.def.size.w / 2) * hit.prop.s + FIRE.cell * 0.5,
        ry = (hit.def.size.d / 2) * hit.prop.s + FIRE.cell * 0.5,
        oy = hit.prop.y - hit.def.size.d * hit.prop.s * 0.25;
      let out = false;
      for (const key of Object.keys(state.fire.cells)) {
        const [ix, iy] = key.split(",").map(Number) as [number, number],
          dx = ((ix + 0.5) * FIRE.cell - hit.prop.x) / rx,
          dy = ((iy + 0.5) * FIRE.cell - oy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        delete state.fire.cells[key];
        out = true;
      }
      if (out) ctx.effect(state, hit.prop.x, hit.prop.y - 10 * hit.prop.s, "steam", EFFECT_LIFE.steam);
    },
  };
}
