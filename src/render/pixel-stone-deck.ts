import type { WaterPolygon } from "../defs/types.js";
import type { Ctx } from "./paper-material.js";

const STONE_PLANES=["#9ca993","#a6ae97","#94a38f","#a0aa94","#aab09a"] as const;

/** Fine stone finish INSIDE the authoritative deck polygon. A-B is the deck
 * width and A-D the crossing direction: only the two lateral edges get coping,
 * leaving both walkable ends open. Caller owns base fill and exact water clip.
 * Unsupported/non-parallelogram polygons retain that caller-supplied base. */
export function drawStoneDeckDetail(ctx: Ctx, polygon: WaterPolygon): void {
  if(polygon.length!==4)return;
  const [a,b,c,d]=polygon;
  if(!a||!b||!c||!d||polygon.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;
  const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-a.x,vy=d.y-a.y;
  const width=Math.hypot(ux,uy),length=Math.hypot(vx,vy),det=ux*vy-uy*vx;
  if(width<1||length<1||Math.abs(det)<1e-6||Math.abs(c.x-(b.x+d.x-a.x))>.01||Math.abs(c.y-(b.y+d.y-a.y))>.01)return;
  const minX=Math.floor(Math.min(a.x,b.x,c.x,d.x)),maxX=Math.ceil(Math.max(a.x,b.x,c.x,d.x));
  const minY=Math.floor(Math.min(a.y,b.y,c.y,d.y)),maxY=Math.ceil(Math.max(a.y,b.y,c.y,d.y));
  const inside=(x:number,y:number)=>{
    const xx=x-a.x,yy=y-a.y,u=(xx*vy-yy*vx)/det,v=(ux*yy-uy*xx)/det;
    return u>=-1e-9&&u<=1+1e-9&&v>=-1e-9&&v<=1+1e-9;
  };
  const material=(u:number,v:number):string=>{
    // Low lateral coping is part of the walkable top, never a rail or raised
    // barrier. Long unbroken colour planes avoid a picket-fence silhouette.
    if(u<5||u>width-5){
      const seam=v%25;
      if(seam<1)return "#7c8b7e";
      if(u<1.5)return "#b4bba2";
      if(u>width-1.5)return "#788a80";
      return "#a6b29b";
    }
    const row=Math.floor(v/21),shift=(row%2)*14;
    const col=Math.floor((u-5+shift)/28),tx=(u-5+shift)%28,ty=v%21;
    // Flagstone joints are subdued, with staggered blocks and no bright
    // complete outlines. Thin top bevels occur on only selected stone edges.
    if(tx<1||ty<1)return "#7d8c7f";
    const index=((row*2+col)%5+5)%5;
    if(ty<2&&tx>3&&tx<23&&index!==2)return "#b3b9a0";
    if(tx>26&&ty>5&&ty<17)return "#8a9b89";
    // Local wear has a deliberate short broken shape, never scatter noise.
    if(index===1&&tx>=7&&tx<15&&ty>=12&&ty<14)return "#b0b49b";
    if(index===1&&tx>=14&&tx<19&&ty>=11&&ty<12)return "#b0b49b";
    if(index===3&&tx>20&&ty>17)return "#8e9f8b";
    return STONE_PLANES[index]!;
  };
  ctx.save();
  // Rasterize on the native world lattice, not a rotated smooth Canvas path.
  // Four-corner containment keeps every emitted pixel fully inside the exact
  // polygon even if this helper is used without the caller's defensive clip.
  for(let y=minY;y<maxY;y++){
    let start=minX,runColor="";
    const flush=(end:number)=>{
      if(runColor&&end>start){ctx.fillStyle=runColor;ctx.fillRect(start,y,end-start,1);}
    };
    for(let x=minX;x<maxX;x++){
      let color="";
      if(inside(x,y)&&inside(x+1,y)&&inside(x,y+1)&&inside(x+1,y+1)){
        const xx=x+.5-a.x,yy=y+.5-a.y;
        const u=(xx*vy-yy*vx)/det*width,v=(ux*yy-uy*xx)/det*length;
        color=material(u,v);
      }
      if(color!==runColor){flush(x);start=x;runColor=color;}
    }
    flush(maxX);
  }
  ctx.restore();
}
