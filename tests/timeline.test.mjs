import assert from "node:assert/strict";
import { test } from "node:test";
import { createClock, FIXED_DT } from "../dist/game/clock.js";
import { chooseUpgrade, createSim, snapshot, step } from "../dist/game/sim.js";
import {
  advanceCues,
  BEATS,
  beatLength,
  cueEnvelope,
  cueSpeed,
  cueTremble,
  cueZoom,
  DEAL,
  dealDelayMs,
  easeInOut,
  easeOutBack,
  phaseAt,
  PHASES,
  presentationSpeed,
  presentationSteps,
  presentationZoom,
  REDUCED_BEAT,
  springSettle,
} from "../dist/render/timeline.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("easings start at 0, end at 1, and easeOutBack overshoots", () => {
  for (const f of [easeInOut, easeOutBack, springSettle]) {
    close(f(0), 0);
    close(f(1), 1);
  }
  close(easeInOut(0.5), 0.5);
  let peak = 0;
  for (let i = 0; i <= 100; i++) peak = Math.max(peak, easeOutBack(i / 100));
  assert.ok(peak > 1.05 && peak < 1.2, `overshoot ${peak}`);
  let spring = 0;
  for (let i = 0; i <= 100; i++) spring = Math.max(spring, springSettle(i / 100));
  assert.ok(spring > 1, "spring wobbles past 1 before it settles");
});

test("phaseAt walks anticipation, reveal, burst, settle in order", () => {
  const b = { anticipation: 1, reveal: 2, burst: 1, settle: 1 };
  assert.equal(beatLength(b), 5);
  assert.deepEqual(phaseAt(b, 0), { phase: "anticipation", local: 0, total: 0 });
  assert.equal(phaseAt(b, 0.5).phase, "anticipation");
  const reveal = phaseAt(b, 2);
  assert.equal(reveal.phase, "reveal");
  close(reveal.local, 0.5);
  close(reveal.total, 0.4);
  assert.equal(phaseAt(b, 3.2).phase, "burst");
  assert.equal(phaseAt(b, 4.9).phase, "settle");
  assert.equal(phaseAt(b, 5).phase, null);
  // Zero-length beats are skipped.
  assert.equal(phaseAt(REDUCED_BEAT, 0).phase, "burst");
  assert.equal(phaseAt(REDUCED_BEAT, 0.1).phase, "settle");
});

test("every key cue has all four beats and slows the sim only in presentation", () => {
  for (const [kind, beat] of Object.entries(BEATS)) {
    for (const p of PHASES) assert.ok(beat[p] > 0, `${kind} ${p}`);
    const len = beatLength(beat);
    let t = 0;
    const seen = [];
    while (t < len) {
      const p = phaseAt(beat, t).phase;
      if (seen.at(-1) !== p) seen.push(p);
      const c = { kind, t };
      const s = cueSpeed(c, false);
      assert.ok(s > 0 && s <= 1, `${kind} speed ${s}`);
      assert.equal(cueSpeed(c, true), 1, "no slow motion under reduced motion");
      assert.equal(cueZoom(c, true), 1, "no zoom under reduced motion");
      assert.ok(cueEnvelope(c, false) >= 0 && cueEnvelope(c, false) <= 1);
      t += 0.01;
    }
    assert.deepEqual(seen, PHASES);
    close(cueSpeed({ kind, t: len }, false), 1);
    close(cueZoom({ kind, t: len }, false), 1);
  }
  // The evolution burst is the slowest beat and the zoom peaks there.
  const e = BEATS.evolution;
  const burst = { kind: "evolution", t: e.anticipation + e.reveal + e.burst * 0.5 };
  assert.ok(cueSpeed(burst, false) <= 0.35);
  assert.ok(cueZoom(burst, false) > 1.05);
  assert.deepEqual(cueTremble([burst], 1.3, true), { x: 0, y: 0 });
});

test("cues age in real time and the slowest / widest one wins", () => {
  let cues = [{ kind: "evolution", t: 0 }, { kind: "dawn", t: 0 }];
  cues = advanceCues(cues, beatLength(BEATS.evolution) + 0.01, false);
  assert.deepEqual(cues.map((c) => c.kind), ["dawn"]);
  assert.equal(advanceCues(cues, 0.5, true).length, 0, "reduced cues are short fades");
  const both = [
    { kind: "evolution", t: BEATS.evolution.anticipation + BEATS.evolution.reveal + 0.1 },
    { kind: "dawn", t: 0.1 },
  ];
  assert.equal(presentationSpeed(both, false), cueSpeed(both[0], false));
  assert.equal(presentationZoom(both, false), cueZoom(both[0], false));
  assert.equal(presentationSpeed(both, true), 1);
  assert.equal(presentationSpeed([], false), 1);
});

test("cards deal about 70 ms apart", () => {
  assert.ok(DEAL.staggerMs >= 60 && DEAL.staggerMs <= 80);
  assert.deepEqual([0, 1, 2].map(dealDelayMs), [0, DEAL.staggerMs, 2 * DEAL.staggerMs]);
});

test("presentation slow motion runs fewer FIXED_DT steps but leaves the sim identical", () => {
  const inputs = [
    { ax: 0.7, ay: -0.3, dash: false },
    { ax: -0.2, ay: 0.9, dash: false },
    { ax: 0, ay: 0, dash: true },
    { ax: 1, ay: 0.1, dash: false },
  ];
  const total = 900;
  const run = (speedAt, legacy = false) => {
    const sim = createSim({ cat: "nicole", seed: 77, sessionSeconds: 600 });
    const clock = createClock();
    let steps = 0,
      frames = 0;
    while (steps < total) {
      const n = presentationSteps(clock, 1 / 60, speedAt(frames));
      for (let i = 0; i < n && steps < total; i++, steps++) {
        const input=inputs[Math.floor(steps / 40) % inputs.length];
        step(sim, {...input,dash:legacy&&input.dash}, FIXED_DT);
        if (sim.pendingChoice) chooseUpgrade(sim, 0);
      }
      frames++;
    }
    return { snap: snapshot(sim), frames };
  };
  const normal = run(() => 1);
  // Cycle through evolution-like slow-motion stretches.
  const slowed = run((f) => (f % 90 < 30 ? 0.3 : f % 90 < 45 ? 0.6 : 1));
  assert.ok(slowed.frames > normal.frames + 100, `${slowed.frames} vs ${normal.frames}`);
  assert.deepEqual(slowed.snap, normal.snap);
  const legacy=run(() => 1,true);
  assert.deepEqual(legacy.snap,normal.snap,"legacy ability flags do not change timed simulation");
});
