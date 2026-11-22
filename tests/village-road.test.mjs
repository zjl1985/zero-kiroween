import assert from 'node:assert/strict';
import {test} from 'node:test';
import {roads} from '../dist/game/world-gen.js';
import {drawRoadNetwork,roadRasterColor,worldRoadDistance} from '../dist/render/road-art.js';
import {VILLAGE_PIXELS} from '../dist/render/village-pixels.js';
function record(seed,view){
  const pixels=new Map(),ctx={fillStyle:'',fillRect(x,y,w,h){
    assert.ok([x,y,w,h].every(n=>Number.isInteger(n)&&n%2===0));assert.equal(h,2);
    for(let xx=x;xx<x+w;xx+=2){const key=`${xx},${y}`;assert.ok(!pixels.has(key),`union writes ${key} only once`);pixels.set(key,this.fillStyle);}
  }};
  for(const _ of drawRoadNetwork(ctx,seed,view)){}return pixels;
}
function independentlyInside(seed,x,y){
  return roads(seed).some(r=>r.points.slice(1).some((b,i)=>{
    const a=r.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<=r.width;
  }));
}
test('southern junction paints each union pixel once and preserves the actual route footprint',()=>{
  const view={x0:400,y0:530,x1:760,y1:780},pixels=record(7,view);
  assert.ok(pixels.size>2000);
  for(let y=view.y0;y<view.y1;y+=2)for(let x=view.x0;x<view.x1;x+=2)
    assert.equal(pixels.has(`${x},${y}`),independentlyInside(7,x+1,y+1),`actual footprint (${x},${y})`);
});
test('junction texture and turf edges have identical world phase across independently baked chunk pieces',()=>{
  const whole=record(7,{x0:400,y0:530,x1:760,y1:780});
  const parts=[...record(7,{x0:400,y0:530,x1:480,y1:780}),...record(7,{x0:480,y0:530,x1:760,y1:780})];
  assert.deepEqual(new Map([...whole].sort()),new Map(parts.sort()));
  for(const [key,color] of whole){const [x,y]=key.split(',').map(Number);assert.equal(color,roadRasterColor(worldRoadDistance(7,x+1,y+1),x,y));}
});
test('the round tree crop is one connected silhouette, without the unrelated floating ore row',()=>{
  const p=VILLAGE_PIXELS.tree0,opaque=new Set();
  p.rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c.charCodeAt(0)>33)opaque.add(y*p.width+x);}));
  const todo=[opaque.values().next().value],seen=new Set(todo);
  for(let i=0;i<todo.length;i++){
    const v=todo[i],x=v%p.width,y=Math.floor(v/p.width);
    for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      if(xx<0||xx>=p.width||yy<0||yy>=p.height)continue;
      const n=yy*p.width+xx;if(opaque.has(n)&&!seen.has(n)){seen.add(n);todo.push(n);}
    }
  }
  assert.equal(seen.size,opaque.size,'no detached source-sheet fragments above the canopy');
});


test("seed7 southern parallel branches retain the original existing topology",()=>{
  const r=roads(7);
  assert.deepEqual(r[3].points.slice(0,2),[{x:530.08198805425,y:639},{x:1261.3782922352625,y:702.6610569611191}]);
  assert.deepEqual(r[4].points.slice(0,2),[{x:532.90523321899,y:700},{x:1874.8384015923434,y:758.0941541016102}]);
  assert.deepEqual(r[1].points[0],{x:528.2769624571213,y:600});
  assert.deepEqual(r[2].points[0],r[1].points[0]);
  assert.equal(r[1].width,20);assert.equal(r[2].width,20);assert.equal(r[3].width,20);assert.equal(r[4].width,20);
  // The right two routes really have grass between them at x=800. Do not
  // cosmetically paint that space as road or alter route/collision definitions.
  assert.equal(independentlyInside(7,800,687),false);
  assert.equal(independentlyInside(7,800,663),true);
  assert.equal(independentlyInside(7,800,712),true);
  // Left routes diverge from the same junction and overlap close to it; their
  // centre-lines are real, but not every visible grass-coloured stripe is a gap.
  assert.equal(independentlyInside(7,100,643),true);
});


test('covered capsule edges inside junctions are not mistaken for external grass boundaries',()=>{
  for(const [x,y] of [[502,584],[504,620],[554,622],[554,624],[556,624],[556,660]]){
    assert.ok(worldRoadDistance(7,x,y)<-3,'actual covered union interior lies beyond the turf fringe');
    assert.equal(roadRasterColor(worldRoadDistance(7,x,y),x,y),roadRasterColor(-20,x,y),
      'overlap samples are the generated earth texture, without internal grass seams');
  }
  assert.ok(worldRoadDistance(7,800,687)>0,'real parallel-road gap remains empty');
});
