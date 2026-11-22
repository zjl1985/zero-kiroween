/** Same-family raster furniture, y-sorted at the existing collision anchors.
 * No old isometric stack, independent shadow slab, or new solid footprint. */
import type { YARD_FURNITURE } from "../game/scenery.js";
import type { Ctx } from "./paper-material.js";
import { drawVillageSprite } from "./village-art.js";
type Furniture = typeof YARD_FURNITURE[number];
export function drawYardFurniture(ctx: Ctx, p: Furniture): void {
  if (p.kind === "woodpile") {
    drawVillageSprite(ctx,"stump",p.x,p.y-15,.7);
    drawVillageSprite(ctx,"stump",p.x-17,p.y,.75);
    drawVillageSprite(ctx,"stump",p.x+17,p.y,.75);
  } else if (p.kind === "tool-rack") {
    drawVillageSprite(ctx,"cabinet",p.x,p.y,.65);
  } else {
    drawVillageSprite(ctx,"planter",p.x-9,p.y-2,.6);
    drawVillageSprite(ctx,"planter",p.x+10,p.y,.6);
  }
}
