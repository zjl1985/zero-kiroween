import type { Ctx } from "./paper-material.js";

const WAX=[
  ["#b39b70","#dcc38b","#efdfb0"],
  ["#ad9277","#d8bfa0","#f0dfbd"],
  ["#aaa17e","#d4c9a6","#e9e0bd"],
] as const;

/** Static UNLIT wax. The existing live flame remains anchored at (2,-47).
 * Only propSprite caches this material painter; fire and lifecycle are external. */
export function drawPixelWaxCandle(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%3,damaged=phase==="damaged",scraps=phase==="scraps",wax=WAX[v]!;
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const left=Math.round(x+px*s),top=Math.round(y+py*s);
    ctx.fillStyle=col;ctx.fillRect(left,top,Math.max(1,Math.round(x+(px+w)*s)-left),Math.max(1,Math.round(y+(py+h)*s)-top));
  };
  const oval=(cx:number,cy:number,rx:number,ry:number,col:string)=>{
    for(let row=Math.ceil(cy-ry);row<=Math.floor(cy+ry);row++){
      const span=rx*Math.sqrt(Math.max(0,1-((row-cy)/ry)**2)),left=Math.ceil(cx-span),right=Math.floor(cx+span);
      if(right>=left)r(left,row,right-left+1,1,col);
    }
  };
  const line=(ax:number,ay:number,bx:number,by:number,col:string,width=1)=>{
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;
    let error=dx+dy;
    while(true){r(ax,ay,width,width,col);if(ax===bx&&ay===by)break;const e=error*2;if(e>=dy){error+=dy;ax+=sx;}if(e<=dx){error+=dx;ay+=sy;}}
  };
  // A shallow grounded metal tray, with a single inset well and rolled rim.
  oval(0,3,14,3,"#46554b");
  oval(0,1,18,6,"#787d6c");oval(0,-1,18,5,"#a6a58b");
  oval(0,-1,15,3,"#858d77");
  r(-12,2,24,1,"#c0b99a");r(-7,4,14,1,"#8d947d");
  if(scraps&&burnt){
    // Wax melts to pale pooled material, never paper-like charcoal ash.
    oval(-2,0,15,4,wax[1]);oval(-10,1,7,3,wax[1]);oval(10,0,6,3,wax[1]);
    oval(0,-1,10,2,wax[2]);r(-10,2,8,1,wax[0]);r(3,2,7,1,wax[0]);
    oval(1,-1,4,1,"#b0a17c");line(-2,-2,5,-4,"#414447",2);
    ctx.restore();return;
  }
  if(scraps){
    // Low broken wax cylinder, a curved slab and a few irregular chunks stay
    // on the tray; the bright fracture surfaces identify wax at every state.
    oval(-5,0,7,3,wax[0]);r(-10,-8,10,8,wax[1]);r(-10,-8,2,8,wax[0]);
    oval(-5,-8,5,2,wax[2]);r(-3,-7,2,2,wax[0]);
    oval(7,0,6,3,wax[1]);oval(7,-2,5,2,wax[2]);r(10,-1,2,2,wax[0]);
    r(-13,1,3,2,wax[2]);r(0,2,4,2,wax[1]);line(-5,-8,-4,-10,"#414447");
    ctx.restore();return;
  }
  // Basal wax flows meet the candle itself and the interior of the tray.
  oval(-2,-3,12,3,wax[1]);oval(6,-2,6,2,wax[1]);
  for(let py=-40;py<-3;py++){
    let right=9;
    if(damaged&&py>=-24&&py<-18)right=py<-22?7:6;
    r(-9,py,right+9,1,wax[1]);r(-9,py,2,1,wax[0]);
    r(-6,py,2,1,wax[2]);r(right-3,py,3,1,wax[0]);
    if(damaged&&py>=-23&&py<-18)r(right-1,py,1,1,wax[2]);
  }
  oval(0,-4,9,2,wax[1]);r(-6,-3,11,1,wax[2]);
  // Thick rounded drips vary by palette, remain attached to the top crown,
  // and stop in rounded droplets rather than a uniform band of stripes.
  const drip=(px:number,bottom:number,w:number)=>{
    r(px,-39,w,bottom+39,wax[2]);r(px+1,bottom,w-2,2,wax[2]);
    if(w>3)r(px+w-1,-35,1,Math.max(1,bottom+35),wax[1]);
  };
  drip(-4,-26-v,4);drip(3,-33+(v===1?2:0),4);
  if(damaged)drip(-8,-20,3);
  // Irregular rim, recessed melt pool, and short unlit wick at the registered
  // flame anchor. Damaged standing candles preserve this exact same top.
  oval(0,-40,10,3,wax[0]);oval(0,-41,9,3,wax[2]);
  r(-8,-40,3,2,wax[1]);r(5,-41,4,2,wax[1]);
  oval(1,-41,5,1,burnt?"#8b866e":"#b19b72");
  if(burnt){r(5,-39,2,4,"#a69b7e");r(-3,-42,3,1,"#9e967c");}
  line(1,-40,2,-47,"#414447",2);
  ctx.restore();
}
