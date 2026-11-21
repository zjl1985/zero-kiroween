import { pumpkinModel } from "./pixel-pumpkin.js";
import { stoneModel } from "./pixel-stone.js";
import { fenceModel } from "./pixel-fence.js";
import { lanternModel } from "./pixel-lantern.js";
import { treeModel } from "./pixel-tree.js";
import { cottageModel } from "./pixel-cottage.js";
import { drawPixelStack, type PixelStackModel } from "./pixel-stack.js";
import { type Ctx } from "./paper-material.js";

// Geometry stays in its original world proportions; half-unit sections and
// half-unit surface details are baked as genuine one-pixel voxels.
function fineModel(m:PixelStackModel):PixelStackModel {
  return {...m,id:m.id+":fine",width:m.width*2,depth:m.depth*2,count:m.count*2-1,
    paint(c,z){m.paint(c,z/2);}};
}
function rect(c:Ctx,x:number,y:number,w:number,h:number,color:string):void {
  c.fillStyle=color;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(h*2)));
}
function pixelDisc(c:Ctx,x:number,y:number,rx:number,ry:number,color:string):void {
  if(rx<=0||ry<=0)return;
  for(let iy=Math.ceil(-ry*2);iy<=Math.floor(ry*2);iy++) {
    const reach=Math.sqrt(Math.max(0,1-(iy/(ry*2))**2))*rx;
    if(reach>.2)rect(c,x-reach,y+iy/2,reach*2,.5,color);
  }
}
const foliage = [
  ["#34544f", "#527b61", "#7f995f"],
  ["#714b50", "#ac7160", "#cf9a70"],
  ["#414f5b", "#6e8980", "#9cae87"],
] as const;
function model(kind: string, variant: number): PixelStackModel {
  const bush = kind === "bush",
    palettes = foliage[Math.abs(variant) % foliage.length]!;
  if (kind === "cottage") return cottageModel(variant % 3);
  if (kind === "tree") return treeModel(variant);
  if (kind === "lamp") return lanternModel(variant);
  if (kind === "fence") return fenceModel(variant);
  if (kind === "stone") return stoneModel(variant);
  if (kind === "pumpkin") return pumpkinModel(variant);
  return {
    id: `scene:${kind}:${variant % 6}`, width: 36,
    depth: 28,
    count: bush ? 19 : 18,
    paint(c,z) {
      const box = (x:number,y:number,w:number,h:number,color:string) => { rect(c,x,y,w,h,color); };
      if (bush) {
        for (const [x,y,center,r] of [[-8,0,8,8],[6,-1,10,9],[0,5,7,7]]) {
          const dz=z-center!; if(Math.abs(dz)>=r!)continue;
          const rr=Math.sqrt(r!*r!-dz*dz);
          pixelDisc(c,x!,y!,rr,Math.max(.5,rr*.7),palettes[dz<-r!*.55?0:dz>r!*.3?2:1]);
          if(z===center!+2)box(x!,y!,2,2,variant%2?"#d79b64":"#ae6675");
        }
        for(const [lx,ly,lz,lr] of [[-9,4,10,3],[-3,7,9,3],[5,5,12,3],[10,1,13,2.5],[-3,0,14,3]]){
          const dz=(z-lz!)/lr!;if(Math.abs(dz)>=1)continue;
          const reach=Math.sqrt(1-dz*dz);
          pixelDisc(c,lx!,ly!,lr!*reach,lr!*.7*reach,palettes[dz<.12?1:2]);
        }
      } else if(kind==="candles") {
        for(const [x,y,h] of [[-6,0,12],[1,-2,16],[7,2,10]]) {
          if(z<h!){box(x!,y!,3,3,z===0?"#514350":"#d5b989");box(x!+2,y!,1,3,"#f3dba8");}
          else if(z<h!+2)box(x!+1,y!+1,1,1,"#ffd78a");
        }
      }
    },
  };
}
export function drawPixelDecor(ctx:Ctx,kind:string,x:number,y:number,s=1,seed=0):void {
  const v=((Math.trunc(seed)%6)+6)%6;
  drawPixelStack(ctx,fineModel(model(kind,v)),{x,y,scale:(kind==="cottage"?.9:1)*s,turn:kind==="cottage"?-.58:.22,squash:.75,shadow:kind!=="cottage"});
}
