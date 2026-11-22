import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelWashEnemy} from '../dist/render/pixel-wash-enemy.js';
import {drawPixelPaperBat} from '../dist/render/pixel-paper-bat.js';
import {drawPixelCrumple} from '../dist/render/pixel-crumple.js';
import {drawPixelSketchEnemy} from '../dist/render/pixel-sketch-enemy.js';
import {drawPixelKiroGhost} from '../dist/render/pixel-kiro-ghost.js';
import {drawPixelEraserBoss} from '../dist/render/pixel-eraser-boss.js';
// Raster occupancy independently guards detached foliage and cache clipping.
function raster() {
  const pixels=new Set(), stack=[];let state={x:0,y:0,sx:1,sy:1,fillStyle:'#123456'};
  const ctx={
    get fillStyle(){return state.fillStyle;},set fillStyle(v){state.fillStyle=v;},
    save(){stack.push({...state});},restore(){state=stack.pop();},
    translate(x,y){state.x+=x*state.sx;state.y+=y*state.sy;},scale(x,y){state.sx*=x;state.sy*=y;},
    fillRect(x,y,w,h){
      assert.ok([x,y,w,h].every(Number.isFinite)&&w>0&&h>0);
      const ax=Math.round(state.x+x*state.sx),ay=Math.round(state.y+y*state.sy);
      const bx=Math.round(state.x+(x+w)*state.sx),by=Math.round(state.y+(y+h)*state.sy);
      const l=Math.min(ax,bx),r=Math.max(ax,bx),t=Math.min(ay,by),b=Math.max(ay,by);
      for(let yy=t;yy<b;yy++)for(let xx=l;xx<r;xx++)pixels.add(`${xx},${yy}`);
    },
  };return{ctx,pixels,stack};
}

for(const [name,draw,bounds] of [['wash',drawPixelWashEnemy,[-16,-40,17,3]],['paper bat',drawPixelPaperBat,[-27,-40,27,-8]]])
test(`${name} keeps animated and washed body connected and inside its sprite`,()=>{
  for(const frame of [0,1])for(const attack of [false,true])for(const wash of [0,.5,1]){
    const {ctx,pixels,stack}=raster();draw(ctx,frame,attack,wash);
    const seen=new Set(),queue=name==='paper bat'?[...pixels].filter(p=>{const[x,y]=p.split(',').map(Number);return Math.abs(x)<=2&&y>=-22&&y<=-12;}):[...pixels].filter(p=>Number(p.split(',')[1])>=-2);
    assert.ok(queue.length>0,'missing ground support');
    for(let n=0;n<queue.length;n++){const p=queue[n];if(seen.has(p))continue;seen.add(p);const[x,y]=p.split(',').map(Number);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const q=`${x+dx},${y+dy}`;if(pixels.has(q)&&!seen.has(q))queue.push(q);}}
    for(const p of pixels){const[x,y]=p.split(',').map(Number);assert.ok(x>=bounds[0]&&x<bounds[2]&&y>=bounds[1]&&y<bounds[3],`clipped ${p}`);assert.ok(seen.has(p),`detached ${p}, frame${frame}, attack${attack}, wash${wash}`);}
    if(name==='paper bat')for(const p of pixels){const[x,y]=p.split(',').map(Number);if(Math.abs(x)<=7)assert.ok(y>=-28,`wing overlaps crown at ${p}`);}
    assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(stack,[]);
  }
});

for (const [name, draw, bounds, grounded, poses] of [
  ['crumple',drawPixelCrumple,[-22,-31,22,2],true,[false]],
  ['pencil sketch',drawPixelSketchEnemy,[-21,-32,21,2],true,[false]],
  ['ghost',drawPixelKiroGhost,[-23,-43,24,-3],false,[false]],
  ['eraser',drawPixelEraserBoss,[-48,-90,49,2],true,['idle','sweep','charge','summon']],
]) test(`${name} has connected pixel poses that fit the atlas through wash states`, () => {
  const [left,top,right,bottom] = bounds, silhouettes = [];
  for (const pose of poses) for (const wash of [0,.5,1]) {
    const pair = [];
    for (const frame of [0,1]) {
      const {ctx,pixels,stack} = raster();
      draw(ctx,frame,pose,wash);
      assert.ok(pixels.size>160);
      const seen = new Set([pixels.values().next().value]), queue = [...seen];
      let touchesGround = false;
      for (let i=0; i<queue.length; i++) {
        const [x,y] = queue[i].split(',').map(Number);
        assert.ok(x>=left && x<right && y>=top && y<bottom, `pixel ${x},${y} exceeded bounds`);
        touchesGround ||= y >= -1;
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const neighbor = `${x+dx},${y+dy}`;
          if (pixels.has(neighbor) && !seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
        }
      }
      assert.equal(seen.size,pixels.size,'no disconnected limbs or texture fragments');
      assert.equal(touchesGround,grounded,'the authored character uses the same foot or hover height');
      assert.deepEqual(stack,[]);
      assert.equal(ctx.fillStyle,'#123456');
      pair.push([...pixels].sort().join('|'));
    }
    assert.notEqual(pair[0],pair[1],'both native poses change silhouette');
    if (wash===0) silhouettes.push(pair[0]);
  }
  assert.equal(new Set(silhouettes).size,poses.length,'different attack poses have distinct silhouettes');
});
