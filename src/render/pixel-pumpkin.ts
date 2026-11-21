import type { PixelStackModel } from "./pixel-stack.js";

/** Lobed gourd with a carved front skin; all sections are cached with the prop. */
export function pumpkinModel(variant: number): PixelStackModel {
  const v=Math.abs(variant)%3;
  const [shade,skin,lit,rim]=[
    ["#813d36","#ba632e","#df913f","#efb75d"],
    ["#754332","#ad7139","#d8a454","#ebca80"],
    ["#713c40","#b05a39","#d68145","#eba35e"],
  ][v]!;
  return {id:`scene:pumpkin:carved:${v}`,width:36,depth:28,count:18,
    paint(c,z){
      const r=(x:number,y:number,w:number,d:number,color:string)=>{
        c.fillStyle=color;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
      };
      if(z<14){
        const radius=Math.max(2.5,9.5*Math.sqrt(Math.max(0,1-((z-7)/7.2)**2)));
        // The actual perimeter has six shallow lobes, not five overlapping discs.
        for(let px=-20;px<=20;px++){
          const x=px/2+.25;let front=-Infinity;
          for(let py=-16;py<=16;py++){
            const y=py/2+.25,ny=y/.76,angle=Math.atan2(ny,x);
            const lobe=Math.cos(angle*6),reach=radius*(.92+.08*lobe);
            if(Math.hypot(x,ny)>reach)continue;
            let color=x< -radius*.55?shade:lobe<-.55||x>radius*.6?skin:lit;
            if(z<1.5)color=shade;
            c.fillStyle=color;c.fillRect(px,py,1,1);front=py/2;
          }
          if(!Number.isFinite(front))continue;
          // Cutouts sit on the exposed front contour. Thick warm cut edges
          // surround dark cavities; small inner faces imply candlelit depth.
          const eye=(z>=9.5&&z<=12.5)&&Math.abs(Math.abs(x)-3)<(12.75-z)*.7;
          const mouth=z>=5.5&&z<=7.5&&Math.abs(x)<4.5-(7.5-z)*.5;
          const tooth=mouth&&((Math.abs(x)<.75&&z>=6.5)||(x>2&&x<3&&z<=6));
          if(eye||mouth&&!tooth){
            r(x-.25,front, .5,1, "#422c31");
            if(mouth&&z===6.5&&x>1&&x<2&&!tooth)
              r(x-.25,front+.5,.5,.5,"#edb85c");
            if(z===9.5&&eye||z===5.5&&mouth)r(x-.25,front+.5,.5,.5,rim);
          }
        }
        if(z>=13){
          r(-2,-1.5,4,3,"#76552f");r(-1,-1,2,2,"#526343");
        }
      }else{
        const bend=(z-14)*.5;
        r(-1+bend,-1,2,2,"#425441");r(bend,.5,1,.5,"#82905b");
        if(z>=16.5)r(-.5+bend,-1,1.5,1.5,"#a4a06a");
        if(z===14){r(-4,-1,3,1,"#566d45");r(-5,-.5,2,1,"#7e8950");}
      }
    },
  };
}
