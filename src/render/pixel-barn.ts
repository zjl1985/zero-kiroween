import type { PixelStackModel } from "./pixel-stack.js";
/** Board-built barn with an open loft, braced doors and a continuous roof shell. */
export function barnModel(): PixelStackModel {
  return {id:"scene:barn:loft",width:60,depth:48,count:48,paint(c,z){
    const r=(x:number,y:number,w:number,d:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));};
    const front=18;
    if(z<3){r(-22,-20,44,40,z<1?"#354538":"#858774");if(z<1.5)r(-11,18,22,5,"#9a9a7d");return;}
    if(z<27){
      r(-20,-18,40,36,"#784c45");r(-19,-17,38,35,"#a4654e");
      r(-20,-18,1,36,"#754b49");r(-20,17,40,1,"#b77a59");
      for(let x=-18;x<20;x+=4)r(x,17.5,.5,.5,"#7d5147");
      for(let y=-17;y<18;y+=4)r(-20,y,.5,.5,"#5e4545");
      for(const x of [-20,18.5])for(const y of [-18,16.5])r(x,y,1.5,1.5,"#d0b993");
      if(z<5||z>=24){r(-20,17,40,1,"#d0b993");r(-20,-18,1,36,"#b4a086");}
      // Recessed double doors with a pale outer frame and diagonally braced boards.
      if(z<23){
        r(-11,16,22,2,"#4a383a");r(-10,17,20,1,"#724c42");
        for(const x of [-11,-.5,10])r(x,17.5,1,.5,"#d6bb91");
        const t=(z-3)/19;
        for(const x of [-9+9*t,1+9*t])r(x,17.5,1,.5,"#baa27d");
        if(z<5||z>=21)r(-11,17,22,1,"#c6ad86");
        if(z>=12&&z<13){r(-2,18,1,.5,"#353a3e");r(1,18,1,.5,"#353a3e");}
      }
      // Side windows and horizontal girts give the long wall a readable scale.
      if(z>=12&&z<21)for(const y of [-10,5]){
        r(-20.5,y-3,1,6,"#d2bc94");
        if(z>=13&&z<20){r(-20.5,y-2,.5,4,"#405b5b");r(-20.5,y,.5,.5,"#b6a888");}
        if(z===16)r(-20.5,y-2,.5,4,"#b6a888");
      }
    }
    if(z>=27&&z<=44){
      const half=Math.max(1,23-(z-27)*1.3);
      if(half>3)r(-half+2,-18,half*2-3,36,"#965c4b");
      r(-half,-21,2,42,"#53666d");r(half-1,-21,2,42,"#364c56");
      r(-half,20,2,1,"#c1b49a");r(half-1,20,2,1,"#c1b49a");
      // Long metal roof seams; no repeated per-slice bevel or bright checker.
      for(let yy=-20;yy<20;yy+=7)r(-half,yy,.5,.5,"#738485");
      if(half>6){
        r(-.5,18,1,.5,"#c9b58e");
        if(z>=29&&z<37){r(-4,17,8,1.5,"#d4bf98");if(z>=30&&z<36)r(-3,18,6,.5,"#3e4648");}
      }
      if(z>=43)r(-1.5,-21,3,42,"#8a9790");
    }
    // Compact ridge ventilator, fully attached to the ridge.
    if(z>=44){r(-2,-5,4,7,"#a97a58");r(-2,-5,1,7,"#6f5750");if(z>=46)r(-3,-6,6,9,"#596b6b");}
  }};
}
