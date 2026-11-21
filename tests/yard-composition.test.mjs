import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawDistantLandscape} from '../dist/render/pixel-distant-landscape.js';
import {WORLD} from '../dist/game/world-gen.js';

function raster(){
  const pixels=new Map(),stack=[];let color='#000';
  const ctx={
    get fillStyle(){return color;},set fillStyle(v){color=v;},
    save(){stack.push(color);},restore(){color=stack.pop();},
    fillRect(x,y,w,h){
      assert.ok([x,y,w,h].every(Number.isInteger),'background retains native pixels');
      assert.ok(y>=80&&y+h<WORLD.playTop,'scenic lake remains outside playable water space');
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels.set(`${xx},${yy}`,color);
    },
  };
  return {ctx,pixels,stack};
}

test('distant lake and farm scenery join identically across independently cached chunks',()=>{
  const whole=raster(),parts=raster();
  drawDistantLandscape(whole.ctx,-480,1440);
  for(const x of [-480,0,480,960])drawDistantLandscape(parts.ctx,x,x+480);
  assert.ok(whole.pixels.size>100000,'nonempty continuous distant landscape');
  assert.deepEqual(parts.pixels,whole.pixels,'chunk boundaries cannot alter lake/shore pixels');
  assert.deepEqual(whole.stack,[]);assert.deepEqual(parts.stack,[]);
  assert.equal(whole.ctx.fillStyle,'#000');
});
