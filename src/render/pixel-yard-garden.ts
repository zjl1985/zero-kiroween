import { groundShape } from "./homestead-ground.js";
import { CROP_PATCHES } from "./homestead-layout.js";
import type { Ctx } from "./paper-material.js";

type GardenPixel=(x:number,y:number,w:number,h:number,c:string)=>void;
// Low plant silhouettes remain walkable; grouped leaves and seed heads carry
// the mass at phone scale, instead of making density out of isolated dots.
function ripeWheat(r:GardenPixel,x:number,y:number,variant=0):void {
  r(x-6,y-2,13,5,"#666e43");r(x-5,y-6,12,5,"#8b854f");
  const heads = WHEAT_HEADS[variant % WHEAT_HEADS.length]!;
  const ripe = variant % WHEAT_HEADS.length !== 1;
  for (const [dx, dy] of heads) {
    r(x+dx,y+dy+3,1,-dy-2,"#a2975e");
    r(x+dx-2,y+dy,4,5,ripe?"#a5986c":"#a69460");
    r(x+dx-1,y+dy-1,2,7,ripe?"#b4a577":"#b8a46a");
    r(x+dx-2,y+dy+1,1,2,"#b9ad7d");
  }
  r(x-5,y+1,10,1,"#817e4b");
}
const WHEAT_HEADS = [
  [[-4,-7],[1,-12],[5,-8],[-1,-6]],
  [[-4,-7],[0,-9],[4,-6]],
  [[-5,-9],[-1,-12],[4,-10],[6,-7]],
] as const;
function matureCabbage(r:GardenPixel,x:number,y:number,tone=0):void {
  r(x-7,y,15,4,"#3c5741");r(x-7,y-4,6,5,"#617d4e");
  r(x+1,y-5,7,6,tone?"#7b8b55":"#728950");
  r(x-5,y-7,10,8,"#8d9b60");r(x-3,y-9,6,3,"#93a072");
  r(x-2,y-6,6,5,"#768c53");r(x-1,y-7,4,2,"#96a574");
  r(x+1,y-4,2,3,"#a2ac70");r(x-5,y-1,4,2,"#8d9b60");
  r(x-5,y-5,1,4,"#4f6e48");r(x+5,y-3,1,3,"#536e43");
}
function ripeTomato(r:GardenPixel,x:number,y:number):void {
  r(x-7,y+1,15,3,"#3c5840");r(x-6,y-5,12,7,"#607b47");
  r(x-3,y-9,7,6,"#7c8b4e");r(x-8,y-2,5,3,"#788850");
  r(x+4,y-4,5,3,"#879255");r(x-1,y-7,1,9,"#586c3e");
  for(const [dx,dy] of [[-4,-3],[2,-6],[4,0]]){
    r(x+dx!-2,y+dy!-1,5,3,"#a16b4e");r(x+dx!-1,y+dy!-2,3,5,"#b98059");
    r(x+dx!-1,y+dy!-2,2,1,"#b5926b");r(x+dx!,y+dy!-3,1,2,"#6f8046");
  }
}
function flowerMass(r:GardenPixel,x:number,y:number,tone:number):void {
  r(x-7,y-1,15,5,"#455f43");r(x-6,y-5,12,6,"#6a7d4c");
  r(x-4,y-7,8,5,"#7b8a55");
  const shades=["#a58c75","#a59b70","#968083"];
  for(const [dx,dy,k] of [[-4,-4,0],[1,-7,1],[5,-2,0],[-1,0,2]]){
    const col=shades[(tone+k!)%3]!;
    r(x+dx!-2,y+dy!,5,3,col);r(x+dx!-1,y+dy!-1,3,5,col);
    r(x+dx!,y+dy!,1,1,"#b5a777");
  }
}

/** Low overlapping leaves read as cultivated margins, not upright shrubs.
 * Unequal broad planes give the planting a silhouette without noisy stipple. */
function borderLeaves(r:GardenPixel,x:number,y:number,lean=0):void {
  r(x-11,y,22,3,"#405b43");r(x-9,y-3,17,5,"#526e47");
  r(x-12,y-4,9,3,"#69804e");r(x-9,y-6,7,3,"#768955");
  r(x-4+lean,y-8,8,6,"#647d4c");r(x-2+lean,y-9,5,3,"#82915d");
  r(x+3,y-5,9,4,"#728651");r(x+7,y-6,5,2,"#899360");
  r(x-2,y-2,9,3,"#5d7547");r(x-8,y-3,5,1,"#8b9763");
}

/** Static, walkable garden dressing for the 960 × 540 opening yard.
 * Call inside the yard's existing background bake, behind actors and props.
 * All placement is authored on an integer grid; no simulation RNG or images.
 */
export function drawYardGarden(ctx: Ctx): void {
  ctx.save();
  const r:GardenPixel=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  for(const patch of CROP_PATCHES){
    groundShape(ctx,patch.outline,"#58604a");
    for(const [row,[x,y,count]] of patch.rows.entries()){
      // Missing harvested groups make larger breathing pockets, not random holes.
      for(let col=0;col<count;col++){
        if(patch.kind==="wheat" && row===1 && col>=4 && col<=6)continue;
        const xx=x+col*(patch.kind==="wheat"?12:17),yy=y+[0,-2,0,1][col%4]!;
        if(patch.kind==="wheat")ripeWheat(r,xx,yy,(row+Math.floor(col/3))%3);
        else if(row===0)ripeTomato(r,xx,yy);
        else matureCabbage(r,xx,yy,row%2);
      }
    }
  }
  // Unequal planted shoulders bind courts to fields. Keep the centre lane quiet.
  for(const [x,y,lean] of [[322,280,-1],[345,286,0],[715,288,1],[738,298,1],
    [252,364,-1],[257,389,0],[279,421,1],[320,441,0],[739,413,1],[715,438,0]] as const)
    borderLeaves(r,x,y,lean);
  groundShape(ctx,[[290,469],[326,456],[373,470],[394,494],[370,517],[320,515],[286,494]],"#4d6048");
  for(const [x,y] of [[305,482],[323,477],[345,485],[363,490],[325,501],[345,505]] as const)flowerMass(r,x,y,0);
  // East foreground stays mostly open grass: no mirrored flower bed.
  for(const [x,y] of [[728,480],[746,484],[737,498]] as const)borderLeaves(r,x,y,1);
  ctx.restore();
}

/** The same curved soil/leaf language continues below the screen boundary.
 * All marks are flat, walkable dressing; real roads/water are painted after us. */
export function drawYardGardenExtension(ctx: Ctx): void {
  ctx.save();
  const r:GardenPixel=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  groundShape(ctx,[[250,540],[437,540],[433,639],[419,729],[398,813],[355,879],
    [316,851],[283,774],[258,667]],"#49664b");
  groundShape(ctx,[[601,540],[750,540],[758,631],[744,744],[703,849],[663,888],
    [626,803],[611,698]],"#49664b");
  groundShape(ctx,[[278,568],[365,558],[420,591],[425,643],[402,688],[329,712],[270,668]],"#59624d");
  groundShape(ctx,[[634,610],[698,597],[738,629],[731,694],[706,737],[650,731],[624,680]],"#59624d");
  // One harvested section and one standing crescent; no repeated full-width stripes.
  for(let row=0;row<5;row++){
    const start=281+[10,0,7,17,30][row]!,count=[7,10,9,7,4][row]!,y=589+row*20;
    for(let col=0;col<count;col++){
      const x=start+col*12;
      if(row===2 || row===3 && col<3){r(x,y,1,4,"#929062");r(x+3,y+1,1,3,"#7d8556");}
      else ripeWheat(r,x,y+(col%3===1?-2:0),Math.floor(col/3)%3);
    }
  }
  for(const [x,y,count] of [[649,630,4],[642,651,5],[648,674,5],[657,697,4],[672,719,3]] as const)
    for(let col=0;col<count;col++)(y<660?ripeTomato:matureCabbage)(r,x+col*16,y+(col%2)*2);
  for(const [x,y] of [[280,708],[297,733],[321,747],[695,775],[714,753],[680,797],[345,801],[364,816]] as const)
    borderLeaves(r,x,y,x<450?-1:1);
  for(const [x,y] of [[355,846],[371,850],[681,847]] as const)flowerMass(r,x,y,0);
  ctx.restore();
}

/** Large connected pasture first; soil never becomes an outlined raised tile. */
export function drawYardGroundMasses(ctx: Ctx): void {
  groundShape(ctx,[[304,257],[358,261],[418,296],[436,352],[424,424],
    [439,492],[437,540],[250,540],[252,463],[237,393],[250,328]],"#49664b");
  groundShape(ctx,[[690,264],[735,290],[754,349],[768,426],[750,494],
    [750,540],[601,540],[606,459],[594,392],[608,324],[634,288]],"#49664b");
}
