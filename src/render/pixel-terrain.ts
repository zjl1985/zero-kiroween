/** Native terrain pixels, anchored to the world lattice before chunk caching. */
import type { BiomeArt } from "./art-registry.js";
import { hash, type Ctx } from "./paper-material.js";
export const TERRAIN_PIXEL = 1;
export type PixelTerrainKind = "ruled" | "furrow" | "torn" | "wave" | "scallop";
export const TERRAIN_PALETTE = {
  ruled: ["#555f61", "#67716c", "#858d79"],
  furrow: ["#6b5542", "#856649", "#a58a61"],
  torn: ["#454e51", "#56615c", "#79896f"],
  wave: ["#41635f", "#52786d", "#7b9c85"],
  scallop: ["#496b50", "#5c805a", "#8b9f6c"],
} as const;
export function terrainPalette(kind: string): readonly [string, string, string] {
  return TERRAIN_PALETTE[kind as PixelTerrainKind] ?? TERRAIN_PALETTE.scallop;
}
export function pixelRect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
/** One authored cluster: rocks, furrows, reeds or little grass fans, never uniform noise. */
export function pixelTerrainCluster(ctx: Ctx, x: number, y: number, seed: number, kind: string): void {
  const q = (dx: number, dy: number, w: number, h: number, c: string) => pixelRect(ctx, x + dx, y + dy, w, h, c);
  const variation=Math.floor(hash(seed+41)*3);
  const rosette=(dx:number,dy:number)=>{
    q(dx-4,dy+1,9,2,"#586542");q(dx-4,dy-2,4,4,"#73824b");
    q(dx,dy-3,5,4,"#819353");q(dx-2,dy-4,4,4,"#96a266");
    q(dx,dy-2,1,4,"#647b47");
  };
  if (kind === "ruled") {
    // Irregular flush paving: different lengths, clipped corners and joints,
    // with restrained moss in one gap rather than a line of outlined bricks.
    const stones=variation===0?[[-15,-2,12,6],[-1,-4,9,7],[9,0,7,5],[-9,6,10,6],[3,8,11,5]]:
      variation===1?[[-14,0,8,5],[-4,-2,14,7],[11,4,6,5],[-3,7,10,5]]:
      [[-16,3,13,7],[-1,1,10,8],[11,-2,6,6],[-7,-4,9,4]];
    for(const [dx,dy,w,h] of stones){
      q(dx!+1,dy!,w!-2,h!,"#737b70");q(dx!,dy!+1,w!,h!-2,"#737b70");
      q(dx!+2,dy!,Math.max(2,w!-5),1,"#89907d");
      q(dx!+2,dy!+h!-1,w!-4,1,"#586463");
    }
    if(variation===1){q(-9,7,4,2,"#63745b");q(-8,6,2,1,"#7e8967");}
  } else if (kind === "furrow") {
    // Short cultivated rows are filled by broad overlapping low crop leaves,
    // not floating seedlings above bright parallel lines.
    for(let row=0;row<2;row++){
      const dy=row*12,offset=row%2?3:0;
      q(-16+offset,dy+3,27,3,"#715a42");q(-13+offset,dy+5,23,1,"#5d503e");
      for(let col=0;col<3;col++){
        const dx=-11+col*11+offset;
        if(variation===2){
          q(dx-4,dy,8,3,"#8a7e4c");
          for(const [xx,yy] of [[-3,-4],[0,-7],[3,-3]]){
            q(dx+xx!,dy+yy!+2,1,6,"#a18d57");q(dx+xx!-1,dy+yy!,3,4,"#b3a06b");
          }
        }else rosette(dx,dy);
      }
    }
  } else if (kind === "wave") {
    // A low reed fan bends outward and is grounded by shallow silt stones.
    q(-10,3,22,3,"#476c61");q(-7,1,14,3,"#557c68");
    for(const [dx,height,lean] of [[-6,8,-3],[-2,12,-1],[3,10,2],[7,7,3]]){
      q(dx!,1-height!,1,height!+3,"#80976c");
      q(dx!+lean!,-height!+2,1,Math.max(2,height!-5),"#6c8b63");
      q(dx!+Math.sign(lean!),-1,2,2,"#91a075");
      if(dx===-2||dx===3){q(dx!-1,-height!,3,4,"#a29166");q(dx!,-height!,1,2,"#bdab7b");}
    }
    q(11,4,8,3,"#607d73");q(12,3,6,2,TERRAIN_PALETTE.wave[2]);
    if(variation===1){q(-15,5,6,2,"#6a8678");q(-14,4,3,1,"#96a48c");}
  } else if(kind === "torn") {
    // Moss follows a broken root, and a fern opens in paired pinnae rather
    // than a picket-fence row of grass stems.
    q(-14,5,13,2,"#454e48");q(-3,3,10,2,"#454e48");q(5,0,7,2,"#454e48");
    q(-11,4,8,1,"#747361");q(-2,2,7,1,"#747361");
    q(-11,6,8,3,"#60715a");q(-8,5,5,2,"#768568");q(3,3,6,2,"#65765a");
    const fx=variation===1?9:-2;
    q(fx,-6,1,10,"#83916e");
    for(let n=0;n<3;n++){
      const yy=-5+n*3,width=2+n;
      q(fx-width,yy,width,2,"#708668");q(fx+1,yy-1,width,2,"#819271");
      q(fx-width-1,yy-1,2,1,"#8f9c78");
    }
    if(variation===2){q(11,6,6,2,"#5e6a61");q(12,4,4,2,"#839080");}
  } else {
    // Meadow flowers grow in three linked leafy clumps, with a few open
    // grassy intervals. Flower heads are muted masses rather than white dots.
    for(const [dx,dy,tone] of [[-11,1,0],[-2,-2,1],[9,3,2]]){
      q(dx!-4,dy!+2,9,2,"#526e4d");q(dx!-3,dy!-1,6,4,"#708a53");
      q(dx!,dy!-4,1,7,"#8da16b");
      q(dx!-4,dy!,3,2,"#849858");q(dx!+2,dy!-2,3,2,"#83985e");
      if((variation+tone!)%3!==2){
        const color=["#c1ae83","#b99c8e","#a7b292"][(variation+tone!)%3]!;
        q(dx!-2,dy!-5,5,2,color);q(dx!-1,dy!-6,3,4,color);
        q(dx!,dy!-5,1,1,"#d0bd8d");
      }
    }
  }
}

/** Reuse biome identity/placement, replace every flat detail painter with native pixels. */
export function pixelBiomeArt(art: BiomeArt): BiomeArt {
  return {
    ...art,
    patch(ctx, x, y, r, seed) {
      const kind = art.sheet.seam, [dark, mid, light] = terrainPalette(kind),
        count = Math.max(3, Math.min(6, Math.round(r / 15)));
      ctx.save();
      // Group motifs in staggered rows with open space, rather than noise across a disc.
      for (let i = 0; i < count; i++) {
        const column = i % 3, row = Math.floor(i / 3),
          px = x + (column - 1) * r * 0.54 + (row % 2) * 8,
          py = y + (row - 1) * r * 0.25 + (hash(seed + i * 17) - 0.5) * 6 + (kind === "wave" ? 6 : 0);
        if (i === 0 || hash(seed + i * 37) > 0.14) pixelTerrainCluster(ctx, px, py, seed + i * 131, kind);
      }
      if (kind === "ruled" && hash(seed+71)>.48) {
        // A flush narrow drain belongs to the paving, without a raised rim.
        pixelRect(ctx,x+8,y+1,20,8,"#596461");
        pixelRect(ctx,x+9,y+2,18,5,"#424f51");
        for(let i=0;i<5;i++)pixelRect(ctx,x+11+i*3,y+2,1,5,"#7c8779");
        pixelRect(ctx,x+9,y,17,1,"#858e7c");
      } else if (kind === "torn") {
        // A small broken graveyard flag with moss creeping along its shadowed foot.
        pixelRect(ctx, x + 4, y + 2, 22, 10, dark);
        pixelRect(ctx, x + 6, y - 2, 18, 10, mid);
        pixelRect(ctx, x + 10, y - 4, 12, 4, light);
        pixelRect(ctx, x + 12, y + 6, 16, 4, "#667c59");
      } else if (kind === "furrow") {
        // Fallen squash/gourd cluster, volume built from stepped three-tone pixels.
        for (let i = 0; i < 2; i++) {
          const px = x - 8 + i * 16, py = y + i * 4;
          pixelRect(ctx, px - 6, py + 2, 14, 8, "#674b3f");
          pixelRect(ctx, px - 6, py, 12, 8, "#a57c50");
          pixelRect(ctx, px - 4, py - 2, 8, 4, "#bf9a65");
          pixelRect(ctx, px, py - 4, 2, 4, "#708450");
        }
      } else if (kind === "scallop") {
        // A small clover seam ties the flower groups into the surrounding turf.
        for(const [dx,dy] of [[-7,4],[-2,6],[5,5]]){
          pixelRect(ctx,x+dx!,y+dy!,5,2,"#72905c");
          pixelRect(ctx,x+dx!+1,y+dy!-1,3,1,"#8ca16b");
        }
      }
      ctx.restore();
    },
  };
}
