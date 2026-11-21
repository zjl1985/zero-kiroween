import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Compact seasonal market counter, half-unit geometry for fineModel. */
export function marketStallModel(variant:number):PixelStackModel {
  const v=Math.abs(variant)%2,cloth=v?"#78998d":"#ac7472",cream="#d0bb91";
  return {id:`landmark:stall:seasonal:${v}`,width:46,depth:24,count:44,
    groundShadow:{rx:18,ry:3,dx:.5,dy:.5},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    // Four square feet join the counter to its tall canopy posts. The shallow
    // footprint keeps the actual rotated base inside the registered b10.
    for(const x of [-16,14.5])for(const y of [-3.5,2]){
      if(z<2)r(x-.5,y-.5,2,2,"#63564b");
      if(z<37){r(x,y,1.5,1.5,"#755542");r(x+.5,y+1,1,.5,"#b08a5e");}
    }
    // Joined timber counter: visible legs below, solid plank front above.
    if(z>=8&&z<17){
      r(-16,-3.5,32,7,"#826248");r(-16,2,32,1.5,"#a17b53");
      for(const x of [-10,-3,4,11])r(x,1.5,.5,2,"#775a46");
      if(z<9||z>=15.5)r(-16,1.5,32,2,"#bd9667");
    }
    if(z>=16&&z<18){
      r(-18,-5,36,10,z<17?"#5e5045":"#b18c5c");
      r(-17,4,34,1,"#d0af77");
      for(const x of [-8,2,11])r(x,-4,.5,8,"#94774f");
    }
    // Knee braces connect the upper posts to the transverse canopy beam.
    if(z>=30&&z<36){
      const t=z-30;
      r(-15+t*.7,2,1.5,1.5,"#947049");
      r(14-t*.7,2,1.5,1.5,"#947049");
    }
    if(z>=35&&z<37){r(-17,-4,34,1.5,"#705440");r(-17,2,34,1.5,"#a37e54");}
    // Goods sit on the slab: ribbed miniature pumpkins, lidded jars/lanterns,
    // and a low rack of folded black paper bats. All retain negative space
    // between their top and the awning rather than filling the stall opening.
    if(z>=18&&z<25){
      for(const [x,center,radius] of [[-11,20.5,3],[-5,20,2.5]]){
        const dz=z-center!,reach=Math.sqrt(Math.max(0,radius!**2-dz*dz));
        if(reach>.25){
          r(x!-reach,-1.5,reach*2,3,"#a56740");
          r(x!-.5,-1.5,Math.max(.5,reach),3,"#ca9556");
          r(x!+reach-.5,-1.5,.5,3,"#b67a43");
        }
        if(z>=center!+radius!-.5&&z<center!+radius!+.5)r(x!,-.5,.5,1,"#73814d");
      }
      const jarX=v?3:4;
      if(z<23.5){
        r(jarX-2,-2,4,4,z<19?"#7b7c65":"#b3ad7a");
        r(jarX-1,-2,1,4,"#d5c591");
        if(z>=21&&z<21.5)r(jarX-2,1,4,1,"#8b8765");
      }else r(jarX-2.5,-2,5,4,"#687a70");
      if(z<20)r(9,-2,6,3,"#9c7b54");
      if(z>=20&&z<24){
        const half=z<21?2:z<22?3:2.5;
        r(12-half,-1,half*2,1.5,"#4f4a56");r(11.5,-1,.5,1.5,"#746470");
        if(z>=22){r(9,-1,1,1.5,"#4f4a56");r(14,-1,1,1.5,"#4f4a56");}
      }
    }
    // Canvas rises toward the rear. Each stripe occupies the complete slab
    // depth and exposed riser, so rotation cannot turn fabric into dotted lines.
    if(z>=35&&z<43){
      const yy=7-(z-35)*1.75;
      for(let i=0;i<8;i++)r(-20+i*5,yy,5,2.5,i%2?cream:cloth);
      r(-20,yy,1,2.5,v?"#587a73":"#865c60");
      r(19,yy,1,2.5,v?"#587a73":"#865c60");
    }
    // Short scalloped valance is part of the low front edge, not a repeated
    // outline on every canopy section.
    if(z>=32.5&&z<35.5){
      for(let i=0;i<8;i++){
        const inset=z<33.5?1:0;
        r(-20+i*5+inset,6,5-inset*2,2,i%2?cream:cloth);
      }
    }
    if(z>=42){r(-20,-6,40,1.5,"#b2a684");}
  }};
}
