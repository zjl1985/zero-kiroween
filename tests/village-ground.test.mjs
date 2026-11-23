import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VILLAGE_PALETTE, VILLAGE_PIXELS } from '../dist/render/village-pixels.js';
import { drawVillageSoil, drawVillageGrass, drawVillageDecor, drawVillageSprite, drawVillageShadow,
  villageMeadowIndex, VILLAGE_GROUND } from '../dist/render/village-art.js';
import { inPlot, plotDistance } from '../dist/render/pixel-yard-garden.js';
import { CROP_PATCHES } from '../dist/render/homestead-layout.js';
import { PIXEL_DECOR_BOUNDS } from '../dist/render/pixel-decor-bounds.js';
import { clearSpriteCache } from '../dist/engine/sprite.js';

// Render-only contracts for the village ground (FEAT-003). Mock contexts on the
// 2-unit world lattice; nothing here claims a browser view or art approval.
const mod=(v,n)=>((v%n)+n)%n;
const earthAt=(x,y)=>{const p=VILLAGE_PIXELS.earth;return VILLAGE_PALETTE[p.rows[mod(y/2,128)].charCodeAt(mod(x/2,128))-33];};
/** Lattice raster: fillRect / translate / scale / rect clips; cells written once unless allowed. */
function lattice({ once = false } = {}) {
  const cells=new Map(),stack=[];let st={tx:0,ty:0,k:1,clip:null,fill:''},path=[];
  const ctx={
    get fillStyle(){return st.fill;},set fillStyle(v){st.fill=v;},imageSmoothingEnabled:false,
    save(){stack.push({...st});},restore(){st=stack.pop();assert.ok(st,'balanced save/restore');},
    translate(x,y){st.tx+=x*st.k;st.ty+=y*st.k;},scale(k){st.k*=k;},
    beginPath(){path=[];},
    rect(x,y,w,h){path.push([st.tx+x*st.k,st.ty+y*st.k,st.tx+(x+w)*st.k,st.ty+(y+h)*st.k]);},
    clip(){const blocks=new Set();for(const [x0,y0,x1,y1] of path)for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2)blocks.add(`${x},${y}`);
      st.clip=st.clip?new Set([...blocks].filter(b=>st.clip.has(b))):blocks;},
    fillRect(x,y,w,h){
      const X=st.tx+x*st.k,Y=st.ty+y*st.k,W=w*st.k,H=h*st.k;
      assert.ok([X,Y,W,H].every(n=>Number.isInteger(n)&&n%2===0),`2-aligned integer run ${[X,Y,W,H]}`);
      for(let yy=Y;yy<Y+H;yy+=2)for(let xx=X;xx<X+W;xx+=2){
        const key=`${xx},${yy}`;if(st.clip&&!st.clip.has(key))continue;
        if(once)assert.ok(!cells.has(key),`cell ${key} painted once`);
        cells.set(key,st.fill);
      }
    },
  };
  return {ctx,cells};
}

test('crop soil follows the authored outline with an irregular world-phased fringe',()=>{
  for(const patch of CROP_PATCHES){
    const pts=patch.outline,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const view={x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)};
    const {ctx,cells}=lattice({once:true});
    drawVillageSoil(ctx,view,(x,y)=>plotDistance(pts,x,y));
    assert.ok(cells.size>500,`${patch.kind} paints a real plot`);
    let interior=0,phased=0,repeats=0,compared=0;
    for(const [key,color] of cells){
      const [x,y]=key.split(',').map(Number);
      for(const [cx,cy] of [[x,y],[x+2,y],[x,y+2],[x+2,y+2]])
        assert.ok(inPlot(pts,cx,cy)||plotDistance(pts,cx,cy)>-1e-9&&plotDistance(pts,cx,cy)<1e-9,`${key} lies inside the outline`);
      if(-plotDistance(pts,x+1,y+1)>VILLAGE_GROUND.soilFringe.min+VILLAGE_GROUND.soilFringe.span+VILLAGE_GROUND.soilFringe.lip+1){
        interior++;if(color===earthAt(x,y))phased++;
        const next=cells.get(`${x+32},${y}`);
        if(next&&-plotDistance(pts,x+33,y+1)>12){compared++;if(next===color)repeats++;}
      }
    }
    assert.equal(phased,interior,'deep soil is the earth texture at absolute world phase');
    assert.ok(compared>50&&repeats<compared*.5,`no 32-unit tile repetition (${repeats}/${compared})`);
    // The fringe edge is irregular: at equal depth some pixels are grass, others soil.
    let grass=0,soil=0;
    for(let y=Math.floor(view.y0/2)*2;y<view.y1;y+=2)for(let x=Math.floor(view.x0/2)*2;x<view.x1;x+=2){
      const d=-plotDistance(pts,x+1,y+1);if(d<5||d>7)continue;
      cells.has(`${x},${y}`)?soil++:grass++;
    }
    assert.ok(grass>10&&soil>10,`ragged grass fringe (${grass} grass / ${soil} soil at depth 5..7)`);
    // Two independently painted halves give exactly the same plot.
    const mid=Math.round((view.x0+view.x1)/2)+1,a=lattice({once:true}),b=lattice({once:true});
    drawVillageSoil(a.ctx,{...view,x1:mid},(x,y)=>plotDistance(pts,x,y));
    drawVillageSoil(b.ctx,{...view,x0:mid},(x,y)=>plotDistance(pts,x,y));
    const merged=new Map([...a.cells,...b.cells]);
    assert.equal(a.cells.size+b.cells.size,merged.size,'halves do not overlap');
    assert.deepEqual(new Map([...merged].sort()),new Map([...cells].sort()));
  }
});

test('meadow is chunk-seamless, world-phased and not a plain 256-unit tiling',t=>{
  clearSpriteCache();t.after(clearSpriteCache);
  const render=view=>{const {ctx,cells}=lattice();drawVillageGrass(ctx,view);return cells;};
  for(const [x0,y0] of [[-160,-120],[480,540]]){
    const whole=render({x0,y0,x1:x0+160,y1:y0+120});
    const left=render({x0,y0,x1:x0+80,y1:y0+120}),right=render({x0:x0+80,y0,x1:x0+160,y1:y0+120});
    for(let y=y0;y<y0+120;y+=2)for(let x=x0;x<x0+160;x+=2){
      const key=`${x},${y}`,expected=VILLAGE_PALETTE[villageMeadowIndex(x,y)];
      assert.equal(whole.get(key),expected,`meadow at ${key}`);
      assert.equal((x<x0+80?left:right).get(key),expected,`split meadow at ${key}`);
    }
  }
  let differ=0,total=0;
  for(let y=-512;y<512;y+=6)for(let x=-512;x<512;x+=6){total++;if(villageMeadowIndex(x,y)!==villageMeadowIndex(x+256,y))differ++;}
  assert.ok(differ>total*.2,`meadow differs from its 256-unit repeat (${differ}/${total})`);
  assert.ok(differ<total*.8,'the base meadow still dominates the quiet floor');
});

function shadowCalls(draw){
  const calls=[];
  const ctx={fillStyle:'',imageSmoothingEnabled:false,save(){},restore(){},translate(){},scale(){},
    fillRect(x,y,w,h){calls.push({fill:this.fillStyle,x,y,w,h});},drawImage(){calls.push({image:true});}};
  draw(ctx);return calls;
}
test('generated scenery casts a flat pixel contact shadow inside declared bounds; flat ground does not',t=>{
  clearSpriteCache();t.after(clearSpriteCache);
  const shade=VILLAGE_GROUND.shadow.color;
  const tree=shadowCalls(ctx=>drawVillageDecor(ctx,'tree',100,200,1,0));
  const first=tree.findIndex(c=>c.fill===shade);
  assert.ok(first>=0,'tree has a contact shadow');
  assert.ok(tree.findIndex(c=>c.fill!==shade)>first,'shadow is drawn before the sprite');
  for(const key of ['meadow','earth','soil11','grass1'])
    assert.equal(shadowCalls(ctx=>{drawVillageShadow(ctx,key,0,0,1);drawVillageSprite(ctx,key,0,0,1);}).filter(c=>c.fill===shade).length,0,`${key} is flat`);
  for(const [kind,b] of Object.entries(PIXEL_DECOR_BOUNDS))for(const s of [.65,1,1.4])for(const seed of [0,1]){
    const rects=shadowCalls(ctx=>drawVillageDecor(ctx,kind,-180,367,s,seed)).filter(c=>c.fill===shade);
    assert.ok(rects.length>0,`${kind} has a shadow`);
    for(const r of rects){
      assert.ok([r.x,r.y,r.w,r.h].every(n=>Number.isInteger(n)&&n%2===0),`${kind} shadow on the 2-unit lattice`);
      assert.ok(r.x>=-180+b.l*s&&r.x+r.w<=-180+b.r*s&&r.y>=367+b.t*s&&r.y+r.h<=367+b.b*s,`${kind}/${s} shadow inside bounds`);
    }
    const rows=rects.map(r=>r.y);assert.equal(new Set(rows).size,rows.length,'each shadow row is filled once');
  }
});
