import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Clocktower sections at half-world precision. The hands remain stopped just
 * before midnight; all framing and dial marks sit on the exposed front plane. */
export function clockTowerModel(variant:number):PixelStackModel {
  return {id:`landmark:clock-tower:masonry:${Math.abs(variant)%3}`,width:44,depth:26,count:122,
    groundShadow:{rx:16,ry:5,dx:.5,dy:1},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    const stone=(rx:number,ry:number,front:string)=>{
      r(-rx,-ry,rx*2,ry*2,front);r(-rx,-ry,2,ry*2,"#7c8b8a");
      r(rx-1,-ry,1,ry*2,"#c4c4a9");
    };
    if(z<5){
      const rx=z<2?16:z<4?15:14,ry=z<2?6:z<4?5.5:5;
      stone(rx,ry,z<2?"#8c9990":"#aeb4a0");
      if(z<2){r(-5,5,10,2,"#a3ae99");r(-4.5,6.5,9,.5,"#c4c7ac");}
      for(const x of [-11,-1,10])r(x,ry-.5,.5,.5,"#778881");
    }
    if(z>=5&&z<84){
      stone(13,6.5,"#b1b8a3");
      // Quoins remain vertical structural corners, with infrequent staggered
      // joints; the wall is not outlined once per stacked horizontal slice.
      for(const x of [-13,10.5]){
        r(x,5.5,2.5,1,"#d0ceb0");
        if((z-5)%9<.5)r(x,6,2,.5,"#99a58f");
      }
      if(z>=30&&z<31.5||z>=57&&z<59){stone(14,7,"#9ca99b");r(-13,6.5,26,.5,"#c7c8ab");}
      // Dark arch opening, thick jambs, and a solid timber door set behind it.
      if(z<27){
        const span=z<21?4:Math.sqrt(Math.max(0,16-(z-21)**2));
        if(span>.3){
          r(-span-.75,6,span*2+1.5,1,"#73857f");r(-span,6.5,span*2,.5,"#3f5557");
          if(z>=7&&z<23){r(-span+.5,6.5,Math.max(.5,span*2-1),.5,"#687768");r(-.25,6.5,.5,.5,"#3d5351");}
          if(z>=13&&z<14)r(2,6.5,.5,.5,"#cbb675");
        }
      }
      const window=(x:number,bottom:number,top:number,side=false)=>{
        if(z<bottom||z>=top)return;
        const t=z-bottom,h=top-bottom,span=t<h-2.5?2.5:Math.sqrt(Math.max(0,6.25-(t-h+2.5)**2));
        if(span<.25)return;
        const face=(u:number,w:number,col:string)=>side?r(-13.5,x+u,.5,w,col):r(x+u,6.5,w,.5,col);
        face(-span-.5,span*2+1,"#6d807b");
        if(t>=1&&t<h-1){face(-span+.5,Math.max(.5,span*2-1),t>h*.65?"#8fa7a0":"#c9bd8d");face(-.25,.5,"#718176");}
        if(t<1)face(-3.5,7,"#d2ceb1");
        if(t>=h*.48&&t<h*.48+.5)face(-span+.5,span*2-1,"#718176");
      };
      window(-6,35,49);window(6,35,49);window(0,35,49,true);
      // Stone dial surround, brass ring and ivory face are horizontal spans
      // of one circle on the front, not a screen-space floating clock disc.
      // All dial layers occupy the SAME solid front slab, including the
      // exposed riser. Thin veneers at different depths let the dark backing
      // shine between rotated slices and turn the dial into vertical bars.
      const dial=(x:number,w:number,color:string)=>r(x,4.5,w,3,color);
      const dz=z-72,outer=9;
      if(Math.abs(dz)<outer){
        const span=Math.sqrt(outer*outer-dz*dz);dial(-span,span*2,"#687d7c");
        if(Math.abs(dz)<8.2){const brass=Math.sqrt(8.2**2-dz*dz);dial(-brass,brass*2,"#ad9a6f");}
        if(Math.abs(dz)<7.5){const face=Math.sqrt(7.5**2-dz*dz);dial(-face,face*2,"#ddd4ac");}
        for(let i=0;i<12;i++){
          const angle=i*Math.PI/6,xx=Math.sin(angle)*6.4,zz=72+Math.cos(angle)*6.4;
          if(Math.abs(z-zz)<(i%3===0?.65:.4))dial(Math.round(xx*2)/2-.25,.5,"#64736b");
        }
        // Match the original near-midnight pose: minute tip(-.75,+6.5),
        // hour tip(-2,+4) in author XY/height coordinates (up is +z).
        if(dz>=0&&dz<=6.5)dial(-dz*.75/6.5-.25,.5,"#394f54");
        if(dz>=0&&dz<=4)dial(-dz*.5-.4,.8,"#394f54");
        if(Math.abs(dz)<.75)dial(-.75,1.5,"#7e765c");
      }
      if(z>=82)stone(15,7.5,"#99a89d");
    }
    // Belfry: open front, back shadow and four actual load-bearing piers.
    if(z>=84&&z<101){
      r(-12,-5,24,1,"#536b6b");
      for(const x of [-13,10.5])for(const y of [-6,4.5]){
        r(x,y,2.5,2,"#a8b29f");r(x+.5,y+1.5,1.5,.5,"#d0cdb0");
      }
      if(z>=86&&z<97){
        const bellWidth=z<88?4.5:z<94?3:2;
        r(-bellWidth,-1.5,bellWidth*2,3,z<88?"#b4a06a":"#8c8864");
        r(0,-1.5,Math.max(.5,bellWidth),3,"#c3ad78");
        if(z<87)r(-4.5,1,9,.5,"#716f58");
      }
      if(z>=97){r(-13,-6,26,12,"#7c8d88");r(-12,5.5,24,.5,"#b1b69d");}
    }
    if(z>=101&&z<119){
      const t=(z-101)/18,rx=17*(1-t)+.75,ry=9*(1-t)+.5;
      r(-rx,-ry,rx,ry*2,"#34475d");r(0,-ry,rx,ry*2,"#61788a");
      if(z<102)r(-rx,ry-1,rx*2,1,"#405665");
      // One raised ridge joins the roof planes only near the tip.
      if(z>=117)r(-1,-ry,2,ry*2,"#8c9b9d");
    }
    if(z>=119){r(-.75,-.75,1.5,1.5,z<120?"#536c79":"#b6aa79");}
  }};
}
