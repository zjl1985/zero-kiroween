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
    r(x+dx-2,y+dy,4,5,ripe?"#b4a169":"#a69460");
    r(x+dx-1,y+dy-1,2,7,ripe?"#c2ae75":"#b8a46a");
    r(x+dx-2,y+dy+1,1,2,"#d0b97f");
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
  r(x-5,y-7,10,8,"#8d9b60");r(x-3,y-9,6,3,"#a2ac75");
  r(x-2,y-6,6,5,"#768c53");r(x-1,y-7,4,2,"#b0b87d");
  r(x+1,y-4,2,3,"#a2ac70");r(x-5,y-1,4,2,"#8d9b60");
  r(x-5,y-5,1,4,"#4f6e48");r(x+5,y-3,1,3,"#536e43");
}
function ripeTomato(r:GardenPixel,x:number,y:number):void {
  r(x-7,y+1,15,3,"#3c5840");r(x-6,y-5,12,7,"#607b47");
  r(x-3,y-9,7,6,"#7c8b4e");r(x-8,y-2,5,3,"#788850");
  r(x+4,y-4,5,3,"#879255");r(x-1,y-7,1,9,"#586c3e");
  for(const [dx,dy] of [[-4,-3],[2,-6],[4,0]]){
    r(x+dx!-2,y+dy!-1,5,3,"#a16b4e");r(x+dx!-1,y+dy!-2,3,5,"#b98059");
    r(x+dx!-1,y+dy!-2,2,1,"#d09c6b");r(x+dx!,y+dy!-3,1,2,"#6f8046");
  }
}
function flowerMass(r:GardenPixel,x:number,y:number,tone:number):void {
  r(x-7,y-1,15,5,"#455f43");r(x-6,y-5,12,6,"#6a7d4c");
  r(x-4,y-7,8,5,"#7b8a55");
  const shades=["#b89176","#b8a36b","#a78383"];
  for(const [dx,dy,k] of [[-4,-4,0],[1,-7,1],[5,-2,0],[-1,0,2]]){
    const col=shades[(tone+k!)%3]!;
    r(x+dx!-2,y+dy!,5,3,col);r(x+dx!-1,y+dy!-1,3,5,col);
    r(x+dx!,y+dy!,1,1,"#d0b67b");
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

function plantedMargin(r:GardenPixel,points:readonly (readonly [number,number,number])[]):void {
  for(const [x,y,bloom] of points){
    borderLeaves(r,x,y,bloom%3-1);
    if(bloom>0)flowerMass(r,x-3,y-1,bloom%3);
  }
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
  const soil="#555b45", furrow="#465542", bank="#69724e", lip="#777d53";
  // Short, broken bank faces describe shallow cultivated ground, not walls.
  const bed=(x:number,y:number,w:number,h:number)=>{
    r(x+3,y,w-6,h,soil);r(x,y+3,w,h-6,soil);
    r(x+3,y+h-3,w-6,3,furrow);
    // Broken shallow earthen shoulders, never a bright rectangular frame.
    r(x+8,y,Math.floor(w*.38),1,lip);r(x+Math.floor(w*.64),y,w*.22|0,1,bank);
    r(x,y+7,2,h-14,bank);r(x+w-2,y+5,1,h-10,soil);
    for(let xx=x+9;xx<x+w-5;xx+=19)r(xx,y+h-2,8,1,bank);
  };
  const leaf=(x:number,y:number,tone=0)=>matureCabbage(r,x,y,tone);
  const tuft=(x:number,y:number,tone=0)=>{
    r(x-3,y,7,1,"#455e47");r(x,y-5,1,5,tone?"#84905c":"#687d50");
    r(x-2,y-3,1,3,"#6d8151");r(x-3,y-4,1,2,"#7a8955");
    r(x+2,y-4,1,4,"#6d8151");r(x+3,y-5,1,2,"#82915c");
  };
  const bloom=(x:number,y:number,tone:number)=>{
    r(x,y-2,1,4,"#5e7651");r(x-2,y+1,2,1,"#718555");
    const petal=["#b28a73","#bdac73","#a58285"][tone%3]!;
    r(x-2,y-4,5,2,petal);r(x-1,y-5,3,4,petal);r(x,y-4,1,1,"#d0b57d");
  };
  // Left: a modest wheat allotment with five individually legible furrows.
  // The small break at the southeast corner connects to the grass approach.
  bed(267,335,137,86);
  const wheatRows = [[285,346,8],[279,360,9],[281,375,9],[282,391,8],[293,406,7]] as const;
  for (const [row, [start, y, count]] of wheatRows.entries()) {
    r(start-5,y+4,count*13,2,furrow);
    r(start-2,y+6,count*13-7,1,bank);
    for(let col=0;col<count;col++){
      if ((row === 0 && col === 2) || (row === 4 && col === 5)) continue;
      const x=start+col*13;
      ripeWheat(r,x,y+(col % 3 === 1 ? 2 : 0),(Math.floor(col/2)+row)%3);
    }
  }
  // Right: three parallel vegetable beds separated by narrow grass walks.
  // Crops vary by row: mature cabbage rosettes, ripe tomatoes, and bronze-leaf cabbage.
  const vegetableBeds = [[616,347,126,8],[611,374,139,8],[625,403,112,7]] as const;
  for(const [row,[left,yy,width,count]] of vegetableBeds.entries()){
    bed(left,yy,width,20);
    r(left+8,yy+13,width-18,1,furrow);
    for(let col=0;col<count;col++){
      if (row === 2 && col === 1) continue;
      const x=left+10+col*15,y=yy+11+(col % 3 === 2 ? 2 : 0);
      if(row===0)leaf(x,y,col%3===0?1:0);
      else if(row===1)ripeTomato(r,x,y);
      else {leaf(x,y,1);r(x+3,y-4,3,3,"#a28365");}

    }
  }
  // Irregular low planted shoulders tie the field to the front border, with
  // visible grass openings between larger masses. They never enter x450..600.
  terrainBands(ctx,"#465d43",[
    [246,347,21,24],[238,371,28,26],[241,397,33,29],[252,426,48,19],
    [276,445,41,15],[286,460,62,17],[303,477,84,18],
    [745,349,23,27],[746,376,30,28],[739,404,35,24],
    [724,428,41,20],[704,448,52,18],[680,466,61,19],
  ]);
  plantedMargin(r,[[253,366,0],[247,383,0],[250,406,0],[260,425,2],
    [279,438,0],[298,458,1],[314,473,0],
    [759,365,0],[763,388,0],[755,412,1],[747,432,0],[730,452,2],[712,470,0]]);
  // Front flowers form overlapping drifts of unequal depth instead of a
  // single picket row; the old flower bed anchors remain recognisable.
  for(const [x,w] of [[302,119],[606,119]] as const){
    terrainBands(ctx,soil,[[x+13,481,w-43,8],[x+2,489,w-4,10],[x+11,499,w-27,10]]);
    for(let i=0;i<5;i++)borderLeaves(r,x+13+i*21,485+(i%3)*3,i%3-1);
    for(let i=0;i<11;i++){
      const xx=x+7+i*10;
      flowerMass(r,xx,493+(i%2)*3,i%3);

    }
    for(const i of [1,2,6,8])flowerMass(r,x+8+i*10,503+(i%3),i%3);
  }
  // A few stepping patches connect the cultivated areas to existing grass;
  // the central route and start clearance have no extra terrain markings.
  for(const [x,y,w] of [[403,377,9],[410,392,11],[595,380,10],[588,398,9]] as const){
    r(x,y,w,3,"#727b59");r(x+2,y-1,w-4,1,"#8c916b");
  }
  // Deliberate edge groups continue the garden beyond the camera's centre.
  for(const [x,y] of [[42,367],[53,373],[73,365],[101,390],[116,393],
    [842,370],[855,375],[879,366],[901,405],[916,411],
    [217,478],[231,481],[777,478],[791,481],[260,515],[756,514]] as const){
    tuft(x,y);tuft(x+5,y+3,1);
  }
  for(const [x,y,t] of [[50,370,1],[108,391,0],[851,372,2],[910,407,1],
    [224,478,2],[784,479,0],[267,516,1],[751,513,2]] as const)bloom(x,y,t);
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
    r(x+2,y,w-4,h,"#565c45");r(x,y+2,w,h-4,"#565c45");
    r(x+3,y,w-6,1,"#7d8055");r(x+2,y+h-2,w-4,2,"#435640");
    r(x,y+3,1,h-6,"#69744c");
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
  terrainBands(ctx, "#5a654b",[
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
  r(263,664,174,5,"#526c49");
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
  r(611,688,143,3,"#526b49");
  for(const [x,y] of [[613,689],[628,691],[648,688]]){r(x!,y!,8,2,"#76805a");}
  plantedMargin(r,[[274,774,0],[283,793,0],[295,811,1],[306,823,0],
    [321,841,2],[339,849,0],[741,792,0],[735,810,1],[724,828,0],
    [705,845,2],[687,852,0]]);
  // Two loose low flower drifts end the near foreground; small separated
  // groups leave grass visible between them, unlike the straight upper beds.
  for(const [origin,w] of [[304,112],[622,108]] as const){
    for(let group=0;group<6;group++){
      const x=origin+8+group*18,y=862+(group%3)*10;
      flowerMass(r,x,y,group%3);
      flowerMass(r,x+8,y+6,(group+1)%3);

    }
    // A short grass seam grounds each drift without outlining the entire bed.
    r(origin+9,895,w-23,1,"#526b48");
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
  // Broad pasture contours merge the near grass with both inhabited sides.
  // Continuous low-contrast contours leave the focus on the planted beds.
  fill("#41674f",[
    [0,258,176,24],[0,282,212,26],[0,308,249,28],[0,336,277,31],
    [0,367,258,31],[0,398,225,32],[0,430,196,38],[0,468,165,72],
    [733,270,227,27],[709,297,251,31],[695,328,265,34],
    [726,362,234,39],[755,401,205,34],[776,435,184,43],[802,478,158,62],
  ]);
  fill("#3a5e4c",[
    [0,420,68,27],[0,447,93,35],[0,482,124,58],
    [118,506,161,34],[139,488,118,18],[170,479,65,9],
    [841,409,119,28],[859,437,101,36],[876,473,84,67],
    [739,510,139,30],[764,494,86,16],
  ]);
  // Trampled western homestead: one irregular apron joins the barn frontage
  // to its wheat plot. It is soil interspersed with grass, not a bordered tile.
  fill("#52634b",[
    [329,268,106,13],[305,281,132,15],[292,296,141,17],
    [276,313,161,19],[261,332,176,27],[250,359,190,30],
    [253,389,184,28],[266,417,164,18],[286,435,126,10],
  ]);
  fill("#5b644a",[
    [343,279,63,12],[330,291,85,13],[316,304,105,16],
    [300,320,126,17],[284,337,144,23],[277,360,151,30],
    [285,390,137,27],[300,417,106,12],
  ]);
  // The cool green shoulder dissolves the soil apron into the surrounding
  // lawn with a few broad incursions rather than a contrasting perimeter.
  fill("#48654c",[
    [249,340,13,37],[247,377,10,30],[255,407,20,22],
    [269,430,38,12],[407,427,24,13],[429,335,12,57],
  ]);
  // Eastern kitchen garden connects to the cottage doorstep, widens around
  // the beds, then opens onto the front grass. No closed rectangular border.
  fill("#50644b",[
    [628,276,63,13],[620,289,87,16],[612,305,117,17],
    [603,322,146,24],[596,346,164,31],[598,377,166,29],
    [608,406,147,26],[625,432,111,13],
  ]);
  fill("#5a634b",[
    [640,286,36,15],[633,301,61,17],[623,318,98,16],
    [615,334,128,27],[610,361,141,28],[616,389,132,27],
    [632,416,96,18],
  ]);
  // Narrow worn connectors stop short of the central fighting space. The
  // authoritative main road will overdraw their far ends at integration.
  fill("#58664c",[
    [401,300,25,10],[420,306,22,10],[438,312,19,9],
    [455,317,19,8],[472,322,14,7],
    [600,304,29,10],[580,310,25,9],[563,316,22,8],
    [548,322,18,7],
  ]);
  // Larger foreground grass terraces support the low flower drifts without
  // filling the centre lane or competing with character/enemy silhouettes.
  fill("#42664d",[
    [233,461,112,12],[217,473,188,15],[207,488,226,20],
    [222,508,211,18],[248,526,173,14],
    [641,460,105,14],[612,474,153,14],[596,488,185,19],
    [610,507,177,18],[638,525,133,15],
  ]);
  fill("#486b50",[
    [245,482,106,13],[233,495,150,16],[251,511,137,13],
    [661,485,83,12],[641,497,117,17],[655,514,97,12],
  ]);
  // Long, overlapping cultivated shoulders replace disconnected plot islands.
  // Their quieter inner lawn remains empty enough to read enemies and drops.
  fill("#49654a",[
    [260,402,162,21],[266,423,156,23],[278,446,145,25],
    [288,471,139,27],[300,498,132,23],[312,521,120,19],
    [615,407,149,22],[609,429,151,23],[612,452,143,24],
    [606,476,148,24],[612,500,141,23],[620,523,131,17],
  ]);
  fill("#52684b",[
    [284,429,103,16],[294,445,110,21],[308,466,104,17],
    [631,433,103,18],[623,451,103,22],[618,473,100,13],
  ]);
  // A few broad mown passes give the side lawn depth; they are interrupted
  // by the darker margin and never continue into the central combat lane.
  fill("#40624b",[
    [77,327,117,15],[58,342,154,20],[49,362,166,18],
    [95,393,112,16],[79,409,133,19],[81,428,120,14],
    [790,314,116,17],[776,331,148,22],[786,353,135,15],
    [802,400,123,20],[811,420,113,18],
  ]);
  ctx.restore();
}
