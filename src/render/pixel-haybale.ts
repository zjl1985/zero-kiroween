import type { Ctx } from "./paper-material.js";

type Point=readonly [number,number];
const HAY=[
  ["#8a7547","#b69d5c","#d9c383"],["#836d41","#ac8e4b","#d1b575"],
  ["#96814c","#c1aa65","#e0cb8d"],["#82794c","#b0a166","#d0c18c"],
] as const;

/** Grounded straw roll and its unrolled material states; native integer art.
 * Live flames remain external at the original three registered anchors. */
export function drawPixelHaybale(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,damaged=phase==="damaged",scraps=phase==="scraps";
  const hay=burnt?["#323b3b","#5b6257","#92917c"] as const:HAY[v]!;
  const twine=burnt?"#92927d":"#785944",inner=burnt?"#263335":"#715638";
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const l=Math.round(x+px*s),t=Math.round(y+py*s);ctx.fillStyle=col;
    ctx.fillRect(l,t,Math.max(1,Math.round(x+(px+w)*s)-l),Math.max(1,Math.round(y+(py+h)*s)-t));
  };
  const line=(a:Point,b:Point,col:string,width=1)=>{
    let ax=Math.round(a[0]),ay=Math.round(a[1]);const bx=Math.round(b[0]),by=Math.round(b[1]);
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let err=dx+dy;
    while(true){r(ax,ay,width,width,col);if(ax===bx&&ay===by)break;const e=err*2;if(e>=dy){err+=dy;ax+=sx;}if(e<=dx){err+=dx;ay+=sy;}}
  };
  const oval=(cx:number,cy:number,rx:number,ry:number,col:string)=>{
    for(let row=Math.ceil(cy-ry);row<=Math.floor(cy+ry);row++){
      const reach=rx*Math.sqrt(Math.max(0,1-((row-cy)/ry)**2)),l=Math.ceil(cx-reach),rr=Math.floor(cx+reach);
      if(rr>=l)r(l,row,rr-l+1,1,col);
    }
  };
  const poly=(points:readonly Point[],col:string)=>{
    for(let py=Math.ceil(Math.min(...points.map(p=>p[1])));py<Math.ceil(Math.max(...points.map(p=>p[1])));py++){
      const cuts:number[]=[];
      for(let i=0;i<points.length;i++){const a=points[i]!,b=points[(i+1)%points.length]!;
        if((a[1]<=py+.5&&b[1]>py+.5)||(b[1]<=py+.5&&a[1]>py+.5))cuts.push(a[0]+(py+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
      cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2){const l=Math.round(cuts[i]!),rr=Math.round(cuts[i+1]!);if(rr>l)r(l,py,rr-l,1,col);}
    }
  };
  oval(0,2,scraps?20:23,2,"#405144");
  if(scraps){
    // Low bundles retain directional stalks and broken binding lengths,
    // rather than generic square confetti or a miniature standing roll.
    for(const [cx,cy,rx,ry] of [[-14,0,11,3],[8,-1,12,4],[20,3,6,2]]){
      oval(cx!,cy!,rx!,ry!,hay[0]);oval(cx!,cy!-1,rx!-1,Math.max(1,ry!-1),hay[1]);
      r(cx!-rx!+3,cy!-1,rx!+2,1,hay[2]);r(cx!-rx!+2,cy!+1,rx!+4,1,hay[0]);
    }
    line([-19,-2],[-16,3],twine);line([6,-4],[9,3],twine);
    line([-22,4],[-11,5],twine);line([-11,5],[-7,3],twine);
    if(burnt){r(-6,3,5,1,"#999887");r(11,5,5,1,"#7e8375");}
    ctx.restore();return;
  }
  // Cylinder runs horizontally. Broad straw planes form a rounded top and
  // shaded underside; the roll remains full height when loosened by damage.
  poly([[-24,0],[-25,-20],[-23,-25],[-18,-30],[14,-30],[17,-25],[17,0]],hay[1]);
  poly([[-25,-20],[-23,-25],[-18,-30],[14,-30],[14,-26],[-19,-25]],hay[2]);
  poly([[-24,-6],[16,-6],[17,1],[-22,1]],hay[0]);
  r(-20,0,39,2,hay[0]);
  // Short staggered strands follow the cylinder axis, with clear quiet areas
  // between them. No random speckle and no repeated full-width stripe bands.
  for(const [sx,sy,len] of [[-19,-23,11],[-3,-23,12],[-21,-18,9],[-7,-16,15],[-19,-11,13],[-3,-8,12]]){
    r(sx!,sy!,len!,1,hay[0]);if(sy===-18||sy===-11)r(sx!+2,sy!-1,len!-4,1,hay[2]);
  }
  // Twine wraps the profile, ending in the same connected basal roll.
  for(const bx of [-12,2]){
    if(damaged&&bx===2)continue;
    line([bx,-30],[bx-2,-20],twine);line([bx-2,-20],[bx-2,-8],twine);line([bx-2,-8],[bx,0],twine);
    if(!burnt)r(bx-1,-28,1,4,"#b4a17a");
  }
  oval(15,-15,10,15,hay[0]);oval(15,-15,9,14,hay[2]);
  if(damaged){
    // A hollow end and a connected loosened sheet distinguish damage from a
    // cut-off cylinder. Upper roll remains at all original flame anchors.
    oval(16,-14,6,9,hay[0]);oval(16,-14,4,7,inner);
    poly([[6,-8],[12,-3],[9,3],[-5,6],[-19,4],[-28,5],[-24,-1],[-22,-11],[-13,-15],[-5,-13],[-9,-7],[-7,-2],[0,0]],hay[1]);
    poly([[-22,-10],[-13,-14],[-7,-12],[-12,-7],[-10,-1],[-1,2],[-8,4],[-18,2]],hay[2]);
    for(const [sx,sy,len] of [[-20,-7,8],[-19,-3,8],[-14,1,10],[-23,3,8]])r(sx!,sy!,len!,1,hay[0]);
    line([1,-29],[0,-24],twine);line([-16,1],[-22,4],twine);line([-22,4],[-28,3],twine);
  }else{
    // One continuous elliptical spiral identifies the end of the straw roll.
    let previous:Point=[15,-15];
    for(let k=1;k<=52;k++){
      const angle=k*.36,radius=.4+k*.18;
      const next:Point=[15+Math.cos(angle)*radius*.65,-15+Math.sin(angle)*radius];
      line(previous,next,hay[0]);previous=next;
    }
    r(13,-27,3,1,hay[1]);r(20,-11,1,5,hay[1]);
  }
  ctx.restore();
}
