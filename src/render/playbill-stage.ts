import { cachedSprite } from "../engine/sprite.js";
import type { CatId } from "../cats/types.js";
import { catArt } from "./art-registry.js";
import type { CatPose } from "./layout.js";
import { foldLine, paperCut } from "./paper-kit.js";
import { mix, oval, shadow, type Ctx, type Point } from "./paper-material.js";

/** The scene and the playbill portrait use the same paper theatre. */
const STAGE = { w: 358, h: 319, base: 274 } as const;

function theatre(accent: string) {
  return cachedSprite("playbill-stage:" + accent, STAGE.w, STAGE.h, 2, (ctx) => {
    ctx.translate(STAGE.w / 2, STAGE.base);
    shadow(ctx, 5, 27, 165, 15);
    const frame = new Path2D("M -158 12 L -163 -197 Q -156 -236 -105 -244 L -28 -251 Q 0 -264 31 -252 L 111 -243 Q 153 -239 160 -204 L 163 12 Z");
    paperCut(ctx, frame, { color: "#7f514c", layers: 2, thickness: 2.2, shadow: 4.2, edge: "#d0a77b", texture: 0.68 });
    const recess = new Path2D("M -138 5 L -143 -186 Q -143 -219 -95 -226 L -26 -235 Q 0 -247 28 -235 L 101 -224 Q 143 -218 141 -186 L 142 5 Z");
    paperCut(ctx, recess, { color: "#27243a", layers: 2, thickness: 1.35, edge: "#b38e73", shadow: 2.5, texture: 0.55 });
    ctx.save();
    ctx.clip(recess);
    // Printed landscape sheets behind the actor.
    const wash = ctx.createRadialGradient(-6, -125, 12, -6, -123, 142);
    wash.addColorStop(0, mix("#33283d", accent, 0.21));
    wash.addColorStop(1, "#222034");
    ctx.fillStyle = wash;
    ctx.fill(recess);
    paperCut(ctx, new Path2D("M -148 -88 Q -100 -125 -65 -94 Q -15 -133 31 -104 Q 80 -129 150 -88 L 150 -27 L -148 -27 Z"),
      { color: "#3c3650", thickness: 0.85, edge: "#625276", shadow: 1.6, texture: 0.53 });
    paperCut(ctx, new Path2D("M -148 -64 Q -105 -89 -64 -66 Q -24 -64 9 -79 Q 63 -66 83 -83 Q 122 -81 151 -66 L 151 -23 L -150 -23 Z"),
      { color: "#403b4c", thickness: 0.95, edge: "#71647d", shadow: 1.6, texture: 0.6 });
    paperCut(ctx, new Path2D("M 47 -214 C 15 -211 16 -173 47 -172 Q 62 -172 69 -183 C 44 -171 31 -200 47 -214 Z"),
      { color: "#e2c797", thickness: 0.85, edge: "#fff1ca", shadow: 1.1, texture: 0.44 });
    for (const [x, y, r] of [[-55, -184, 3.6], [-25, -207, 2.3], [77, -195, 2.8], [68, -152, 3.4]]) {
      paperCut(ctx, [[x, y-r], [x+r*0.4, y-0.4], [x+r, y], [x+0.4, y+r*0.4], [x, y+r], [x-0.4, y+r*0.4], [x-r, y], [x-0.4, y-0.4]],
        { color: "#cdb892", thickness: 0.44, shadow: 0.6, texture: 0.36 });
    }
    ctx.restore();

    const apron: Point[] = [[-167, 12], [161, 12], [151, 29], [-159, 30]];
    paperCut(ctx, apron, { color: "#64433e", layers: 2, thickness: 1.45, edge: "#b1896a", shadow: 2.2, texture: 0.7 });
    const floor: Point[] = [[-129, -31], [126, -31], [164, 15], [151, 20], [-160, 20], [-170, 15]];
    paperCut(ctx, floor, { color: "#8c6850", layers: 2, thickness: 1.25, edge: "#dcbb8d", shadow: 1.9, texture: 0.65 });
    for (const x of [-90, -44, 0, 45, 90]) foldLine(ctx, x, -26, x * 1.2, 15, 0.5);
    paperCut(ctx, oval(0, -1, 79, 15, 14, 0.06), {
      color: mix("#78615d", accent, 0.35), layers: 1, thickness: 0.85, edge: "#ebcfaa",
      shadow: 0.95, texture: 0.59,
    });

    // Separate hanging cuts instead of a repeated wall of stripes.
    const drape = new Path2D("M -151 -201 Q -137 -218 -108 -222 L -82 -223 Q -91 -180 -99 -164 Q -105 -147 -116 -129 Q -127 -102 -118 -71 L -103 -17 Q -129 -12 -149 -21 Z");
    const innerFold = new Path2D("M -151 -201 Q -125 -218 -96 -222 Q -116 -183 -119 -150 Q -126 -132 -135 -117 Q -136 -67 -121 -16 L -149 -21 Z");
    const rimFold = new Path2D("M -96 -222 L -82 -223 Q -91 -180 -99 -164 Q -105 -147 -116 -129 L -125 -116 Q -111 -157 -96 -222 Z");
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      paperCut(ctx, drape, { color: "#874253", layers: 1, thickness: 1.8, edge: "#c7837e", shadow: 2.5, texture: 0.65 });
      paperCut(ctx, innerFold, { color: "#592d45", thickness: 0.75, edge: "#aa6775", shadow: 1.0, texture: 0.54 });
      paperCut(ctx, rimFold, { color: "#ad606a", thickness: 0.56, shadow: 0.7, texture: 0.54 });
      foldLine(ctx, -129, -192, -135, -123, 0.7);
      paperCut(ctx, [[-151, -128], [-120, -137], [-117, -131], [-149, -121]],
        { color: "#c79e6a", thickness: 0.8, edge: "#f0d5a2", shadow: 1.1, texture: 0.64 });
      ctx.restore();
    }
    const top = new Path2D("M -153 -210 Q -81 -241 -25 -242 L 0 -250 L 27 -242 Q 92 -241 153 -210 L 144 -195 Q 116 -199 78 -220 Q 31 -230 0 -229 Q -57 -231 -144 -195 Z");
    paperCut(ctx, top, { color: "#ad7e60", layers: 1, thickness: 1.6, edge: "#f2d3a1", shadow: 2.1, texture: 0.62 });
    foldLine(ctx, -99, -219, -38, -236, 0.45);
    foldLine(ctx, 40, -236, 100, -219, 0.45);
  }, { x: 0.5, y: STAGE.base / STAGE.h });
}

export function drawPlaybillStage(ctx: Ctx, pose: CatPose): void {
  const art = catArt(pose.id);
  theatre(art.colors.hud).draw(ctx, { x: pose.x, y: pose.y });
  art.draw(ctx, pose);
}

/** On narrow screens, fill the small stage with the whole actor and its paper base. */
export function paintPlaybillPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: string | null): void {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const zoom = Math.min(canvas.width / 220, canvas.height / 194);
  ctx.setTransform(zoom, 0, 0, zoom, canvas.width / 2, canvas.height * 0.83);
  drawPlaybillStage(ctx, {
    id, x: 0, y: 0, scale: 0.3, facing: 1, moving: false, dashing: false, hurt: false, time: 0,
    ...(costume ? { costume } : {}),
  });
}
