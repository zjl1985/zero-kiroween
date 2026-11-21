import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelReeds} from '../dist/render/pixel-reeds.js';

// Raster occupancy, independent of colours or how a painter builds its cord.
function raster() {
  const pixels=new Set(), stack=[];let state={x:0,y:0,sx:1,sy:1,fillStyle:'#123456'};
  const ctx={
    get fillStyle(){return state.fillStyle;},set fillStyle(v){state.fillStyle=v;},
    save(){stack.push({...state});},restore(){state=stack.pop();},
    translate(x,y){state.x+=x*state.sx;state.y+=y*state.sy;},scale(x,y){state.sx*=x;state.sy*=y;},
    fillRect(x,y,w,h){
      assert.ok([x,y,w,h].every(Number.isFinite)&&w>0&&h>0);
      const l=Math.round(state.x+x*state.sx),t=Math.round(state.y+y*state.sy);
      const r=Math.round(state.x+(x+w)*state.sx),b=Math.round(state.y+(y+h)*state.sy);
      for(let yy=t;yy<b;yy++)for(let xx=l;xx<r;xx++)pixels.add(`${xx},${yy}`);
    },
  };return{ctx,pixels,stack};
}
test('reeds keep tapered leaves and seed heads connected to ground roots',()=>{
  for(let v=0;v<4;v++)for(const phase of ['intact','damaged','scraps'])for(const burnt of [false,true]){
    const {ctx,pixels,stack}=raster();drawPixelReeds(ctx,0,0,1,v,phase,burnt);
    const seen=new Set(),queue=[...pixels].filter(p=>Number(p.split(',')[1])>=0);
    for(let n=0;n<queue.length;n++){
      const p=queue[n];if(seen.has(p))continue;seen.add(p);
      const[x,y]=p.split(',').map(Number);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const next=`${x+dx},${y+dy}`;if(pixels.has(next)&&!seen.has(next))queue.push(next);}
    }
    for(const p of pixels){const[x,y]=p.split(',').map(Number);
      assert.ok(x>=-34&&x<34&&y>=-60&&y<10,`clipped reed ${p}`);
      if(y<-12)assert.ok(seen.has(p),`detached tip ${p}, variant ${v}, ${phase}, burnt ${burnt}`);
    }
    assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(stack,[]);
  }
});
