import type { Ctx } from "./paper-material.js";

type Point=readonly [number,number];
const BARK=[
  ["#3c3944","#62505c","#92807b"],["#403b40","#70594e","#9f8a72"],
  ["#353943","#574b5e","#8b7c8c"],["#414047","#6b5d60","#a18b80"],
] as const;

/** Crooked card tree, rendered as rooted native pixels without a stack lift. */
export function drawPixelDeadTree(ctx:Ctx,x:number,y:number,s:number,variant:number,phase:string,burnt:boolean):void {
  const v=Math.abs(variant)%4,damaged=phase==="damaged",scraps=phase==="scraps";
  const bark=burnt?["#292f34","#4c514e","#858174"] as const:BARK[v]!;
  const cut=burnt?"#929080":"#b5a18a";
  ctx.save();
  const r=(px:number,py:number,w:number,h:number,col:string)=>{
    const l=Math.round(x+px*s),t=Math.round(y+py*s);ctx.fillStyle=col;
    ctx.fillRect(l,t,Math.max(1,Math.round(x+(px+w)*s)-l),Math.max(1,Math.round(y+(py+h)*s)-t));
  };
  const poly=(points:readonly Point[],col:string)=>{
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
  const line=(a:Point,b:Point,col:string,width=1)=>{
    let ax=Math.round(a[0]),ay=Math.round(a[1]);const bx=Math.round(b[0]),by=Math.round(b[1]);
    const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let err=dx+dy;
    while(true){r(ax,ay,width,width,col);if(ax===bx&&ay===by)break;const e=err*2;if(e>=dy){err+=dy;ax+=sx;}if(e<=dx){err+=dx;ay+=sy;}}
  };
  const branch=(points:readonly Point[],width:number)=>{
    for(let i=1;i<points.length;i++){
      const a=points[i-1]!,b=points[i]!,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
      const wa=width*(1-(i-1)/points.length*.8),wb=i===points.length-1?.45:width*(1-i/points.length*.8);
      poly([[a[0]-nx*wa,a[1]-ny*wa],[b[0]-nx*wb,b[1]-ny*wb],[b[0]+nx*wb,b[1]+ny*wb],[a[0]+nx*wa,a[1]+ny*wa]],bark[0]);
      poly([[a[0],a[1]],[b[0],b[1]],[b[0]+nx*wb,b[1]+ny*wb],[a[0]+nx*wa,a[1]+ny*wa]],bark[1]);
      line(a,b,bark[1]); // Guarantees connected one-pixel twig tips.
      if(wa>1.7)line([a[0]+nx*.7,a[1]+ny*.7],[b[0]+nx*.4,b[1]+ny*.4],bark[2]);
    }
  };
  // Root buttresses meet the trunk and the ground; the shadow is tucked under
  // them rather than a detached wide oval beneath the entire branch canopy.
  r(-10,3,20,1,"#354940");r(-6,4,12,1,"#354940");
  poly([[-7,-5],[-3,-1],[-13,4],[-17,4]],bark[0]);
  poly([[4,-6],[8,-1],[17,3],[12,4],[5,1]],bark[1]);
  line([5,-3],[13,2],bark[2]);
  const lean=[-1,1,0,-2][v]!;
  if(scraps){
    poly([[-8,2],[-6,-13],[-2,-17],[0,-12],[3,-16],[6,-12],[8,2]],bark[0]);
    poly([[-1,-13],[3,-16],[6,-12],[8,2],[0,2]],bark[1]);
    poly([[-6,-13],[-2,-17],[0,-12],[3,-16],[6,-12],[3,-10],[-3,-10]],cut);
    branch([[-9,2],[-20,0],[-29,4]],2.5);branch([[-20,0],[-24,-5]],1.3);
    branch([[10,3],[22,-1],[31,2]],2);branch([[22,-1],[25,-6]],1.2);
    r(-5,-1,1,3,bark[2]);if(burnt){r(-15,5,5,1,"#8f8d7b");r(11,5,6,1,"#777c70");}
    ctx.restore();return;
  }
  if(damaged){
    // The broken crown has an exposed jagged end; one lower fork remains
    // physically attached rather than truncating every branch at one height.
    branch([[-3,-36],[-16,-44],[-25,-53+v]],3);
    branch([[-16,-44],[-19,-54+v]],1.6);
    poly([[-8,2],[-5,-24],[-7,-41],[-4,-47],[-1,-43],[2,-48],[5,-43],[5,-25],[9,2]],bark[0]);
    poly([[-1,1],[-1,-25],[-2,-42],[2,-48],[5,-43],[5,-25],[9,2]],bark[1]);
    poly([[-7,-41],[-4,-47],[-1,-43],[2,-48],[5,-43],[2,-39],[-3,-39]],cut);
    line([3,-37],[4,-20],bark[2]);
    branch([[12,3],[24,1],[30,4]],1.8);
  }else{
    branch([[-4,-46],[-19+lean,-55],[-31+lean,-68]],3.4);
    branch([[-19+lean,-55],[-20+lean,-70]],1.9);
    branch([[3,-55],[20+lean,-63],[31+lean,-77-v]],3.2);
    branch([[20+lean,-63],[30+lean,-61]],1.7);
    branch([[-1,-69],[-9+lean,-84],[-14+lean,-94+(v%2)]],2.6);
    branch([[-9+lean,-84],[-18+lean,-88]],1.4);
    branch([[1,-73],[10+lean,-86],[12+lean,-94-v%2]],2.2);
    branch([[10+lean,-86],[21+lean,-88]],1.3);
    poly([[-8,2],[-5,-28],[-8,-50],[-3+lean,-76],[1+lean,-76],[5,-50],[4,-28],[9,2]],bark[0]);
    poly([[-1,2],[-1,-27],[-3,-49],[-1+lean,-74],[1+lean,-76],[5,-50],[4,-28],[9,2]],bark[1]);
    poly([[3,1],[2,-26],[3,-49],[1+lean,-71],[4,-50],[4,-28],[7,1]],bark[2]);
    line([-5,-20],[-4,-31],bark[1]);line([-5,-47],[-3,-57],bark[2]);
  }
  // A deep dark knot and short bark fissures, without bright eyes or noise.
  r(-2,-37,4,6,bark[2]);r(-1,-38,2,8,bark[2]);
  r(-1,-36,2,5,burnt?"#202c30":"#292b36");r(-2,-35,1,3,burnt?"#202c30":"#292b36");
  line([0,-15],[-1,-23],bark[0]);line([2,-7],[1,-11],bark[0]);
  ctx.restore();
}
