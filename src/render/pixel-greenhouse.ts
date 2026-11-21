import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Half-unit voxel greenhouse. Caller applies fineModel; flat opaque pane
 * colors carry the interior silhouettes, without compositing or gradients. */
export function greenhouseModel(variant:number):PixelStackModel {
  const v=Math.abs(variant)%3;
  const glass=[
    ["#4a7478","#7ca59b","#9db9a7"],
    ["#526f7d","#80a1a7","#adc1b5"],
    ["#526f69","#83a595","#aec0a4"],
  ][v]!;
  const frame="#b4b59a",darkFrame="#677d76",edge="#d2d0aa";
  return {id:`landmark:greenhouse:glazed:${v}`,width:90,depth:40,count:76,groundShadow:{rx:36,ry:8,dx:.5,dy:1},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    if(z<6){
      r(-39,-12,78,24,z<2?"#66716b":"#9b8971");
      r(-39,-12,1,24,"#706f61");r(-38,11,76,1,"#b4a084");
      if(z>=3&&z<3.5)r(-38,11,76,.5,"#807e6b");
      for(let x=-34;x<39;x+=9)r(x+(z<3?3:0),11,.5,1,"#7b7968");
      if(z<3){r(-6,12,12,4,"#9ca58e");r(-5.5,15.5,11,.5,"#b8bea0");}
    }
    if(z>=6&&z<49){
      // Solid glazing planes contain the projected interiors right at their
      // exposed surfaces; hidden inset artwork would disappear slice by slice.
      r(-38,-11,76,22,glass[0]);r(-37,-10,74,21,glass[1]);
      r(-38,-11,1,22,glass[0]);
      const interior=(x:number,base:number,top:number,tone:number)=>{
        if(z<base||z>top)return;
        if(z<base+3){r(x-2.5,10.5,5,.5,"#8c8d6c");return;}
        const h=(z-base-3)/(top-base-3),half=Math.max(1,4*Math.sin(h*Math.PI));
        r(x-half,10.5,half*2,.5,tone?"#67896e":"#567d6b");
        if(h>.35&&h<.85)r(x,10.5,1,.5,"#94a279");
      };
      // Shelves form two readable greenhouse benches; grouped plant forms
      // differ by bay, and are intentionally muted behind the glazing.
      for(const [x,b,t,tone] of [[-30,12,28,0],[-21,12,24,1],[-12,12,29,0],
        [12,12,26,1],[22,12,31,0],[31,12,25,1],[-27,31,42,1],[25,32,43,0]])interior(x!,b!,t!,tone!);
      if(z>=11&&z<12.5||z>=30&&z<31){r(-34,10.5,26,.5,"#6c8476");r(8,10.5,26,.5,"#6c8476");}
      // A side-plane shelf and foliage make the end glazing distinct too.
      if(z>=14&&z<29){r(-38,-7,.5,5,"#58796b");r(-38,3,.5,4,"#6d8b70");}
      if(z>=12&&z<13)r(-38,-9,.5,18,"#8a9a85");
      // Sparse elongated reflections sit beside the frames, not over plants.
      if(z>=35&&z<44){for(const x of [-32,-13,12,31])r(x,10.5,.5,.5,glass[2]);}
      if(z>=21&&z<29){r(-38,-8,.5,.5,glass[2]);r(-38,5,.5,.5,glass[2]);}
      // Corner posts, fixed mullions and transoms are solid continuous beams.
      for(const x of [-38,-19,-5,5,19,37]){r(x,-11,1,22,darkFrame);r(x,10.5,1,1,frame);}
      for(const yy of [-11,0,10]){r(-38,yy,1,1,frame);r(37,yy,1,1,frame);}
      if(z<7||z>=47||z>=29&&z<30){r(-38,10.5,76,1,frame);r(-38,-11,1,22,darkFrame);}
      // Central double glass door has jambs, threshold, lock rail and handles.
      if(z<41){
        r(-5,10.5,10,.5,z>35?glass[2]:"#73958b");
        r(-5,10,1,2,frame);r(4,10,1,2,frame);r(-.25,10.5,.5,1,frame);
        if(z<8||z>=39||z>=23&&z<24)r(-5,10.5,10,1,frame);
        if(z>=20&&z<23){r(-1.5,11,.5,.5,"#d2bc86");r(1,11,.5,.5,"#d2bc86");}
      }
    }
    // The ridge runs along X. Both long roof faces are sloped slabs meeting
    // above the gable ends; shell construction keeps end glazing exposed.
    if(z>=49&&z<74){
      const depth=Math.max(.5,13-(z-49)*.5);
      if(depth>1){
        r(-37,-depth+1,74,depth*2-2,glass[1]);
        r(-38,-depth,1,depth*2,glass[0]);r(37,-depth,1,depth*2,glass[2]);
      }
      // Two roof slabs reach the exterior contour: no inset color rims.
      r(-40,-depth,80,1.5,glass[2]);r(-40,depth-1.5,80,1.5,glass[1]);
      // Structural rafters follow fixed bay boundaries up both slopes.
      for(const x of [-40,-19,0,19,39]){
        r(x,-depth,1,1.5,frame);r(x,depth-1.5,1,1.5,darkFrame);
      }
      // Single roof transom across each slope, rather than repeated stripes.
      if(z>=60&&z<61.5){
        // The beam occupies the complete sloped slab thickness, including
        // its exposed riser. A half-pixel outer edge alone becomes a broken
        // dotted line when adjacent rotated sections occlude that thin strip.
        r(-40,-depth,80,1.5,frame);
        r(-40,depth-1.5,80,1.5,darkFrame);
      }
      if(z<50){r(-40,-depth,80,1,darkFrame);r(-40,depth-1,80,1,darkFrame);}
      // Gable vertical framing remains visible behind the sloped edge bars.
      if(depth>2){r(-38,-.5,1,1,frame);r(37,-.5,1,1,frame);}
    }
    if(z>=73){r(-40,-.75,80,1.5,z<74?darkFrame:edge);}
  }};
}
