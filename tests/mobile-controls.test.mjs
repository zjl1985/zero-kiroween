import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FIXED_DT } from "../dist/game/clock.js";
import { createInput } from "../dist/game/input.js";
import { createSim, step } from "../dist/game/sim.js";
import { createTouch } from "../dist/ui/touch.js";

function element() {
  const classes = new Set();
  const events = new EventTarget();
  const capture = new Set();
  return Object.assign(events, {
    style: {},
    classList: {
      add: key => classes.add(key),
      remove: key => classes.delete(key),
      contains: key => classes.has(key),
    },
    setPointerCapture: id => capture.add(id),
    hasPointerCapture: id => capture.has(id),
    releasePointerCapture: id => capture.delete(id),
  });
}

function setup() {
  const root = element(), base = element(), dash = element(), knob = element();
  knob.offsetWidth = 26;
  base.querySelector = () => knob;
  let reads = 0;
  const rect = { left: 0, top: 0, width: 90, height: 90 };
  base.getBoundingClientRect = () => { reads++; return rect; };
  const touch = createTouch(root, base, dash);
  touch.attach();
  const fire = (type, clientX, clientY, pointerId = 1, target = base) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { clientX, clientY, pointerId });
    target.dispatchEvent(event);
  };
  return { base, dash, knob, touch, rect, fire, reads: () => reads };
}

test("touch drag updates direction immediately without remeasuring the layout on every move", () => {
  const { touch, fire, base, knob, rect, reads } = setup();
  fire("pointerdown", 45, 45);
  assert.ok(base.classList.contains("is-active"));
  fire("pointermove", 48, 45);
  assert.equal(touch.stick.ax, 0);
  assert.equal(knob.style.translate, "3px 0px");
  fire("pointermove", 61, 45);
  assert.equal(touch.stick.ax, 1);
  assert.equal(knob.style.translate, "16px 0px");
  fire("pointermove", 100, 45);
  assert.equal(touch.stick.ax, 1);
  assert.equal(knob.style.translate, "32px 0px");
  assert.equal(reads(), 1);
  rect.left = 10;
  rect.width = 98;
  touch.invalidateGeometry();
  fire("pointermove", 59, 45); // New horizontal center.
  assert.equal(touch.stick.ax, 0);
  assert.equal(knob.style.translate, "");
  assert.equal(reads(), 2);
});

test("secondary touches do not hijack the stick or lose a queued skill when it is released", () => {
  const { touch, fire, base, dash, knob } = setup();
  const input = createInput();
  fire("pointerdown", 77, 45);
  fire("pointerdown", 12, 45, 2);
  fire("pointermove", 12, 45, 2);
  fire("pointerup", 12, 45, 2);
  assert.equal(input.sample(touch.stick).ax, 1);
  fire("pointerdown", 200, 300, 3, dash);
  fire("pointercancel", 77, 45);
  assert.equal(knob.style.translate, "");
  assert.equal(base.classList.contains("is-active"), false);
  assert.deepEqual(input.sample(touch.stick), { ax: 0, ay: 0, dash: true });
  assert.equal(input.sample(touch.stick).dash, false);
  fire("pointerdown", 77, 45, 4);
  fire("lostpointercapture", 77, 45, 4);
  assert.equal(touch.stick.ax, 0);
  fire("pointerdown", 77, 45, 5);
  touch.detach();
  assert.equal(touch.stick.ax, 0);
  assert.equal(base.hasPointerCapture(5), false);
});

test("a shallow push outside the radial dead zone and a full push keep the same cat speed", () => {
  const { touch, fire } = setup();
  const input = createInput();
  fire("pointerdown", 45, 45);
  const velocity = (x, y) => {
    fire("pointermove", x, y);
    const state = createSim({ seed: 9 });
    step(state, input.sample(touch.stick), FIXED_DT);
    return Math.hypot(state.player.vx, state.player.vy);
  };
  const top = velocity(77, 45);
  assert.ok(top > 0);
  assert.equal(velocity(48, 45), 0);
  assert.equal(velocity(50, 45), top);
  assert.ok(Math.abs(velocity(100, 100) - top) < 1e-8);
});

test("the built touch upgrade hand skips the desktop deal and forces flat cards", () => {
  const main = readFileSync(new URL("../site/dist/main.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../site/styles.css", import.meta.url), "utf8");
  assert.match(main, /show\("upgrade"\);\s*(?:\/\/[^\n]*\n\s*)?if \(useTouch\)\s*return;[\s\S]*?replay\(hand, "dealt"\)/);
  assert.match(css, /\.has-touch \.upgrade-cards\s*\{\s*perspective: none/);
  assert.match(css, /\.has-touch \.upgrade-card:hover[^\{]*\{\s*transform: none;\s*filter: none;\s*transition: none/);
});
