/** Developer-only browser review. No dependency is added to the shipped game.
 * PIXEL_REVIEW_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs node scripts/review-pixel-asset.mjs scene cottage before
 * Serve the built site on localhost:4175 first. Requires an installed Chromium.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const [kind = 'scene', id = 'cottage', revision = 'review'] = process.argv.slice(2);
if (!['scene', 'cat', 'enemy'].includes(kind) || !/^[a-z0-9-]+$/.test(id) || !/^[a-z0-9-]+$/.test(revision)) throw new Error('Expected scene|cat|enemy, an asset id, and a safe revision label');
const provider = process.env.PIXEL_REVIEW_PLAYWRIGHT;
if (!provider) throw new Error('Set PIXEL_REVIEW_PLAYWRIGHT to an installed Playwright module; game dependencies stay unchanged.');
const { chromium } = await import(pathToFileURL(resolve(provider)).href);
const output = resolve('output/pixel-asset-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PIXEL_REVIEW_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('http://localhost:4175/?seed=7', { waitUntil: 'networkidle' });
  await page.evaluate(async ({ kind, id, revision }) => {
    const { drawPixelDecor } = await import('/dist/render/pixel-scene-art.js');
    const { CAT_ART, ENEMY_ART } = await import('/dist/render/art-index.js');
    const { ENEMY_DEFS } = await import('/dist/defs/index.js');
    const { drawCraftEnemy } = await import('/dist/render/craft-enemies.js');
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:999999;width:1024px;height:768px;image-rendering:pixelated';
    document.body.append(canvas); const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101e2b'; ctx.fillRect(0, 0, 1024, 768);
    ctx.font = '18px monospace'; ctx.fillStyle = '#e7dec4'; ctx.fillText(`${kind} / ${id} / ${revision}`, 24, 30);
    const panels = [[16,50,320,475],[348,50,660,475],[16,537,320,215],[348,537,320,215],[680,537,328,215]];
    for (const [x,y,w,h] of panels) { ctx.fillStyle = '#29433d'; ctx.fillRect(x,y,w,h); ctx.strokeStyle = '#4e6c69'; ctx.strokeRect(x+.5,y+.5,w-1,h-1); }
    function paint(x,y,scale,variant,moving=false,facing=1){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
      if(kind==='scene') drawPixelDecor(ctx,id,0,0,1,variant);
      else if(kind==='cat') {
        const art=CAT_ART.find(id);if(!art)throw new Error('Unknown cat '+id);
        art.draw(ctx,{id,x:0,y:0,facing,moving,dashing:false,hurt:false,time:variant/9});
      } else {
        if(!ENEMY_ART.find(id))throw new Error('Unknown enemy '+id);
        const def=ENEMY_DEFS.get(id);
        drawCraftEnemy(ctx,{id:1,kind:id,x:0,y:0,hp:def.stats.hp,alive:true,orbitCooldown:0,slowTime:0,spawnTime:0},variant*.15,{x:1,y:0});
      }
      ctx.restore();
    }
    const zoom=kind==='scene'&&id==='tree'?2:3;
    paint(176,335,1,0);paint(678,480,zoom,0);
    for(let i=0;i<3;i++)paint(176+i*332,723,1,i,kind==='cat',i===2?-1:1);
    ctx.fillStyle='#e7dec4';ctx.font='14px monospace';
    ctx.fillText('WORLD SIZE / 1x',32,77);ctx.fillText(`DETAIL / ${zoom}x / nearest pixels`,364,77);
    for(let i=0;i<3;i++)ctx.fillText(kind==='scene'?`PALETTE ${i+1}`:`POSE ${i+1}`,32+i*332,564);
  }, {kind,id,revision});
  const name=`${kind}-${id}-${revision}`;
  await page.screenshot({path:resolve(output,name+'.png')});
  if (kind === 'cat') {
    await page.evaluate(async ({id}) => {
      const {CAT_ART} = await import('/dist/render/art-index.js');
      const {withPaperMotion} = await import('/dist/render/paper-motion.js');
      const canvas = [...document.querySelectorAll('canvas')].at(-1), ctx=canvas.getContext('2d');
      const cases=[['idle right',0,false,1,false,false,false],['idle left',0,false,-1,false,false,false],
        ['walk 0',0,true,1,false,false,false],['walk 1',1,true,1,false,false,false],
        ['walk 2',2,true,1,false,false,false],['walk 3',3,true,1,false,false,false],
        ['dash right',1,true,1,true,false,false],['dash left',1,true,-1,true,false,false],
        ['hurt',0,false,1,false,true,false],['reduced walk',2,true,1,false,false,true],
        ['reduced dash',2,true,1,true,false,true],['walk left',3,true,-1,false,false,false]];
      ctx.fillStyle='#101e2b';ctx.fillRect(0,0,1024,768);ctx.font='14px monospace';
      cases.forEach(([label,frame,moving,facing,dashing,hurt,reduced],i)=>{
        const x=(i%4)*256,y=Math.floor(i/4)*256;
        ctx.fillStyle='#29433d';ctx.fillRect(x+8,y+8,240,240);ctx.fillStyle='#e7dec4';ctx.fillText(label,x+20,y+34);
        ctx.save();ctx.translate(x+128,y+216);ctx.scale(2,2);ctx.imageSmoothingEnabled=false;
        withPaperMotion(reduced,()=>CAT_ART.get(id).draw(ctx,{id,x:0,y:0,facing,moving,dashing,hurt,time:(frame+.01)/9}));
        ctx.restore();
      });
    }, {id});
    await page.screenshot({path:resolve(output,name+'-poses.png')});
  }
  const report={kind,id,revision,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),errors,image:name+'.png',note:'Actual browser render at native 1x and integer nearest magnification. Human visual review still required.'};
  await writeFile(resolve(output,name+'.json'),JSON.stringify(report,null,2)+'\n');
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(resolve(output,name+'.png'));
} finally {await browser.close();}
