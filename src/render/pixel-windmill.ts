import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Half-unit sections of a masonry windmill. The caller's fineModel adapter
 * doubles the atlas dimensions/count and invokes paint at half-height steps.
 * No extra origin lift: the compact footing projects inside the ground bounds. */
export function windmillModel(variant:number):PixelStackModel {
  const v=Math.abs(variant)%3;
  const cap=[
    ["#36475d","#536d82","#748a99"],
    ["#414456","#66677d","#8a8c9a"],
    ["#344e58","#52767c","#7b9895"],
  ][v]!;
  return {id:`landmark:windmill:masonry:${v}`,width:48,depth:32,count:87,groundShadow:{rx:17,ry:4,dx:.5,dy:1},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    // An eight-sided cross section exposes broad side/front planes. Every
    // plane reaches its outer contour, avoiding per-slice outlined striping.
    const section=(rx:number,ry:number,left:string,front:string,right:string)=>{
      for(let yy=Math.ceil(-ry*2);yy<Math.ceil(ry*2);yy++){
        const y=yy/2,corner=Math.max(0,Math.abs(y)-ry*.6)*.9;
        const reach=rx-corner;
        r(-reach,y,reach*.68,.5,left);
        r(-reach*.32,y,reach*.9,.5,front);
        r(reach*.58,y,reach*.42,.5,right);
      }
    };
    // Shallow stone footing with two broad steps, not a tall round pedestal.
    if(z<4){
      const rx=z<1.5?18:z<3?17:16,ry=z<1.5?8:z<3?7.5:7;
      section(rx,ry,"#666c6c",z<1.5?"#85897d":"#a3a38e","#b2af95");
      if(z>=1.5&&z<2)r(-12,ry-.5,24,.5,"#b6b29a");
      for(const x of [-10,-1,9])r(x,ry-.5,.5,.5,"#6f7771");
      // The doorstep projects only within the shallow base footprint.
      if(z<2){r(-5,6,10,2,"#919888");r(-4.5,7.5,9,.5,"#b3b49a");}
    }
    if(z>=4&&z<64){
      const h=(z-4)/60,rx=16-h*5,ry=7-h*1.5;
      section(rx,ry,"#9b9c8b","#c6bda0","#d8cbae");
      const course=Math.floor((z-4)/8),local=(z-4)%8;
      // Sparse short joints only on a few blocks in each course. Complete
      // horizontal outlines would turn the taper into a stack of striped rings.
      if(local<.5){
        r(-rx*.68,ry-.5,3,.5,"#b2ad92");
        r(rx*.25,ry-.5,4,.5,"#b9b296");
      }
      if(local<2.5){
        const joint=(course%2?-.15:.35)*rx;
        r(joint,ry-.5,.5,.5,"#aaa68e");
      }
      // Door is an arched dark recess bounded by solid projecting jambs.
      if(z<24){
        const arch=z<=19?4:Math.sqrt(Math.max(0,16-(z-19)**2));
        if(arch>.3){
          r(-arch-.75,ry-.5,arch*2+1.5,1,"#7b6a57");
          r(-arch,ry,arch*2,.5,"#4b514b");
          if(z>5&&z<20){
            r(-arch+.5,ry,Math.max(.5,arch*2-1),.5,"#727260");
            r(-.25,ry,.5,.5,"#454c46");
            if(z>=11&&z<11.5)r(-arch+.5,ry,Math.max(.5,arch*2-1),.5,"#4e5147");
            if(z>=13&&z<14)r(2,ry,.5,.5,"#c6ad72");
          }
        }
      }
      const window=(bottom:number,top:number,x:number,side=false)=>{
        if(z<bottom||z>=top)return;
        const height=top-bottom,t=z-bottom,span=t<height-2?2.5:Math.sqrt(Math.max(0,6.25-(t-height+2)**2));
        if(span<.3)return;
        const face=(u:number,w:number,col:string)=>side?r(-rx-.5,x+u,.5,w,col):r(x+u,ry,w,.5,col);
        face(-span-.5,span*2+1,"#796a59");
        if(t>=1&&t<height-1){
          face(-span+.5,Math.max(.5,span*2-1),t>height*.65?"#879b99":"#d5bc82");
          face(-.25,.5,"#706959");
          if(t>=height*.46&&t<height*.46+.5)face(-span+.5,span*2-1,"#756c59");
        }
        if(t<1)face(-3,6,"#d9ccaa");
      };
      window(31,42,0);window(49,59,1);
      window(27,36,-1,true);window(46,54,0,true);
      // Continuous eave support and a narrow warm timber cornice.
      if(z>=61.5){section(rx+.5,ry+.5,"#675c55","#82735d","#a18d6a");}
    }
    if(z>=64&&z<85){
      const t=(z-64)/21;
      // Both dimensions shrink to form a proper conical/hipped slate cap,
      // with a single overhanging eave instead of a rectangular roof block.
      const rx=14*(1-t)+.5,ry=9*(1-t)+.5;
      section(rx,ry,cap[0],cap[1],cap[2]);
      if(z<65){r(-rx+3,ry-.5,rx*2-6,.5,cap[0]);}
      // Sparse tile ends follow the exposed front, staggered by slate course.
      const course=Math.floor((z-65)/3),within=(z-65)%3;
      if(z>=65&&within<.5&&rx>3){
        for(let x=-rx+2+(course%2);x<rx-2;x+=5)r(x,ry-.5,1.5,.5,cap[0]);
      }
    }
    if(z>=85){r(-.75,-.75,1.5,1.5,z<86?cap[0]:"#a8956c");}
  }};
}
