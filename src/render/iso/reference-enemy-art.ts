import { surface, type CanvasSurface } from "../../engine/surface.js";
import { ELITE } from "../../defs/horde.js";
import type { Ctx } from "../paper-material.js";
import { ENEMY_REFERENCE_VIEWS } from "./gen/enemy-reference-atlas.js";
import type { PuppetDraw } from "./puppet.js";
import type { IsoDir } from "./sprite-sheet.js";

let atlas: (CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }) | undefined;
let flashAtlas: CanvasSurface | undefined;
let pencilAtlas: CanvasSurface | undefined;

export function setReferenceEnemyAtlas(image: (CanvasImageSource & { width?: number; height?: number }) | undefined): void {
  atlas = image;
  flashAtlas = undefined;
  pencilAtlas = undefined;
}

export async function loadReferenceEnemyAtlas(): Promise<void> {
  const image = new Image();
  image.src = new URL("assets/enemies/render/enemy-reference-atlas.png", import.meta.url.replace(/\/dist\/.*/, "/")).href;
  await image.decode();
  atlas = image;
}

function tintedAtlas(
  image: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number },
  color: string,
  cache: "flash" | "pencil",
): CanvasImageSource {
  if (cache === "flash" && flashAtlas) return flashAtlas;
  if (cache === "pencil" && pencilAtlas) return pencilAtlas;
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;
  const tinted = surface(w, h), ctx = tinted.getContext("2d");
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, tinted.width, tinted.height);
  if (cache === "flash") flashAtlas = tinted;
  else pencilAtlas = tinted;
  return tinted;
}

/** Target display height (in native scene px) of a reference enemy crop, or undefined when unavailable. */
export function referenceEnemyHeight(kind: string, elite: boolean): number | undefined {
  const view = ENEMY_REFERENCE_VIEWS[kind];
  if (!atlas || !view) return undefined;
  return Math.round((view.height + view.lift) * (elite ? ELITE.radiusMul : 1));
}

/**
 * Draw an original-resolution enemy crop at the scene foot, with crisp nearest-neighbour
 * scaling, walk bounce/squash, hover motion, attack windup/lunge and hit flash.
 * Returns false when the atlas is not loaded (Node tests / fallback to voxel puppet).
 */
export function drawReferenceEnemy(
  ctx: Ctx,
  kind: string,
  elite: boolean,
  dir: IsoDir,
  pose: { anim: string; frame: number },
  x: number,
  y: number,
  draw: PuppetDraw,
  time: number,
  reduced: boolean,
  idSeed: number,
): boolean {
  const view = ENEMY_REFERENCE_VIEWS[kind];
  if (!atlas || !view) return false;
  const source = draw.look === "flash"
    ? tintedAtlas(atlas, "#fff2cc", "flash")
    : draw.look === "pencil"
      ? tintedAtlas(atlas, "#c6c2b8", "pencil")
      : atlas;

  const mul = elite ? ELITE.radiusMul : 1;
  const targetH = view.height * mul;
  const scale = targetH / view.h;
  const mirror = dir === "sw" || dir === "nw";
  const phase = reduced ? 0 : time * 7.5 + (idSeed % 11) * 0.7;

  // Expressive procedural squash/bob per pose without distorting pixel crispness.
  let bob = 0;
  let sx = 1;
  let sy = 1;
  if (view.lift > 0) {
    // Hovering enemies (paper-bat, kiro-ghost) float smoothly above their shadow.
    bob = -view.lift * mul + (reduced ? 0 : Math.sin(phase * 0.85) * 1.8);
    if (!reduced && pose.anim === "walk") {
      sx = 1 + Math.sin(phase * 1.4) * 0.06;
      sy = 1 - Math.sin(phase * 1.4) * 0.06;
    }
  } else if (pose.anim === "walk" && !reduced) {
    const hop = Math.abs(Math.sin(phase));
    bob = -hop * (kind === "eraser-boss" ? 2.2 : 1.6);
    sx = 1 + (0.5 - hop) * 0.08;
    sy = 1 - (0.5 - hop) * 0.08;
  } else if (pose.anim === "idle" && !reduced) {
    const breathe = Math.sin(phase * 0.45);
    sx = 1 + breathe * 0.03;
    sy = 1 - breathe * 0.03;
  }

  // Attack windup crouches/swells; strike lunges forward.
  if (pose.anim === "attack" || pose.anim === "sweep" || pose.anim === "summon" || pose.anim === "charge") {
    if (pose.frame === 0) {
      sx *= 1.12;
      sy *= 0.88;
    } else {
      sx *= 0.94;
      sy *= 1.09;
      bob -= 1.5;
    }
  }

  ctx.save();
  ctx.translate(x + (draw.dx ?? 0), y + (draw.dy ?? 0));
  ctx.scale((draw.sx ?? 1) * sx * (mirror ? -1 : 1), (draw.sy ?? 1) * sy);
  ctx.imageSmoothingEnabled = false;
  const left = -view.ax * scale;
  ctx.drawImage(source, view.x, view.y, view.w, view.h, left, -targetH + bob, view.w * scale, targetH);
  ctx.restore();
  return true;
}
