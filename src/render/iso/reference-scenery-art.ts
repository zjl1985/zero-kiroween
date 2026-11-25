import { surface, type CanvasSurface } from "../../engine/surface.js";
import type { Ctx } from "../paper-material.js";
import type { GenGlow, GenLook } from "./gen-sprites.js";
import { SCENERY_REFERENCE_VIEWS } from "./gen/scenery-reference-atlas.js";
import { snap, toScreen } from "./projection.js";

let atlas: (CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }) | undefined;
let washAtlas: CanvasSurface | undefined;

export function setReferenceSceneryAtlas(image: (CanvasImageSource & { width?: number; height?: number }) | undefined): void {
  atlas = image;
  washAtlas = undefined;
}

export async function loadReferenceSceneryAtlas(): Promise<void> {
  const image = new Image();
  image.src = new URL("assets/scenery/render/scenery-reference-atlas.png", import.meta.url.replace(/\/dist\/.*/, "/")).href;
  await image.decode();
  atlas = image;
}

export function hasReferenceSceneryAtlas(): boolean {
  return !!atlas;
}

function washedAtlas(
  image: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number },
): CanvasImageSource {
  if (washAtlas) return washAtlas;
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;
  const tinted = surface(w, h), ctx = tinted.getContext("2d");
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#c4c1b6";
  ctx.fillRect(0, 0, tinted.width, tinted.height);
  washAtlas = tinted;
  return tinted;
}

const BUCKET_SCALE = [0.88, 1.0, 1.12] as const;

/** Maps high-frequency baked voxel scenery and intact prop IDs to their HD reference atlas counterpart. */
export function referenceSceneryForGen(id: string): { refId: string; scale: number; mirror?: boolean } | null {
  if (id.startsWith("tree-oak-")) return { refId: "tree-oak", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id.startsWith("tree-maple-")) return { refId: "tree-maple", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id.startsWith("tree-pine-")) return { refId: "tree-pine", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id.startsWith("tree-birch-")) return { refId: "tree-oak", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! * 0.94, mirror: true };
  if (id.startsWith("tree-dead-")) return { refId: "tree-dead", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id.startsWith("terrace-")) return { refId: "cottage", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id.startsWith("bush-")) return { refId: "bush", scale: BUCKET_SCALE[Number(id.slice(-1)) % 3]! };
  if (id === "pumpkin-0") return { refId: "farm-giant-pumpkin", scale: 0.48 };
  if (id === "pumpkin-1") return { refId: "farm-giant-pumpkin", scale: 0.56, mirror: true };
  if (id === "pumpkin-2") return { refId: "farm-giant-pumpkin", scale: 0.64 };
  if (id === "lamp-iron-0" || id === "lamp-iron-1" || id === "lamp-lantern") {
    return { refId: "lamp", scale: id === "lamp-iron-1" ? 0.94 : 1.0 };
  }
  if (id === "headstone-slab" || id === "headstone-cross" || id === "headstone-obelisk") {
    return { refId: "headstone", scale: id === "headstone-obelisk" ? 1.08 : 0.96, mirror: id === "headstone-cross" };
  }
  if (id === "yard-cart") return { refId: "farm-cart", scale: 0.9 };
  // Upgrade intact interactive props so the whole world shares one crisp HD pixel-art standard;
  // damaged/scraps/ash phases keep their destructible voxel sprites.
  if (id === "prop-paper-bush-intact") return { refId: "bush", scale: 0.96 };
  if (id === "prop-paper-tombstone-intact") return { refId: "headstone", scale: 0.98 };
  if (id === "prop-dead-tree-intact") return { refId: "tree-dead", scale: 0.92 };
  if (id === "prop-paper-lanterns-intact") return { refId: "canal-lantern-rack", scale: 0.88 };
  if (id === "prop-paper-mushroom-intact") return { refId: "meadow-mushrooms", scale: 0.78 };
  if (id === "prop-signpost-intact") return { refId: "town-board", scale: 0.82 };
  return null;
}

/** Draw an HD scenery sprite from the reference atlas at world foot (x, y). Returns false if atlas is unloaded. */
export function drawReferenceScenery(
  ctx: Ctx,
  refId: string,
  x: number,
  y: number,
  opts?: { scale?: number; mirror?: boolean; look?: GenLook; lift?: number },
): boolean {
  const view = SCENERY_REFERENCE_VIEWS[refId];
  if (!atlas || !view) return false;
  const source = opts?.look && (opts.look === "pencil" || opts.look.startsWith("wash")) ? washedAtlas(atlas) : atlas;
  const targetH = view.height * (opts?.scale ?? 1);
  const scale = targetH / view.h;
  const foot = toScreen(x, y);
  const sx = snap(foot.x);
  const sy = snap(foot.y - (opts?.lift ?? 0));
  ctx.save();
  ctx.translate(sx, sy);
  if (opts?.mirror) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  const left = -view.ax * scale;
  ctx.drawImage(source, view.x, view.y, view.w, view.h, left, -targetH, view.w * scale, targetH);
  ctx.restore();
  return true;
}

/** Attempt to render a baked gen-sprite id using the HD scenery atlas. */
export function drawReferenceSceneryForGen(
  ctx: Ctx,
  id: string,
  x: number,
  y: number,
  look?: GenLook,
  lift?: number,
): boolean {
  if (!atlas) return false;
  // Let burning/inked/wet interactive props show their status-tinted voxel feedback.
  if (id.startsWith("prop-") && (look === "char" || look === "ink" || look === "wet")) return false;
  const mapped = referenceSceneryForGen(id);
  if (!mapped) return false;
  return drawReferenceScenery(ctx, mapped.refId, x, y, { scale: mapped.scale, mirror: mapped.mirror, look, lift });
}

/** Emissive HD-2D light anchors for the 8 new biome-signature HD props. */
export function addReferenceSceneryGlows(refId: string, x: number, y: number, out: GenGlow[]): void {
  switch (refId) {
    case "town-bench":
      out.push({ kind: "candle", x, y, dx: 4, lift: 10 });
      break;
    case "town-board":
      out.push({ kind: "lantern", x, y, dx: -6, lift: 18 });
      break;
    case "farm-cart":
    case "farm-giant-pumpkin":
      out.push({ kind: "pumpkin", x, y, dx: 0, lift: 10 });
      break;
    case "grave-arch":
      out.push({ kind: "lantern", x, y, dx: 0, lift: 22 });
      break;
    case "canal-lantern-rack":
      out.push({ kind: "lantern", x, y, dx: 0, lift: 24 });
      break;
    case "canal-dock-crates":
      out.push({ kind: "lantern", x, y, dx: 2, lift: 18 });
      break;
    case "meadow-mushrooms":
      out.push({ kind: "candle", x, y, dx: 0, lift: 12 });
      break;
  }
}
