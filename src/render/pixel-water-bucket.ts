import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Half-unit pail geometry; all lifecycle states share the taper, rim and
 * handle construction. The caller owns simulation, spills and water effects. */
export function waterBucketModel(variant:number,phase:string,burnt:boolean):PixelStackModel {
  const v=Math.abs(variant)%3,damaged=phase==="damaged",scraps=phase==="scraps";
  const normal=[
    ["#4b6873","#789b9f","#a9bdaf"],
    ["#536a7c","#7f9ba9","#afbdba"],
    ["#536f66","#7b9b88","#afbaa0"],
  ][v]!;
  const body=burnt?["#343b3e","#545752","#7f7b69"] as const:normal;
  const hoop=burnt?"#65665c":"#bec2ac",inner=burnt?"#303839":"#4b6c74";
  return {id:`prop:water-bucket:constructed:${v}:${phase}:${burnt?1:0}`,
    width:28,depth:20,count:scraps?7:25,
    groundShadow:{rx:scraps?8:6,ry:1.5,dx:0,dy:0},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,h:number,color:string)=>{
      // Quantize shared endpoints, not origin and width independently. On
      // a curved row those two roundings disagree by one pixel, leaving the
      // darker underpaint exposed as a stipple beside the right-hand plane.
      const left=Math.round(x*2),top=Math.round(y*2);
      c.fillStyle=color;c.fillRect(left,top,Math.max(1,Math.round((x+w)*2)-left),Math.max(1,Math.round((y+h)*2)-top));
    };
    const ellipse=(cx:number,cy:number,rx:number,ry:number,color:string)=>{
      for(let row=Math.ceil(-ry*2);row<=Math.floor(ry*2);row++){
        const yy=row/2,span=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(span>.2)r(cx-span,cy+yy,span*2,.5,color);
      }
    };
    if(scraps){
      // Recognizable curved wall sections, one torn coping arc and the fallen
      // handle: no generic rectangle scatter or untriggered liquid puddle.
      for(const [cx,cy,rx,ry,top,side] of [[-5,0,4,2.5,4,-1],[4,1,4.5,2.5,3,1],[0,-3,3,1.5,2,-1]]){
        if(z>=top!)continue;
        const outer=rx!*(1+z*.08);
        for(let row=-Math.floor(ry!*2);row<=Math.floor(ry!*2);row++){
          const yy=row/2;if((side!<0&&yy>0)||(side!>0&&yy<0))continue;
          const reach=outer*Math.sqrt(Math.max(0,1-(yy/ry!)**2));
          if(reach<.3)continue;
          r(cx!-reach,cy!+yy,reach*2,.5,z>top!-.75?hoop:body[side!<0?1:2]);
        }
      }
      if(z<1.5){
        for(let xx=-7;xx<=7;xx+=.5){
          const yy=4*Math.sqrt(Math.max(0,1-(xx/7)**2));
          if(xx<-1||xx>1.5)r(xx,yy+1,1,1,burnt?"#79796b":"#c5c4a5");
        }
      }
      if(burnt&&z<1){r(-7,-2,4,2,"#838175");r(2,2,4,1,"#929083");}
      return;
    }
    if(z<15){
      const taper=z/15,rx=7.5+taper*2.5,ry=3.5+taper*1.7;
      const topRim=z>=13.5,band=z>=3&&z<4||z>=10&&z<11;
      // Dark recessed water well is a complete slab below the coping. The
      // dark surface extends across all exposed cells, not thin inner slivers.
      if(z>=10.5&&z<12.5){
        ellipse(0,0,rx-1.5,ry-1,inner);
        if(!burnt){ellipse(0,0,rx-2,ry-1.3,damaged?"#6f969b":"#8fb7ba");
          if(z>=12)r(-3,-.5,4,1,"#b3cdca");}
      }
      for(let row=Math.ceil(-ry*2);row<=Math.floor(ry*2);row++){
        const yy=row/2,reach=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(reach<.3)continue;
        const hollow=z>=10.5&&Math.abs(yy)<ry-1.1;
        const hole=hollow?(rx-1.8)*Math.sqrt(Math.max(0,1-(yy/(ry-1.1))**2)):0;
        const dent=damaged&&z>=5&&z<11&&yy>0?1:0;
        const color=topRim||band?hoop:body[yy<-.5?0:1];
        if(hole>.2){
          // A notch interrupts only the front left coping; the remaining rim
          // and joined handle retain identity after damage.
          if(!(damaged&&z>=14&&yy>1.5&&yy<3.5))r(-reach,yy,Math.max(.5,reach-hole),.5,color);
          r(hole,yy,Math.max(.5,reach-hole-dent),.5,topRim?hoop:body[2]);
        }else{
          r(-reach,yy,Math.max(.5,reach*2-dent),.5,color);
          if(!topRim&&!band&&reach>2)r(0,yy,Math.max(.5,reach-dent),.5,body[2]);
        }
      }
      if(damaged&&z>=7&&z<11){r(-5,2,1,2,burnt?"#292f33":"#45636c");if(z>=9)r(-6,2,1,2,body[0]);}
    }
    // Solid attachment lugs meet both coping and the arched carrying handle.
    if(z>=13&&z<16.5)for(const x of [-9,8]){r(x,-1,2,2.5,body[0]);r(x+.5,-.5,1,1.5,hoop);}
    if(z>=14&&z<=24){
      const dz=z-14,span=8.5*Math.sqrt(Math.max(0,1-(dz/10)**2));
      const bend=damaged?Math.max(0,(z-18)/6)*.8:0;
      if(z<23.5){r(-span-bend,-1.25,1.5,2.5,hoop);r(span-1.5-bend,-1.25,1.5,2.5,hoop);}
      else r(-3-bend,-1.25,6,2.5,hoop);
    }
  }};
}
