import assert from "node:assert/strict";
import { test } from "node:test";
import { CUE_LAYERS, CUE_TIER, MASTER, THROTTLE, cueLevel, layerGain, mixTable } from "../dist/audio/mix.js";

const table = mixTable();
const tier = (name) => Object.entries(table).filter(([, r]) => r.tier === name);

test("every cue has layers, a tier, a throttle and a finite, audible mix row", () => {
  const cues = Object.keys(CUE_LAYERS);
  assert.ok(cues.length >= 24);
  for (const cue of cues) {
    assert.ok(CUE_TIER[cue], `${cue} has a tier`);
    assert.ok(THROTTLE[cue] > 0, `${cue} has a throttle (voice cap)`);
    const r = table[cue];
    assert.ok(r.peak > 0.01 && r.peak < 0.25, `${cue} peak ${r.peak}`);
    assert.ok(r.duration > 0 && r.duration < 2.5, `${cue} duration ${r.duration}`);
    assert.ok(r.low >= 20 && r.high <= 20000 && r.low <= r.high, `${cue} band`);
  }
});

test("the envelope math follows the exponential ramps sfx.ts schedules", () => {
  const l = { kind: "tone", freq: 440, dur: 0.2, gain: 0.08 };
  assert.equal(layerGain(l, -0.01), 0);
  assert.ok(Math.abs(layerGain(l, 0.005) - 0.08) < 1e-9);
  assert.ok(layerGain(l, 0.1) < 0.08 && layerGain(l, 0.1) > 0.0001);
  assert.equal(layerGain(l, 0.25), 0);
});

test("frequent cues sit below every rare event cue", () => {
  const loudestFrequent = Math.max(...tier("frequent").map(([, r]) => r.peak)),
    quietestEvent = Math.min(...tier("event").map(([, r]) => r.peak));
  assert.ok(loudestFrequent < quietestEvent, `frequent ${loudestFrequent} < event ${quietestEvent}`);
  for (const k of [0, 1, 8, 50]) assert.ok(cueLevel("defeat", k).peak < quietestEvent, `defeat at k=${k}`);
});

test("snip and fold peak within the band of comparable short cues (tear, hit, skill)", () => {
  const band = ["tear", "hit", "skill"].map((c) => table[c].peak),
    lo = Math.min(...band),
    hi = Math.max(...band);
  for (const cue of ["snip", "fold"]) {
    const p = table[cue].peak;
    assert.ok(p >= lo - 1e-9 && p <= hi + 1e-9, `${cue} ${p} in [${lo}, ${hi}]`);
  }
});

test("stacked cues cannot pass full scale: frequent voices fit the bus and a hard limiter closes it", () => {
  let frequent = 0;
  for (const [, r] of tier("frequent")) frequent += r.peak * r.voices;
  assert.ok(frequent * MASTER.gain < 1, `crowded fight bus ${frequent * MASTER.gain}`);
  const l = MASTER.limiter;
  assert.ok(l.threshold <= -1 && l.ratio >= 12 && l.knee === 0 && l.attack <= 0.005);
});
