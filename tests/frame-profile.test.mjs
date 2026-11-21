import assert from "node:assert/strict";
import { test } from "node:test";
import { FrameProfile } from "../dist/render/frame-profile.js";
const metadata = { version: "test-revision", viewport: { width: 390, height: 844 }, dpr: 3, reduced: false, seed: 7, variant: "A" };

test("empty, one-frame and two-frame captures report honest sample sizes and null missing timings", () => {
  const p = new FrameProfile(metadata, 8);
  p.start("dry");
  assert.equal(p.snapshot().frameIntervals.p99Ms, null);
  assert.equal(p.snapshot().frameIntervals.over33MsRate, null);
  p.record(100, { gen: 0, total: 4 });
  assert.equal(p.snapshot().framesRetained, 1);
  assert.equal(p.snapshot().frameIntervals.samples, 0);
  assert.equal(p.snapshot().cpuMs.gen.p50Ms, 0);
  assert.equal(p.snapshot().cpuMs.mask.samples, 0);
  p.record(116, { total: 6 });
  assert.deepEqual(p.snapshot().frameIntervals, {
    samples: 1, p50Ms: 16, p95Ms: 16, p99Ms: 16, maxMs: 16, over33MsCount: 0, over33MsRate: 0,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(p.snapshot())), p.snapshot());
});

test("nearest-rank percentiles and strict greater-than-33 rate use valid retained intervals", () => {
  const p = new FrameProfile(metadata, 8);
  p.start("crowded");
  let timestamp = 0;
  p.record(timestamp);
  for (const interval of [10, 20, 30, 33, 34, 60]) p.record(timestamp += interval);
  assert.deepEqual(p.snapshot().frameIntervals, {
    samples: 6, p50Ms: 30, p95Ms: 60, p99Ms: 60, maxMs: 60, over33MsCount: 2, over33MsRate: 2 / 6,
  });
});

test("ring overwrite excludes old spikes and keeps frame/time accounting bounded", () => {
  const p = new FrameProfile(metadata, 3);
  p.start("first-water");
  for (const [time, total] of [[0, 1], [100, 99], [110, 2], [121, 3], [133, 4]]) p.record(time, { total });
  const result = p.snapshot();
  assert.equal(result.framesRecorded, 5);
  assert.equal(result.framesRetained, 3);
  assert.equal(result.framesOverwritten, 2);
  assert.equal(result.retainedStartTimestampMs, 110);
  assert.equal(result.retainedEndTimestampMs, 133);
  assert.equal(result.frameIntervals.maxMs, 12);
  assert.equal(result.cpuMs.total.maxMs, 4);
});

test("stop ignores callbacks and start clears both interval history and phase data", () => {
  const p = new FrameProfile(metadata, 3);
  p.start("steady-wash");
  p.record(10, { mask: 2 });
  p.stop();
  p.record(500, { mask: 99 });
  assert.equal(p.snapshot().framesRecorded, 1);
  p.start("repaint");
  p.record(1000, { composite: 3 });
  const result = p.snapshot();
  assert.equal(result.label, "repaint");
  assert.equal(result.framesRecorded, 1);
  assert.equal(result.frameIntervals.samples, 0);
  assert.equal(result.cpuMs.mask.samples, 0);
  assert.equal(result.cpuMs.composite.maxMs, 3);
});

test("invalid timestamps cannot poison intervals and invalid CPU values are missing", () => {
  const p = new FrameProfile(metadata, 8);
  p.start("dry");
  p.record(100, { gen: -1, mask: NaN, total: Infinity });
  for (const time of [NaN, Infinity, -1, 100, 99]) p.record(time);
  p.record(116, { total: 0 });
  const result = p.snapshot();
  assert.equal(result.rejectedTimestamps, 5);
  assert.equal(result.framesRecorded, 2);
  assert.equal(result.frameIntervals.maxMs, 16);
  assert.equal(result.cpuMs.gen.samples, 0);
  assert.equal(result.cpuMs.total.samples, 1);
  assert.equal(result.cpuMs.total.maxMs, 0);
});

test("metadata is captured by value and capacity is validated", () => {
  const mutable = { ...metadata, viewport: { ...metadata.viewport } };
  const p = new FrameProfile(mutable, 1);
  mutable.viewport.width = 999;
  const exported = p.snapshot();
  exported.metadata.viewport.width = 800;
  assert.equal(p.snapshot().metadata.viewport.width, 390);
  for (const size of [0, -1, 1.5, Infinity, 100001]) assert.throws(() => new FrameProfile(metadata, size), RangeError);
  assert.throws(() => p.start("unknown"), RangeError);
  p.start("dry");
  p.record(0);
  p.record(20);
  assert.equal(p.snapshot().frameIntervals.p99Ms, 20);
});
