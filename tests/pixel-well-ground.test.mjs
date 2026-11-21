import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANDMARK_ART } from '../dist/render/art-index.js';
import { WISHING_WELL } from '../dist/defs/landmarks/wishing-well/def.js';
import { inWaterPolygon } from '../dist/defs/water.js';

function record() {
  const cells = new Set(), stack = [];
  let style = '#123456';
  const ctx = {
    get fillStyle() { return style; }, set fillStyle(value) { style = value; },
    save() { stack.push(style); }, restore() { style = stack.pop(); },
    fillRect(x, y, w, h) {
      assert.ok([x, y, w, h].every(Number.isInteger) && w > 0 && h > 0);
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells.add(`${xx},${yy}`);
    },
  };
  return { ctx, cells, stack };
}

test('wishing-well ground cannot hide its authoritative pond under an opaque plaza', () => {
  const art = LANDMARK_ART.get('wishing-well');
  for (const [x, y] of [[0, 0], [-3287, 4842], [1024, -512]]) {
    const landmark = Object.freeze({ id: 'well-fixture', kind: 'wishing-well', x, y, radius: 170, seed: 7 });
    const pond = WISHING_WELL.water(landmark)[0], before = JSON.stringify(pond);
    const base = record(), detail = record();
    art.base(base.ctx, landmark); art.ground(detail.ctx, landmark);
    for (const cell of base.cells) {
      const [px, py] = cell.split(',').map(Number);
      assert.equal(inWaterPolygon({ x: px + .5, y: py + .5 }, pond.shore), false, 'opaque dry footing must not cover water');
    }
    assert.ok(detail.cells.size > 100 && detail.cells.size < 1500, 'floating detail remains sparse enough to read the water');
    for (const cell of detail.cells) {
      const [px, py] = cell.split(',').map(Number);
      assert.equal(inWaterPolygon({ x: px + .5, y: py + .5 }, pond.shore), true, 'boats and lily details stay on the real pond');
    }
    assert.equal(JSON.stringify(pond), before);
    for (const r of [base, detail]) { assert.equal(r.ctx.fillStyle, '#123456'); assert.deepEqual(r.stack, []); }
  }
});
