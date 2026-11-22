"""INACTIVE legacy CC0 compiler; outputs only assets/village/legacy/village-pixels.ts.
Original PNGs remain the source of truth. Runtime uses row runs so the same
pixels work synchronously in Canvas2D, terrain workers, Node and offline builds.
"""
from pathlib import Path
import hashlib, json
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/village'
# One palette for all vertical assets; ground keeps a lower contrast sub-ramp.
PALETTE = {
 '#adbc3a':'#799565', '#a8a129':'#587850', '#7a7a3e':'#405948',
 '#74a334':'#557a53', '#546626':'#2d4540', '#cec66a':'#a0ac7b',
 '#a3754e':'#826b58', '#965340':'#654f48', '#141b1b':'#26363b',
 '#d2b37d':'#bbaa83', '#e46d3a':'#ad6a53', '#61372e':'#453f42',
 '#ffad5d':'#cb956b', '#eecf9b':'#d5c69f', '#c8966b':'#aa8d6a',
 '#bd7959':'#98765e', '#f38c4c':'#b7805b', '#a89e34':'#587850',
 '#c69469':'#aa8d6a', '#ffcba9':'#dbc5a0', '#965746':'#654f48',
 '#fce2ca':'#dfd1b3', '#ffe18d':'#ead8a0', '#757a32':'#405948',
 '#a4834b':'#826b58', '#8c8640':'#587850',
 '#548789':'#617b7a', '#2d697b':'#405963', '#4a5270':'#3c4b5d',
 '#b8dce5':'#a5b8b1', '#f2eaf1':'#d9d4bc',
 '#ef914f':'#b9805b', '#ffcb8d':'#d0aa79', '#ffbc75':'#bd916a',
}
GROUND = {'#adbc3a':'#3d624e','#a8a129':'#466b52','#74a334':'#527850',
 '#56864c':'#315345','#a3754e':'#797967','#9c6546':'#6c6d5c',
 '#bd7959':'#898570','#d3865f':'#91917a'}
manifest = json.loads((SOURCE/'legacy/manifest.json').read_text())
adaptations = json.loads((SOURCE/'adaptations.json').read_text())
palette = ['']; sprites = {}; hashes = {}
for name,(file,x,y,w,h,ax,ay) in manifest.items():
 data=(SOURCE/file).read_bytes();hashes[file]=hashlib.sha256(data).hexdigest()
 im=Image.open(SOURCE/file).convert('RGBA');assert x+w<=im.width and y+h<=im.height
 im=im.crop((x,y,x+w,y+h))
 for patch in adaptations.get(name,[]):
  sx,sy,sw,sh=patch['src'];dx,dy=patch['at']
  assert dx>=0 and dy>=0 and dx+sw<=w and dy+sh<=h
  original=Image.open(SOURCE/patch['file']).convert('RGBA')
  im.paste(original.crop((sx,sy,sx+sw,sy+sh)),(dx,dy))
 rows=[]
 for yy in range(h):
  row=''
  for xx in range(w):
   r,g,b,a=im.getpixel((xx,yy));col=f'#{r:02x}{g:02x}{b:02x}' if a else ''
   if col:col=(GROUND.get(col) if file=='tileset_floor.png' else None) or PALETTE.get(col,col)
   if col not in palette:palette.append(col)
   row+=chr(33+palette.index(col))
  rows.append(row)
 sprites[name]={'width':w,'height':h,'ax':ax,'ay':ay,'rows':rows}
assert len(palette)<90
out='// GENERATED from Ninja Adventure + project pixel retouch; see assets/village/SOURCE.txt.\n'
out+='// Do not hand-edit pixels; run python3 scripts/prepare-village-assets.py.\n'
out+='export const VILLAGE_SOURCE_HASHES = '+json.dumps(hashes)+' as const;\n'
out+='export const VILLAGE_PALETTE: readonly string[] = '+json.dumps(palette)+';\n'
out+='export interface VillagePixels { width:number; height:number; ax:number; ay:number; rows:readonly string[]; }\n'
out+='export const VILLAGE_PIXELS = '+json.dumps(sprites,separators=(',',':'))+' satisfies Record<string,VillagePixels>;\n'
(SOURCE/'legacy/village-pixels.ts').write_text(out)
print(f'Compiled {len(sprites)} raster crops, {len(palette)-1} shared colours, {len(out)} bytes')
