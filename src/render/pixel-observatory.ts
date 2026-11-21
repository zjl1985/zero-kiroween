import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Observatory cross-sections at half-world-unit precision. Wrap with the
 * shared fineModel adapter; the foot stays at the caller's ground anchor. */
export function observatoryModel(variant:number):PixelStackModel {
  const v=Math.abs(variant)%3;
  const copper=[
    ["#30495d","#4e7786","#7c9d9e"],
    ["#384b64","#5f7f97","#91a8b0"],
    ["#36535a","#5b8687","#8aaba1"],
  ][v]!;
  return {id:`landmark:observatory:domed:${v}`,width:76,depth:48,count:97,groundShadow:{rx:24,ry:6,dx:.5,dy:1},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,col:string)=>{
      c.fillStyle=col;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    // A faceted drum is scanned rather than outlined. Front/side values run
    // to the exact contour so tapered sections never develop zebra edges.
    const drum=(rx:number,ry:number,left:string,front:string,right:string)=>{
      for(let iy=Math.ceil(-ry*2);iy<Math.ceil(ry*2);iy++){
        const yy=iy/2,reach=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(reach<.25)continue;
        r(-reach,yy,reach*.6,.5,left);r(-reach*.4,yy,reach*.95,.5,front);
        r(reach*.55,yy,reach*.45,.5,right);
      }
    };
    if(z<6){
      const rx=z<2?25:z<4?24:23,ry=z<2?12:z<4?11.5:11;
      drum(rx,ry,"#677780","#939f9b","#b3b8a8");
      // Three broad low steps join the door to the foreground paving.
      if(z<2)r(-7,10,14,7,"#7f908c");
      else if(z<4)r(-6,10,12,5,"#9da99b");
      else r(-5.5,10,11,3,"#bdc2ac");
      if(z<2)r(-6.5,16.5,13,.5,"#abb6a3");
    }
    if(z>=6&&z<57){
      const rx=22,ry=10.5;
      drum(rx,ry,"#7d9094","#b1b8a8","#ccd0b6");
      // A few narrow mortar ends and staggered vertical joints imply stone
      // courses without drawing a full band at every height.
      const course=Math.floor((z-6)/9),local=(z-6)%9;
      if(local<.5){r(-16,8,4,.5,"#929f96");r(8,9.5,5,.5,"#a2ac9d");}
      if(local<3){r(course%2?-11:13,9,.5,.5,"#96a299");}
      // Arch is a true changing aperture profile in successive sections.
      if(z<31){
        const span=z<25?5:Math.sqrt(Math.max(0,25-(z-25)**2));
        if(span>.3){
          r(-span-1,10,span*2+2,1,"#768582");
          r(-span,10.5,span*2,.5,"#334f57");
          if(z>7&&z<27){
            r(-span+.75,10.5,Math.max(.5,span*2-1.5),.5,"#52706d");
            r(-.25,10.5,.5,.5,"#304951");
            if(z>=17&&z<17.5)r(-span+.75,10.5,span*2-1.5,.5,"#304951");
            if(z>=17.5&&z<19)r(2.5,10.5,.5,.5,"#d5b573");
          }
        }
      }
      const window=(x:number,y:number,bottom:number,top:number,side=false)=>{
        if(z<bottom||z>=top)return;
        const t=z-bottom,h=top-bottom,span=t<h-3?3:Math.sqrt(Math.max(0,9-(t-h+3)**2));
        if(span<.25)return;
        const face=(u:number,w:number,col:string)=>side?r(-21.5,y+u,.5,w,col):r(x+u,y,w,.5,col);
        face(-span-.75,span*2+1.5,"#6c7b7a");
        if(t>=1&&t<h-1){
          face(-span+.5,Math.max(.5,span*2-1),t>h*.65?"#9aaea6":"#d6bd88");
          face(-.25,.5,"#6c7770");
          if(t>=h*.45&&t<h*.45+.5)face(-span+.5,span*2-1,"#6c7770");
        }
        if(t<1)face(-4,8,"#c9ccb2");
      };
      window(-14,8.5,20,36);window(14,8.5,20,36);window(0,0,22,38,true);
      window(-10,9.5,40,50);window(10,9.5,40,50);
      // Continuous stone cornice and the shallow copper bearing ring.
      if(z>=53){drum(23,11,"#6b7d83",z<55?"#9ca99f":copper[0],z<55?"#bcc3ad":copper[1]);}
    }
    // Dome is a single attached curved volume, supported by the bearing ring.
    // Segment boundaries follow fixed XY meridians through the entire dome.
    if(z>=57&&z<87){
      const t=(z-57)/30,scale=Math.sqrt(Math.max(0,1-t*t)),rx=24*scale,ry=13*scale;
      for(let iy=Math.ceil(-ry*2);iy<Math.ceil(ry*2);iy++){
        const yy=iy/2,reach=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));
        if(reach<.25)continue;
        r(-reach,yy,reach,.5,copper[0]);r(0,yy,reach,.5,copper[1]);
        // Fixed meridian avoids subpixel highlight boundaries crawling across
        // neighboring slices into accidental speckle on the broad cap face.
        if(reach>8)r(8,yy,reach-8,.5,copper[2]);
        // The observation slot is a longitudinal opening through the front
        // right quarter, with its jambs integral to the dome, not a black cap.
        const left=3,right=8;
        if(z>=66&&yy>=-2&&reach>left){
          const width=Math.min(right,reach)-left;
          if(width>0){r(left,yy,width,.5,"#273e4d");r(left-.5,yy,.5,.5,"#849f9f");}
        }
      }
      // A pair of restrained seams are meridians, never rings by slice index.
      if(rx>12){r(-rx*.55,-ry*.65,.5,ry*.35,"#486477");}
    }
    // Telescope trunnion grows directly out of the open slot. A diagonal
    // tube advances outward as its elevation rises; overlapping sections
    // keep it continuous from its saddle to the objective lens.
    if(z>=70&&z<79){
      r(3,0,5,5,"#495c68");
      if(z>=74)r(2.5,-.5,6,6,"#9a997e");
    }
    if(z>=76&&z<95){
      const t=(z-76)/19,cx=5+t*18,cy=2+t*3,rx=z>=91?4:3;
      drumTube(cx,cy,rx,z>=91?3:2.5,z>=91?"#b2b6a0":copper[1]);
      function drumTube(x:number,y:number,w:number,d:number,col:string){
        r(x-w,y-d,w*2,d*2,col);r(x-w,y-d,w*.65,d*2,copper[0]);
        r(x+w-.5,y-d,.5,d*2,"#b7c6b5");
      }
      if(z>=94){r(cx-2.5,cy-1.5,5,3,"#273b4b");r(cx-1.5,cy-1.5,2,.5,"#84a8af");}
    }
  }};
}
