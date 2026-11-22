import { HOMESTEADS, roadArrival } from "./homestead-layout.js";
import { drawHomesteadGround } from "./homestead-ground.js";
import { drawDistantLandscape } from "./pixel-distant-landscape.js";
import { drawYardGarden, drawYardGroundMasses } from "./pixel-yard-garden.js";
/** Pixel diorama scene. Static terrain and volume stacks are authored at one
 * native pixel per world unit; their world anchors and gameplay remain unchanged. */
import type { CanvasSurface } from "../engine/surface.js";
import { surface, hash, type Ctx, type Point } from "./paper-material.js";
import { START_ROAD_EXIT } from "../game/world-gen.js";
import { ROAD_STOCK } from "./road-art.js";
import { STATS } from "../game/types.js";
import { LAMPS, YARD_PROPS, pathCenter as oldPathCenter, type SceneProp } from "./scene.js";
import { drawPixelDecor } from "./pixel-scene-art.js";
import { pixelDisc } from "./pixel-stack.js";
import { polygon as pixelPolygon } from "./pixel-art.js";
import { pixelRect, pixelTerrainCluster } from "./pixel-terrain.js";
export { LAMPS, YARD_PROPS };
const W=960,H=540,SKY_H=250;
/** Footings remain north of the playable boundary; no invisible new colliders. */
export const OPENING_BUILDINGS = HOMESTEADS;
let background:CanvasSurface|undefined, skyCanvas:CanvasSurface|undefined;
export interface GroundLamp { x:number;y:number;s?:number; }
const q=(n:number)=>Math.round(n/2)*2;
function pathCenter(y:number):number{return oldPathCenter(y)+(y<348?17*Math.max(0,1-(y-222)/126):0);}
function moon(ctx:Ctx,x:number,y:number):void {
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  pixelDisc(ctx,0,0,34,34,"#a5b4c7");pixelDisc(ctx,1,-1,32,32,"#e4d7ad");
  pixelDisc(ctx,-17,6,5,3,"#c4c6ad");pixelDisc(ctx,-11,20,3,2,"#d2cdb0");
  pixelDisc(ctx,14,-12,26,26,"#24334d");ctx.restore();
}
function skySheet(ctx:Ctx):void {
  const bands=["#19283f","#24334d","#32435b","#4c5668"];
  for(let i=0;i<4;i++){ctx.fillStyle=bands[i]!;ctx.fillRect(0,i*64,W,64);}
  for(let i=0;i<72;i++){
    const x=q(16+hash(i*47)*928),y=q(12+hash(i*73)*132);
    pixelRect(ctx,x,y,2,2,i%3?"#8c9eb7":"#e3ca94");
    if(i%13===0){pixelRect(ctx,x-2,y+2,6,2,"#bac1b8");pixelRect(ctx,x,y-2,2,6,"#bac1b8");}
  }
  moon(ctx,770,61);
  for(const [cx,cy,s] of [[245,70,1],[535,50,.8],[890,103,.75]]){
    for(let i=0;i<5;i++)pixelRect(ctx,cx!+(i-2)*20*s!,cy!+((i+1)%3)*4,40*s!,8*s!,i%2?"#3d4c66":"#465773");
  }
}
export function pine(ctx:Ctx,x:number,y:number,s:number,color:string):void{
  for(let i=0;i<4;i++){const width=(8+i*5)*s;pixelRect(ctx,x-width,y-45*s+i*10*s,width*2,12*s,color);}
  pixelRect(ctx,x-2*s,y-6*s,4*s,8*s,"#3a3746");
}
export function horizonHills(ctx:Ctx,x0:number,x1:number):void{drawDistantLandscape(ctx,x0,x1);}
export function groundOutline(x0:number,y0:number,w:number,h:number,top:boolean):Path2D{
  const p=new Path2D();if(!top){p.rect(x0-12,y0-12,w+24,h+24);return p;}
  p.moveTo(x0-12,250);
  for(let x=Math.floor(x0/4)*4-12;x<=x0+w+12;x+=4){const y=q(190+Math.sin(x*.015)*8+Math.sin(x*.043)*2);p.lineTo(x,y);p.lineTo(x+4,y);}
  p.lineTo(x0+w+12,y0+h+12);p.lineTo(x0-12,y0+h+12);p.closePath();return p;
}
export function groundUnderlay(ctx:Ctx,x:number,y:number,w:number,h:number,top:boolean,_stock?:string,_opacity=1):void{
  const p=groundOutline(x,y,w,h,top);ctx.save();ctx.clip(p);ctx.fillStyle="#3d624e";ctx.fill(p);
  for(let gy=Math.floor(y/28);gy*28<y+h;gy++)for(let gx=Math.floor(x/28);gx*28<x+w;gx++){
    const sd=gx*92821+gy*68917;if(hash(sd)>.7)pixelRect(ctx,gx*28+hash(sd+1)*18,gy*28+hash(sd+2)*18,4,1,"#496b52");
  }ctx.restore();
}
export function groundTile(ctx:Ctx,x:number,y:number,w:number,h:number,lamps:readonly GroundLamp[],top:boolean,yard=false):void{
  for(const _ of groundTilePasses(ctx,x,y,w,h,lamps,top,yard)){/* same incremental bake */}
}
export function* groundTilePasses(ctx:Ctx,x:number,y:number,w:number,h:number,_lamps:readonly GroundLamp[],top:boolean,_yard=false):Generator<void>{
  groundUnderlay(ctx,x,y,w,h,top);yield;
  const p=groundOutline(x,y,w,h,top);ctx.save();ctx.clip(p);
  for(let gy=Math.floor(y/76);gy*76<y+h;gy++){
    for(let gx=Math.floor(x/76);gx*76<x+w;gx++){
      const sd=gx*1931+gy*7841;if(hash(sd)<.55)continue;
      pixelTerrainCluster(ctx,gx*76+hash(sd+1)*40,gy*76+hash(sd+2)*38,sd,"scallop");
    }yield;
  }ctx.restore();
}
export function leaf(ctx:Ctx,x:number,y:number,length:number,width:number,angle:number,color:string,_seed:number,_stitched=false):void{
  for(let i=0;i<Math.ceil(length/2);i++){
    const t=i/Math.max(1,length/2),px=x-Math.sin(angle)*i*2,py=y-Math.cos(angle)*i*2;
    const span=Math.max(2,Math.sin(t*Math.PI)*width*2);pixelRect(ctx,px-span/2,py,span,2,color);
  }
}
export function tree(ctx:Ctx,x:number,y:number,s:number,seed:number):void{drawPixelDecor(ctx,"tree",x,y,s,seed);}
export function cottage(ctx:Ctx,x:number,y:number,s:number,seed:number):void{drawPixelDecor(ctx,"cottage",x,y,s,seed);}
export function lantern(ctx:Ctx,x:number,y:number,s:number,post=true):void{drawPixelDecor(ctx,"lamp",x,y,s*(post?1:.65),0);}
export function bush(ctx:Ctx,x:number,y:number,s:number,seed:number):void{drawPixelDecor(ctx,"bush",x,y,s,seed);}
export function stone(ctx:Ctx,x:number,y:number,s:number,seed:number):void{drawPixelDecor(ctx,"stone",x,y,s,seed);}
export function pumpkin(ctx:Ctx,x:number,y:number,s:number,seed:number):void{drawPixelDecor(ctx,"pumpkin",x,y,s,seed);}
export function fence(ctx:Ctx,x:number,y:number,s:number):void{drawPixelDecor(ctx,"fence",x,y,s,0);}
export function candles(ctx:Ctx,x:number,y:number,s:number):void{drawPixelDecor(ctx,"candles",x,y,s,0);}
export function flower(ctx:Ctx,x:number,y:number,s:number,seed:number):void{
  pixelRect(ctx,x,y-7*s,2*s,8*s,"#63845c");pixelRect(ctx,x-3*s,y-8*s,7*s,4*s,seed%2?"#d38d8d":"#d8c182");pixelRect(ctx,x,y-8*s,2*s,2*s,"#f1dca1");
}
export function grassTuft(ctx:Ctx,x:number,y:number,s:number,seed:number):void{
  ctx.save();ctx.translate(q(x),q(y));ctx.scale(s,s);pixelTerrainCluster(ctx,0,0,seed,"scallop");ctx.restore();
}
function buildStartYard():CanvasSurface{
  const c=surface(W,H),ctx=c.getContext("2d")!;ctx.imageSmoothingEnabled=false;
  horizonHills(ctx,0,W);groundTile(ctx,0,0,W,H,LAMPS,true,true);
  drawYardGroundMasses(ctx);
  drawHomesteadGround(ctx);
  // Original opening route centre remains identical; only its raster materials change.
  for(let y=245;y<H;y++){
    const join=roadArrival((y-480)/60),
      center=pathCenter(y)*(1-join)+START_ROAD_EXIT.x*join,
      width=(14+(y-225)*.038)*(1-join)+START_ROAD_EXIT.width*join;
    pixelRect(ctx,center-width-3,y,width*2+6,1,ROAD_STOCK.bank);
    pixelRect(ctx,center-width,y,width*2,1,ROAD_STOCK.face);
    pixelRect(ctx,center-width,y,1,1,ROAD_STOCK.rim);pixelRect(ctx,center+width-1,y,1,1,ROAD_STOCK.rim);
    for (const side of [-1,1]) {
      const section = Math.floor((y + side * 11) / 27);
      if (y > H - 5 || hash(section * 41 + side * 29) < .6) continue;
      const offset = side * (width * .42 + Math.sin(y / 34) * 1.5);
      pixelRect(ctx,center + offset - 2,y,4,1,ROAD_STOCK.worn);
      if (y % 37 === 0) pixelRect(ctx,center + offset + 3,y,3,1,ROAD_STOCK.packed);
    }
  }
  drawYardGarden(ctx);
  // Broad shadows start within each footing and continue onto the lawn.
  // Bake them with the ground so they stay attached during camera movement.
  ctx.save();
  ctx.globalAlpha = .28;
  for (const { x, y, s } of OPENING_BUILDINGS) {
    pixelPolygon(ctx, [[x - 28*s,y + 9*s], [x + 23*s,y + 6*s],
      [x + 56*s,y + 31*s], [x + 18*s,y + 43*s], [x - 18*s,y + 31*s]], "#293c4b");
  }
  for(const [x,y,s] of [[291,254,.67],[763,251,.65]]){
    pixelPolygon(ctx, [[x!-4*s!,y!],[x!+4*s!,y!],[x!+48*s!,y!+25*s!],
      [x!+37*s!,y!+31*s!],[x!-2*s!,y!+5*s!]], "#293c4b");
  }
  ctx.restore();
  tree(ctx,284,233,.87,8);tree(ctx,316,219,.67,9);
  tree(ctx,775,225,.9,7);tree(ctx,809,240,.72,6);
  tree(ctx,99,247,.8,8);tree(ctx,872,243,.78,6);
  for(const b of OPENING_BUILDINGS)drawPixelDecor(ctx,b.kind,b.x,b.y,b.s,b.seed);
  tree(ctx,291,254,.67,10);tree(ctx,763,251,.65,11);
  for(const [x,y,s,seed] of [[540,280,.7,31],[846,274,.68,41]])pumpkin(ctx,x!,y!,s!,seed!);
  candles(ctx,112,261,.8);
  for(const [x,y] of [[915,370],[892,380],[46,398]])stone(ctx,x!,y!,x!>900?1.6:.8,x!);
  return c;
}
export function startYard():CanvasSurface{return background??=buildStartYard();}
export function drawSky(ctx:Ctx):void{
  if(!skyCanvas){skyCanvas=surface(W,SKY_H);const c=skyCanvas.getContext("2d")!;skySheet(c);}
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(skyCanvas,0,0,W,SKY_H);ctx.restore();
}
export function drawProp(ctx:Ctx,p:SceneProp):void{drawPixelDecor(ctx,p.kind,p.x,p.y,p.s,p.seed);}
export function drawLamp(ctx:Ctx,l:{x:number;y:number;s:number},_time:number):void{lantern(ctx,l.x,l.y,l.s);}
export function lampPool(ctx:Ctx,x:number,y:number,s=1):void{
  ctx.save();ctx.globalAlpha*=.16;
  for(let row=-4;row<=4;row++){const w=(16-Math.abs(row)*2)*s;pixelRect(ctx,x-w,y+row*2*s,w*2,2*s,"#c4a36a");}
  ctx.restore();
}
export function drawGroundLight(ctx:Ctx,x:number,y:number,_time:number,s=1):void{lampPool(ctx,x,y,s);}
export function drawWind(_ctx:Ctx,_time:number):void{}
export function drawAtmosphere(ctx:Ctx,time:number,dawn=0,_lamps:readonly {x:number;y:number;s:number}[]=LAMPS):void{
  ctx.save();ctx.globalAlpha*=.65*(1-dawn*.6);
  for(let i=0;i<8;i++){const x=80+hash(i*71)*800,y=280+hash(i*91)*220;if(Math.floor(time*2+i)%4!==0)pixelRect(ctx,x,y,2,2,"#d6c988");}
  ctx.restore();
}
export function drawForeground(ctx:Ctx,viewer?:{x:number;y:number},withFrame=true,width=W,height=H):void{
  ctx.save();ctx.globalAlpha*=viewer&&viewer.y>height-40?.35:.8;
  for(const side of [0,1])for(let i=0;i<5;i++){
    const x=side?width-i*12:i*12;pixelRect(ctx,x,height-10-i%3*4,10,12+i%3*4,"#253c48");pixelRect(ctx,x+2,height-12-i%3*4,6,4,"#456453");
  }ctx.restore();if(withFrame)drawFrame(ctx,width,height);
}
export function drawFrame(ctx:Ctx,width=W,height=H):void{
  ctx.save();ctx.fillStyle="#172638";ctx.fillRect(0,0,width,2);ctx.fillRect(0,height-2,width,2);ctx.fillRect(0,0,2,height);ctx.fillRect(width-2,0,2,height);ctx.restore();
}
export function dawnAmount(progress:number,sessionSeconds:number=STATS.sessionSeconds):number{
  const span=Math.min(1,STATS.dawnSeconds/Math.max(1,sessionSeconds));return Math.max(0,Math.min(1,(progress-(1-span))/span));
}
export function drawNightShift(ctx:Ctx,progress:number,sessionSeconds?:number):void{
  const t=dawnAmount(progress,sessionSeconds);if(!t)return;ctx.save();ctx.globalAlpha*=t*.6;
  for(let i=0;i<5;i++){ctx.fillStyle=["#52688b","#7a7e9a","#ac8c9c","#d9a08d","#edbb92"][i]!;ctx.fillRect(0,i*50,W,50);}ctx.restore();
}
export function drawDawnWash(ctx:Ctx,progress:number,x:number,y:number,w:number,h:number,sessionSeconds?:number):void{
  const t=dawnAmount(progress,sessionSeconds);if(!t)return;ctx.save();ctx.globalAlpha*=t*.1;ctx.fillStyle="#efc99e";ctx.fillRect(x,Math.max(y,250),w,y+h-Math.max(y,250));ctx.restore();
}
