import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** A small string-puppet theatre, built in half-world-unit slices. */
export function theatreModel(variant:number):PixelStackModel {
  return {id:`landmark:theatre:puppets:${Math.abs(variant)%2}`,width:82,depth:30,count:79,
    groundShadow:{rx:10,ry:.5,dx:0,dy:0},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    const gold="#c3a56e",goldLight="#e0c591",goldDark="#8d7055",wood="#725448";
    if(z<7){
      const width=z<2?33:z<5?35:37,depth=z<2?2.5:z<5?4:5;
      r(-width,-depth,width*2,depth*2,z<2?"#51494a":wood);
      r(-width,depth-1,width*2,1,z<5?"#987451":"#c09a6b");
      if(z>=5){
        r(-37,-5,74,10,"#a4825d");
        for(const x of [-29,-19,-8,4,16,28])r(x,-5,.5,10,"#85674f");
        r(-36,4,72,1,"#c3a775");
      }
    }
    // Stage backdrop is a solid thick plane with the illustration extending
    // through the same XY slab. It cannot alias into uncovered veneer stripes.
    if(z>=7&&z<69){
      r(-31,-5,62,3,"#3b4d63");
      if(z<31){
        for(const [center,width,peak,col] of [[-20,16,29,"#566c7b"],[5,20,36,"#4c6377"],[23,12,25,"#627c82"]] as const){
          const half=width*(1-(z-7)/(peak-7));
          if(half>0)r(center-half,-5,half*2,3,col);
        }
      }
      const moonZ=z-48;
      if(Math.abs(moonZ)<6){
        const half=Math.sqrt(36-moonZ*moonZ);r(-13-half,-5,half*2,3,"#c7caa5");
        // The overlaid sky crescent cut-out also covers the full slab.
        const cut=z-50;if(Math.abs(cut)<5.5){const w=Math.sqrt(30.25-cut*cut);r(-10-w,-5,w*2,3,"#3b4d63");}
      }
    }
    // Joined proscenium posts and pilasters carry the curved opening overhead.
    if(z>=7&&z<65){
      for(const side of [-1,1]){
        const x=side<0?-36:30;
        r(x,-4,6,10,"#895d52");r(x+1,-1,4,7,goldDark);r(x+2,1,2,5,gold);
        if(z<11||z>=60){r(x-1,0,8,6,gold);r(x,4.5,6,1.5,goldLight);}
      }
      // Gathered curtains open at mid-height and widen near the valance.
      // Four broad folded volumes describe fabric; no z-periodic banding.
      const opening=20-Math.max(0,z-39)*.22+Math.max(0,19-z)*.1;
      for(const side of [-1,1]){
        const x=side<0?-30:opening,w=30-opening;
        r(x,-1,w,5,"#713c51");
        r(x+(side<0?1:Math.max(0,w-4)),-1,3,5,"#a35c6c");
        if(w>5)r(x+(side<0?w-3:1),-1,2,5,"#bc7c7f");
        if(z>=29&&z<31){r(x,1,w,3,gold);r(side<0?x+w-1:x-1,1,2,3,"#ddbd7e");}
      }
    }
    // Curved arch grows inward over the stage opening, held by both posts.
    if(z>=55&&z<69){
      const t=(z-55)/14,inner=29*Math.sqrt(Math.max(0,1-t*t));
      r(-36,-3,36-inner,9,goldDark);r(inner,-3,36-inner,9,goldDark);
      r(-36,3,36-inner,3,gold);r(inner,3,36-inner,3,gold);
      if(inner>2){r(-inner-1,1,1,5,goldLight);r(inner,1,1,5,goldLight);}
    }
    if(z>=68&&z<77){
      const half=37-(z-68)*2.6;
      r(-half,-4,half*2,10,"#735363");
      r(-half,2,half*2,4,goldDark);
      r(-half,4.5,half*2,1.5,gold);
      // Central inset medallion uses solid material through its full front.
      if(z>=70&&z<75){const span=Math.sqrt(Math.max(0,9-(z-72.5)**2));if(span>.2)r(-span,3,span*2,3,"#bd9574");}
    }
    if(z>=77){r(-4,-2,8,6,gold);r(-2,1,4,3,goldLight);}
    // Footlights are small solid brass cups and cream inserts, without glow.
    if(z>=7&&z<10)for(const x of [-25,-12,0,12,25]){
      r(x-1.5,3,3,2,z<8?goldDark:"#d9bd82");if(z>=9)r(x-.75,3.5,1.5,1,"#e5d5a7");
    }
    // Two miniature puppets hang on visible paired strings. Their warm wood
    // and dark paper silhouettes are stage ornaments, not playable cats.
    if(z>=38&&z<60){r(-10.5,-.5,.75,2,"#9caa98");r(-4.5,-.5,.75,2,"#9caa98");}
    if(z>=20&&z<39){
      const x=-8;
      if(z<24){r(x-3,-1,2,3,"#a18a6a");r(x+1,-1,2,3,"#a18a6a");}
      else if(z<31){r(x-3,-1,6,3,"#c3ad7b");if(z>=28)r(x-5,-1,10,3,"#b59d72");}
      else {const w=z<36?4:3;r(x-w,-1,w*2,3,"#d1bb88");
        if(z>=36){r(x-4,-1,2,3,"#d1bb88");r(x+2,-1,2,3,"#d1bb88");}
        if(z>=33&&z<34){r(x-2.5,-1,1,3,"#62574b");r(x+1.5,-1,1,3,"#62574b");}
      }
    }
    if(z>=40&&z<60){r(12,-.5,.75,2,"#9caa98");}
    if(z>=30&&z<42){
      // Raised outer wing tips and three descending membrane scallops give
      // the bat its silhouette; a tapered diamond cannot read as a wing.
      for(let xx=-8;xx<=8;xx+=.5){
        const ax=Math.abs(xx),top=36+ax*.65;
        const bottom=ax>7?38:ax>5.5?34.5:ax>4?35.5:ax>2.5?32.5:31;
        if(z>=bottom&&z<top)r(12+xx,-1,.5,3,"#63566d");
        // Two broad finger bones follow the wing sweep, not slice outlines.
        if(ax>2&&ax<7&&Math.abs(z-(36+ax*.45))<.5)r(12+xx,-1,.5,3,"#8d7890");
      }
      if(z>=30&&z<39.5)r(10.5,-1,3,3,"#9b8394");
      if(z>=36&&z<40)r(10,-1,4,3,"#ad91a1");
      if(z>=39&&z<41.5){r(9.5,-1,1.5,3,"#ad91a1");r(13,-1,1.5,3,"#ad91a1");}
      if(z>=37&&z<37.5){r(10.5,-1,.5,3,"#d4c6ad");r(13,-1,.5,3,"#d4c6ad");}
    }
  }};
}
