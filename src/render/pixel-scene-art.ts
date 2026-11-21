import { drawPixelStack, pixelDisc, type PixelStackModel } from "./pixel-stack.js";
import { hash, type Ctx } from "./paper-material.js";

const foliage = [
  ["#243d43", "#3f6860", "#779358"],
  ["#53334d", "#a45d53", "#e1a760"],
  ["#313d50", "#576e6b", "#9aab79"],
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
      const box = (x:number,y:number,w:number,h:number,color:string) => { c.fillStyle=color;c.fillRect(x,y,w,h); };
      if (tree) {
        if (z < 38) {
          pixelDisc(c, 0, 0, z < 4 ? 6 : 3, z < 4 ? 5 : 3, "#554051");
          box(0,-2,2,4,"#9a7057");
          if (z > 18) { box(-Math.floor((z-18)/3),-2,Math.floor((z-18)/3)+3,2,"#75514d"); }
        }
        const clumps = [[-12,-3,43,17], [10,-6,47,18], [-1,7,52,17], [-4,-7,58,13]];
        for (let i=0;i<clumps.length;i++) {
          const [x,y,center,r] = clumps[i]!, dz=z-center!;
          if (Math.abs(dz)>=r!) continue;
          const radius=Math.floor(Math.sqrt(r!*r!-dz*dz));
          pixelDisc(c,x!,y!,radius,Math.max(2,Math.floor(radius*.75)),palettes[z<center!-6?0:1]);
          pixelDisc(c,x!+1,y!-1,Math.max(1,radius-1),Math.max(1,Math.floor(radius*.75)-1),palettes[z>center!?2:1]);
          if (radius>7 && z%4===0) {box(x!-radius+4,y!,3,2,palettes[2]); box(x!+4,y!-3,2,1,palettes[0]);}
        }
      } else if (bush) {
        for (const [x,y,center,r] of [[-8,0,8,8],[6,-1,10,9],[0,5,7,7]]) {
          const dz=z-center!; if(Math.abs(dz)>=r!)continue;
          const rr=Math.floor(Math.sqrt(r!*r!-dz*dz));
          pixelDisc(c,x!,y!,rr,Math.max(1,rr*.7),palettes[0]);
          pixelDisc(c,x!+1,y!-1,Math.max(1,rr-1),Math.max(1,rr*.7-1),palettes[z>center!?2:1]);
          if(z===center!+2)box(x!,y!,2,2,variant%2?"#d79b64":"#ae6675");
        }
      } else if(kind==="stone") {
        const rr=Math.max(1,11-Math.floor(z*.65));
        if(z<13){pixelDisc(c,0,0,rr,rr*.65,"#40465a");pixelDisc(c,1,-1,Math.max(1,rr-2),Math.max(1,rr*.65-1),z>6?"#9b9e97":"#6e7880");}
      } else if(kind==="pumpkin") {
        if(z<14){const rr=Math.max(2,Math.floor(Math.sqrt(Math.max(0,49-(z-7)**2))));
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
          if(z>17&&z<27){box(-5,-4,2,9,"#65514e");box(4,-4,2,9,"#65514e");box(0,3,1,2,"#7c694e");box(1,3,3,1,"#f3d584");}}
        else {const r=Math.max(1,8-(z-28));box(-r,-r,r*2+1,r*2+1,z%2?"#746b68":"#3c4055");}
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
    const r=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    if(z<3){r(-23,-22,46,44,z===0?"#4a3646":"#50694b");r(-21,-20,42,40,z===2?"#799451":"#667950");
      if(z===2){for(let i=0;i<16;i++){const x=Math.floor(hash(i*7+v)*42)-21,y=Math.floor(hash(i*13+v)*40)-20;r(x,y,2,1,i%3?"#9eb366":"#d88a75");}r(-3,16,7,6,"#adb1a0");}return;}
    if(z<28){r(-15,-17,30,34,timber);r(-14,-16,28,32,z%6===0?"#c2ae94":wall);
      r(-15,-17,2,34,shadow);r(13,-17,2,34,timber);r(-15,15,30,2,wall);
      for(const x of [-14,13])r(x,15,2,2,timber);
      if(z<21){r(-4,15,9,2,timber);r(-2,16,5,1,z===12?"#c8ab65":"#437575");}
      if(z>=11&&z<22){for(const x of [-10,9]){r(x-3,15,6,2,"#f1dcc0");if(z>12&&z<21)r(x-2,16,4,1,z===17?"#6f6570":"#9ac1c4");}
        for(const yy of [-9,6]){r(-15,yy-3,2,7,"#eee0c7");if(z>12&&z<21)r(-15,yy-2,1,5,z===17?"#6f6570":"#88a8bb");}}
      if(z===9){r(-14,16,7,2,"#9c6d50");r(6,16,8,2,"#9c6d50");}if(z===10){r(-13,16,5,2,"#a85770");r(7,16,6,2,"#8b9e55");}
      if(z===26||z===27)r(-16,-18,32,36,timber);
    }
    if(z>=28&&z<=44){const half=18-(z-28);r(-half,-20,half*2+1,40,roof[0]);
      if(half>1){r(-half+1,-19,half-1,38,z%3===0?roof[2]:roof[1]);r(1,-19,half-1,38,z%3===0?roof[1]:roof[0]);
        // Front and rear gables occupy the middle of the roof section.
        if(half>3){r(-half+2,16,half*2-3,1,wall);r(-half+2,-17,half*2-3,1,shadow);}
        if(z>=32&&z<=36)r(-2,16,4,1,z===34?"#f0d1a2":"#6694a7");
        if(z%3===1)for(let yy=-17;yy<19;yy+=8)r(-half+2,yy,2,2,roof[0]);
      }
    }
    if(z>=35){const cap=z>=51;r(7,-9,cap?7:5,6,cap?"#363749":z%4===0?"#b67f65":"#8d534b");r(10,-9,2,6,"#bc866b");if(cap)r(9,-7,2,2,"#292d42");}
  }};
}
export function drawPixelDecor(ctx:Ctx,kind:string,x:number,y:number,s=1,seed=0):void {
  const v=((Math.trunc(seed)%6)+6)%6;
  drawPixelStack(ctx,model(kind,v),{x,y:y-(kind==="cottage"?26:0)*s,scale:(kind==="cottage"?1.8:2)*s,turn:kind==="cottage"?-.58:.22,squash:.75});
}
