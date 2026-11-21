import type { Ctx } from "./paper-material.js";

const GREENS=[
  ["#4c6548","#748451","#98a066"],["#596f4b","#87915b","#acaf76"],
  ["#425e47","#647c4e","#8e9d65"],["#626f4c","#929267","#b4b47f"],
] as const;

/** Direct native ground-cover fans; authored root/leaf groups use no RNG. */
export function drawPixelGrass(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,scraps=phase==="scraps",damaged=phase==="damaged";
  const colors=burnt?["#30383c","#5c625e","#919083"] as const:GREENS[v]!;
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const l=Math.round(x+px*s),t=Math.round(y+py*s);ctx.fillStyle=col;
    ctx.fillRect(l,t,Math.max(1,Math.round(x+(px+w)*s)-l),Math.max(1,Math.round(y+(py+h)*s)-t));
  };
  const line=(ax:number,ay:number,bx:number,by:number,col:string)=>{
    ax=Math.round(ax);ay=Math.round(ay);bx=Math.round(bx);by=Math.round(by);
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let err=dx+dy;
    while(true){r(ax,ay,1,1,col);if(ax===bx&&ay===by)break;const e=err*2;if(e>=dy){err+=dy;ax+=sx;}if(e<=dx){err+=dx;ay+=sy;}}
  };
  const blade=(root:number,base:number,height:number,lean:number,width:number,col:string)=>{
    // Body-coloured connected spine survives one-pixel taper rounding.
    let lastX=root,lastY=base;
    for(let i=1;i<=12;i++){const t=i/12,nx=root+lean*t*t,ny=base-height*t;line(lastX,lastY,nx,ny,col);lastX=nx;lastY=ny;}
    for(let row=0;row<height;row++){
      const t=row/height,cx=root+lean*t*t,half=width*(1-t)*(.65+.6*Math.sin(Math.PI*t));
      const left=Math.round(cx-half),right=Math.round(cx+half);
      r(left,base-row,Math.max(1,right-left),1,col);
      if(t>.2&&t<.52)r(Math.round(cx),base-row,1,1,colors[2]);
    }
  };
  const fans=[
    {root:-35,base:-2,heights:[17,24,29,21,17,23],leans:[-9,-5,3,10,-13,6]},
    {root:-18,base:4,heights:[14,23,20,17,15,19],leans:[-9,-2,7,13,-6,8]},
    {root:19,base:-6,heights:[28,34,26,22,18,30],leans:[-12,-4,5,11,-7,9]},
    {root:35,base:2,heights:[14,21,18,24,16,20],leans:[-9,-4,3,11,-6,9]},
  ];
  for(let group=0;group<fans.length;group++){
    const {root,base,heights,leans}=fans[group]!;
    r(root-6,base+2,12,1,"#415b43");r(root-4,base+1,8,2,colors[0]);
    if(scraps){
      if(burnt){
        r(root-7,base,13,3,colors[0]);r(root-4,base-1,7,3,colors[1]);
        r(root-2,base+1,4,1,colors[2]);r(root+5,base+2,3,1,colors[1]);
      }
      for(const [dx,h] of [[-4,5],[0,8],[4,4]]){r(root+dx!,base-h!,2,h!+2,colors[1]);r(root+dx!,base-h!,2,1,colors[2]);}
      r(root-9,base+4,8,2,colors[1]);r(root-8,base+4,6,1,colors[2]);
      r(root+2,base+5,9,1,colors[1]);continue;
    }
    // Unequal shoulders and heights form four open fans, not a picket row.
    for(let leaf=0;leaf<6;leaf++){
      const cut=damaged&&(leaf===1||leaf===3||leaf===5);
      const height=cut?9+(group+leaf)%4:heights[leaf]!+(v===1?2:0);
      const rootX=root+(leaf%3-1)*2;
      blade(rootX,base,height,cut?leans[leaf]!*.35:leans[leaf]!,leaf>3?3.9:group===2?3.2:2.8,colors[leaf<2?0:1]);
      if(cut)r(Math.round(rootX+leans[leaf]!*.35)-1,base-height,3,1,colors[2]);
    }
    // A short basal fold gathers the blades without covering their airy tops.
    r(root-4,base,8,2,colors[0]);r(root-1,base-1,3,3,colors[1]);
    if(damaged){r(root-8,base+4,7,1,colors[1]);r(root+1,base+5,9,1,colors[2]);}
  }
  ctx.restore();
}
