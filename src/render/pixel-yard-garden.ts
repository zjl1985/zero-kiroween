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

/** Join broad terrain bands with one-pixel stepped contours. The authored
 * masses keep their shape without exposing the rectangle grid used to lay them out. */
function terrainBands(ctx: Ctx, color: string, rows: readonly (readonly number[])[]): void {
  ctx.fillStyle=color;
  for(let i=0;i<rows.length;i++){
    const [x,y,w,h]=rows[i]! as readonly [number,number,number,number];
    const before=rows[i-1],after=rows[i+1];
    const prev=before && before[1]!+before[3]===y ? before : undefined;
    const next=after && y+h===after[1] ? after : undefined;
    const l0=prev?(prev[0]!+x)/2:x,l1=next?(next[0]!+x)/2:x;
    const r0=prev?(prev[0]!+prev[2]!+x+w)/2:x+w,r1=next?(next[0]!+next[2]!+x+w)/2:x+w;
    for(let dy=0;dy<h;dy++){
      const t=(dy+.5)/h;
      const cap=Math.min(5,w/5,h/3);
      const inset=Math.max(!prev?cap-dy:0,!next?cap-(h-1-dy):0,0);
      const left=Math.round(l0+(l1-l0)*t+(x===0?0:inset));
      const right=Math.round(r0+(r1-r0)*t-(x+w===960?0:inset));
      if(right>left)ctx.fillRect(left,y+dy,right-left,1);
    }
  }
}

/** Static, walkable garden dressing for the 960 × 540 opening yard.
 * Call inside the yard's existing background bake, behind actors and props.
 * All placement is authored on an integer grid; no simulation RNG or images.
 */
export function drawYardGarden(ctx: Ctx): void {
  ctx.save();
  const r=(x:number,y:number,w:number,h:number,c:string)=>{
    ctx.fillStyle=c;ctx.fillRect(x,y,w,h);
  };
  // One generous cultivated plot per side, rather than separate framed strips.
  // Broad soil shapes stay flush with the lawn and leave the route untouched.
  terrainBands(ctx,"#585e4a",[[257,331,145,20],[250,351,163,29],
    [252,380,164,29],[263,409,145,23],[283,432,108,12]]);
  terrainBands(ctx,"#535a42",[[264,340,134,25],[260,365,145,34],
    [270,399,132,29],[289,428,92,7]]);
  const wheatRows=[[274,346,10],[265,361,12],[270,377,11],[273,393,11],[286,410,9],[302,426,6]] as const;
  for(const [row,[start,y,count]] of wheatRows.entries()){
    r(start-5,y+4,count*11,2,"#48533d");
    for(let col=0;col<count;col++){
      // A short harvested pocket and uneven row ends make one recognisable
      // field silhouette; variation is authored in groups, not random dots.
      if(row===4&&col>5&&col<8)continue;
      const lift=[0,-3,-2,1,2,0][Math.floor(col/2)%6]!;
      ripeWheat(r,start+col*11,y+lift,(row+Math.floor(col/3))%3);
    }
  }
  // A single kitchen garden with staggered mature foliage and a broad earth
  // walk through its middle. Short young rosettes interrupt the full cabbages.
  terrainBands(ctx,"#585d4a",[[619,335,112,18],[607,353,143,27],
    [606,380,149,30],[615,410,132,26],[632,436,98,9]]);
  const vegetables=[[625,352,7],[617,369,8],[620,400,8],[632,419,7]] as const;
  for(const [row,[start,y,count]] of vegetables.entries()){
    r(start-6,y+4,count*16,2,"#4c543e");
    for(let col=0;col<count;col++){
      const xx=start+col*16,yy=y+[0,2,-2,0][col%4]!;
      if(row===1||row===2&&col>4)ripeTomato(r,xx,yy);
      else if((row===3&&col<2)||(row===0&&col===4))borderLeaves(r,xx,yy,1);
      else matureCabbage(r,xx,yy,(row+col)%3===0?1:0);
    }
  }
  // Continuous low leaf shoulders, with a few flower groups only at the
  // foreground ends. This avoids a necklace of detached bright decorations.
  for(const [start,y,count,step] of [[252,422,5,13],[286,444,5,13],
    [746,421,4,-13],[719,443,5,-13]] as const){
    for(let i=0;i<count;i++)borderLeaves(r,start+i*step,y+(i%3)*3,i%3-1);
  }
  for(const [x,y] of [[303,485],[611,485]] as const){
    terrainBands(ctx,"#4d5b42",[[x-7,y-7,104,12],[x-13,y+5,119,15],[x,y+20,93,8]]);
    for(let row=0;row<3;row++)for(let col=0;col<7-row;col++){
      const xx=x+col*15+row*6,yy=y+row*10+(col%3===1?2:0);
      if(row===0||col===0)borderLeaves(r,xx,yy,1);
      else flowerMass(r,xx,yy,col<3?1:0);
    }
  }
  ctx.restore();
}

/** Second row of walkable farm plots. Draw after biome ground and before real
 * water/roads; chunk clipping is supplied by the caller. Central x450..600 stays
 * free of planted beds, including the downward continuation of the main lane. */
export function drawYardGardenExtension(ctx: Ctx): void {
  ctx.save();
  const r=(x:number,y:number,w:number,h:number,c:string)=>{
    ctx.fillStyle=c;ctx.fillRect(x,y,w,h);
  };
  const bank=(x:number,y:number,w:number,h:number)=>{
    r(x+3,y+3,w-6,h-5,"#565e49");
    r(x+7,y+h-2,w-14,1,"#50583f");
  };
  // Wide pasture tongues carry the upper lawn into the lower farm. Each
  // silhouette follows a fine stepped contour; later roads/water own all route
  // geometry, while the surrounding brown biome remains visible beyond it.
  terrainBands(ctx, "#49664b",[
    [250,540,194,29],[254,569,190,32],[250,601,190,35],
    [258,636,184,39],[250,675,192,38],[257,713,184,37],
    [269,750,172,35],[282,785,157,38],[290,823,147,36],
    [300,859,137,36],[310,895,123,29],[325,924,102,24],[342,948,70,12],
    [601,540,149,33],[606,573,144,35],[600,608,150,39],
    [603,647,147,40],[601,687,149,42],[607,729,143,40],
    [611,769,139,38],[617,807,133,40],[619,847,131,38],
    [624,885,126,35],[634,920,107,24],[649,944,76,16],
  ]);
  terrainBands(ctx, "#53634e",[
    [276,561,153,31],[269,592,166,47],[274,639,162,43],
    [278,682,157,49],[285,731,143,30],[301,761,119,21],
    [625,578,105,28],[618,606,122,42],[615,648,128,49],
    [622,697,120,50],[628,747,110,35],[643,782,88,20],
  ]);
  // Green shoulders and clear grass crossings tie the planting areas together.
  terrainBands(ctx, "#4d6b4d",[
    [254,556,27,34],[255,633,21,43],[263,743,24,43],
    [286,801,35,50],[306,899,38,27],[724,553,26,39],
    [733,643,17,53],[731,771,19,50],[720,873,30,38],
  ]);
  // Cultivated margins widen between the lower allotments and flower drifts.
  // Their long contours bridge the green/brown transition without inventing
  // a separate raised island or a hard perimeter around the farm.
  terrainBands(ctx,"#4b6146",[
    [273,751,148,26],[284,777,141,26],[294,803,132,29],
    [300,832,126,33],[313,865,109,28],
    [617,779,134,26],[621,805,130,28],[623,833,126,30],[629,863,116,28],
  ]);
  terrainBands(ctx,"#56604c",[[268,540,166,57],[256,597,180,61],
    [260,658,176,67],[278,725,154,55],[299,780,126,37],
    [618,540,126,64],[610,604,142,72],[612,676,142,75],[627,751,119,57]]);
  // Long beds run east/west here, alternating standing crop with recently
  // cut rows. A grass cross-path bisects the field rather than duplicating
  // the tightly packed five-row patch in the opening.
  const rows=[
    [259,598,166,0],[264,620,164,1],[259,642,172,0],
    [272,683,157,1],[266,705,163,0],[277,727,152,1],
  ] as const;
  for(const [x,y,w,cut] of rows){
    bank(x,y,w,17);r(x+7,y+12,w-14,1,"#46563e");
    for(let col=0;col<12;col++){
      const xx=x+8+col*12;if(xx>x+w-7)break;
      if(cut){
        // Stubble shows three clipped stalks, with a few short fallen stems
        // all lying along the harvesting direction; no hay bales or obstacles.
        r(xx,y+8,1,4,"#9a925e");r(xx+3,y+9,1,3,"#838452");
        r(xx-2,y+10,1,2,"#b0a06a");
        if(col%3===1){r(xx-2,y+4,6,1,"#9b935e");r(xx+1,y+5,4,1,"#7e8051");}
      }else{
        ripeWheat(r,xx,y+10+(col%4===0?1:0),(Math.floor(col/2)+cut+y)%3);

      }
    }
  }
  // Low grass path links the harvested field to the central lane, with a
  // handful of worn stepping patches only at the junction.
  r(263,664,174,5,"#59614c");
  for(const [x,y,w] of [[393,665,8],[408,666,10],[423,665,9],[433,675,7]] as const){
    r(x,y,w,2,"#78815b");r(x+2,y,w-4,1,"#90946a");
  }
  // Right beds use a long north/south layout, with a small cross-walk and
  // different crop heights. The left strip carries broad cabbage leaves,
  // the central strip ripe tomatoes, the right strip bronze-leaf cabbage.
  for(let col=0;col<3;col++){
    const x=615+col*46;
    for(const [y,h] of [[616,66],[700,78]] as const){
      bank(x,y,35,h);
      for(let row=0;row<(h===66?4:5);row++){
        const yy=y+11+row*14;
        for(const side of [-1,1]){
          const xx=x+17+side*7;
          if(col===1)ripeTomato(r,xx,yy);
          else matureCabbage(r,xx,yy,col===2?1:0);

        }
      }
    }
  }
  r(611,688,143,3,"#59614c");
  for(const [x,y] of [[613,689],[628,691],[648,688]]){r(x!,y!,8,2,"#76805a");}
  // The foreground ends in two broad low planting drifts, not scattered
  // diagonal chains. Leafy backs frame the flowers; the walking lane is open.
  for(const [origin,y] of [[310,851],[633,851]] as const){
    terrainBands(ctx,"#4d6045",[[origin-10,y-8,91,16],[origin-15,y+8,108,20],[origin,y+28,78,12]]);
    for(let row=0;row<4;row++)for(let col=0;col<6-(row===3?2:0);col++){
      const xx=origin+col*15+(row%2)*4,yy=y+row*10;
      if(row<2)borderLeaves(r,xx,yy,col%3-1);
      else flowerMass(r,xx,yy,col<3?1:0);
    }
  }
  ctx.restore();
}

/** Broad ground values unify the yard before roads and farm detail are drawn.
 * Pixel scanlines form soft-shaped, hard-edged grass and trampled-earth areas;
 * there are no outlines, shadows, water colors, or raised obstacle silhouettes. */
export function drawYardGroundMasses(ctx: Ctx): void {
  ctx.save();
  const fill=(color:string,rows:readonly (readonly [number,number,number,number])[])=>{
    terrainBands(ctx,color,rows);
  };
  // Two connected homestead aprons establish the large-scale hierarchy:
  // quiet green pasture outside, warm cultivated soil within, clear centre.
  fill("#42634b",[[0,270,270,62],[0,332,255,70],[0,402,244,68],[0,470,268,70],
    [749,270,211,66],[758,336,202,70],[769,406,191,74],[747,480,213,60]]);
  fill("#536149",[[315,270,119,27],[289,297,150,34],[254,331,183,44],
    [246,375,191,46],[261,421,175,46],[281,467,155,38],[302,505,135,35],
    [628,274,78,28],[611,302,121,32],[601,334,159,45],
    [601,379,167,46],[608,425,152,43],[611,468,144,36],[621,504,129,36]]);
  fill("#56604c",[[333,279,81,26],[307,305,113,31],[274,336,147,45],
    [268,381,152,44],[285,425,133,39],[306,464,112,40],[322,504,99,36],
    [637,285,58,25],[624,310,99,31],[618,341,132,42],
    [617,383,134,43],[628,426,116,38],[632,464,110,40],[637,504,102,36]]);
  // Inner margins gradually narrow into the southern cultivated district;
  // no isolated terraces, outlined islands, or planted centre-lane obstacles.
  fill("#48654a",[[253,430,42,35],[267,465,45,36],[283,501,43,39],
    [742,434,32,34],[732,468,34,36],[727,504,31,36]]);
  ctx.restore();
}
