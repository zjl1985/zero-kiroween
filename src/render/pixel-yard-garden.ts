import { CROP_PATCHES, type GroundPoint } from "./homestead-layout.js";
import type { Ctx } from "./paper-material.js";
import { drawVillageSoil, drawVillageSprite, VILLAGE_PIXEL } from "./village-art.js";
import { VILLAGE_PIXELS } from "./village-pixels.js";
import { worldRoadDistance } from "./road-art.js";

function inPlot(points: readonly GroundPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!, b = points[j]!;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside = !inside;
  }
  return inside;
}
function plot(ctx: Ctx, points: readonly GroundPoint[]): void {
  drawVillageSoil(ctx, {
    x0: Math.min(...points.map(p=>p[0])), y0: Math.min(...points.map(p=>p[1])),
    x1: Math.max(...points.map(p=>p[0])), y1: Math.max(...points.map(p=>p[1])),
  }, (x,y)=>inPlot(points,x,y));
}
/** The plots follow their authored boundaries at the native pixel scale.
 * Their earth and vegetation come from the generated village palette.
 * All are existing flat, walkable dressing, never new solid props.
 */
export function drawYardGarden(ctx: Ctx): void {
  for (const patch of CROP_PATCHES) plot(ctx,patch.outline);
  // Loose, asymmetric herb beds with harvest gaps, not identical crop matrices.
  for (const [x,y,variant,s] of [
    [283,359,0,.72],[313,350,0,.8],[350,362,1,.75],[384,375,1,.72],
    [269,389,0,.8],[303,385,1,.75],[372,401,0,.8],[320,412,0,.72],
    [291,417,1,.7],[349,425,1,.65],
    [658,369,1,.75],[692,360,1,.8],[724,380,0,.75],
    [646,402,1,.8],[680,393,0,.72],[718,414,1,.8],[680,424,0,.65],
  ] as const) drawVillageSprite(ctx,variant?"herb1":"herb0",x,y,s);
  // Planting knots reinforce the rails and the edge of the clearing. The centre
  // of the combat floor deliberately has no decorative plant or texture carpet.
  for (const [x,y,v] of [[309,278,0],[329,288,1],[733,284,1],[751,298,0],
    [246,374,0],[256,412,1],[289,448,1],[328,466,0],[720,447,1],
    [306,482,0],[331,493,1],[354,502,0],[738,480,1]] as const)
    drawVillageSprite(ctx,v?"herb1":"herb0",x,y,.65);
}
/** One screen south uses the same art family and plot edges. World roads and
 * water still draw afterwards, so decorative plots never impersonate a route.
 */
export function drawYardGardenExtension(ctx: Ctx, seed: number): void {
  plot(ctx,[[278,568],[365,558],[420,591],[425,643],[402,688],[329,712],[270,668]]);
  plot(ctx,[[634,610],[698,597],[738,629],[731,694],[706,737],[650,731],[624,680]]);
  for (const [x,y,v] of [[303,590,0],[340,583,1],[381,608,0],[293,625,0],[329,644,1],
    [385,665,1],[353,682,0],[287,666,1],
    [665,629,1],[706,641,0],[652,670,1],[692,686,1],[707,718,0],
    [281,732,0],[310,751,1],[346,804,0],[371,846,1],[705,767,0],[680,803,1]] as const) {
    const key = v ? "herb1" : "herb0", scale = .8, pixel = scale * VILLAGE_PIXEL;
    const {width, height, ax, ay} = VILLAGE_PIXELS[key];
    const cx = x + (width / 2 - ax) * pixel, cy = y + (height / 2 - ay) * pixel;
    const radius = Math.hypot(width, height) * pixel / 2 + VILLAGE_PIXEL;
    // The road is painted afterwards. Leave room for each whole silhouette
    // so a passing road cannot cover only the top or bottom of a pot.
    if (worldRoadDistance(seed, cx, cy) <= radius) continue;
    drawVillageSprite(ctx, key, x, y, scale);
  }
}
