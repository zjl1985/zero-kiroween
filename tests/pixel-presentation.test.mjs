import assert from "node:assert/strict";
import { test } from "node:test";
import { pixelBacking } from "../dist/render/pixel-resolution.js";
import { boardLayout } from "../dist/render/viewport.js";
import { drawPixelStack, projectPixelStack } from "../dist/render/pixel-stack.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";

test("native pixel presentation leaves camera and touch dimensions intact across DPR and rotation", () => {
  for (const [width, height] of [[1280,720],[390,844],[844,390],[320,568],[430,932]]) {
    let previous;
    for (const dpr of [1,2,3]) {
      const layout = boardLayout(width, height, dpr, true), before = structuredClone(layout);
      const pixels = pixelBacking(layout.viewWidth, layout.viewHeight);
      assert.deepEqual(layout, before);
      assert.ok(Math.abs(pixels.width - layout.viewWidth) <= 1);
      assert.ok(Math.abs(pixels.height - layout.viewHeight) <= 1);
      if (previous) assert.deepEqual(pixels, previous, "DPR never changes the authored pixel lattice");
      previous = pixels;
    }
  }
  assert.deepEqual(pixelBacking(960,540), {width:960,height:540});
  for (const n of [0,-1,NaN,Infinity]) assert.throws(() => pixelBacking(n,540), RangeError);
});

test("cardinal stack turns keep their central foot anchor and height", () => {
  for (const turn of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const [x,y] = projectPixelStack(0,0,12,turn,.75,1);
    assert.ok(x === 0 && y === -12, "height stays anchored through every heading");
  }
  assert.deepEqual(projectPixelStack(8,0,0,Math.PI/2,.75,1), [0,6]);
  assert.deepEqual(projectPixelStack(0,8,0,Math.PI/2,.75,1), [-8,0]);
});

function environment(t) {
  const surfaces = [];
  function make() {
    const surface = {width:0,height:0}, calls = [], saved = [];
    let state = {imageSmoothingEnabled:true,globalAlpha:0.7,globalCompositeOperation:"source-over"};
    const ctx = new Proxy({}, {
      get(_, key) {
        if (key === "canvas") return surface;
        if (key === "calls") return calls;
        if (key === "save") return () => saved.push({...state});
        if (key === "restore") return () => { assert.ok(saved.length); state = saved.pop(); };
        if (key in state) return state[key];
        return (...args) => calls.push({op:key,args});
      },
      set(_,key,value) {state[key]=value;return true;},
    });
    surface.getContext = () => ctx; surfaces.push(surface); return surface;
  }
  const old = Object.getOwnPropertyDescriptor(globalThis,"document");
  Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:make}});
  clearSpriteCache();
  t.after(() => {clearSpriteCache(); if(old) Object.defineProperty(globalThis,"document",old); else delete globalThis.document;});
  return {surfaces,make};
}

test("static pixel stacks bake once and camera movement draws one cached whole object", t => {
  const {surfaces,make} = environment(t), ctx = make().getContext("2d");
  let paints = 0;
  const model = {id:"test-native",width:12,depth:10,count:9,paint(c,z) {paints++;c.fillStyle="#aabbcc";c.fillRect(-4,-3,8,6);}};
  drawPixelStack(ctx,model,{x:12,y:18});
  const allocated = surfaces.length;
  assert.equal(paints,model.count);
  for(let i=0;i<100;i++) drawPixelStack(ctx,model,{x:i*.2,y:i*.7,scale:2});
  assert.equal(surfaces.length,allocated);
  assert.equal(paints,model.count);
  assert.equal(ctx.calls.filter(c=>c.op==="drawImage").length,101);
  assert.equal(ctx.imageSmoothingEnabled,true,"caller state restored");
  assert.equal(ctx.globalAlpha,.7);
  const atlas = surfaces.find(s=>s.width===12*8&&s.height===10*2);
  assert.ok(atlas,"native atlas packs layers into bounded rows");
  const samples=surfaces.flatMap(s=>s.getContext("2d").calls).filter(c=>c.op==="drawImage"&&c.args[0]===atlas);
  assert.equal(samples.length,9);
  const cells=new Set();
  for(const {args:[,x,y,w,h]} of samples){
    assert.ok(x>=0&&y>=0&&x+w<=atlas.width&&y+h<=atlas.height);
    cells.add(`${x},${y}`);
  }
  assert.equal(cells.size,9,"each height samples its own section");
});

test("invalid or unbounded stack dimensions are rejected before canvas allocation", t => {
  const {surfaces,make}=environment(t),ctx=make().getContext("2d"),before=surfaces.length;
  const model={id:"invalid",width:8,depth:8,count:8,paint(){assert.fail("invalid model painted");}};
  for(const dims of [{count:0},{count:257},{width:1.5},{depth:Infinity}])
    assert.throws(()=>drawPixelStack(ctx,{...model,...dims}),RangeError);
  for(const pose of [{spacing:1e100},{squash:2},{turn:NaN},{scale:0}])
    assert.throws(()=>drawPixelStack(ctx,model,pose),RangeError);
  assert.equal(surfaces.length,before);
});

test("contact shadow dimensions and offsets isolate pose caches while sharing the material atlas", t => {
  const {surfaces,make}=environment(t),ctx=make().getContext("2d");
  let paints=0;
  const model={id:"contact-cache",width:12,depth:10,count:4,paint(c){paints++;c.fillRect(-3,-2,6,4);}};
  const ground={rx:5,ry:2,dx:1,dy:1};
  const draw=groundShadow=>{
    drawPixelStack(ctx,{...model,groundShadow},{x:30,y:40});
    return ctx.calls.filter(c=>c.op==="drawImage").at(-1).args[0];
  };
  const base=draw(ground),allocated=surfaces.length;
  assert.equal(draw({...ground}),base,"equivalent shadow data reuses the baked pose");
  assert.equal(surfaces.length,allocated);
  const changed=[{rx:9},{ry:4},{dx:-4},{dy:6}].map(change=>draw({...ground,...change}));
  assert.equal(new Set([base,...changed]).size,5,"each independently changed shadow parameter has its own pose");
  assert.equal(paints,model.count,"changing contact shadows never repaints material sections");
  const atlases=[base,...changed].map(sheet=>sheet.getContext("2d").calls.find(c=>c.op==="drawImage").args[0]);
  assert.ok(atlases.every(atlas=>atlas===atlases[0]),"all five projected poses sample the same atlas");
  const contactRows=sheet=>sheet.getContext("2d").calls.filter(c=>c.op==="fillRect").map(c=>c.args);
  for(const sheet of [base,...changed]) {
    const rows=contactRows(sheet);
    assert.ok(rows.length>0);
    assert.ok(rows.every(([x,y,w,h])=>[x,y,w,h].every(Number.isInteger)&&w>0&&h===1),"contact shadow uses integer scanlines");
    assert.ok(rows.every(([x,y,w,h])=>x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height),"baked shadow is not clipped by its cache canvas");
  }
  for(const sheet of changed) assert.notDeepEqual(contactRows(sheet),contactRows(base),"distinct cache entries also contain their requested geometry");
  const noOffsets=draw({rx:5,ry:2});
  assert.equal(draw({rx:5,ry:2,dx:0,dy:0}),noOffsets,"omitted offsets normalize to zero");
  assert.equal(ctx.imageSmoothingEnabled,true);
  assert.equal(ctx.globalAlpha,.7);
});

test("invalid contact shadows are rejected before allocating a sprite or painting layers", t => {
  const {surfaces,make}=environment(t),ctx=make().getContext("2d"),before=surfaces.length;
  const model={id:"invalid-contact",width:8,depth:8,count:4,paint(){assert.fail("invalid shadow painted a layer");}};
  const valid={rx:4,ry:2,dx:0,dy:0};
  for(const invalid of [{rx:NaN},{ry:NaN},{dx:NaN},{dy:NaN},{rx:-1},{ry:-1},{rx:0},{ry:0},
    {dx:1e9},{dy:-1e9},{rx:Infinity},{ry:Infinity}]) {
    assert.throws(()=>drawPixelStack(ctx,{...model,groundShadow:{...valid,...invalid}}),RangeError);
    assert.equal(surfaces.length,before,"validation precedes all canvas allocation");
  }
  assert.equal(ctx.calls.length,0,"invalid input does not draw into the caller");
});
