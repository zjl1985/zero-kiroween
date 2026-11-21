import { drawPaperStack, type PaperSliceModel } from "./paper-sprite-stack.js";
import { type Ctx } from "./paper-material.js";

/** A square card lantern: base, post, four warm inset faces, cap, finial.
 * Every section has depth; window bars are material in the section, not a
 * front-facing graphic pasted over a rotated box. Two finite model variants.
 */
export function streetLampModel(post: boolean): PaperSliceModel {
  const stem = post ? 29 : 0;
  return {
    id: `street-lamp:${post ? "post" : "hung"}:v1`, width: 26, depth: 26, count: stem + 32,
    paint(ctx, z) {
      const slab = (half: number, color: string) => {
        ctx.fillStyle = color; ctx.fillRect(-half, -half, half * 2, half * 2);
      };
      if (z < stem) {
        slab(z < 3 ? 6 - z * 0.4 : 2, z === 0 ? "#e1cda8" : "#66513e");
        ctx.fillStyle = "#ab895c"; ctx.fillRect(0.4, -2, 1.4, 4);
        return;
      }
      const h = z - stem;
      if (h < 3) { slab(8.5, h === 1 ? "#e8d4ac" : "#70533d"); return; }
      if (h < 23) {
        const half = 7 + (h - 3) * 0.08;
        slab(half, "#dbad61");
        ctx.fillStyle = "#a46d44"; ctx.fillRect(-half, -half, 1.5, half * 2);
        ctx.fillStyle = "#f1cc85"; ctx.fillRect(-half + 1.5, half - 1.6, half * 2 - 3, 1.6);
        ctx.fillStyle = "#674d39";
        for (const xx of [-half, -0.7, half - 1.5]) {
          ctx.fillRect(xx, -half, 1.5, 1.6); ctx.fillRect(xx, half - 1.6, 1.5, 1.6);
        }
        for (const yy of [-half, -0.7, half - 1.5]) {
          ctx.fillRect(-half, yy, 1.5, 1.5); ctx.fillRect(half - 1.5, yy, 1.5, 1.5);
        }
        return;
      }
      if (h < 30) {
        const half = 11 - (h - 23) * 1.35;
        slab(half, h === 23 ? "#ead8b5" : "#806147");
        ctx.fillStyle = "#af8d5b"; ctx.fillRect(0, -half, half, half * 2);
      } else slab(1.5, "#e2c392");
    },
  };
}

export function drawStackedStreetLamp(ctx: Ctx, x: number, y: number, scale: number, post = true): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  drawPaperStack(ctx, streetLampModel(post), { turn: -0.3, squash: 0.75, spacing: 1, shadow: true });
  ctx.restore();
}
