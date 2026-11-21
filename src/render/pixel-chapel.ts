import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Half-world-unit stone chapel with an attached left bellcote and cross.
 * Graphic facade materials occupy six native XY pixels, not thin veneers. */
export function chapelModel(variant:number):PixelStackModel {
  return {id:`landmark:chapel:stone:${Math.abs(variant)%2}`,width:70,depth:30,count:95,
    groundShadow:{rx:14,ry:1,dx:0,dy:0},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    const stone="#b9b69f",light="#d3c9ab",shade="#87958f",joint="#9ba391";
    const front=(x:number,w:number,col:string)=>r(x,6.5,w,3,col);
    if(z<4){
      const depth=z<1.5?3.5:5;
      r(-29,-depth,58,depth*2,z<1.5?"#74847c":"#a7ae97");
      r(-27,depth-1,54,1,"#c1c0a3");
      if(z>=1.5)r(0,5,10,2,"#b4bba0");
    }
    if(z>=4&&z<45){
      r(-22,-9,50,18,stone);r(-22,-9,2,18,shade);r(26,-9,2,18,light);
      // Buttresses meet both footing and wall. Their caps taper into the
      // corners rather than becoming separate floating blocks.
      const buttress=z<31?3:Math.max(1,3-(z-31)*.15);
      for(const x of [-23,25]){r(x,-9,buttress,19,shade);r(x+.5,7.5,Math.max(.5,buttress-.5),2.5,light);}
      if((z-4)%10<.5){front(-18,4,joint);front(18,4,joint);}
      if((z-4)%10<3)front(Math.floor((z-4)/10)%2?-10:16,.5,joint);
      // Dressed doorway surround is distinct from the rubble wall. Broad
      // jamb blocks and arch voussoirs occupy the same thick facade slab.
      if(z>=5&&z<30){
        const arch=z<23?7:Math.sqrt(Math.max(0,49-(z-23)**2));
        if(arch>.5){front(5-arch,arch*2,"#cec6aa");
          if(z<22){front(-2,1,"#a4ad97");front(11,1,"#ded3b2");}
          if(z<23&&(z-5)%6<.5){front(-2,2,"#9ba58f");front(10,2,"#9ba58f");}
          if(z>=26&&z<29)front(4.5,1,"#e0d2af");
        }
      }
      // Recessed arched timber door with full-depth jamb, boards and fittings.
      if(z<30){
        const half=z<23?5:Math.sqrt(Math.max(0,25-(z-23)**2));
        if(half>.25){
          front(5-half-1,half*2+2,"#819187");front(5-half,half*2,"#4d5650");
          if(z>=6&&z<26){front(5-half+.75,Math.max(.5,half*2-1.5),"#7a7058");front(4.75,.5,"#4d5650");}
          if(z>=13&&z<14||z>=20&&z<21)front(5-half+.75,Math.max(.5,half*2-1.5),"#5a604f");
          if(z>=15&&z<16)front(7,.75,"#cab47a");
        }
      }
      // Two lancet windows on the exposed side wall.
      for(const cy of [-5,4])if(z>=18&&z<34){
        const t=z-18,half=t<12?2.5:Math.sqrt(Math.max(0,6.25-(t-12)**2));
        if(half>.2){
          r(-24,cy-half-.5,3,half*2+1,"#657b77");
          if(t>=1&&t<14){r(-24,cy-half+.5,3,Math.max(.5,half*2-1),"#b3b58f");r(-24,cy-.25,3,.5,"#6b7b6d");}
        }
      }
      if(z>=43){r(-24,-10,54,20,"#737d77");r(-23,8,52,2,"#b7b69d");}
      for(const [sx,sz,len] of [[-16,12,5],[17,17,5],[-13,28,4],[15,35,5],[-17,37,3]]){
        if(z>=sz!&&z<sz!+.5)front(sx!,len!,"#a4aa94");
        if(z>=sz!&&z<sz!+2)front(sx!+len!,.5,"#a4aa94");
      }
    }
    // True pitched shell leaves a plaster gable below the slate roof.
    if(z>=45&&z<67){
      const half=Math.max(1,28-(z-45)*1.25),center=4;
      if(half>2){r(center-half+2,-9,half*2-4,18,stone);front(center-half+2,half*2-4,stone);}
      r(center-half,-11,2,22,"#44556b");r(center+half-2,-11,2,22,"#6c8190");
      // Fixed front/back fascia follows the pitched contour.
      r(center-half,9,2,2,"#677886");r(center+half-2,9,2,2,"#94a1a2");
      // Both exposed slopes carry staggered slate courses. All tile colors
      // span the full slab/riser width; narrow inset overlays cause bars.
      const course=Math.floor((z-45)/4),phase=(z-45)%4;
      for(let col=0;col<5;col++){
        const yy=-11+col*4.5+(course%2?2:0),length=Math.min(4.5,11-yy);
        if(length<=0)continue;
        const accent=(col+course)%3===0;
        r(center-half,yy,2,length,accent?"#4b6075":"#44556b");
        r(center+half-2,yy,2,length,accent?"#778b98":"#6c8190");
        if(phase<1&&length>1.5){
          r(center-half,yy+.5,2,length-1,"#3e5167");
          r(center+half-2,yy+.5,2,length-1,"#5c7383");
        }
        r(center-half,yy,2,.5,"#3e5167");r(center+half-2,yy,2,.5,"#5f7686");
      }
      // Substantial end fascia and a raised ridge end the roof construction.
      r(center-half,9,2,2,"#667987");r(center+half-2,9,2,2,"#96a6a7");
      if(z<46){r(center-half,-11,2,22,"#354d60");r(center+half-2,-11,2,22,"#566f7e");}
      if(z>=64.5)r(center-1,-11,2,22,"#a4b0ad");
    }
    // Rose window spans wall and gable. Ring/glass/tracery share one opaque
    // slab, so rotated fine slices cannot reveal barred-window artifacts.
    const rose=z-42;
    if(Math.abs(rose)<6.5){
      const span=Math.sqrt(6.5**2-rose*rose);front(5-span,span*2,"#75877e");
      if(Math.abs(rose)<5.3){
        const pane=Math.sqrt(5.3**2-rose*rose);front(5-pane,pane*2,"#d4bd85");
        front(4.75,.5,"#7b806a");
        if(Math.abs(rose)<.5)front(5-pane,pane*2,"#7b806a");
        for(const sign of [-1,1]){const xx=5+sign*rose;if(Math.abs(xx-5)<pane)front(xx-.25,.5,"#929072");}
      }
    }
    // Bellcote is attached to the left nave wall, not an unrelated tall prop.
    if(z>=4&&z<73){
      r(-27,-7,13,12,"#a3ad99");r(-27,-7,2,12,"#7d918a");r(-16,-7,2,12,"#c6c4a7");
      for(const [sz,sx] of [[13,-24],[25,-20],[37,-25],[48,-20]]){
        if(z>=sz!&&z<sz!+.5)r(sx!,2,3,3,"#8f9f8f");
        if(z>=sz!&&z<sz!+2)r(sx!+3,2,.5,3,"#8f9f8f");
      }
      if(z>=57&&z<70){
        const half=z<66?3:Math.sqrt(Math.max(0,9-(z-66)**2));
        if(half>.25){
          r(-20.5-half,2,half*2,3,"#465e5e");
          if(z<65){const bell=z<59?2.7:z<63?2:1;r(-20.5-bell,2,bell*2,3,"#b39c65");}
        }
      }
      if(z>=70){r(-28,-8,15,14,"#85978d");r(-27,4,13,2,"#b6b9a0");}
    }
    if(z>=73&&z<89){
      const rx=8*(1-(z-73)/16)+.5,ry=7*(1-(z-73)/16)+.5;
      r(-20.5-rx,-2-ry,rx,ry*2,"#3f5167");r(-20.5,-2-ry,rx,ry*2,"#6e8390");
    }
    // Small metal cross retains the original chapel identity.
    if(z>=88){r(-21,-3,1,2,"#b19d70");if(z>=91&&z<92)r(-24,-3,7,2,"#b19d70");}
  }};
}
