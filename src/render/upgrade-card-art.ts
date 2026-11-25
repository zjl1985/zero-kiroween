import type { UpgradeId } from "../game/upgrades.js";
import { UPGRADE_CARD_ART } from "./iso/gen/upgrade-card-atlas.js";
import { paintCardEmblem } from "./upgrade-icons.js";

let atlas: HTMLImageElement | undefined;
let loading: Promise<void> | undefined;

export function loadUpgradeCardAtlas(): Promise<void> {
  if (loading) return loading;
  const image = new Image();
  image.src = new URL("assets/upgrades/render/upgrade-card-atlas.png", import.meta.url.replace(/\/dist\/.*/, "/")).href;
  loading = image.decode().then(() => { atlas = image; });
  return loading;
}

/** Fits each full-colour object in the existing card canvas, with its original aspect ratio. */
export function paintUpgradeCardArt(canvas: HTMLCanvasElement, id: UpgradeId): void {
  const view = UPGRADE_CARD_ART[id];
  if (!view || !atlas) {
    paintCardEmblem(canvas, id);
    if (view && loading) {
      void loading.then(() => {
        if (canvas.dataset.id === id) paintUpgradeCardArt(canvas, id);
      }).catch(() => {});
    }
    return;
  }
  const ctx = canvas.getContext("2d")!;
  const scale = .91 * Math.min(canvas.width / view.w, canvas.height / view.h);
  const w = Math.round(view.w * scale), h = Math.round(view.h * scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas, view.x, view.y, view.w, view.h,
    Math.round((canvas.width - w) / 2), Math.round((canvas.height - h) / 2), w, h);
}
