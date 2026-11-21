/** Quiet stone compass court, baked below actors; no new physical geometry. */
import type { Ctx } from './paper-material.js';

export function drawObservatoryCourt(ctx:Ctx,x:number,y:number):void {
  ctx.save();
  const rect=(px:number,py:number,w:number,h:number,color:string)=>{
    ctx.fillStyle=color;ctx.fillRect(Math.round(x+px),Math.round(y+py),Math.round(w),Math.round(h));
  };
  const ellipse=(cx:number,cy:number,rx:number,ry:number,color:string)=>{
    for(let row=-Math.floor(ry);row<=Math.floor(ry);row++){
      const reach=Math.floor(rx*Math.sqrt(Math.max(0,1-(row/ry)**2)));
      if(reach>0)rect(cx-reach,cy+row,reach*2+1,1,color);
    }
  };
  ellipse(0,0,172,88,'#475b59');
  ellipse(0,-1,169,85,'#7d8978');
  ellipse(0,0,164,81,'#616f65');
  // Sparse paver joints follow the court, leaving its center calm.
  for(let row=-4;row<=4;row++)for(let col=-7;col<=7;col++){
    const px=col*21+(row%2?10:0),py=row*17;
    if((px/154)**2+(py/73)**2>.96||(px/63)**2+((py-34)/40)**2<1)continue;
    if((row+col+21)%3===0){rect(px,py,13,1,'#788172');rect(px+13,py+1,1,5,'#55665f');}
  }
  // Dark brass inlay and alternating stone wedges form a compressed compass.
  ellipse(0,39,58,30,'#485e5c');ellipse(0,39,56,28,'#8c957c');
  ellipse(0,39,53,26,'#617267');
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,px=Math.cos(a)*55,py=39+Math.sin(a)*28;
    rect(px-1,py-1,i%4===0?3:2,2,'#a0a389');
  }
  const triangle=(points:readonly (readonly [number,number])[],color:string)=>{
    const top=Math.ceil(Math.min(...points.map(p=>p[1]))),bottom=Math.floor(Math.max(...points.map(p=>p[1])));
    for(let row=top;row<=bottom;row++){
      const intersections:number[]=[];
      for(let i=0;i<3;i++){
        const a=points[i]!,b=points[(i+1)%3]!;
        if(a[1]===b[1]||row<Math.min(a[1],b[1])||row>=Math.max(a[1],b[1]))continue;
        intersections.push(a[0]+(row-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      if(intersections.length<2)continue;
      const left=Math.ceil(Math.min(...intersections)),right=Math.floor(Math.max(...intersections));
      if(right>=left)rect(left,row,right-left+1,1,color);
    }
  };
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,length=i%2?28:45,cs=Math.cos(a),sn=Math.sin(a);
    const tip:[number,number]=[cs*length,39+sn*length*.5];
    triangle([[0,39],[-sn*5,39+cs*2.5],tip],i%2?'#8c957a':'#a4a58a');
    triangle([[0,39],[sn*5,39-cs*2.5],tip],'#4c625e');
  }
  ellipse(0,39,5,3,'#b1ad8c');ellipse(0,39,2,1,'#5b7066');
  // Short flush stones join the actual building's offset doorway to the court.
  for(let i=0;i<4;i++){
    rect(-23,-17+i*7,21,5,i%2?'#8c937e':'#959b83');
    rect(-22,-13+i*7,19,1,'#4e635b');
  }
  ctx.restore();
}
