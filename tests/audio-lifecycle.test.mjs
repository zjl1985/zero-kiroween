import assert from "node:assert/strict";
import { test } from "node:test";
import { createSfx } from "../dist/audio/sfx.js";

test("audio releases ended voices and stops ambient sources/timers when disabled or muted", (t) => {
  const nodes = [], timers = new Map();
  let timerId = 0, contexts = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  class Node {
    constructor() {
      this.gain = param(); this.frequency = param(); this.Q = param();
      this.threshold = param(); this.ratio = param(); this.stopped = false;
      this.disconnected = false; nodes.push(this);
    }
    connect(target) { return target; }
    disconnect() { this.disconnected = true; }
    start() { this.started = true; }
    stop(time) { this.stopped = true; this.stopTime = time; }
  }
  class Context {
    constructor() { contexts++; this.sampleRate = 16; this.currentTime = 1; this.state = "running"; this.destination = {}; }
    createGain() { return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    createOscillator() { return new Node(); }
    createBufferSource() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
  }
  t.mock.method(globalThis, "setTimeout"); // Never schedule real audio work.
  const old = globalThis.window;
  globalThis.window = { AudioContext: Context,
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); } };
  t.after(() => { if (old === undefined) delete globalThis.window; else globalThis.window = old; });
  const sfx = createSfx(false);
  sfx.unlock();
  assert.equal(nodes.filter(n => n.started).length, 0, "title has no silent ambient loops");
  sfx.setAmbience(true);
  const ambient = nodes.filter(n => n.started);
  assert.equal(ambient.length, 4);
  assert.equal(timers.size, 1);
  sfx.setAmbience(false);
  assert.ok(ambient.every(n => n.stopped && n.disconnected));
  assert.equal(timers.size, 0);
  for (let i = 0; i < 10; i++) {
    sfx.setAmbience(true);
    sfx.setMuted(true);
    assert.equal(timers.size, 0);
    assert.ok(nodes.filter(n => n.started).every(n => n.stopped && n.disconnected));
    sfx.setMuted(false);
    sfx.setAmbience(false);
  }
  const begin = nodes.length;
  sfx.play("shot"); sfx.play("hit");
  const voices = nodes.slice(begin);
  for (const n of voices.filter(n => n.started)) {
    assert.ok(n.stopped && n.stopTime > 1);
    n.onended();
    assert.equal(n.onended, null);
  }
  assert.ok(voices.every(n => n.disconnected));
  assert.equal(contexts, 1, "reuse one audio context across runs");
});
