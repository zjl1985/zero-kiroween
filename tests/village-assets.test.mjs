import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { VILLAGE_PALETTE, VILLAGE_PIXELS, VILLAGE_SOURCE_HASHES } from '../dist/render/village-pixels.js';
import { paintVillagePixels, villageSoilTile, villageGrassCells, VILLAGE_TILE } from '../dist/render/village-art.js';
import { HOMESTEADS, HOUSE_WALKS } from '../dist/render/homestead-layout.js';
const source = new URL('../assets/village/',import.meta.url);

test('compiled generated environment records exact source PNGs and bounded source crops',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',source),'utf8'));
  for(const [file,hash] of Object.entries(VILLAGE_SOURCE_HASHES)){
    const png=readFileSync(new URL(file,source));
    assert.equal(createHash('sha256').update(png).digest('hex'),hash,'source asset changed without rebuilding pixels');
    assert.equal(png.subarray(1,4).toString(),'PNG');
    for(const [key,[f,x,y,w,h,ax,ay]] of Object.entries(manifest))if(f===file){
      assert.ok(x>=0 && y>=0 && x+w<=png.readUInt32BE(16) && y+h<=png.readUInt32BE(20),`${key} stays inside its source PNG`);
      assert.deepEqual([VILLAGE_PIXELS[key].width,VILLAGE_PIXELS[key].height,VILLAGE_PIXELS[key].ax,VILLAGE_PIXELS[key].ay],[w,h,ax,ay]);
    }
  }
  const provenance=readFileSync(new URL('SOURCE.txt',source),'utf8');
  assert.ok(provenance.includes('ACTIVE ENVIRONMENT: Generated village art'));
  const generation=JSON.parse(readFileSync(new URL('generated/PROVENANCE.json',source),'utf8'));
  assert.equal(generation.generator,'cursor.studio.GenerateImage');
  assert.equal(generation.generation_calls,4);
  assert.ok(generation.model.includes('does not expose'));
  assert.equal(Object.keys(generation.raw_sha256).length,4);
  for(const [file,hash] of Object.entries(generation.raw_sha256)){
    const original=readFileSync(new URL(`generated/raw/${file}`,source));
    assert.equal(createHash('sha256').update(original).digest('hex'),hash);
    assert.equal(original.readUInt16BE(0),0xffd8,'unmodified generated JPEG');
  }
  assert.deepEqual(Object.keys(VILLAGE_SOURCE_HASHES),['generated/atlas.png']);
});

test('raster run compiler reproduces every indexed source pixel exactly, including transparency',()=>{
  for(const [key,p] of Object.entries(VILLAGE_PIXELS)){
    const actual=Array.from({length:p.height},()=>Array(p.width).fill(''));
    const ctx={fillStyle:'',fillRect(x,y,w,h){
      assert.ok([x,y,w,h].every(Number.isInteger));
      assert.ok([x,y,w,h].every(n=>n%2===0),'the imported art is a single square 2x pixel grid');
      assert.equal(h,2);
      for(let xx=x/2;xx<(x+w)/2;xx++){
        assert.equal(actual[y/2][xx],'','opaque source runs never overlap');
        actual[y/2][xx]=this.fillStyle;
      }
    }};
    paintVillagePixels(ctx,p);
    assert.equal(p.rows.length,p.height);
    for(let y=0;y<p.height;y++){
      assert.equal(p.rows[y].length,p.width);
      for(let x=0;x<p.width;x++){
        const index=p.rows[y].charCodeAt(x)-33;
        assert.ok(index>=0&&index<VILLAGE_PALETTE.length);
        assert.equal(actual[y][x],VILLAGE_PALETTE[index],`${key} (${x},${y})`);
      }
    }
  }
});

test('all 16 terrain neighbour combinations select real authored edge/corner art',()=>{
  const choices=new Set();
  for(let mask=0;mask<16;mask++){
    const key=villageSoilTile(!!(mask&1),!!(mask&2),!!(mask&4),!!(mask&8));
    choices.add(key);assert.ok(VILLAGE_PIXELS[key]);
  }
  assert.equal(choices.size,9);
  assert.equal(villageSoilTile(true,true,true,true),'soil11');
  assert.equal(villageSoilTile(false,true,false,true),'soil00');
  assert.equal(villageSoilTile(true,false,true,false),'soil22');
});

test('raster grass phase and variants agree across positive and negative chunk boundaries',()=>{
  for(const edge of [540,-540,1080]){
    const row=Math.floor(edge/VILLAGE_TILE)*VILLAGE_TILE;
    const a=[...villageGrassCells({x0:-960,y0:edge-540,x1:960,y1:edge})].filter(p=>p.y===row);
    const b=[...villageGrassCells({x0:-960,y0:edge,x1:960,y1:edge+540})].filter(p=>p.y===row);
    assert.ok(a.length>0);assert.deepEqual(a,b);
    for(const p of a)assert.ok(p.x%VILLAGE_TILE===0&&p.y%VILLAGE_TILE===0);
  }
});

test('new raster door anchors still meet existing porch walks north of the playable yard',()=>{
  HOMESTEADS.forEach((b,i)=>{
    const door=[b.x+23*b.s,b.y+29*b.s];
    assert.ok(Math.hypot(door[0]-HOUSE_WALKS[i][0][0],door[1]-HOUSE_WALKS[i][0][1])<2);
    assert.ok(door[1]<264,'backdrop doors are not drawn as newly enterable buildings');
  });
});


test('generated surfaces are periodic at both opposite edges after shared palette quantization',()=>{
  for(const key of ['meadow','earth','paving','forest']){
    const p=VILLAGE_PIXELS[key];
    assert.equal(p.width,128);assert.equal(p.height,128);
    for(let y=0;y<p.height;y++)assert.equal(p.rows[y][0],p.rows[y][p.width-1],`${key} horizontal seam`);
    assert.equal(p.rows[0],p.rows[p.height-1],`${key} vertical seam`);
    assert.ok(new Set(p.rows.join('')).size>30,`${key} retains generated texture detail`);
  }
});

test('generated independent scenery retains transparent silhouettes and detailed pixel palettes',()=>{
  for(const key of ['barn','cottage','tree0','tree1','pine','bush','stone','fence','lamp','stump','pumpkin','candles','planter','cabinet']){
    const p=VILLAGE_PIXELS[key],values=new Set(p.rows.join(''));
    assert.ok(values.has('!'),`${key} has transparent padding, never a rectangular scene card`);
    assert.ok(values.size>12,`${key} is detailed generated artwork, not a coarse geometry proxy`);
    assert.ok(p.ax>0 && p.ax<p.width && p.ay===p.height,`${key} independent bottom/door footpoint`);
    for(const c of values){
      const color=VILLAGE_PALETTE[c.charCodeAt(0)-33];if(!color)continue;
      const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
      assert.ok(!(r>150&&g<50&&b>85),`${key} has no opaque magenta key pixels`);
    }
  }
  assert.ok(VILLAGE_PIXELS.barn.width>=88);
});

const rgbOf=(p,x,y)=>{const c=VILLAGE_PALETTE[p.rows[y].charCodeAt(x)-33];return c?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):null;};
const lum=c=>(c[0]+c[1]+c[2])/3;
const SPRITES=['barn','cottage','tree0','tree1','pine','bush','stone','fence','lamp','stump','pumpkin','candles','planter','cabinet','herb0','pot','herb1','pebble'];
function silhouette(p){
  const edge=[],inner=[];
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
    const c=rgbOf(p,x,y);if(!c)continue;
    const open=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const xx=x+dx,yy=y+dy;return xx<0||yy<0||xx>=p.width||yy>=p.height||!rgbOf(p,xx,yy);});
    (open?edge:inner).push(c);
  }
  return {edge,inner};
}
const mean=list=>list.reduce((s,c)=>s+lum(c),0)/list.length;

test('crop-bed herb1 is an in-ground plant, never an alias of the potted plant',()=>{
  assert.notDeepEqual(VILLAGE_PIXELS.herb1.rows,VILLAGE_PIXELS.pot.rows);
  assert.ok(VILLAGE_PIXELS.herb1.height<VILLAGE_PIXELS.pot.height,'no clay pot body below the foliage');
  assert.equal(VILLAGE_PIXELS.herb1.ay,VILLAGE_PIXELS.herb1.height,'bottom-centre anchor');
});

test('sprite silhouettes carry no pink chroma spill and a darker selective outline',()=>{
  for(const key of SPRITES){
    const {edge,inner}=silhouette(VILLAGE_PIXELS[key]);
    for(const [r,g,b] of edge)assert.ok(!(r>g*1.3&&b>g*1.2&&r>90&&b>90),`${key} edge pixel #${[r,g,b]} is pinkish`);
    assert.ok(edge.length>0&&inner.length>0);
  }
  for(const key of ['barn','cottage','tree0','tree1','pine','fence']){
    const {edge,inner}=silhouette(VILLAGE_PIXELS[key]);
    assert.ok(mean(edge)<mean(inner)*.75,`${key} outer edge reads darker than its interior`);
  }
});

test('surface tiles keep one mean value up to their seams (no dark grid every tile)',()=>{
  for(const key of ['meadow','earth','paving','forest']){
    const p=VILLAGE_PIXELS[key],band=[],core=[];
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const inBand=x<14||y<14||x>=p.width-14||y>=p.height-14;
      (inBand?band:core).push(rgbOf(p,x,y));
    }
    const a=mean(band),b=mean(core);
    assert.ok(Math.abs(a-b)<=b*.04,`${key} edge band ${a.toFixed(1)} vs interior ${b.toFixed(1)}`);
  }
});

test('derived soil and grass tiles sample distinct surface regions',()=>{
  const meadow=VILLAGE_PIXELS.meadow;
  const rowZero=[0,1,2,3,4].every(i=>{
    const g=VILLAGE_PIXELS[`grass${i}`];
    return g.rows.every((row,y)=>row===meadow.rows[y].slice(i*16,i*16+16));
  });
  assert.ok(!rowZero,'grass variants are not five neighbouring crops of the first meadow row');
  const cores=new Set();
  for(let cx=0;cx<3;cx++)for(let cy=0;cy<3;cy++)cores.add(VILLAGE_PIXELS[`soil${cx}${cy}`].rows.slice(5,11).map(r=>r.slice(5,11)).join('|'));
  assert.equal(cores.size,9,'every soil tile has its own interior pixels');
  for(const key of ['soil00','soil22']){
    const p=VILLAGE_PIXELS[key];
    const opaqueFrom=p.rows.map(r=>key==='soil00'?[...r].findIndex(ch=>ch!=='!'):[...r].findLastIndex(ch=>ch!=='!'));
    assert.ok(new Set(opaqueFrom).size>1,`${key} west/east teeth vary along the edge`);
  }
});
