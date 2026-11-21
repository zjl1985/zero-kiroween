import type { Ctx } from "./paper-material.js";

/** Flush meadow dressing for the existing moon-hill landmark. All objects and
 * collision remain in the landmark definition; this paints ground only. */
export function drawMoonHill(ctx: Ctx,x:number,y:number):void {
  ctx.save();
  const ox=Math.round(x),oy=Math.round(y);
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    ctx.fillStyle=col;ctx.fillRect(ox+px,oy+py,w,h);
  };
  // Three quiet, interleaved contours fade into the meadow by open stepped
  // edges. No continuous perimeter, side shadow or plinth suggests an island.
  for(const [px,py,w,h] of [
    [-133,-62,75,12],[-150,-50,119,14],[-160,-36,150,17],
    [-168,-19,151,19],[-161,0,118,17],[-145,17,84,18],[-120,35,47,10],
  ])r(px!,py!,w!,h!,"#5b6e5d");
  for(const [px,py,w,h] of [
    [-46,-87,80,11],[-68,-76,134,12],[-80,-64,170,15],
    [-66,-49,178,15],[-38,-34,166,14],[12,-20,128,13],
    [49,-7,104,12],[78,5,77,11],
  ])r(px!,py!,w!,h!,"#607560");
  for(const [px,py,w,h] of [
    [67,21,72,13],[43,34,113,15],[4,49,149,16],
    [-36,65,169,13],[-66,78,162,12],[-83,90,136,9],
  ])r(px!,py!,w!,h!,"#586b59");
  // A stone crescent is embedded into the turf around the lamp's fixed foot.
  // Subtracting the inner arc leaves the middle open instead of a paved disc.
  // Each world-pixel row is contiguous; no smooth paths or translucent layers.
  for(let py=-15;py<=19;py++){
    let start=0,run="";
    const flush=(end:number)=>{if(run&&end>start)r(start,py,end-start,1,run);};
    for(let px=-43;px<=43;px++){
      const outer=(px/42)**2+((py-2)/17)**2<=1;
      const inner=((px-13)/35)**2+((py+2)/14.5)**2<1;
      let color="";
      if(outer&&!inner){
        color=py<0?"#b8bda0":"#aab496";
        // Two understated masonry divisions cross the inlay, not the lawn.
        if((px===-27&&py>-10)||(px===-10&&py>8))color="#8f9f83";
        else if(py===13&&px<-12&&px>-30)color="#c5c8aa";
      }
      if(color!==run){flush(px);start=px;run=color;}
    }
    flush(44);
  }
  // Connected small leaf fans sit on selected contour shoulders and around
  // existing rocks, never as a full border or a new wall through the clearing.
  const grass=(px:number,py:number,lean=1)=>{
    r(px-5,py+2,11,2,"#506f4c");r(px-3,py,4,3,"#6e8957");
    r(px+1,py-2,4,4,"#7c945f");r(px,py-5,1,7,"#8ba169");
    r(px-3,py-3,2,3,"#7c945b");r(px+lean*3,py-4,1,3,"#91a66e");
  };
  for(const [px,py,lean] of [
    [-130,-51,-1],[-121,-48,1],[-98,-67,1],[-89,-65,-1],
    [63,-62,-1],[72,-59,1],[112,-26,1],[120,-22,-1],
    [-151,10,-1],[-143,14,1],[-111,53,1],[-101,56,-1],
    [121,68,-1],[130,65,1],[84,86,1],[74,89,-1],
    [-43,87,-1],[-34,90,1],
  ])grass(px!,py!,lean!);
  // Quiet clover leaves join a few groups without sprinkling isolated dots.
  for(const [px,py] of [[-116,-45],[78,-55],[-137,20],[-95,60],[114,73],[66,93]]){
    r(px!,py!,5,2,"#73915c");r(px!+3,py!-2,4,2,"#86a168");
    r(px!+6,py!+1,3,2,"#6b8956");
  }
  ctx.restore();
}
