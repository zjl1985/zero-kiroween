import type { Ctx } from "./paper-material.js";

type Point = readonly [number, number];
const OUTLINE: readonly Point[] = [
  [-5,-30],[2,-28],[7,-30],[11,-25],[15,-25],[15,-21],[19,-18],
  [16,-13],[19,-9],[15,-7],[13,-3],[7,-1],[6,0],[-7,0],
  [-10,-2],[-15,-3],[-14,-7],[-19,-11],[-16,-15],[-18,-20],
  [-13,-22],[-12,-27],[-8,-26],
];
const STOCK = [
  { edge:"#5d5660", shade:"#92836f", fold:"#b09a7d", body:"#d0bc96", light:"#e8d8b5", eye:"#e9e4d5", ink:"#423b4b" },
  { edge:"#5e5d62", shade:"#93918a", fold:"#aaa69a", body:"#c5c0ad", light:"#dedac6", eye:"#e5e3d9", ink:"#45464c" },
  { edge:"#606967", shade:"#959f96", fold:"#aab2a5", body:"#c3c9b8", light:"#dce0ce", eye:"#e5e7db", ink:"#46534f" },
] as const;

/** A crushed sheet with unequal folded eyes; neither frame leaves the ground.
 * Attack is intentionally ignored: Crumple has no manual/ranged windup cue. */
export function drawPixelCrumple(ctx: Ctx, frame: number, _attack: boolean, wash: number): void {
  const p=STOCK[wash>=1?2:wash>0?1:0], compressed=frame%2!==0;
  // The second pose compresses the upper facets and spreads the shoulders;
  // the sole remains fixed, rather than moving the complete sprite upwards.
  const pose=([x,y]:Point):Point=>compressed
    ? [Math.round(x*(y<-4?1.07:1)),Math.round(y*.93)] : [x,y];
  const contour=OUTLINE.map(pose);
  const span=(points:readonly Point[],y:number):readonly [number,number]|undefined=>{
    let left=Infinity,right=-Infinity;
    for(let i=0;i<points.length;i++){
      const a=points[i]!,b=points[(i+1)%points.length]!;
      if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5)){
        const x=a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]);
        left=Math.min(left,x);right=Math.max(right,x);
      }
    }
    return right>left?[Math.round(left),Math.round(right)]:undefined;
  };
  const polygon=(points:readonly Point[],color:string,clip=true)=>{
    const pts=points.map(pose);ctx.fillStyle=color;
    for(let y=Math.floor(Math.min(...pts.map(v=>v[1])));y<Math.ceil(Math.max(...pts.map(v=>v[1])));y++){
      const s=span(pts,y),outer=clip?span(contour,y):s;if(!s||!outer)continue;
      const left=Math.max(s[0],outer[0]),right=Math.min(s[1],outer[1]);
      if(right>left)ctx.fillRect(left,y,right-left,1);
    }
  };
  const r=(x:number,y:number,w:number,h:number,color:string)=>{
    const a=pose([x,y]),b=pose([x+w,y+h]);ctx.fillStyle=color;
    ctx.fillRect(a[0],a[1],Math.max(1,b[0]-a[0]),Math.max(1,b[1]-a[1]));
  };
  ctx.save();
  polygon(OUTLINE,p.edge,false);
  // Large interlocking paper planes, with narrow valleys only at key joins.
  // No radial noise, full perimeter highlights, or repeated outline bands.
  polygon([[-12,-25],[-5,-29],[0,-23],[-4,-16],[-15,-18]],p.fold);
  polygon([[-4,-29],[2,-26],[7,-29],[10,-23],[3,-18],[-4,-16],[0,-23]],p.light);
  polygon([[10,-24],[14,-23],[17,-18],[11,-13],[3,-18]],p.body);
  polygon([[-15,-19],[-5,-16],[-3,-8],[-12,-8],[-17,-12]],p.shade);
  polygon([[-5,-16],[3,-18],[11,-13],[7,-6],[-3,-8]],p.body);
  polygon([[12,-13],[16,-16],[15,-11],[18,-9],[11,-5],[7,-6]],p.fold);
  polygon([[-12,-7],[-3,-8],[1,-3],[-7,-1],[-12,-3]],p.fold);
  polygon([[-2,-8],[7,-6],[12,-5],[7,-2],[0,-2]],p.light);
  // Turned paper corner and a short crushed valley connect to the sheet.
  polygon([[-17,-20],[-12,-22],[-13,-17]],p.light);
  polygon([[12,-25],[15,-25],[14,-20],[10,-22]],p.shade);
  polygon([[-3,-16],[0,-14],[-1,-10],[-3,-8],[-2,-13]],p.shade);
  // Misfolded eye sockets: one slanted and narrow, one upright and larger.
  polygon([[-11,-18],[-5,-17],[-4,-11],[-9,-10],[-12,-13]],p.ink);
  polygon([[-10,-17],[-6,-16],[-5,-12],[-9,-12]],p.eye);
  polygon([[3,-19],[8,-20],[11,-16],[9,-11],[3,-12]],p.ink);
  polygon([[4,-18],[8,-19],[9,-16],[8,-12],[4,-13]],p.eye);
  r(-8,-15,2,3,p.ink);r(6,-16,2,3,p.ink);
  r(-3,-7,2,1,p.ink);r(-1,-6,3,1,p.ink);r(2,-7,2,1,p.ink);
  // A crushed bottom lip explicitly touches y=0 in both poses.
  ctx.fillStyle=p.edge;ctx.fillRect(-7,0,14,1);
  ctx.restore();
}
