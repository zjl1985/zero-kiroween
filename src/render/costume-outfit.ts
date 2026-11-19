/**
 * Costume outfits on the articulated body: garment colours merged onto the
 * cat's own tailoring, plus finite cached outfit cuts stamped through the
 * cat-detail hooks. Keys hold (costume, part index, tailoring) only: never
 * time, facing, scale or an actor id. No costume or cat ids are named here.
 */
import { cachedSprite } from "../engine/sprite.js";
import type { CatBodyPalette, CostumeArt, OutfitLayer, OutfitPart } from "./art-registry.js";
import type { CatDetailHooks } from "./cat-detail.js";
import { flatCut, flatShadow } from "./paper-kit.js";
import { line, mix, oval, type Ctx, type Point } from "./paper-material.js";

/**
 * One outfit paper cut at body scale under the paper ruleset: hard shadow
 * down-right, the card side, a lit rim toward the moon and a dark lip.
 */
export function outfitCut(ctx: Ctx, shape: Path2D | readonly Point[], color: string, lift = 0.55, thickness = 0.55): Path2D {
  return flatCut(ctx, shape, { color, thickness, lift, rim: 0.45, texture: 0.45, edge: mix(color, "#fff1cf", 0.45) });
}
/** A ruled crease or seam line on an outfit cut. */
export function outfitLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, width = 0.5, alpha = 0.8): void {
  line(ctx, x0, y0, x1, y1, color, width, alpha);
}
export { flatShadow, oval };

const looks = new WeakMap<CatBodyPalette, WeakMap<CostumeArt, CatBodyPalette>>();
/** The cat's tailoring with the costume's garment colours (memoised, so the body cache key stays stable). */
export function costumeLook(look: CatBodyPalette, art: CostumeArt): CatBodyPalette {
  const over = look.tailoring === "split-coat" ? art.outfit.coat : art.outfit.tee;
  if (!over) return look;
  let byArt = looks.get(look);
  if (!byArt) looks.set(look, (byArt = new WeakMap()));
  let merged = byArt.get(art);
  if (!merged) byArt.set(art, (merged = Object.freeze({ ...look, ...over }) as CatBodyPalette));
  return merged;
}

/** Cached sprite of one outfit part (2x raster like the body parts). */
export function outfitSprite(art: CostumeArt, index: number, tailoring: CatBodyPalette["tailoring"]) {
  const part = art.outfit.parts[index]!, [l, t, r, b] = part.box, cut = part.tailored ? tailoring : "any";
  return cachedSprite(`costume-part:${art.id}:${index}:${cut}`, r - l, b - t, 2, (c) => {
    c.translate(-l, -t);
    part.paint(c, tailoring);
  }, { x: -l / (r - l), y: -t / (b - t) });
}

function stampPart(ctx: Ctx, art: CostumeArt, index: number, part: OutfitPart, tailoring: CatBodyPalette["tailoring"]): void {
  const [x, y, angle = 0] = part.at;
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  outfitSprite(art, index, tailoring).draw(ctx, { x: 0, y: 0 });
  ctx.restore();
}

/** Hooks that stamp every outfit part of `art` at its layer, in authored order. */
export function outfitHooks(ctx: Ctx, art: CostumeArt, tailoring: CatBodyPalette["tailoring"]): CatDetailHooks {
  const layer = (name: OutfitLayer) => {
    art.outfit.parts.forEach((part, i) => {
      if (part.layer === name) stampPart(ctx, art, i, part, tailoring);
    });
  };
  return {
    under: () => layer("under"),
    back: () => layer("back"),
    torso: () => layer("torso"),
    hand: (upright) => {
      // The paw sits at the end of the forearm cut (cat-detail.ts paintForearm); held props stay upright.
      ctx.save();
      ctx.translate(8, 1);
      ctx.rotate(upright);
      layer("hand");
      ctx.restore();
    },
    front: () => layer("front"),
  };
}
