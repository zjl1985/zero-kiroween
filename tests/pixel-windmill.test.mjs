import assert from 'node:assert/strict';
import {test} from 'node:test';
import {drawPixelWindmillRotor} from '../dist/render/pixel-windmill-rotor.js';
import {LANDMARK_ART} from '../dist/render/art-index.js';

function canvas(){
  const calls=[],stack=[];let state={fillStyle:'#123456',imageSmoothingEnabled:true};
  const ctx={
    get fillStyle(){return state.fillStyle;},set fillStyle(v){state.fillStyle=v;},
    get imageSmoothingEnabled(){return state.imageSmoothingEnabled;},set imageSmoothingEnabled(v){state.imageSmoothingEnabled=v;},
    save(){stack.push({...state});},restore(){assert.ok(stack.length);state=stack.pop();},
    fillRect(x,y,w,h){calls.push([x,y,w,h,state.fillStyle]);},
  };
  return {ctx,calls,stack};
}

test('windmill rotor stays inside existing live bounds at every sampled angle and scale',()=>{
  const b=LANDMARK_ART.get('paper-windmill').pieces.find(p=>p.kind==='windmill').bounds;
  for(const scale of [.65,1,1.4])for(let frame=0;frame<96;frame++){
    const c=canvas(),x=121,y=317;
    drawPixelWindmillRotor(c.ctx,x,y,scale,frame%3,frame*Math.PI/48);
    assert.ok(c.calls.length>100&&c.calls.length<=1800,'bounded live raster workload');
    for(const [px,py,w,h] of c.calls){
      assert.ok([px,py,w,h].every(Number.isInteger)&&w>0&&h>0,'native integer pixel runs');
      assert.ok(px>=x+b.l*scale-1&&px+w<=x+b.r*scale+1&&py>=y+b.t*scale-1&&py+h<=y+b.b*scale+1,'rotating sails fit existing culling/cache extent');
    }
    assert.equal(c.ctx.fillStyle,'#123456');assert.equal(c.ctx.imageSmoothingEnabled,true);assert.deepEqual(c.stack,[]);
  }
});

test('windmill activity angle remains authoritative and renderer never advances its state',()=>{
  const piece=LANDMARK_ART.get('paper-windmill').pieces.find(p=>p.kind==='windmill');
  const activity=Object.freeze({turn:1.25});
  const a=canvas(),b=canvas(),idle=canvas(),later=canvas();
  piece.live(a.ctx,0,0,1,0,3,activity);piece.live(b.ctx,0,0,1,0,17,activity);
  assert.deepEqual(a.calls,b.calls,'world time cannot override an interaction-driven angle');
  piece.live(idle.ctx,0,0,1,0,0);piece.live(later.ctx,0,0,1,0,3);
  assert.notDeepEqual(idle.calls,later.calls,'unpowered rotor still follows the existing idle timing');
  assert.equal(activity.turn,1.25);
});
