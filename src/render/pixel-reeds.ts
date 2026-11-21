import type { Ctx } from "./paper-material.js";

type Point=readonly [number,number];
const PALETTES=[
  ["#4f6545","#7c8952","#a7aa70"],["#5c714d","#8e985e","#b7b77b"],
  ["#425d47","#6c7d4d","#98a267"],["#626c49","#9b9968","#bfbb87"],
] as const;

/** Native cached cattails. No water patch is painted: only existing stalks,
 * attached leaves and grounded cut vegetation, with no gameplay side effects. */
export function drawPixelReeds(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,damaged=phase==="damaged",scraps=phase==="scraps";
  const colors=burnt?["#303f3c","#5e6c5a","#91937c"] as const:PALETTES[v]!;
  const head=burnt?"#3c4441":"#755440",headLight=burnt?"#8a8974":"#ab8055";
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const left=Math.round(x+px*s),top=Math.round(y+py*s);
    ctx.fillStyle=col;ctx.fillRect(left,top,Math.max(1,Math.round(x+(px+w)*s)-left),Math.max(1,Math.round(y+(py+h)*s)-top));
  };
  const polygon=(points:readonly Point[],col:string)=>{
    const low=Math.ceil(Math.min(...points.map(p=>p[1]))),high=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let py=low;py<high;py++){
      const cuts:number[]=[];
      for(let i=0;i<points.length;i++){
        const a=points[i]!,b=points[(i+1)%points.length]!;
        if((a[1]<=py+.5&&b[1]>py+.5)||(b[1]<=py+.5&&a[1]>py+.5))cuts.push(a[0]+(py+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      cuts.sort((a,b)=>a-b);
      for(let i=0;i+1<cuts.length;i+=2){const l=Math.round(cuts[i]!),rr=Math.round(cuts[i+1]!);if(rr>l)r(l,py,rr-l,1,col);}
    }
  };
  const line=(a:Point,b:Point,col:string,w=1)=>{
    let ax=Math.round(a[0]),ay=Math.round(a[1]);const bx=Math.round(b[0]),by=Math.round(b[1]);
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;
    let error=dx+dy;
    while(true){r(ax,ay,w,w,col);if(ax===bx&&ay===by)break;const e=error*2;if(e>=dy){error+=dy;ax+=sx;}if(e<=dx){error+=dx;ay+=sy;}}
  };
  const blade=(root:number,height:number,lean:number,width:number,col:string,bent=false)=>{
    const left:Point[]=[],right:Point[]=[];
    for(let i=0;i<=10;i++){
      const t=i/10,cx=root+lean*t*t,cy=2-height*t+(bent?height*.52*t*t:0);
      const half=width*(1-t)*(.65+Math.sin(Math.PI*t)*.55);
      left.push([cx-half,cy]);right.push([cx+half,cy]);
    }
    // A body-colored spine guarantees an eight-connected taper even where
    // both polygon sides round to the same native column near the tip.
    const spine:Point[]=[];
    for(let i=0;i<=10;i++){const t=i/10;spine.push([root+lean*t*t,2-height*t+(bent?height*.52*t*t:0)]);}
    for(let i=1;i<spine.length;i++)line(spine[i-1]!,spine[i]!,col);
    polygon([...left,...right.reverse()],col);
    // Short lower/middle crease leaves the broad blade material exposed on
    // both sides. Extending this pale line to every tip reads as neon wire.
    const mid:Point[]=[];
    for(let i=0;i<=4;i++){const t=.18+i*.1;mid.push([root+lean*t*t,2-height*t+(bent?height*.52*t*t:0)]);}
    for(let i=1;i<mid.length;i++)line(mid[i-1]!,mid[i]!,colors[2]);
  };
  // Small root shadows are separate, not a broad dark strip across the patch.
  for(const root of [-12,1,13]){r(root-4,3,8,1,"#3d5746");r(root-2,4,4,1,"#3d5746");}
  if(scraps){
    for(const [root,h] of [[-14,8],[-5,6],[3,10],[12,7],[18,5]]){
      polygon([[root!-2,3],[root!-1,-h!],[root!+1,-h!+1],[root!+2,3]],colors[1]);
      r(root!-1,-h!,2,1,colors[2]);
    }
    polygon([[-25,2],[-12,-1],[-3,2],[-16,4]],colors[1]);
    polygon([[6,1],[24,-1],[28,2],[11,5]],colors[1]);
    line([-23,2],[-6,2],colors[2]);line([9,2],[25,1],colors[2]);
    r(-6,3,5,2,head);r(-5,3,3,1,headLight);
    if(burnt){r(-17,4,5,1,"#8a8e79");r(13,5,5,1,"#a0a28a");}
    ctx.restore();return;
  }
  // Back leaves form irregular arching fans, not nine equally spaced stakes.
  for(const [root,h,lean,w] of [[-13,35,-13,2.2],[-8,39,-3,2.7],[0,45,5,2.4],
    [9,36,14,2.4],[14,31,12,2.3],[-12,26,-15,2.4],[12,25,-7,2.1]]){
    const i=Math.round(root!+14);
    const cut=damaged&&(root===-8||root===9);
    blade(root!,cut?h!*.48:h!+(v%2?2:0),lean!+(v===2?-1:0),w!,colors[i%2],damaged&&!cut&&root===14);
  }
  // Three connected cattail stalks rise above the blades at different heights.
  const stems=[[-13,-17+(v%2),-45],[1,4+(v===3?1:0),-51],[13,20-(v%2),-38]] as const;
  for(let i=0;i<stems.length;i++){
    const [root,hx,hy]=stems[i]!,tipY=hy+(v===2?1:0);
    if(damaged&&i===1){line([root,2],[root+1,-16],colors[1],2);r(root+1,-16,2,1,colors[2]);continue;}
    const bend:Point=[root+(hx-root)*.25,-20];
    line([root,2],bend,colors[1],2);line(bend,[hx,tipY+6],colors[1],2);
    line([hx+1,tipY+5],[hx,tipY-7],colors[2]);
    polygon([[hx-1,tipY-6],[hx+2,tipY-6],[hx+3,tipY-4],[hx+3,tipY+4],[hx+1,tipY+6],[hx-2,tipY+4],[hx-2,tipY-4]],head);
    r(hx+1,tipY-4,1,8,headLight);r(hx,tipY-5,2,1,headLight);
  }
  // Foreground leaves curl around and visibly meet the same root collars.
  blade(-11,27,11,4,colors[1],damaged);
  blade(1,30,6,3.8,colors[1],damaged);
  blade(12,26,-12,4,colors[1]);
  for(const root of [-12,1,13]){r(root-3,1,6,3,colors[0]);r(root-1,0,2,3,colors[1]);}
  ctx.restore();
}
