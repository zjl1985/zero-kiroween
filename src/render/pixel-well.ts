import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Working well assembled from half-unit horizontal slices for fineModel. */
export function wellModel(variant:number):PixelStackModel {
  return {id:`landmark:well:winch:${Math.abs(variant)%2}`,width:34,depth:24,count:51,
    groundShadow:{rx:12,ry:3.5,dx:.5,dy:.5},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,h:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(h*2)));
    };
    // Each ring slice is actually hollow. Row spans leave the shaft empty;
    // inner surfaces are dark material, not an opaque black disc over a tube.
    const ring=(rx:number,ry:number,holeX:number,holeY:number,coping=false)=>{
      for(let row=Math.ceil(-ry*2);row<=Math.floor(ry*2);row++){
        const yy=row/2,outer=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(outer<.25)continue;
        const inner=Math.abs(yy)<holeY?holeX*Math.sqrt(1-(yy/holeY)**2):0;
        const color=yy<0?(coping?"#8f9f94":"#73877f"):(coping?"#c0c2a6":"#a0ad99");
        if(inner>0){
          r(-outer,yy,Math.max(.5,outer-inner),.5,color);r(inner,yy,Math.max(.5,outer-inner),.5,color);
          // Interior side walls have real material width. Single-pixel
          // slivers here alias into a row of spikes after slice rotation.
          if(!coping){
            const wall=Math.min(2,outer-inner);
            r(-inner-wall,yy,wall,.5,"#526e67");
            r(inner,yy,wall,.5,"#617a6e");
          }
        }else r(-outer,yy,outer*2,.5,color);
      }
    };
    if(z<2)ring(12,5,6,2.5);
    // The shaft bottom sits below the rim and shows through it, with a small
    // desaturated water value rather than a glow or an external water patch.
    if(z<1){r(-6,-2,12,4,"#314f53");r(-3,-1,5,1,"#577777");}
    if(z>=2&&z<17){
      // A recessed cavity floor is several units below the coping. A solid
      // dark span fills its entire projected surface rather than outlining
      // it with thin strips, leaving continuous readable depth behind bucket.
      if(z>=10&&z<12.5){
        for(let row=-6;row<=6;row++){
          const yy=row/2,span=7.5*Math.sqrt(Math.max(0,1-(yy/3.5)**2));
          r(-span,yy,span*2,.5,"#345650");
        }
      }
      const coping=z>=14.5;
      ring(coping?12:11,coping?5.5:5,coping?7.5:7,coping?3:2.8,coping);
      // Sparse staggered joints run through complete front stone segments.
      const course=Math.floor((z-2)/4),phase=(z-2)%4;
      if(phase<.5&&!coping){r(-7,3.5,4,1,"#879b8c");r(2,3.5,4,1,"#879b8c");}
      for(const x of (course%2?[-7,1,7]:[-4,4])){
        if(Math.abs(x)<8)r(x,4,.5,.5,coping?"#8c9b8a":"#71897c");
      }
      if(coping){r(-1,4,.5,1,"#879886");r(-10,-1,.5,1,"#71877b");}
    }
    // Posts enter the masonry at both sides and carry the roof and spindle.
    for(const x of [-10,8.5]){
      if(z>=6&&z<40){r(x,-1.5,1.5,3,"#795e48");r(x+.5,0,1,1.5,"#b18e61");}
      if(z>=34&&z<40){const dx=(z-34)*.6;r(x<0?x+dx:x-dx,-1,1.5,2,"#9b7a53");}
    }
    // Axle across the posts, thick spool in its centre, and a joined crank.
    if(z>=27&&z<29){r(-11,-1,22,2,"#aa8c62");r(-11,.5,22,.5,"#d0b486");}
    if(z>=25.5&&z<30.5){
      const rr=Math.sqrt(Math.max(0,6.25-(z-28)**2));
      if(rr>.2){r(-3,-rr,6,rr*2,"#a28b62");r(-3,-rr,1,rr*2,"#6c6550");r(2,-rr,1,rr*2,"#6c6550");}
    }
    if(z>=24&&z<29){r(11,-.5,1,1,"#736a54");if(z<25)r(11,-.5,3,1,"#b69a6e");}
    // Rope touches the spool, handle and bucket. The bucket is above the
    // dark shaft, inside the rim, with a real open top and metal hoops.
    if(z>=23&&z<27.5)r(-.25,1,1,1.5,"#c5b184");
    if(z>=17&&z<23){
      const width=2+(z-17)*.12;
      r(-width,0,width*2,3,z>=22?"#526969":"#8d8e70");
      r(-width,0,1,3,"#65746b");r(width-1,0,1,3,"#beb38b");
      if(z<18||z>=21&&z<21.5)r(-width,1,width*2,2,"#647575");
      if(z>=22){r(-width+.75,.5,width*2-1.5,2,"#3d5558");}
    }
    if(z>=22&&z<25){r(-2,.5,1,2,"#a3a78a");r(1,.5,1,2,"#a3a78a");if(z>=24)r(-2,.5,4,2,"#a3a78a");}
    // A true gabled roof shell; fixed end rafters join the ridge to the posts.
    if(z>=39&&z<50){
      const ry=Math.max(.75,7-(z-39)*.6);
      r(-15,-ry,30,1.5,"#596f80");r(-15,ry-1.5,30,1.5,"#789093");
      for(const x of [-15,14]){r(x,-ry,1,ry*2,"#465b6b");}
      if(z<40){r(-15,ry-1.5,30,1.5,"#425866");r(-15,-ry,30,1.5,"#425866");}
      if(z>=44&&z<45){r(-15,-ry,30,1.5,"#516779");r(-15,ry-1.5,30,1.5,"#6f858c");}
    }
    if(z>=49)r(-15,-.75,30,1.5,"#9babaa");
  }};
}
