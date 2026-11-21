import type { Ctx } from "./paper-material.js";

const PETALS=[
  ["#9d8caa","#c0aacd","#dfcde0"],["#ad9b79","#d1bd92","#e9d7b4"],
  ["#a2737e","#ca99a1","#e3bdba"],["#8398aa","#afc1ce","#d0dce0"],
] as const;

/** Six connected, grouped flowers; only existing art/lifecycle is rendered. */
export function drawPixelFlowers(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,scraps=phase==="scraps",damaged=phase==="damaged";
  const green=burnt?["#30383c","#5c625e","#919083"] as const:["#4d6847","#7b8e58","#a0aa73"] as const;
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const l=Math.round(x+px*s),t=Math.round(y+py*s);ctx.fillStyle=col;
    ctx.fillRect(l,t,Math.max(1,Math.round(x+(px+w)*s)-l),Math.max(1,Math.round(y+(py+h)*s)-t));
  };
  const line=(ax:number,ay:number,bx:number,by:number,col:string,w=1)=>{
    ax=Math.round(ax);ay=Math.round(ay);bx=Math.round(bx);by=Math.round(by);
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let err=dx+dy;
    while(true){r(ax,ay,w,w,col);if(ax===bx&&ay===by)break;const e=err*2;if(e>=dy){err+=dy;ax+=sx;}if(e<=dx){err+=dx;ay+=sy;}}
  };
  const bloom=(cx:number,cy:number,index:number)=>{
    const p=burnt?["#3a3e42","#70716a","#a09b8b"] as const:PETALS[(v+index)%4]!;
    // Five joined broad petals have dark undersides, warm central discs and
    // one restrained upper edge, never isolated luminous flower dots.
    r(cx-4,cy+2,9,2,p[0]);r(cx-5,cy-1,4,4,p[1]);r(cx+2,cy-1,4,4,p[1]);
    r(cx-2,cy-5,5,4,p[1]);r(cx-3,cy+2,4,3,p[1]);r(cx+1,cy+2,4,3,p[1]);
    r(cx-1,cy-5,3,1,p[2]);r(cx-4,cy-1,2,1,p[2]);
    r(cx-1,cy-1,3,3,burnt?green[2]:"#cbb375");r(cx,cy-1,1,1,burnt?"#a7aa8d":"#e5ce91");
  };
  // Two unequal rooted bouquets: a broad low left shoulder and a taller
  // open right fan. Heights, lean and leaf nodes are authored independently.
  const roots=[-28,-24,-18,10,18,25],bases=[1,-2,4,-3,2,4],
    heights=[22,36,28,36,24,32],leans=[-6,2,7,4,1,7];
  for(let i=0;i<roots.length;i++){
    const root=roots[i]!,base=bases[i]!;
    if(i%2===0){r(root-4,base+2,9,1,"#435b44");r(root-3,base,7,2,green[0]);}
    if(scraps){
      const h=5+i%3;r(root,base-h,2,h+2,green[1]);r(root,base-h,2,1,green[2]);
      if(burnt){r(root-5,base+1,10,3,green[0]);r(root-2,base,5,2,green[1]);r(root+1,base+2,2,1,green[2]);}
      else{
        const p=PETALS[(v+i)%4]!;r(root-4,base+4,4,2,p[1]);r(root-3,base+4,2,1,p[2]);
        r(root+2,base+3,4,2,p[0]);line(root-4,base+2,root+4,base+1,green[1]);
      }
      continue;
    }
    const cut=damaged&&(i===1||i===4),droop=damaged&&i===3;
    const h=cut?10:heights[i]!+(v===2&&i%2===0?2:0),lean=leans[i]!;
    let lastX=root,lastY=base,headX=root,headY=base;
    for(let k=1;k<=12;k++){
      const t=k/12,cx=root+lean*t*t+(droop?9*t*t:0),cy=base-h*t+(droop?h*.45*t*t:0);
      line(lastX,lastY,cx,cy,green[0],2);line(lastX,lastY,cx,cy,green[1]);
      lastX=cx;lastY=cy;headX=Math.round(cx);headY=Math.round(cy);
    }
    // Broad leaf pairs visibly meet each stem at two heights.
    const leafNodes=i%3===0?[[.28,-1],[.55,1]]:i%3===1?[[.4,1],[.7,-1]]:[[.32,-1],[.56,-1]];
    for(const [share,side] of leafNodes){
      const t=share!,cx=Math.round(root+lean*t*t+(droop?9*t*t:0)),cy=Math.round(base-h*t+(droop?h*.45*t*t:0));
      const ex=cx+side!*(i%2?5:7);
      line(cx,cy,ex,cy-3,green[1],2);
      r(side!<0?ex:cx+2,cy-4,5,3,green[1]);r(side!<0?ex+1:cx+3,cy-4,3,1,green[2]);
    }
    if(cut){r(headX,headY,2,1,green[2]);const p=burnt?["#3a3e42","#70716a","#a09b8b"] as const:PETALS[(v+i)%4]!;r(root+2,base+4,4,2,p[1]);}
    else bloom(headX,headY,i);
    r(root-1,base,3,2,green[0]);
  }
  ctx.restore();
}
