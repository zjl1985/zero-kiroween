"""Reproducible extraction of four GenerateImage outputs; no old pack is sampled.
Run python3 scripts/prepare-generated-village.py. Requires Pillow + numpy.
Original generated JPEGs are retained unmodified under assets/village/generated/raw.
"""
from pathlib import Path
from collections import deque
import hashlib, json
import numpy as np
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/village'
OUT=BASE/'generated'
RAW=OUT/'raw'
OUT.mkdir(exist_ok=True)

def isolate(file, box, width, anchor=None):
    source=Image.open(RAW/file).convert('RGB')
    box=tuple(round(v*(source.width/1024 if i%2==0 else source.height/576)) for i,v in enumerate(box))
    im=source.crop(box)
    a=np.asarray(im).astype(float)
    # Chroma key catches JPEG spill and the model's non-exact pink background.
    pink=(a[:,:,0]>80)&(a[:,:,0]>a[:,:,1]*1.5)&(a[:,:,2]>a[:,:,1]*1.30)&(a[:,:,2]>45)
    mask=~pink
    # Keep the actual connected silhouette, not isolated compression speckles.
    h,w=mask.shape; seen=np.zeros((h,w),bool); best=[]
    for yy,xx in zip(*np.where(mask)):
        if seen[yy,xx]: continue
        q=[(int(xx),int(yy))]; seen[yy,xx]=True
        for x,y in q:
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True; q.append((nx,ny))
        if len(q)>len(best): best=q
    alpha=Image.new('L',im.size)
    alpha.putdata([0]*(w*h)); pixels=alpha.load()
    for x,y in best: pixels[x,y]=255
    rgba=im.convert('RGBA'); rgba.putalpha(alpha)
    bounds=rgba.getbbox(); rgba=rgba.crop(bounds)
    height=round(rgba.height*width/rgba.width)
    # One common 2-world-unit logical pixel, no sharpening/filter recolor.
    rgba=rgba.resize((width,height),Image.Resampling.NEAREST)
    # Remove any isolated single-pixel fragments introduced by sampling.
    m=rgba.getchannel('A'); vis={(x,y) for y in range(height) for x in range(width) if m.getpixel((x,y))}
    best=set()
    while vis:
        start=vis.pop(); connected={start}; queue=[start]
        for x,y in queue:
            for pt in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if pt in vis:vis.remove(pt);connected.add(pt);queue.append(pt)
        if len(connected)>len(best):best=connected
    rgba.putalpha(Image.new('L',rgba.size))
    for x,y in best:rgba.putpixel((x,y),(*rgba.getpixel((x,y))[:3],255))
    ax=round(width*(anchor if anchor is not None else .5)); ay=height
    return rgba,ax,ay

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
}
assets={name:isolate(*args) for name,args in spec.items()}
assets['herb1']=assets['pot']
im,ax,ay=assets['stone'];small=im.resize((14,round(im.height*14/im.width)),Image.Resampling.NEAREST)
assets['pebble']=(small,7,small.height)

def periodic(im,size=128):
    a=np.array(im.resize((size,size),Image.Resampling.BOX)).astype(float)
    # Symmetric opposite-edge crossfade: exact matching opposite boundary pixels.
    # 100/128 interior pixels untouched, small border correction, no hard grid edge.
    band=14
    for axis in (0,1):
        for i in range(band):
            t=(1-i/band)**2*.5
            if axis==0:
                l=a[i].copy();r=a[-1-i].copy();a[i]=l*(1-t)+r*t;a[-1-i]=r*(1-t)+l*t
            else:
                l=a[:,i].copy();r=a[:,-1-i].copy();a[:,i]=l*(1-t)+r*t;a[:,-1-i]=r*(1-t)+l*t
    return Image.fromarray(np.uint8(np.clip(a,0,255))).convert('RGBA')
surface=Image.open(RAW/'surfaces.jpg').convert('RGB')
for name,box in {'meadow':(16,16,496,496),'earth':(528,16,1008,496),'paving':(16,528,496,1008),'forest':(528,528,1008,1008)}.items():
    assets[name]=(periodic(surface.crop(box)),0,0)
# The existing garden neighbour API is preserved, but sourced from new earth pixels.
earth=assets['earth'][0]
for cy in range(3):
 for cx in range(3):
    tile=earth.crop((48,48,64,64))
    for yy in range(16):
     for xx in range(16):
      d=min(xx if cx==0 else 99,15-xx if cx==2 else 99,yy if cy==0 else 99,15-yy if cy==2 else 99)
      if d < (1+(xx*7+yy*3)%3):tile.putpixel((xx,yy),(0,0,0,0))
    assets[f'soil{cx}{cy}']=(tile,0,0)
for i in range(5):assets[f'grass{i}']=(assets['meadow'][0].crop((i*16,0,i*16+16,16)),0,0)
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
out+='// Rebuild with python3 scripts/prepare-generated-village.py; no Ninja Adventure pixels used.\n'
out+='export const VILLAGE_SOURCE_HASHES = '+json.dumps(hashes)+' as const;\n'
out+='export const VILLAGE_PALETTE: readonly string[] = '+json.dumps(palette)+';\n'
out+='export interface VillagePixels { width:number; height:number; ax:number; ay:number; rows:readonly string[]; }\n'
out+='export const VILLAGE_PIXELS = '+json.dumps(sprites,separators=(',',':'))+' satisfies Record<string,VillagePixels>;\n'
(ROOT/'src/render/village-pixels.ts').write_text(out)
provenance={'generator':'cursor.studio.GenerateImage','generation_calls':4,'model':'Tool does not expose model selection; no model name asserted.','reference':'generated/reference-target.jpg','reference_sha256':hashlib.sha256((OUT/'reference-target.jpg').read_bytes()).hexdigest(),'generation_requests':'generated/GENERATION_REQUESTS.json','raw_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.glob('*.jpg'))},'extraction':spec,'processing':['pink JPEG chroma key','largest connected silhouette; no characters copied','nearest neighbour logical sprite resize','four filled surface crops; opposite edge periodic crossfade','224 shared palette colours, no dithering','binary alpha; bottom-centre or door-step anchors','synchronous indexed row-run compilation, no runtime image load'],'atlas_sha256':hashes['generated/atlas.png'],'legacy_pack':'Retained on disk only, not sampled by active compiler.'}
(OUT/'PROVENANCE.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'Generated {len(sprites)} assets, {len(palette)-1} colors, {len(out)} source bytes, atlas {atlas.size}')
