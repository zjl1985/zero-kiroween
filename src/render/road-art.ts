/** One world-phased raster surface for the exact union of simulation roads.
 * No segment outlines, capsule-bank overlaps, or independently phased strips. */
import { roads, START_ROAD_EXIT } from "../game/world-gen.js";
import { pathCenter } from "./scene.js";
import { roadArrival } from "./homestead-layout.js";
import type { Ctx } from "./paper-material.js";
import type { ViewRect } from "./camera.js";
import { VILLAGE_PALETTE, VILLAGE_PIXELS } from "./village-pixels.js";
export const ROAD_STOCK = { face:"#74603e", rim:"#52603a", bank:"#424d29", worn:"#6a5639", packed:"#806943" } as const;
interface Segment { ax:number; ay:number; dx:number; dy:number; length2:number; width:number; }
function segments(seed:number, view?:ViewRect):Segment[] {
  const out:Segment[]=[];
  for(const r of roads(seed)) for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1]!,b=r.points[i]!,pad=r.width+8;
    if(view && (Math.max(a.x,b.x)+pad<view.x0 || Math.min(a.x,b.x)-pad>view.x1 ||
      Math.max(a.y,b.y)+pad<view.y0 || Math.min(a.y,b.y)-pad>view.y1))continue;
    const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;
    if(length2)out.push({ax:a.x,ay:a.y,dx,dy,length2,width:r.width});
  }
  return out;
}
function capsuleUnionField(parts:readonly Segment[],x:number,y:number):number{
  let d=Infinity;
  for(const s of parts){
    const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(y-s.ay)*s.dy)/s.length2));
    d=Math.min(d,Math.hypot(x-s.ax-t*s.dx,y-s.ay-t*s.dy)-s.width);
  }
  return d;
}
/** The minimum capsule SDF gives membership, NOT distance to a union's
 * external edge in overlaps. For our 2-unit raster, search the nearest truly
 * uncovered sample, capped beyond the 6-unit grass fringe. Internal joins can
 * never become a turf edge. Samples are absolute and independent of chunk cuts. */
const EDGE_RADIUS = 6;
const EXTERIOR_SAMPLES = Array.from({length:49},(_,i)=>({
  dx:(i%7-3)*2, dy:(Math.floor(i/7)-3)*2,
})).filter(p=>(p.dx!==0||p.dy!==0)&&Math.hypot(p.dx,p.dy)<=EDGE_RADIUS)
  .sort((a,b)=>Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
function distanceToUnion(parts:readonly Segment[],x:number,y:number):number{
  const field=capsuleUnionField(parts,x,y);
  if(field>0 || field<=-EDGE_RADIUS)return field;
  // If the deepest capsule's nearest surface is exposed, its analytic distance
  // is already the exact union distance. Keep subpixel precision on single roads.
  for(const s of parts){
    const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(y-s.ay)*s.dy)/s.length2));
    const cx=s.ax+t*s.dx,cy=s.ay+t*s.dy,n=Math.hypot(x-cx,y-cy);
    if(Math.abs(n-s.width-field)>.0001)continue;
    const nx=n>.0001?(x-cx)/n:-s.dy/Math.sqrt(s.length2),
      ny=n>.0001?(y-cy)/n:s.dx/Math.sqrt(s.length2);
    if(capsuleUnionField(parts,cx+nx*s.width,cy+ny*s.width)>=-.0001)return field;
  }
  for(const p of EXTERIOR_SAMPLES)
    if(capsuleUnionField(parts,x+p.dx,y+p.dy)>0)
      return -Math.max(.5,Math.hypot(p.dx,p.dy)-1);
  return -EDGE_RADIUS;
}
export function worldRoadDistance(seed:number,x:number,y:number):number{return distanceToUnion(segments(seed),x,y);}
export function openingRoadProfile(y:number):{center:number;width:number}{
  const old=pathCenter(y)+(y<348?17*Math.max(0,1-(y-222)/126):0),join=roadArrival((y-480)/60);
  return {center:old*(1-join)+START_ROAD_EXIT.x*join,width:(14+(y-225)*.038)*(1-join)+START_ROAD_EXIT.width*join};
}
export function openingRoadDistance(x:number,y:number):number{
  const p=openingRoadProfile(y);return Math.abs(x-p.center)-p.width;
}
const mod=(v:number,n:number)=>((v%n)+n)%n;
/** Artist-authored turf teeth are sampled inward from the UNION boundary.
 * Inside overlap, the deeper segment wins; no internal segment bank is drawn.
 * Both edge and earth pixels retain absolute world phase at every junction. */
export function roadRasterColor(distance:number,x:number,y:number):string{
  if(distance>0)return "";
  const px=Math.floor(x/2),py=Math.floor(y/2),earth=VILLAGE_PIXELS.earth;
  // World-phased full generated texture, not a repeated sixteen-pixel stripe.
  const turf=distance>-3 && mod(px*7+py*11,7)<(3+distance)*1.2;
  const source=turf?VILLAGE_PIXELS.meadow:earth;
  return VILLAGE_PALETTE[source.rows[mod(py,source.height)]!.charCodeAt(mod(px,source.width))-33]!;
}
export function* drawRasterRoad(ctx:Ctx,view:ViewRect,distance:(x:number,y:number)=>number):Generator<void>{
  for(let y=Math.floor(view.y0/2)*2;y<view.y1;y+=2){
    let start=Math.floor(view.x0/2)*2,last="";
    const flush=(end:number)=>{if(last && end>start){ctx.fillStyle=last;ctx.fillRect(start,y,end-start,2);}};
    for(let x=start;x<view.x1;x+=2){
      const next=roadRasterColor(distance(x+1,y+1),x,y);
      if(next!==last){flush(x);start=x;last=next;}
    }
    flush(Math.ceil(view.x1/2)*2);
    if(y%32===0)yield;
  }
}
export function* drawRoadNetwork(ctx:Ctx,seed:number,view:ViewRect):Generator<void>{
  const parts=segments(seed,view);if(!parts.length)return;
  yield* drawRasterRoad(ctx,view,(x,y)=>distanceToUnion(parts,x,y));
}
