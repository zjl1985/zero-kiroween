import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawStoneDeckDetail } from '../dist/render/pixel-stone-deck.js';
import { LANDMARK_ART } from '../dist/render/art-index.js';
import { STONE_BRIDGE } from '../dist/defs/landmarks/stone-bridge/def.js';
import { inWaterPolygon } from '../dist/defs/water.js';

function record() {
  const calls = [], stack = []; let fillStyle = '#123456';
  const ctx = { get fillStyle() { return fillStyle; }, set fillStyle(v) { fillStyle = v; },
    save() { stack.push(fillStyle); }, restore() { fillStyle = stack.pop(); },
    fillRect(x,y,w,h) { assert.ok([x,y,w,h].every(Number.isInteger) && w>0 && h>0); calls.push([x,y,w,h]); } };
  return {ctx,calls,stack};
}

test('stone deck finish stays inside the shared crossing at negative, rotated and skewed placements', () => {
  const l = {id:'bridge',kind:'stone-bridge',x:-337,y:514,span:420,radius:160,seed:7};
  const original = STONE_BRIDGE.water(l)[0].crossings[0].polygon;
  const shapes = [original, original.map(p=>({x:(p.x+337)*.8-(p.y-514)*.6-45.3,y:(p.x+337)*.6+(p.y-514)*.8+82.1})),
    original.map(p=>({x:p.x+(p.y-514)*.3,y:p.y}))];
  for(const shape of shapes) for(const polygon of [shape,[...shape].reverse()]) {
    const before = JSON.stringify(polygon), r=record();
    drawStoneDeckDetail(r.ctx,polygon);
    assert.ok(r.calls.length>0);
    for(const [x,y,w,h] of r.calls) for(const [px,py] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])
      assert.ok(inWaterPolygon({x:px,y:py},shape),'decorative stone must never imply additional walkable deck');
    assert.equal(JSON.stringify(polygon),before);
    assert.equal(r.ctx.fillStyle,'#123456'); assert.deepEqual(r.stack,[]);
  }
});

test('bridge bank and approach decoration never paints over the real river', () => {
  const art=LANDMARK_ART.get('stone-bridge');
  for(const span of [120,260,420]) for(const [x,y] of [[0,0],[-2047,2331]]) {
    const l=Object.freeze({id:'bridge',kind:'stone-bridge',x,y,span,radius:160,seed:7}), shore=STONE_BRIDGE.water(l)[0].shore, r=record();
    art.base(r.ctx,l); art.ground(r.ctx,l);
    for(const [px,py,w,h] of r.calls) for(let yy=py;yy<py+h;yy++) for(let xx=px;xx<px+w;xx++)
      assert.equal(inWaterPolygon({x:xx+.5,y:yy+.5},shore),false,'dry land decoration cannot hide water');
    assert.equal(r.ctx.fillStyle,'#123456'); assert.deepEqual(r.stack,[]);
  }
});
