import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  BAYER4, Bits, Particles, P, PAL, RAMP, Rng, WHITE, blue, clearFrame, composite, createFrame, createFx, fit, green, hex,
  painterFor, red, rgb,
} from '../dist/render/pixelfx/index.js';

// Pixel contracts for the vendored pixelfx core; no effect built on it was viewed in a browser here.

test('frames carry colour and light buffers of the requested size', () => {
  const f = createFrame(8, 4, 2, 3);
  assert.equal(f.w, 8); assert.equal(f.h, 4); assert.equal(f.ox, 2); assert.equal(f.oy, 3);
  assert.ok(f.color instanceof Uint32Array && f.color.length === 32);
  assert.ok(f.light instanceof Uint32Array && f.light.length === 32);
  f.color[5] = WHITE; f.light[5] = WHITE;
  clearFrame(f);
  assert.ok(f.color.every((v) => v === 0) && f.light.every((v) => v === 0));
});

test('colours pack in ImageData byte order and palettes resolve to ramps', () => {
  const c = hex('#123456');
  assert.equal(red(c), 0x12); assert.equal(green(c), 0x34); assert.equal(blue(c), 0x56);
  assert.equal(c, rgb(0x12, 0x34, 0x56));
  assert.equal(hex('#abc'), hex('#aabbcc'));
  const bytes = new Uint8Array(new Uint32Array([c]).buffer);
  assert.deepEqual([...bytes], [0x12, 0x34, 0x56, 255]);
  for (const [name, list] of Object.entries(PAL)) assert.equal(RAMP[name].length, list.length);
  const five = fit(PAL.fire, 5);
  assert.equal(five.length, 5);
  assert.equal(five[0], hex(PAL.fire[0]));
  assert.equal(five[4], hex(PAL.fire.at(-1)));
  assert.equal(BAYER4.length, 16);
  assert.equal(new Set(BAYER4).size, 16, 'every Bayer threshold is distinct');
});

test('composite puts colour over a background and adds light', () => {
  const f = createFrame(3, 1);
  const p = painterFor(f);
  p.px(0, 0, rgb(100, 50, 20));
  p.light(0, 0, rgb(40, 40, 40), 1);
  p.light(2, 0, rgb(200, 100, 0), 1);
  const out = composite(f, new Uint8ClampedArray(12), rgb(10, 20, 30));
  assert.deepEqual([...out.slice(0, 4)], [140, 90, 60, 255], 'opaque colour plus light');
  assert.deepEqual([...out.slice(4, 8)], [10, 20, 30, 255], 'background shows through empty colour');
  assert.deepEqual([...out.slice(8, 12)], [210, 120, 30, 255], 'light adds over the background');
  const clear = composite(f, new Uint8ClampedArray(12), null);
  assert.equal(clear[7], 0, 'transparent where nothing was drawn');
  assert.equal(clear[11], 200, 'light over transparency becomes alpha from its brightest channel');
});

test('dithered fades follow the ordered Bayer pattern', () => {
  const f = createFrame(4, 4);
  const p = painterFor(f);
  p.rect(0, 0, 4, 4, WHITE, 0.5);
  const drawn = [...f.color].filter((v) => v !== 0).length;
  assert.equal(drawn, 8, 'half alpha draws half of a 4x4 cell');
});

function runParticles(seed) {
  const f = createFrame(48, 48);
  const ps = new Particles({ seed, ground: () => 40 });
  const bits = new Bits({ ground: () => 40 });
  const R = new Rng(seed);
  for (let i = 0; i < 24; i++) {
    ps.spawn(i % 2 ? P.SPARK : P.FIRE, 24, 30, R.range(-80, 80), R.range(-160, -20), R.range(0.3, 0.9), i % 2 ? WHITE : 0, R.range(1, 3));
    bits.add({ kind: 1, x: 24, y: 30, vx: R.range(-60, 60), vy: R.range(-120, -40), s: 2, life: 2 });
  }
  for (let s = 0; s < 18; s++) { ps.update(1 / 60); bits.update(1 / 60); }
  const p = painterFor(f);
  ps.draw(p); bits.draw(p);
  return composite(f, new Uint8ClampedArray(48 * 48 * 4), rgb(8, 8, 16));
}

test('seeded effects are deterministic: same seed, same pixels', (t) => {
  t.mock.method(Math, 'random', () => assert.fail('pixelfx never uses Math.random'));
  const a = runParticles(7), b = runParticles(7), c = runParticles(8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok([...a].some((v, i) => i % 4 !== 3 && v > 60), 'something bright was drawn');
});

test('createFx runs a module on its own clock', () => {
  const mod = {
    meta: { duration: 0.5, options: { palette: ['#000000', '#ffffff'] } },
    draw(p, t, o) { p.px(0, 0, hex(o.palette.at(-1))); p.glow(0, 0, 3, WHITE, t); },
  };
  const fx = createFx(mod, { x: 2, y: 2, palette: ['#000000', '#808080', '#ffffff'] });
  assert.equal(fx.options.palette.length, 2, 'ramps resample to the default length');
  const f = createFrame(5, 5);
  fx.update(0.25);
  fx.draw(f);
  assert.equal(f.color[2 * 5 + 2], WHITE);
  assert.ok(f.light[2 * 5 + 2] !== 0);
  assert.equal(fx.done(), false);
  fx.update(0.3);
  assert.equal(fx.done(), true);
});

test('the vendored core carries its MIT licence and no DOM or Math.random', () => {
  const dir = new URL('../src/render/pixelfx/', import.meta.url);
  const license = readFileSync(new URL('LICENSE', dir), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Patch/);
  assert.match(license, /Hugo Duprez/);
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(!/Math\.random/.test(src), `${name} has no Math.random`);
    assert.ok(!/\bdocument\.|\bwindow\./.test(src), `${name} has no DOM`);
  }
});
