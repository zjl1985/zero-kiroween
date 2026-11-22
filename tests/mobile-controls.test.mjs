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
  const root = element(), base = element(), knob = element();
  knob.offsetWidth = 26;
  base.querySelector = () => knob;
  let reads = 0;
  const rect = { left: 0, top: 0, width: 90, height: 90 };
  base.getBoundingClientRect = () => { reads++; return rect; };
  const touch = createTouch(root, base);
  touch.attach();
  const fire = (type, clientX, clientY, pointerId = 1, target = base) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { clientX, clientY, pointerId });
    target.dispatchEvent(event);
  };
  return { base, knob, touch, rect, fire, reads: () => reads };
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

test("secondary touches do not hijack the movement stick and cancellation clears its axes", () => {
  const { touch, fire, base, knob } = setup();
  const input = createInput();
  fire("pointerdown", 77, 45);
  fire("pointerdown", 12, 45, 2);
  fire("pointermove", 12, 45, 2);
  fire("pointerup", 12, 45, 2);
  assert.equal(input.sample(touch.stick).ax, 1);
  fire("pointercancel", 77, 45);
  assert.equal(knob.style.translate, "");
  assert.equal(base.classList.contains("is-active"), false);
  assert.deepEqual(input.sample(touch.stick), { ax: 0, ay: 0 });
  assert.deepEqual(Object.keys(touch.stick).sort(), ["ax", "ay"]);
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

function keyboardInput() {
  const target = new EventTarget(), input = createInput();
  input.attach(target);
  const fire = (code, repeat = false, type = "keydown") => {
    const event = Object.assign(new Event(type, { cancelable: true }), { code, repeat });
    target.dispatchEvent(event);
    return event;
  };
  return { input, target, fire };
}

test("Space, Shift and repeated keydown cannot queue an ability or boost movement", () => {
  const { input, fire } = keyboardInput(), stick = { ax: 0, ay: 0 };
  assert.equal("queueSkill" in input, false);
  fire("KeyD");
  const normal = input.sample(stick);
  for (const code of ["Space", "ShiftLeft", "ShiftRight"]) {
    for (const repeat of [false, true, true]) {
      const event = fire(code, repeat);
      assert.deepEqual(input.sample(stick), normal);
      assert.equal(event.defaultPrevented, false, "unbound keys retain browser/button behavior");
    }
  }
  assert.deepEqual(normal, { ax: 1, ay: 0 });
  const speed = (frame) => {
    const state = createSim({ seed: 9 });
    step(state, frame, FIXED_DT);
    return Math.hypot(state.player.vx, state.player.vy);
  };
  assert.equal(speed(input.sample(stick)), speed(normal));
  fire("KeyD", false, "keyup");
  assert.deepEqual(input.sample(stick), { ax: 0, ay: 0 });
  input.detach();
});

test("keyboard diagonal and pointer axes remain normalized with the existing stick priority", () => {
  const { input, fire, target } = keyboardInput();
  fire("KeyW"); fire("KeyD");
  const diagonal = input.sample({ ax: 0, ay: 0 });
  assert.ok(Math.abs(Math.hypot(diagonal.ax, diagonal.ay) - 1) < 1e-12);
  assert.ok(diagonal.ax > 0 && diagonal.ay < 0);
  assert.deepEqual(input.sample({ ax: 0, ay: 0.04 }), diagonal, "tiny pointer jitter does not replace keyboard movement");
  assert.deepEqual(input.sample({ ax: -3, ay: 4 }), { ax: -0.6, ay: 0.8 });
  assert.deepEqual(input.sample({ ax: 0, ay: 0.5 }), { ax: 0, ay: 0.5 });
  target.dispatchEvent(new Event("blur"));
  assert.deepEqual(input.sample({ ax: 0, ay: 0 }), { ax: 0, ay: 0 });
  input.detach();
});

test("menu choice and pause shortcuts remain single-consumption actions", () => {
  const { input, fire } = keyboardInput();
  fire("Digit2"); assert.equal(input.consumeChoice(), 1); assert.equal(input.consumeChoice(), null);
  fire("Digit2", true); assert.equal(input.consumeChoice(), null);
  fire("Numpad3"); assert.equal(input.consumeChoice(), 2);
  for (const code of ["Escape", "KeyP"]) {
    assert.equal(fire(code).defaultPrevented, true);
    assert.equal(input.wantsPause(), true);
    assert.equal(input.consumePause(), true);
    assert.equal(input.consumePause(), false);
    fire(code, true); assert.equal(input.wantsPause(), false);
  }
  assert.equal(fire("ArrowLeft").defaultPrevented, true);
  fire("Digit1"); fire("Escape"); input.reset();
  assert.equal(input.consumeChoice(), null); assert.equal(input.consumePause(), false);
  assert.deepEqual(input.sample({ ax: 0, ay: 0 }), { ax: 0, ay: 0 });
  input.detach();
});


test("phone context hints remain in HUD flow as one line, while danger copy may wrap",()=>{
  const css=readFileSync(new URL("../site/styles.css",import.meta.url),"utf8");
  const rules=[...css.matchAll(/\.has-touch \.game-hint\.context-hint\s*\{([^}]+)\}/g)].map(m=>m[1]);
  const phone=rules.at(-1);
  assert.match(phone,/position:\s*static/);
  assert.match(phone,/white-space:\s*nowrap/);
  assert.match(phone,/text-overflow:\s*ellipsis/);
  assert.doesNotMatch(phone,/position:\s*absolute|bottom:/);
  assert.match(css,/\.has-touch \.game-hint\.context-hint\.danger-hint\s*\{[^}]*white-space:\s*normal;[^}]*overflow:\s*visible/);
});
