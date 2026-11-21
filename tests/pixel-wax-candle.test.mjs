import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelWaxCandle} from '../dist/render/pixel-wax-candle.js';
import {WAX_CANDLE_ART} from '../dist/defs/props/wax-candle/art.js';

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
test('standing wax keeps its wick under the existing live flame anchor after damage',()=>{
  assert.deepEqual(WAX_CANDLE_ART.flames,[[2,-47]]);
  for(let v=0;v<3;v++)for(const phase of ['intact','damaged'])for(const burnt of [false,true]){
    const {ctx,pixels,stack}=raster();drawPixelWaxCandle(ctx,0,0,1,v,phase,burnt);
    assert.ok(pixels.has('2,-47'),`${v}/${phase}/${burnt}: wick must meet existing flame anchor`);
    assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(stack,[]);
  }
});
test('spent wax is a low grounded melt rather than a tall ash remnant',()=>{
  for(let v=0;v<3;v++){
    const {ctx,pixels}=raster();drawPixelWaxCandle(ctx,0,0,1,v,'scraps',true);
    assert.ok(pixels.size>100,'melted wax has a tangible tray footprint');
    for(const p of pixels){const[x,y]=p.split(',').map(Number);assert.ok(x>=-25&&x<26&&y>=-12&&y<15,`melt stays grounded within its tray bounds: ${p}`);}
  }
});
