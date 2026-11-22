import assert from "node:assert/strict";
import { test } from "node:test";
import { CROP_PATCHES, HOMESTEADS, HOUSE_WALKS, roadArrival } from "../dist/render/homestead-layout.js";
import { groundShape, groundWalk } from "../dist/render/homestead-ground.js";
import { avoidScenery } from "../dist/game/scenery.js";
import { WORLD } from "../dist/game/world-gen.js";
import { STATS } from "../dist/game/types.js";
import { pathCenter } from "../dist/render/scene.js";

function record() {const calls=[];return {calls,fillStyle:"",fillRect(...args){calls.push([this.fillStyle,...args]);}};}
test("porch walks reach the existing route without crossing a solid yard fixture",()=>{
  for(const walk of HOUSE_WALKS){
    const [x,y]=walk.at(-1),main=pathCenter(y)+(y<348?17*Math.max(0,1-(y-222)/126):0);
    assert.ok(Math.abs(x-main)<14+(y-225)*.038,"joins the existing main route, not a painted dead end");
    for(let i=1;i<walk.length;i++)for(let n=0;n<=30;n++){
      const t=n/30,x=walk[i-1][0]*(1-t)+walk[i][0]*t,y=walk[i-1][1]*(1-t)+walk[i][1]*t;
      if(y<WORLD.playTop+STATS.playerRadius)continue; // backdrop porches are not new enterable buildings
      const safe=avoidScenery(x,y,STATS.playerRadius);
      assert.ok(Math.hypot(safe.x-x,safe.y-y)<.01,"visible approach does not run into unchanged yard collision");
    }
  }
});
test("shared ground contour has bounded deterministic integer coverage and never mutates layout",()=>{
  const before=JSON.stringify({HOMESTEADS,CROP_PATCHES,HOUSE_WALKS});
  const a=record(),b=record();
  for(const ctx of [a,b]){
    for(const patch of CROP_PATCHES)groundShape(ctx,patch.outline,"soil");
    for(const walk of HOUSE_WALKS)groundWalk(ctx,walk,12,"path");
  }
  assert.deepEqual(a.calls,b.calls);
  const budget=CROP_PATCHES.reduce((sum,p)=>sum+Math.ceil(Math.max(...p.outline.map(v=>v[1]))-Math.min(...p.outline.map(v=>v[1])))+1,0)
    +HOUSE_WALKS.reduce((sum,walk)=>sum+walk.slice(1).reduce((n,p,i)=>n+Math.ceil(Math.abs(p[1]-walk[i][1]))+4*12+4,0),0);
  assert.ok(a.calls.length<=budget,"at most one span per contour scanline, independent of fill width");
  assert.ok(a.calls.every(([,x,y,w,h])=>[x,y,w,h].every(Number.isInteger)&&w>0&&h===1));
  assert.equal(JSON.stringify({HOMESTEADS,CROP_PATCHES,HOUSE_WALKS}),before);
});
test("road arrival preserves both boundaries without a derivative discontinuity",()=>{
  assert.equal(roadArrival(-1),0);assert.equal(roadArrival(2),1);
  assert.equal(roadArrival(0),0);assert.equal(roadArrival(1),1);
  const eps=.001;
  assert.ok(roadArrival(eps)/eps<.004);
  assert.ok((1-roadArrival(1-eps))/eps<.004);
  let previous=0;for(let i=0;i<=100;i++){const q=roadArrival(i/100);assert.ok(q>=previous);previous=q;}
});
