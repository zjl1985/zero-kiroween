import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelLaundryLine} from '../dist/render/pixel-laundry-line.js';
import {drawPixelPaperLanterns} from '../dist/render/pixel-paper-lanterns.js';

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
for(const [id,paint,anchor,bounds] of [
  ['laundry-line',drawPixelLaundryLine,42,[-52,-62,52,8]],
  ['paper-lanterns',drawPixelPaperLanterns,34,[-44,-74,44,10]],
])test(`${id} retains grounded supports and attached hanging parts in all visual states`,()=>{
  for(let v=0;v<4;v++)for(const phase of ['intact','damaged','scraps'])for(const burnt of [false,true]){
    const {ctx,pixels,stack}=raster();paint(ctx,0,0,1,v,phase,burnt);
    const label=`${id}/${v}/${phase}/${burnt}`;
    assert.ok(pixels.size>0,label);
    for(const point of pixels){const[x,y]=point.split(',').map(Number);assert.ok(x>=bounds[0]&&x<bounds[2]&&y>=bounds[1]&&y<bounds[3],`${label} clipped pixel ${point}`);}
    for(const x of [-anchor,anchor])assert.ok(pixels.has(`${x},-1`),`${label} post must meet its existing collider foot`);
    if(phase!=='scraps'){
      const seen=new Set(),queue=[`${-anchor},-1`,`${anchor},-1`];
      for(let n=0;n<queue.length;n++){
        const point=queue[n];if(seen.has(point)||!pixels.has(point))continue;seen.add(point);
        const[x,y]=point.split(',').map(Number);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const next=`${x+dx},${y+dy}`;if(pixels.has(next)&&!seen.has(next))queue.push(next);}
      }
      for(const point of pixels)if(Number(point.split(',')[1])<-16)assert.ok(seen.has(point),`${label} suspended pixel ${point} has no connected ground support`);
    }
    assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(stack,[]);
  }
});
