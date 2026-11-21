import type { PixelStackModel } from "./pixel-stack.js";

type Point = readonly [number, number];
const FOOT: readonly Point[] = [[-10,-3],[-6,-6],[3,-6],[9,-3],[11,2],[5,6],[-5,7],[-11,3]];
const CROWN: readonly Point[] = [[-7,-2],[-5,-4],[2,-4],[5,-1],[4,3],[0,4],[-5,3],[-8,1]];

/** Angular rock cross-sections, with face colours reaching the exposed contour. */
export function stoneModel(variant: number): PixelStackModel {
  const v = Math.abs(variant) % 3;
  const [dark, side, face, top, seam] = [
    ["#3d4656", "#566573", "#7c898c", "#a8b0a1", "#626d72"],
    ["#474655", "#6c6770", "#958b88", "#bbb09c", "#776d72"],
    ["#364c51", "#536f6b", "#7c9282", "#a8b49b", "#5c776e"],
  ][v]!;
  return { id: `scene:stone:facets:${v}`, width: 36, depth: 28, count: 18,
    paint(c, z) {
      if (z > 10.5) return;
      // A near-vertical foot and a broad, off-centre crown replace the cone.
      const t = Math.max(0, (z - 1.5) / 9);
      const ring = FOOT.map(([x,y],i): Point => {
        const [tx,ty] = CROWN[i]!;
        return [x+(tx-x)*t+(v===1?t:0), y+(ty-y)*t];
      });
      const colors = [side,face,top,face,side,face,side,dark];
      for (let py=-14;py<=14;py++) {
        const y=py/2+.25, cuts:number[]=[];
        for(let i=0;i<ring.length;i++) {
          const [ax,ay]=ring[i]!,[bx,by]=ring[(i+1)%ring.length]!;
          if((ay<=y&&by>y)||(by<=y&&ay>y)) cuts.push(ax+(y-ay)*(bx-ax)/(by-ay));
        }
        if(cuts.length<2)continue;
        const left=Math.ceil(Math.min(...cuts)*2),right=Math.floor(Math.max(...cuts)*2);
        for(let px=left;px<right;px++) {
          const x=px/2+.25;
          let nearest=Infinity,edge=0;
          for(let i=0;i<ring.length;i++) {
            const [ax,ay]=ring[i]!,[bx,by]=ring[(i+1)%ring.length]!;
            const dx=bx-ax,dy=by-ay;
            const distance=Math.abs(dx*(y-ay)-dy*(x-ax))/Math.hypot(dx,dy);
            if(distance<nearest){nearest=distance;edge=i;}
          }
          let color=z<1?dark:z===10.5?top:colors[edge]!;
          // One connected fissure on the crown, rather than all-over speckle.
          if(z===10.5 && x>-1 && x<3 && Math.abs(y-(x<1?-.5:0))<.3)color=seam;
          c.fillStyle=color;c.fillRect(px,py,1,1);
        }
      }
    },
  };
}
