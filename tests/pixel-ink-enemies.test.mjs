import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelInkBlob} from '../dist/render/pixel-ink-blob.js';
import {drawPixelSmudge} from '../dist/render/pixel-smudge.js';
// Raster occupancy independently guards detached foliage and cache clipping.
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

for(const [name,draw,bounds] of [['ink blob',drawPixelInkBlob,[-17,-28,18,2]],['smudge',drawPixelSmudge,[-20,-42,29,2]]])
test(`${name} keeps animated and washed material grounded and inside its sprite`,()=>{
  for(const frame of [0,1])for(const attack of [false,true])for(const wash of [0,.5,1]){
    const {ctx,pixels,stack}=raster();draw(ctx,frame,attack,wash);
    const seen=new Set(),queue=[...pixels].filter(p=>Number(p.split(',')[1])>=-2);
    assert.ok(queue.length>0,'missing ground support');
    for(let n=0;n<queue.length;n++){const p=queue[n];if(seen.has(p))continue;seen.add(p);const[x,y]=p.split(',').map(Number);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const q=`${x+dx},${y+dy}`;if(pixels.has(q)&&!seen.has(q))queue.push(q);}}
    for(const p of pixels){const[x,y]=p.split(',').map(Number);assert.ok(x>=bounds[0]&&x<bounds[2]&&y>=bounds[1]&&y<bounds[3],`clipped ${p}`);assert.ok(seen.has(p),`detached ${p}, frame${frame}, attack${attack}, wash${wash}`);}
    if(name==='smudge'&&attack)assert.ok([...pixels].some(p=>Number(p.split(',')[1])<-32),'charge cue missing from still frame');
    assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(stack,[]);
  }
});
