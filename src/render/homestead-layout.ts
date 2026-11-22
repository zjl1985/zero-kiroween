/** Scene-only layout. No colliders, RNG or simulation-owned coordinates are changed. */
export type GroundPoint = readonly [number, number];
export const HOMESTEADS = [
  {kind:"barn",x:390,y:207,s:1.22,seed:0},
  {kind:"cottage",x:660,y:205,s:1.22,seed:71},
] as const;
/** Ends meet the existing main route. Northern ends are porch dressing behind playTop. */
export const HOUSE_WALKS = [
  [[418,242],[427,261],[452,278]],
  [[687,241],[671,264],[623,286],[501,310]],
] as const;
export const CROP_PATCHES = [
  {kind:"wheat",outline:[[257,350],[322,333],[390,346],[413,378],[391,418],[337,443],[281,425],[252,393]],
   rows:[[280,357,8],[269,375,10],[276,394,9],[294,414,6]]},
  {kind:"vegetable",outline:[[638,358],[698,345],[743,365],[755,403],[724,435],[665,439],[628,409],[619,381]],
   rows:[[645,371,5],[637,390,6],[650,411,5]]},
] as const;
/** Smooth arrival, with zero derivative at either side of the 480..540 join. */
export function roadArrival(t: number): number {
  const q = Math.max(0,Math.min(1,t)); return q*q*(3-2*q);
}
