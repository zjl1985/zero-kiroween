import type { Ctx } from "./paper-material.js";
import { HOUSE_WALKS, type GroundPoint } from "./homestead-layout.js";
/** One integer scanline contour, shared by soil, footpaths and cultivated ground. */
export function groundShape(ctx: Ctx, points: readonly GroundPoint[], color: string): void {
  ctx.fillStyle=color;
  const top=Math.floor(Math.min(...points.map(p=>p[1]))), bottom=Math.ceil(Math.max(...points.map(p=>p[1])));
  for(let y=top;y<bottom;y++){
    const crossings:number[]=[];
    for(let i=0;i<points.length;i++){
      const a=points[i]!,b=points[(i+1)%points.length]!;
      if((a[1]<=y+.5 && b[1]>y+.5)||(b[1]<=y+.5 && a[1]>y+.5))
        crossings.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    crossings.sort((a,b)=>a-b);
    for(let i=0;i+1<crossings.length;i+=2){const x=Math.round(crossings[i]!),right=Math.round(crossings[i+1]!);if(right>x)ctx.fillRect(x,y,right-x,1);}
  }
}
/** One continuous, tapered foot-worn ribbon. Smooth corners before rasterising,
 * union the samples, then paint each integer row once: no segment diamonds or
 * overlapping bright joints. The shoulder is a separate, close-value pass. */
export function groundWalk(ctx:Ctx, points:readonly GroundPoint[], half:number,color:string):void{
  const rows=new Map<number,[number,number]>();
  for(let i=1;i<points.length;i++){
    const p0=points[Math.max(0,i-2)]!,p1=points[i-1]!,p2=points[i]!,p3=points[Math.min(points.length-1,i+1)]!;
    const steps=Math.max(1,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])));
    for(let n=0;n<=steps;n++){
      const t=n/steps,t2=t*t,t3=t2*t;
      const at=(axis:0|1)=>.5*((2*p1[axis])+(-p0[axis]+p2[axis])*t+(2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis])*t2+(-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis])*t3);
      const x=at(0),y=at(1),along=(i-1+t)/(points.length-1);
      const radius=half*(.76+.18*Math.sin(along*Math.PI)+.06*Math.sin(along*Math.PI*3));
      for(let row=Math.ceil(y-radius);row<=Math.floor(y+radius);row++){
        const reach=Math.sqrt(Math.max(0,radius*radius-(row-y)*(row-y))),left=Math.round(x-reach),right=Math.round(x+reach);
        const old=rows.get(row);rows.set(row,old?[Math.min(old[0],left),Math.max(old[1],right)]:[left,right]);
      }
    }
  }
  ctx.fillStyle=color;
  for(const [y,[left,right]] of [...rows].sort((a,b)=>a[0]-b[0]))if(right>left)ctx.fillRect(left,y,right-left,1);
}
export function drawHomesteadGround(ctx:Ctx):void{
  // Wear lies in front of the thresholds, never under or around the whole house.
  groundShape(ctx,[[410,247],[427,249],[437,261],[425,270],[411,261]],"#716346");
  groundShape(ctx,[[676,246],[692,247],[691,258],[674,266],[666,259]],"#716346");
  for(const walk of HOUSE_WALKS){groundWalk(ctx,walk,8,"#626042");groundWalk(ctx,walk,4.5,"#7b6848");}
  // A few authored grass incursions break the shoulder in broad, unequal bites.
  // Not random stipple and not a complete contrasting outline around the soil.
  groundShape(ctx,[[423,262],[429,263],[433,269],[426,267]],"#555a3c");
  groundShape(ctx,[[648,276],[656,273],[652,279],[643,281]],"#555a3c");
  groundShape(ctx,[[568,296],[580,295],[575,299],[566,300]],"#555a3c");
}
