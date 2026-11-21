import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";

/** Timber tea shop authored in half-world units for the fineModel adapter. */
export function teahouseModel(variant:number):PixelStackModel {
  const v=Math.abs(variant)%3;
  const tiles=[
    ["#483e56","#78596b","#a47e85"],
    ["#344b58","#547480","#849b9d"],
    ["#454852","#6e716c","#9b9d85"],
  ][v]!;
  const timber="#715244",shade="#4e4544",beam="#a5825e",plaster="#d1b994";
  return {id:`landmark:teahouse:timber:${v}`,width:108,depth:44,count:97,
    groundShadow:{rx:44,ry:10,dx:1,dy:1},paint(c:Ctx,z:number){
    const r=(x:number,y:number,w:number,d:number,color:string)=>{
      c.fillStyle=color;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)));
    };
    if(z<5){
      r(-44,-13,88,26,z<2?"#6b7068":"#a39e83");r(-44,-13,2,26,"#777b6d");
      r(-42,12,84,1,z<2?"#8c927a":"#c2b99a");
      if(z<3){r(-7,13,14,5,"#929c83");r(-6,17,12,1,"#b7b99a");}
      for(let x=-38;x<44;x+=11)r(x+(z<2?4:0),12,.5,1,"#818572");
    }
    const window=(x:number,bottom:number,top:number,width:number)=>{
      if(z<bottom||z>=top)return;
      r(x-width/2-1,11.5,width+2,1.5,shade);
      r(x-width/2,12.5,width,.5,z>top-4?"#bca77e":"#dbc18b");
      for(let xx=x-width/2+2;xx<x+width/2;xx+=3)r(xx,12.5,.5,.5,timber);
      if(z<bottom+1||z>=top-1||Math.abs(z-(bottom+top)/2)<.5)r(x-width/2,12.5,width,.5,timber);
      if(z===bottom)r(x-width/2-1,12,width+2,2,beam);
    };
    if(z>=5&&z<58){
      r(-42,-12,84,24,timber);r(-40,-11,80,24,plaster);
      r(-42,-12,2,24,"#a59177");r(40,-12,2,25,shade);
      // Continuous posts, broad crossbeams and short diagonal knee braces.
      for(const x of [-42,-22,-6,5,21,40]){r(x,-12,2,25,timber);r(x+.5,12,.5,1,beam);}
      for(const yy of [-12,0,11])r(-42,yy,2,2,timber);
      if(z<8||z>=32&&z<34||z>=54)r(-42,12,84,1,timber);
      if(z>=50&&z<54){for(const side of [-1,1])r(side*(34+(z-50))-.5,12,1,1,timber);}
      window(-31,15,30,12);window(-14,15,30,10);window(14,15,30,10);window(31,15,30,12);
      window(-31,38,51,12);window(-14,38,51,10);window(14,38,51,10);window(31,38,51,12);
      // Side glazing has a cool reflected face and substantial timber jambs.
      if(z>=17&&z<30||z>=39&&z<51){
        for(const yy of [-6,5]){
          r(-42.5,yy-3,.5,6,"#83998c");r(-42.5,yy,.5,.5,timber);
          if(z>=23&&z<23.5||z>=45&&z<45.5)r(-42.5,yy-3,.5,6,timber);
        }
      }
      // Central entrance sits in a dark recess under the supported awning.
      if(z<32){
        r(-6,11,12,2,shade);r(-4.5,12.5,9,.5,"#526e64");
        r(-.25,12.5,.5,.5,"#354f4d");
        if(z>=10&&z<27){r(-3.5,12.5,2.5,.5,"#6b8775");r(1,12.5,2.5,.5,"#6b8775");}
        if(z>=18&&z<18.5)r(-4.5,12.5,9,.5,shade);
        if(z>=18.5&&z<20){r(-1.5,13,.5,.5,"#d8b977");r(1,13,.5,.5,"#d8b977");}
        if(z>=30)r(-6,12,12,2,beam);
      }
      // Shelf ledge with small tea tins and clay pots, all physically resting
      // on the board rather than floating ornaments on the wall.
      if(z>=12&&z<13){r(-39,12,30,3,timber);r(9,12,30,3,timber);}
      if(z>=13&&z<17)for(const [x,color] of [[-35,"#8c8d68"],[-28,"#a7815d"],[26,"#7b9585"],[34,"#a88f63"]] as const){
        r(x-1.5,12.5,3,2.5,z>=16.5?"#c1b28c":color);
        if(z>=14&&z<15)r(x-.5,14.5,1,.5,"#d5c39b");
      }
      // Brackets hold a small pitched awning over the entrance.
      if(z>=27&&z<34)for(const x of [-7,6])r(x,12+(z-27)*.4,1,1,timber);
      if(z>=32&&z<37){const yy=17-(z-32);r(-9,yy,18,2,tiles[1]);r(-9,yy,1,2,tiles[0]);r(8,yy,1,2,tiles[0]);}
    }
    const hip=(bottom:number,top:number,baseX:number,baseY:number,ridgeX:number)=>{
      if(z<bottom||z>=top)return;
      const t=(z-bottom)/(top-bottom),rx=baseX-(baseX-ridgeX)*t,ry=Math.max(.75,baseY*(1-t));
      // Each halfplane reaches its exposed edge. Only the eave is outlined;
      // meridian/tile marks are sparse deliberate material details.
      r(-rx,-ry,rx*2,ry,tiles[0]);r(-rx,0,rx*2,ry,tiles[1]);
      if(z<bottom+1)r(-rx,ry-1,rx*2,1,shade);
      if((z-bottom)%4<.5&&ry>2)for(let x=-rx+3;x<rx-2;x+=7)r(x,ry-1,2,1,tiles[0]);
      if(t>.88)r(-rx,-.75,rx*2,1.5,tiles[2]);
    };
    hip(58,75,48,16,27);
    // Clerestory is a smaller inhabited volume between the two roof tiers.
    if(z>=72&&z<81){
      r(-25,-7,50,14,timber);r(-24,6,48,1,"#baab88");
      for(const x of [-18,-6,6,18]){r(x-3,6.5,6,.5,"#cdb981");r(x-.25,6.5,.5,.5,timber);}
      if(z<73||z>=80)r(-25,6.5,50,1,timber);
      for(const x of [-25,-13,0,13,24])r(x,6,1,1,timber);
    }
    hip(81,95,31,11,16);
    if(z>=94){r(-17,-1,34,2,z>=95?tiles[2]:tiles[0]);}
  }};
}
