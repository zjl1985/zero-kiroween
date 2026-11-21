import type { Ctx } from "./paper-material.js";

type Point=readonly [number,number];
const BOXES=[
  ["#3b5262","#648598","#a1b7bb"],
  ["#514354","#8a687f","#b69ca8"],
  ["#455746","#7b8b60","#abb78c"],
] as const;

/** Integer-raster tunnel mailbox. propSprite supplies caching and the existing
 * lifecycle; this painter never moves the ground anchor or alters collision. */
export function drawPixelMailbox(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%3,damaged=phase==="damaged",scraps=phase==="scraps";
  const metal=burnt?["#303d3e","#59675e","#929582"] as const:BOXES[v]!;
  const wood=burnt?"#56645a":"#937653",woodDark=burnt?"#2b3839":"#414849",woodLight=burnt?"#939780":"#c7a873";
  const paper=burnt?"#8f947d":"#e0d5b4",paperFold=burnt?"#626e5d":"#b9ac8b",red=burnt?"#798271":"#b7685c";
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const left=Math.round(x+px*s),top=Math.round(y+py*s);
    ctx.fillStyle=col;ctx.fillRect(left,top,Math.max(1,Math.round(x+(px+w)*s)-left),Math.max(1,Math.round(y+(py+h)*s)-top));
  };
  const poly=(points:readonly Point[],col:string)=>{
    const low=Math.ceil(Math.min(...points.map(p=>p[1]))),high=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let py=low;py<high;py++){
      const cuts:number[]=[];
      for(let i=0;i<points.length;i++){
        const a=points[i]!,b=points[(i+1)%points.length]!;
        if((a[1]<=py+.5&&b[1]>py+.5)||(b[1]<=py+.5&&a[1]>py+.5))cuts.push(a[0]+(py+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      cuts.sort((a,b)=>a-b);
      for(let i=0;i+1<cuts.length;i+=2){const l=Math.round(cuts[i]!),rr=Math.round(cuts[i+1]!);if(rr>l)r(l,py,rr-l,1,col);}
    }
  };
  const letter=(px:number,py:number)=>{
    r(px,py,10,5,paper);r(px,py,10,1,burnt?metal[2]:"#eee2c2");
    // A two-sided envelope flap rather than a generic cream rectangle.
    for(let i=0;i<4;i++){r(px+i,py+1+Math.floor(i/2),1,1,paperFold);r(px+9-i,py+1+Math.floor(i/2),1,1,paperFold);}
    r(px+4,py+3,2,1,paperFold);
  };
  r(-5,1,10,1,"#364f45");r(-3,2,6,1,"#364f45");
  const postTop=scraps?-10:-32;
  r(-2,postTop,4,-postTop+1,woodDark);r(-1,postTop,2,-postTop+1,wood);r(1,postTop,1,-postTop+1,woodLight);
  if(scraps){
    r(-2,-10,4,2,woodLight);
    poly([[-14,1],[-13,-3],[-10,-5],[-4,-4],[0,-1],[-1,3],[-11,4]],metal[1]);
    poly([[-12,0],[-10,-3],[-5,-2],[-2,1],[-3,3],[-10,3]],metal[0]);
    r(-11,-3,6,1,metal[2]);
    r(11,-5,1,8,metal[0]);poly([[12,-5],[17,-3],[12,-1]],red);
    letter(0,0);r(8,4,5,1,paperFold);
    ctx.restore();return;
  }
  // Side support saddle is visibly joined to the pole, not a floating body.
  r(-5,-29,10,3,woodDark);r(-4,-28,8,1,woodLight);
  // The tunnel's turned rear/side face sits three pixels right and two up.
  for(let py=-48;py<-30;py++){
    const reach=py<-40?12*Math.sqrt(Math.max(0,1-((py+40)/8)**2)):12;
    if(reach>.5)r(3-Math.floor(reach),py,Math.floor(reach)*2,1,metal[0]);
  }
  poly([[12,-38],[15,-41],[15,-31],[12,-28]],metal[0]);r(14,-38,1,7,metal[2]);
  // Full front silhouette, curved hood and inset door seam at native scale.
  for(let py=-46;py<-28;py++){
    const raw=py<-38?12*Math.sqrt(Math.max(0,1-((py+38)/8)**2)):12;
    const reach=Math.floor(raw),dent=damaged&&py>=-43&&py<-39?2:0;
    if(reach<1)continue;
    r(-reach,py,reach*2-dent,1,metal[0]);
    if(reach>2)r(-reach+1,py,reach*2-2-dent,1,metal[1]);
    if(py<-42&&reach>2)r(-reach+2,py,Math.max(1,reach*2-4-dent),1,metal[2]);
    if(py>=-41&&py<-30)r(-10,py,1,1,metal[2]);
  }
  if(damaged){
    // A dropped hinged door stays attached at the lower edge of the housing.
    r(-8,-37,17,8,woodDark);r(-7,-36,15,6,metal[0]);
    poly([[-9,-30],[9,-30],[12,-25],[-7,-23]],metal[1]);
    poly([[-8,-29],[8,-29],[9,-27],[-6,-25]],metal[2]);
    letter(-5,-33);r(-7,-25,17,1,metal[0]);
    r(8,-42,2,3,metal[0]);
  }else{
    r(-7,-38,14,2,woodDark);r(-6,-36,12,1,metal[2]);
    r(9,-39,1,9,metal[0]);r(-9,-30,19,1,metal[2]);
    letter(-5,-34);
  }
  // The original raised flag is retained, shortened to the registered r18.
  r(13,-46,2,14,metal[0]);r(14,-46,1,14,metal[2]);
  poly([[14,-46],[18,-44],[14,-41]],red);
  r(14,-46,2,1,burnt?metal[2]:"#d29178");r(13,-33,2,2,woodDark);
  ctx.restore();
}
