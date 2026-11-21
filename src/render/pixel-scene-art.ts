import { drawPixelStack, type PixelStackModel } from "./pixel-stack.js";
import { hash, type Ctx } from "./paper-material.js";

// Geometry stays in its original world proportions; half-unit sections and
// half-unit surface details are baked as genuine one-pixel voxels.
function fineModel(m:PixelStackModel):PixelStackModel {
  return {...m,id:m.id+":fine",width:m.width*2,depth:m.depth*2,count:m.count*2-1,
    paint(c,z){m.paint(c,z/2);}};
}
function rect(c:Ctx,x:number,y:number,w:number,h:number,color:string):void {
  c.fillStyle=color;c.fillRect(Math.round(x*2),Math.round(y*2),Math.max(1,Math.round(w*2)),Math.max(1,Math.round(h*2)));
}
function pixelDisc(c:Ctx,x:number,y:number,rx:number,ry:number,color:string):void {
  if(rx<=0||ry<=0)return;
  for(let iy=Math.ceil(-ry*2);iy<=Math.floor(ry*2);iy++) {
    const reach=Math.sqrt(Math.max(0,1-(iy/(ry*2))**2))*rx;
    if(reach>.2)rect(c,x-reach,y+iy/2,reach*2,.5,color);
  }
}
const foliage = [
  ["#34544f", "#527b61", "#7f995f"],
  ["#714b50", "#ac7160", "#cf9a70"],
  ["#414f5b", "#6e8980", "#9cae87"],
] as const;
function model(kind: string, variant: number): PixelStackModel {
  const tree = kind === "tree", cottage = kind === "cottage", bush = kind === "bush",
    palettes = foliage[Math.abs(variant) % foliage.length]!;
  if (cottage) return cottageModel(variant % 3);
  return {
    id: `scene:${kind}:${variant % 6}`, width: tree ? 64 : kind === "fence" ? 48 : 36,
    depth: tree ? 48 : kind === "fence" ? 12 : 28,
    count: tree ? 67 : kind === "lamp" ? 34 : kind === "fence" ? 22 : bush ? 19 : 18,
    paint(c,z) {
      const box = (x:number,y:number,w:number,h:number,color:string) => { rect(c,x,y,w,h,color); };
      if (tree) {
        if (z < 38) {
          pixelDisc(c, 0, 0, z < 4 ? 6 : 3, z < 4 ? 5 : 3, "#554051");
          box(0,-2,2,4,"#9a7057");
          if (z > 18) { box(-Math.floor((z-18)/3),-2,Math.floor((z-18)/3)+3,2,"#75514d"); }
        }
        // Overlapping asymmetrical crowns share a broad light direction. No
        // concentric rims or repeating slice highlights on the leaf surface.
        const clumps = [[-13,-3,43,15,12,15],[10,-6,47,17,12,17],[-1,7,51,16,11,16],[-5,-7,58,12,9,9],[-20,0,40,8,7,9],[16,4,48,9,8,11]];
        for (const [x,y,center,rx,ry,rz] of clumps) {
          const dz=(z-center!)/rz!;if(Math.abs(dz)>=1)continue;
          const radius=Math.sqrt(1-dz*dz);
          // Paint the exposed contour itself. Inset highlights are hidden by
          // the next projected slice, leaving a dark shell around the crown.
          const shade=dz<-.58?0:dz>.28?2:1;
          pixelDisc(c,x!,y!,rx!*radius,ry!*radius,palettes[shade]);

        }
        // Authored leaf groups sit on the front and top of the crown. They
        // are small volumes, not a pattern stamped on every horizontal slice.
        const leaves=[[-20,8,39,4],[-12,12,41,5],[-3,15,43,4],[7,12,44,5],[17,9,43,4],
          [-17,10,48,4],[-7,14,51,5],[3,16,52,4],[13,12,52,5],
          [-16,2,56,4],[-7,7,58,5],[4,9,60,4],[13,3,59,4],[-8,-4,63,3],[0,0,63,3]];
        for(const [lx,ly,lz,lr] of leaves){
          const dz=(z-lz!)/lr!;if(Math.abs(dz)>=1)continue;
          const reach=Math.sqrt(1-dz*dz);
          pixelDisc(c,lx!,ly!,lr!*reach,lr!*.75*reach,palettes[dz<.05?1:2]);
        }
      } else if (bush) {
        for (const [x,y,center,r] of [[-8,0,8,8],[6,-1,10,9],[0,5,7,7]]) {
          const dz=z-center!; if(Math.abs(dz)>=r!)continue;
          const rr=Math.sqrt(r!*r!-dz*dz);
          pixelDisc(c,x!,y!,rr,Math.max(.5,rr*.7),palettes[dz<-r!*.55?0:dz>r!*.3?2:1]);
          if(z===center!+2)box(x!,y!,2,2,variant%2?"#d79b64":"#ae6675");
        }
        for(const [lx,ly,lz,lr] of [[-9,4,10,3],[-3,7,9,3],[5,5,12,3],[10,1,13,2.5],[-3,0,14,3]]){
          const dz=(z-lz!)/lr!;if(Math.abs(dz)>=1)continue;
          const reach=Math.sqrt(1-dz*dz);
          pixelDisc(c,lx!,ly!,lr!*reach,lr!*.7*reach,palettes[dz<.12?1:2]);
        }
      } else if(kind==="stone") {
        const rr=Math.max(1,11-z*.65);
        if(z<13){pixelDisc(c,0,0,rr,rr*.65,"#40465a");pixelDisc(c,1,-1,Math.max(1,rr-2),Math.max(1,rr*.65-1),z>6?"#9b9e97":"#6e7880");}
      } else if(kind==="pumpkin") {
        if(z<14){const rr=Math.max(2,Math.sqrt(Math.max(0,49-(z-7)**2)));
          for(let l=-2;l<=2;l++)pixelDisc(c,l*2,0,Math.max(1,rr-2),rr*.8,l<0?"#92503e":l===0?"#e1a34e":"#bd713b");
          if(z===8||z===9){box(-5,Math.floor(rr*.7),2,1,"#f6d980");box(3,Math.floor(rr*.7),2,1,"#f6d980");}
          if(z===4)box(-3,Math.floor(rr*.7),6,1,"#593746");
        }else{box(-1,-1,3,2,"#516a4c");}
      } else if(kind==="fence") {
        for(const x of [-18,0,18])box(x-2,-2,4,4,z>18?"#d0ae80":"#87644f");
        if(z===7||z===8||z===15||z===16)box(-22,-1,44,2,z%2?"#b99268":"#5e4650");
      } else if(kind==="lamp") {
        if(z<17){box(-1,-1,3,3,"#6e5b59");if(z<2)box(-4,-3,9,7,"#3b364a");}
        else if(z<28){const col=z===17||z===27?"#414153":"#dfac59";box(-5,-4,11,9,col);
          if(z>17&&z<27){box(-5,-4,2,9,"#65514e");box(4,-4,2,9,"#65514e");box(0,3,1,2,"#7c694e");box(1,3,3,1,"#edc779");box(-3,4,2.5,.5,"#f5d991");box(1,4,2,.5,"#edc779");if(z>=21&&z<21.5)box(-4,4,8,.5,"#65514e");}}
        else {const r=Math.max(1,8-(z-28));box(-r,-r,r*2+1,r*2+1,z>30?"#746b68":"#3c4055");}
      } else if(kind==="candles") {
        for(const [x,y,h] of [[-6,0,12],[1,-2,16],[7,2,10]]) {
          if(z<h!){box(x!,y!,3,3,z===0?"#514350":"#d5b989");box(x!+2,y!,1,3,"#f3dba8");}
          else if(z<h!+2)box(x!+1,y!+1,1,1,"#ffd78a");
        }
      }
    },
  };
}
function cottageModel(v:number):PixelStackModel {
  const roofs=[["#35384f","#52678c","#9eacca"],["#433751","#78596d","#bd8e91"],["#283f4c","#4b7279","#9cae9c"]] as const,
    roof=roofs[v]!, wall="#d8c3a0", shadow="#9e8c87", timber="#6a4b47";
  return {id:`scene:cottage:${v}`,width:50,depth:48,count:53,paint(c,z){
    const r=(x:number,y:number,w:number,h:number,col:string)=>{rect(c,x,y,w,h,col);};
    if(z<3){r(-23,-22,46,44,z===0?"#4a3646":"#50694b");r(-21,-20,42,40,z===2?"#799451":"#667950");
      if(z===2){for(let i=0;i<16;i++){const x=Math.floor(hash(i*7+v)*42)-21,y=Math.floor(hash(i*13+v)*40)-20;r(x,y,2,1,i%3?"#9eb366":"#d88a75");}r(-3,16,7,6,"#adb1a0");}return;}
    if(z<28){r(-15,-17,30,34,timber);r(-14,-16,28,32,wall);
      r(-15,-17,2,34,shadow);r(13,-17,2,34,timber);r(-15,15,30,2,wall);
      for(const x of [-14,13])r(x,15,2,2,timber);
      if(z<21){r(-4,15,9,2,timber);r(-3,16,7,1,"#36595d");
        if(z>4&&z<19){r(-2.5,16.5,2.5,.5,"#547d78");r(1,16.5,2,.5,"#547d78");}
        if(z>10&&z<11)r(2.5,17,1,.5,"#d7b776");
        if(z<4)r(-4,16,9,2,"#a99c87");}
      if(z>=10&&z<23){for(const x of [-10,9]){
        r(x-3.5,15,7,2,timber);
        if(z>11&&z<22){r(x-2.5,16,5,1,z>19?"#6b98ac":"#bad4c8");r(x-.25,16.5,.5,.5,timber);}
        if(z>=16&&z<16.5)r(x-2.5,16.5,5,.5,timber);
        if(z<11||z>=22)r(x-4,16,8,1.5,"#e4ceb1");
        for(const side of [-1,1]){r(x+side*4-0.5,15.5,1.5,1,"#547b78");if(z>=13&&z<13.5||z>=20&&z<20.5)r(x+side*4-0.5,16,1.5,.5,"#324d56");}
      }
      for(const yy of [-9,6]){r(-15,yy-3,2,7,timber);if(z>11&&z<22){r(-15.5,yy-2,1,5,z>19?"#66879b":"#a2c4c5");r(-15.5,yy,.5,.5,timber);}if(z>=16&&z<16.5)r(-15.5,yy-2,.5,5,timber);}}
      if(z===9){r(-14,16,7,2,"#9c6d50");r(6,16,8,2,"#9c6d50");}if(z===10){r(-13,16,5,2,"#a85770");r(7,16,6,2,"#8b9e55");}
      if(z===26||z===27)r(-16,-18,32,36,timber);
    }
    if(z>=28&&z<=44){const half=18-(z-28);r(-half,-20,half*2+1,40,roof[1]);
      if(half>1){r(-half+0.5,-19.5,half-.5,39,roof[1]);r(0,-19.5,half,39,roof[0]);
        // Narrow mortar joints are staggered by tile course; the broad roof
        // planes retain their value instead of alternating bright stripes.
        const course=Math.floor((z-28)/3), joint=(z-28)%3;
        if(joint<.5)r(-half,-19.5,.5,39,v===0?"#50658a":v===1?"#75576b":"#496f77");
        const tileInk=v===0?"#455a7e":v===1?"#684c61":"#3e626a";
        for(let yy=-18+(course%2)*3;yy<19;yy+=6){
          // Short horizontal lower edge plus a one-pixel staggered joint.
          if(joint<.5)r(-half,yy,.5,3,tileInk);
          if(joint<1)r(-half,yy,.5,.5,tileInk);
        }
        if(half>3){r(-half+2,16,half*2-3,1,wall);r(-half+2,-17,half*2-3,1,shadow);
          r(-half+2,16.5,.5,.5,timber);r(half-2,16.5,.5,.5,timber);r(-.5,16,1,1,timber);}
        if(z>=31&&z<=37){r(-2.5,16,5,1,timber);if(z>32&&z<36.5)r(-1.5,16.5,3,.5,"#a6c9c9");if(z>=34&&z<34.5)r(-1.5,16.5,3,.5,timber);}
      }
      if(z>=43)r(-1,-20,3,40,roof[1]);
    }
    if(z>=35){const cap=z>=51;r(7,-9,cap?7:5,6,cap?"#363749":z%4===0?"#b67f65":"#8d534b");r(10,-9,2,6,"#bc866b");if(cap)r(9,-7,2,2,"#292d42");}
  }};
}
export function drawPixelDecor(ctx:Ctx,kind:string,x:number,y:number,s=1,seed=0):void {
  const v=((Math.trunc(seed)%6)+6)%6;
  drawPixelStack(ctx,fineModel(model(kind,v)),{x,y:y-(kind==="cottage"?26:0)*s,scale:(kind==="cottage"?.9:1)*s,turn:kind==="cottage"?-.58:.22,squash:.75});
}
