import type { Ctx } from "./paper-material.js";

type P=readonly [number,number];
const CLOTH=[
  ["#a9aa97","#d3cbb1","#e2d8bd"],
  ["#607b8e","#8ea8b5","#b5c4c5"],
  ["#965f5c","#bf8c7b","#d8ac90"],
  ["#73845d","#a1af7e","#c1c998"],
] as const;

/** Cached by propSprite. Direct world-native pixels keep both support posts at
 * the exact ±42 anchors, with no sprite-stack projection or artificial lift. */
export function drawPixelLaundryLine(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,damaged=phase==="damaged",scraps=phase==="scraps";
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const left=Math.round(x+px*s),top=Math.round(y+py*s);
    ctx.fillStyle=col;ctx.fillRect(left,top,Math.max(1,Math.round(x+(px+w)*s)-left),Math.max(1,Math.round(y+(py+h)*s)-top));
  };
  const wood=burnt?"#515b54":"#8c7153",dark=burnt?"#2d393a":"#3f4744",edge=burnt?"#8b8c79":"#c2a373";
  const cloth=(index:number)=>burnt?["#384443","#667165","#949580"] as const:CLOTH[(v+index)%4]!;
  const poly=(points:readonly P[],colors:readonly string[])=>{
    const min=Math.ceil(Math.min(...points.map(p=>p[1]))),max=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let py=min;py<max;py++){
      const hits:number[]=[];
      for(let i=0;i<points.length;i++){
        const a=points[i]!,b=points[(i+1)%points.length]!;
        if((a[1]<=py+.5&&b[1]>py+.5)||(b[1]<=py+.5&&a[1]>py+.5))hits.push(a[0]+(py+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      hits.sort((a,b)=>a-b);
      for(let i=0;i+1<hits.length;i+=2){
        const left=Math.ceil(hits[i]!),right=Math.ceil(hits[i+1]!);
        if(right<=left)continue;
        r(left,py,right-left,1,colors[1]!);
        r(left,py,Math.min(2,right-left),1,colors[0]!);
        if(right-left>5)r(right-2,py,1,1,colors[2]!);
      }
    }
  };
  // Two separate contact shadows, never a long bar across the walking space.
  for(const px of [-42,42]){
    r(px-5,1,10,1,"#344c44");r(px-3,2,6,1,"#344c44");
    const top=scraps?(px<0?-12:-9):-56;
    r(px-2,top,4,-top+1,dark);r(px-1,top,2,-top+1,wood);r(px+1,top,1,-top+1,edge);
    r(px-3,top,6,2,edge);
    if(!scraps){r(px-6,-56,12,3,wood);r(px-5,-56,10,1,edge);r(px-2,-53,4,2,dark);}
  }
  const cordY=(px:number)=>{
    const t=(px+42)/84,control=damaged?-32:-36;
    return (1-t)*(1-t)*-52+2*(1-t)*t*control+t*t*-52;
  };
  const cord=burnt?"#7b8171":"#b2a589";
  if(scraps){
    // Fallen fabric still has a shirt collar, sock heel and folded sheet.
    poly([[-31,-3],[-25,-5],[-20,-3],[-15,-1],[-19,1],[-21,4],[-31,3]],cloth(0));
    r(-27,-4,4,2,cloth(0)[0]);r(-24,1,4,1,cloth(0)[2]);
    poly([[-6,0],[-1,-1],[1,2],[6,3],[5,5],[-4,4]],cloth(1));
    poly([[14,-3],[30,-4],[36,0],[31,5],[14,3]],cloth(2));
    r(18,0,12,1,cloth(2)[2]);r(24,-2,1,5,cloth(2)[0]);
    // Slack cord lies in short connected bends beside the fallen pieces.
    for(const [px,py,w] of [[-38,-1,8],[-32,0,6],[-9,3,5],[4,4,7],[31,3,7]] as const)r(px,py,w,1,cord);
    ctx.restore();return;
  }
  // The sagging line and every peg sample this same quadratic curve.
  let previous=Math.round(cordY(-42));
  for(let px=-42;px<=42;px++){
    const cy=Math.round(cordY(px));r(px,Math.min(previous,cy),1,Math.abs(previous-cy)+1,cord);previous=cy;
  }
  const shirtY=Math.round(cordY(-24))+1,sockY=Math.round(cordY(-4))+1,sheetY=Math.round(cordY(20))+1;
  const shirt:P[]=damaged?
    [[-33,shirtY],[-15,shirtY],[-11,shirtY+5],[-15,shirtY+7],[-16,shirtY+19],[-20,shirtY+17],[-21,shirtY+22],[-32,shirtY+21],[-33,shirtY+7],[-37,shirtY+5]]:
    [[-33,shirtY],[-15,shirtY],[-11,shirtY+5],[-15,shirtY+7],[-16,shirtY+22],[-32,shirtY+22],[-33,shirtY+7],[-37,shirtY+5]];
  poly(shirt,cloth(0));r(-27,shirtY,6,2,cloth(0)[0]);r(-26,shirtY+2,4,1,cloth(0)[2]);
  r(-23,shirtY+10,5,5,cloth(2)[1]);r(-23,shirtY+10,5,1,cloth(2)[2]);
  r(-30,shirtY+19,8,1,cloth(0)[2]);
  if(damaged){poly([[-9,0],[-4,-1],[-2,2],[3,3],[2,5],[-7,4]],cloth(1));}
  else{
    poly([[-7,sockY],[-1,sockY],[-1,sockY+12],[3,sockY+15],[2,sockY+18],[-7,sockY+16]],cloth(1));
    r(-6,sockY+2,4,2,cloth(1)[2]);r(-6,sockY+12,3,3,cloth(1)[0]);
  }
  poly([[8,sheetY],[32,sheetY],[33,sheetY+24],[24,sheetY+22],[20,sheetY+(damaged?18:24)],[16,sheetY+25],[8,sheetY+23]],cloth(2));
  r(14,sheetY+3,2,17,cloth(2)[2]);r(25,sheetY+4,1,16,cloth(2)[0]);
  r(10,sheetY+20,9,1,cloth(2)[2]);r(24,sheetY+20,7,1,cloth(2)[2]);
  // Pegs bridge the actual cord height to each flat upper fabric edge.
  for(const [px,top] of [[-29,shirtY],[-19,shirtY],[-5,sockY],[11,sheetY],[29,sheetY]] as const){
    const cy=Math.round(cordY(px)),bottom=damaged&&px===-5?cy+3:Math.max(cy+3,top+3);
    r(px-1,cy-2,2,bottom-cy+2,wood);r(px,cy-2,1,bottom-cy+2,edge);
  }
  ctx.restore();
}
