"""Reproducible extraction of four GenerateImage outputs; no old pack is sampled.
Run through uv: uv run --with pillow==13.0.0 --with numpy==2.5.5 python scripts/prepare-generated-village.py
Original generated JPEGs are retained unmodified under assets/village/generated/raw.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/village'
OUT=BASE/'generated'
RAW=OUT/'raw'
OUT.mkdir(exist_ok=True)

def largest_component(mask):
    """Largest 4-connected True region of a boolean array (deterministic scan order)."""
    h,w=mask.shape; seen=np.zeros((h,w),bool); best=[]
    for yy,xx in zip(*np.where(mask)):
        if seen[yy,xx]: continue
        q=[(int(xx),int(yy))]; seen[yy,xx]=True
        for x,y in q:
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True; q.append((nx,ny))
        if len(q)>len(best): best=q
    out=np.zeros((h,w),bool)
    for x,y in best: out[y,x]=True
    return out

def reduce_block(rgb, mask, width, height):
    """Area reduction to the logical grid. Each logical pixel is the masked source
    pixel closest to the block mean (a real generated colour, never a JPEG speckle
    picked by nearest neighbour); coverage >= 0.5 decides binary alpha."""
    h,w=mask.shape
    xs=np.linspace(0,w,width+1).round().astype(int); ys=np.linspace(0,h,height+1).round().astype(int)
    col=np.zeros((height,width,3)); alpha=np.zeros((height,width),bool)
    for j in range(height):
        for i in range(width):
            m=mask[ys[j]:ys[j+1],xs[i]:xs[i+1]]
            if m.size==0 or m.mean()<.5: continue
            px=rgb[ys[j]:ys[j+1],xs[i]:xs[i+1]][m]
            mean=px.mean(0)
            col[j,i]=px[np.argmin(((px-mean)**2).sum(1))]*.5+mean*.5
            alpha[j,i]=True
    return col,alpha

def sel_out(col, alpha):
    """1-pixel selective outline inside the silhouette: edge pixels become a darker,
    slightly more saturated shade of their own hue; bounds never grow."""
    pad=np.pad(alpha,1,constant_values=False)
    edge=alpha&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
    c=col[edge]; lum=c.mean(1,keepdims=True)
    col[edge]=np.clip((lum+(c-lum)*1.25)*.62,0,255)
    return col

def isolate(file, box, width, anchor=None, outline=True):
    source=Image.open(RAW/file).convert('RGB')
    box=tuple(round(v*(source.width/1024 if i%2==0 else source.height/576)) for i,v in enumerate(box))
    a=np.asarray(source.crop(box)).astype(float)
    # Chroma key catches JPEG spill and the model's non-exact pink background.
    pink=(a[:,:,0]>80)&(a[:,:,0]>a[:,:,1]*1.5)&(a[:,:,2]>a[:,:,1]*1.30)&(a[:,:,2]>45)
    # Keep the actual connected silhouette, not isolated compression speckles.
    mask=largest_component(~pink)
    yy,xx=np.where(mask); y0,y1,x0,x1=yy.min(),yy.max()+1,xx.min(),xx.max()+1
    a,mask=a[y0:y1,x0:x1],mask[y0:y1,x0:x1]
    height=round(a.shape[0]*width/a.shape[1])
    col,alpha=reduce_block(a,mask,width,height)
    # Remove any isolated fragments introduced by the coverage threshold.
    alpha=largest_component(alpha)
    if outline: col=sel_out(col,alpha)
    rgba=np.zeros((height,width,4),np.uint8); rgba[...,:3]=np.uint8(np.clip(col.round(),0,255)); rgba[...,3]=alpha*255
    ax=round(width*(anchor if anchor is not None else .5)); ay=height
    return Image.fromarray(rgba,'RGBA'),ax,ay

spec={
 'barn':('cottages.jpg',(80,80,510,460),88,.42),
 'cottage':('cottages.jpg',(520,80,980,460),88,.36),
 'tree0':('nature-props.jpg',(0,0,270,290),60,None),
 'tree1':('nature-props.jpg',(270,0,520,290),60,None),
 'pine':('nature-props.jpg',(520,0,765,290),49,None),
 'bush':('nature-props.jpg',(765,0,1024,290),24,None),
 'stone':('nature-props.jpg',(0,290,270,576),30,None),
 'fence':('nature-props.jpg',(270,290,520,576),64,None),
 'lamp':('nature-props.jpg',(520,290,765,576),14,None),
 'stump':('nature-props.jpg',(765,290,1024,576),27,None),
 'pumpkin':('yard-details.jpg',(40,20,340,275),18,None),
 'candles':('yard-details.jpg',(345,20,675,275),20,None),
 'planter':('yard-details.jpg',(680,20,1000,275),28,None),
 'cabinet':('yard-details.jpg',(40,285,340,550),34,None),
 'herb0':('yard-details.jpg',(345,285,675,550),18,None),
 'pot':('yard-details.jpg',(680,285,1000,550),19,None),
 # In-ground autumn shrub for crop beds: the same generated foliage as `pot`,
 # cut above the clay rim so no flower pot is planted in the soil.
 'herb1':('yard-details.jpg',(680,285,1000,386),17,None),
 'pebble':('nature-props.jpg',(0,290,270,576),14,None),
}
assets={name:isolate(*args) for name,args in spec.items()}

def periodic(im,size=128):
    a=np.array(im.resize((size,size),Image.Resampling.BOX)).astype(float)
    # Separable offset blend, one axis at a time: inside a 24 px edge band the tile
    # fades into a half-period rolled copy of itself, so the border shows interior
    # pixels and wraps continuously, while the rolled copy's own seam (the centre
    # line) always has zero weight. The sheet's darker frame never reaches a seam.
    band=24; i=np.arange(size)+.5
    t=np.clip(np.minimum(i,size-i)/band,0,1); t=t*t*(3-2*t)
    for axis in (1,0):
        w=t[None,:,None] if axis==1 else t[:,None,None]
        a=a*w+np.roll(a,size//2,axis)*(1-w)
    # Flatten the remaining low-frequency luminance drift (wrap-around blur) so the
    # tile keeps one mean value everywhere; fine texture is untouched.
    tiled=Image.fromarray(np.uint8(np.clip(np.tile(a,(3,3,1)),0,255)))
    low=np.asarray(tiled.filter(ImageFilter.GaussianBlur(18))).astype(float)[size:2*size,size:2*size]
    a=a-(low-low.mean((0,1)))*.85
    # Exact opposite-edge equality (runtime and tests rely on it).
    a[:,-1]=a[:,0]=(a[:,0]+a[:,-1])/2; a[-1]=a[0]=(a[0]+a[-1])/2
    return Image.fromarray(np.uint8(np.clip(a.round(),0,255))).convert('RGBA')
surface=Image.open(RAW/'surfaces.jpg').convert('RGB')
for name,box in {'meadow':(16,16,496,496),'earth':(528,16,1008,496),'paving':(16,528,496,1008),'forest':(528,528,1008,1008)}.items():
    assets[name]=(periodic(surface.crop(box)),0,0)

def tooth(i, salt):
    """Deterministic 1..3 pixel cut depth, changing every two pixels along an edge."""
    return 1+((i//2)*7+salt*5+(i//2)**2*3)%3
# The existing garden neighbour API is preserved, but sourced from new earth pixels.
# Each of the nine tiles samples its own interior offset; cut edges are irregular on
# all four sides and the soil just inside a cut is darker (grass-lip shade).
earth=np.asarray(assets['earth'][0]).astype(float)
for cy in range(3):
 for cx in range(3):
    ox,oy=24+cx*29+cy*7,20+cy*31+cx*5
    tile=earth[oy:oy+16,ox:ox+16].copy()
    # Shallow broken furrows at fixed rows so beds read as tilled rows across tiles.
    for yy in (4,12):
        for xx in range(16):
            if ((xx+cx*5+yy)//3)%3: tile[yy,xx,:3]*=.9
    cut=np.zeros((16,16)); shade=np.zeros((16,16),bool)
    for yy in range(16):
     for xx in range(16):
      d=min(xx-tooth(yy,cy*3+1) if cx==0 else 99,15-xx-tooth(yy,cy*3+2) if cx==2 else 99,
            yy-tooth(xx,cx*3+1) if cy==0 else 99,15-yy-tooth(xx,cx*3+2) if cy==2 else 99)
      cut[yy,xx]=d<0; shade[yy,xx]=0<=d<1
    tile[shade,:3]*=.8; tile[cut.astype(bool),3]=0
    assets[f'soil{cx}{cy}']=(Image.fromarray(np.uint8(np.clip(tile.round(),0,255)),'RGBA'),0,0)
meadow=assets['meadow'][0]
for i in range(5):
    x,y=10+i*23,8+(i*41)%96
    assets[f'grass{i}']=(meadow.crop((x,y,x+16,y+16)),0,0)
# Shared palette quantization removes JPEG colour noise while retaining art detail.
strip=Image.new('RGB',(sum(im.width for im,_,_ in assets.values()),128),(45,50,30));x=0
for im,_,_ in assets.values():strip.paste(im.convert('RGB'),(x,0),im.getchannel('A'));x+=im.width
pal=strip.quantize(colors=224,method=Image.Quantize.MEDIANCUT)
atlas=Image.new('RGBA',(1024,1024));manifest={};x=y=rowh=0
for name,(im,ax,ay) in assets.items():
    alpha=im.getchannel('A');im=im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(alpha)
    if x+im.width+4>1024:x=0;y+=rowh+4;rowh=0
    atlas.paste(im,(x,y));manifest[name]=['generated/atlas.png',x,y,im.width,im.height,ax,ay]
    im.save(OUT/(name+'.png'));x+=im.width+4;rowh=max(rowh,im.height)
atlas=atlas.crop((0,0,1024,y+rowh));atlas.save(OUT/'atlas.png')
(BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
palette=[''];index={'':0};sprites={}
for name,(file,x,y,w,h,ax,ay) in manifest.items():
 im=atlas.crop((x,y,x+w,y+h));rows=[]
 for yy in range(h):
    row=''
    for xx in range(w):
        r,g,b,a=im.getpixel((xx,yy));c=f'#{r:02x}{g:02x}{b:02x}' if a else ''
        if c not in index:index[c]=len(palette);palette.append(c)
        row+=chr(33+index[c])
    rows.append(row)
 sprites[name]={'width':w,'height':h,'ax':ax,'ay':ay,'rows':rows}
hashes={'generated/atlas.png':hashlib.sha256((OUT/'atlas.png').read_bytes()).hexdigest()}
out='// GENERATED from GenerateImage art; see assets/village/generated/PROVENANCE.json.\n'
out+='// Rebuild with scripts/prepare-generated-village.py (run through uv); no Ninja Adventure pixels used.\n'
out+='export const VILLAGE_SOURCE_HASHES = '+json.dumps(hashes)+' as const;\n'
out+='export const VILLAGE_PALETTE: readonly string[] = '+json.dumps(palette)+';\n'
out+='export interface VillagePixels { width:number; height:number; ax:number; ay:number; rows:readonly string[]; }\n'
out+='export const VILLAGE_PIXELS = '+json.dumps(sprites,separators=(',',':'))+' satisfies Record<string,VillagePixels>;\n'
(ROOT/'src/render/village-pixels.ts').write_text(out)
provenance={'generator':'cursor.studio.GenerateImage','generation_calls':4,'model':'Tool does not expose model selection; no model name asserted.','reference':'generated/reference-target.jpg','reference_sha256':hashlib.sha256((OUT/'reference-target.jpg').read_bytes()).hexdigest(),'generation_requests':'generated/GENERATION_REQUESTS.json','raw_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.glob('*.jpg'))},'extraction':spec,'processing':[
 'pink JPEG chroma key',
 'largest connected silhouette; no characters copied',
 'area reduction to the logical grid: each pixel blends the block mean with the closest real masked source colour; binary alpha at 50% coverage; isolated fragments dropped',
 'one-pixel selective outline inside the silhouette (darker, slightly more saturated own hue; bounds unchanged)',
 'herb1 is the pot foliage cut above the clay rim (in-ground crop plant); pebble is reduced directly from the stone source',
 'four filled surface crops; separable 24 px edge-band blend with a half-period rolled copy plus wrap-around low-frequency luminance flattening; exact opposite edges',
 'soil00..soil22 sample nine earth offsets with broken furrow rows, irregular cuts on every open side and a shaded inner lip; grass0..grass4 sample five meadow offsets',
 '224 shared palette colours, no dithering',
 'binary alpha; bottom-centre or door-step anchors',
 'synchronous indexed row-run compilation, no runtime image load'],'atlas_sha256':hashes['generated/atlas.png'],'legacy_pack':'Retained on disk only, not sampled by active compiler.'}
(OUT/'PROVENANCE.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'Generated {len(sprites)} assets, {len(palette)-1} colors, {len(out)} source bytes, atlas {atlas.size}')
