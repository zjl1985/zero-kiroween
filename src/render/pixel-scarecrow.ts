import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Patched coat, sack face and straw hat on joined grounded timber. Half-unit
 * geometry for fineModel, with shared endpoint rounding on every material. */
export function scarecrowModel(variant:number,phase:string,burnt:boolean):PixelStackModel {
  const v=Math.abs(variant)%4,damaged=phase==="damaged",scraps=phase==="scraps";
  const coats=[
    ["#46566e","#687f94","#94a7b1"],["#624c6b","#8c6b8c","#b195a6"],
    ["#526349","#7f8e5c","#a9b07c"],["#704e44","#a57457","#c49a75"],
  ][v]!;
  const cloth=burnt?["#303b3c","#515c54","#7e8070"] as const:coats;
  const postDark=burnt?"#293438":"#3f4347",postFace=burnt?"#58605a":"#8b7154",postEdge=burnt?"#8b8a78":"#c0a171";
  const straw=burnt?"#7f8170":"#cdb777",sack=burnt?"#808171":"#d2bd8b",seam=burnt?"#adb09b":"#e1d0a6";
  return {id:`prop:scarecrow:joined:${v}:${phase}:${burnt?1:0}`,
    width:34,depth:14,count:scraps?7:40,
    groundShadow:{rx:scraps?8:3.5,ry:1,dx:0,dy:0},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,h:number,col:string)=>{
      const left=Math.round(x*2),top=Math.round(y*2);
      c.fillStyle=col;c.fillRect(left,top,Math.max(1,Math.round((x+w)*2)-left),Math.max(1,Math.round((y+h)*2)-top));
    };
    const oval=(cx:number,cy:number,rx:number,ry:number,col:string)=>{
      for(let row=Math.ceil(-ry*2);row<=Math.floor(ry*2);row++){
        const yy=row/2,reach=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(reach>.2)r(cx-reach,cy+yy,reach*2,.5,col);
      }
    };
    // Dark side and pale edge remain visible on brown farm soil all the way
    // from the footprint to the shoulders; the support cannot camouflage away.
    if(z<(scraps?6:32)){
      r(-1.5,-1.5,3,3,postFace);r(-1.5,-1.5,1,3,postDark);r(.5,-1.5,1,3,postEdge);
      if(z<1){r(-2,-1.5,4,3,postDark);r(-.5,-1.5,1.5,3,postFace);}
      if(scraps&&z>=5)r(-1.5,-1.5,3,3,postEdge);
    }
    if(scraps){
      // The same hat, coat and crossbar collapse around the remaining post.
      if(z<2){r(-9,-1,6,3,cloth[1]);r(-8,-.5,4,2,cloth[2]);r(-6,0,1,1,seam);}
      if(z<1.5){r(3,-2,7,1.5,postFace);r(4,-1.5,6,1,postEdge);}
      if(z<3){oval(6,1,4.5,2,z<1?straw:burnt?cloth[1]:"#ac8a4f");if(z>1)oval(6,1,2,1.5,straw);}
      if(z<1){r(-4,2,2,1,straw);r(0,2,3,1,straw);if(burnt)r(-7,-2,3,1,"#939582");}
      return;
    }
    // A single continuous crossbar joins the post behind both sleeves.
    if(z>=21&&z<23){r(-13,-1.5,26,3,postDark);r(-13,-.5,26,2,postFace);}
    if(z>=8&&z<26){
      const half=z<20?6.5-(z-8)*.05:5.9;
      // Coat hem is split by local tears only in the damaged state.
      if(damaged&&z<11){r(-half,-2,half+1,4,cloth[1]);r(3,-2,half-3,4,cloth[1]);}
      else r(-half,-2,half*2,4,cloth[1]);
      r(-half,-2,1.5,4,cloth[0]);r(half-1.5,-2,1.5,4,cloth[2]);
      // Lapel, centre seam, patch and buttons cover the full exposed 3px-deep
      // graphic slab instead of leaving thin overlays for rotation to drop.
      if(z>=12&&z<24)r(-.25,-.5,.5,3,cloth[0]);
      if(z>=15&&z<20){r(2,-.5,3,3,burnt?"#767c69":"#b29a70");
        if(z<16||z>=19)r(2,-.5,3,3,seam);else{r(2,-.5,.5,3,seam);r(4.5,-.5,.5,3,seam);}}
      if(z>=13&&z<13.5||z>=18&&z<18.5||z>=22&&z<22.5)r(.5,-.5,.5,3,seam);
      if(z>=23){r(-4,-.5,2,3,cloth[2]);r(2,-.5,2,3,cloth[2]);}
    }
    // Sleeves taper down to the shared crossbar, then pale cuff straw emerges.
    if(z>=20&&z<25){
      for(const side of [-1,1]){
        const outer=damaged&&side<0?10:12;
        r(side<0?-outer:5,-1.5,outer-5,3.5,cloth[1]);
        r(side<0?-outer:outer-1.5,-1.5,1.5,3.5,cloth[2]);
      }
    }
    for(const side of [-1,1]){
      if(z>=21&&z<23.5){r(side<0?-14.5:12,-1,2.5,2,straw);if(z>=22)r(side<0?-15:13,0,2,1,straw);}
      if(z>=7&&z<9.5)r(side<0?-5:3,0,1.5,2,straw);
    }
    // Sack head has a shaped silhouette and full-depth stitched facial marks.
    if(z>=25&&z<34){
      const dz=(z-29.5)/4.5,rx=4.5*Math.sqrt(Math.max(0,1-dz*dz));
      if(rx>.3){oval(0,0,rx,2.5,sack);
        if(z>=29.5&&z<30.5){r(-2.5,-.5,1.5,3,postDark);r(1,-.5,1.5,3,postDark);}
        if(z>=27&&z<27.5)r(-2,-.5,4,3,postDark);
        if(z>=26.5&&z<28)for(const x of [-1.5,0,1.5])r(x,-.5,.5,3,postDark);
        if(damaged&&z>=28&&z<29)r(3,-.5,1,3,cloth[0]);
      }
    }
    // Wide straw brim and tilted tapered crown, with one dark red hat band.
    if(z>=32&&z<34){oval(0,-.5,8,3.5,burnt?cloth[1]:"#aa854c");
      if(damaged)r(5.5,0,1.5,1,postDark);}
    if(z>=34){
      const rx=Math.max(1.5,4-(z-34)*.4),cx=(z-34)*.15;
      oval(cx,-.5,rx,2.5,burnt?cloth[1]:"#bfa162");
      if(z<35)r(cx-rx,-2,rx*2,4,burnt?postDark:"#855345");
      if(z>=38)r(cx-1,-1.5,2,2,burnt?cloth[2]:"#d2b77a");
    }
  }};
}
