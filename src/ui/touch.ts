import { length } from "../game/collision.js";
import type { PointerStick } from "../game/input.js";

export function createTouch(
  root: HTMLElement,
  stickEl: HTMLElement,
  dashEl: HTMLElement,
): {
  stick: PointerStick;
  attach: () => void;
  detach: () => void;
  reset: () => void;
  invalidateGeometry: () => void;
} {
  const stick: PointerStick = { ax: 0, ay: 0, dashQueued: false };
  // A small radial dead zone keeps thumb jitter from starting the cat.
  const deadZone = 0.14;
  const knob = stickEl.querySelector<HTMLElement>("i")!;
  let pointerId: number | null = null;
  let geometry: { x: number; y: number; travel: number } | null = null;
  let knobOffset = "";
  const moveKnob = (x: number, y: number) => {
    const offset = x === 0 && y === 0 ? "" : `${x}px ${y}px`;
    if (offset === knobOffset) return;
    knobOffset = offset;
    knob.style.translate = offset;
  };
  const setFromEvent = (event: PointerEvent) => {
    if (!geometry) {
      const rect = stickEl.getBoundingClientRect();
      geometry = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        travel: Math.max(1, (rect.width - knob.offsetWidth) / 2),
      };
    }
    const { x, y, travel } = geometry;
    const ax = (event.clientX - x) / travel;
    const ay = (event.clientY - y) / travel;
    const len = length(ax, ay);
    const visualScale = 1 / Math.max(1, len);
    // The stick chooses direction only. Past the dead zone, keep normal speed.
    const scale = len > deadZone ? 1 / len : 0;
    stick.ax = ax * scale;
    stick.ay = ay * scale;
    moveKnob(ax * visualScale * travel, ay * visualScale * travel);
  };

  const releaseStick = () => {
    stick.ax = 0;
    stick.ay = 0;
    const previous = pointerId;
    pointerId = null;
    geometry = null;
    if (previous !== null && stickEl.hasPointerCapture(previous))
      stickEl.releasePointerCapture(previous);
    moveKnob(0, 0);
    stickEl.classList.remove("is-active");
  };
  const reset = () => {
    releaseStick();
    stick.dashQueued = false;
  };

  const onDown = (event: PointerEvent) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    stickEl.setPointerCapture(event.pointerId);
    stickEl.classList.add("is-active");
    setFromEvent(event);
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    setFromEvent(event);
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    releaseStick();
  };
  const onDash = (event: Event) => {
    event.preventDefault();
    stick.dashQueued = true;
  };

  return {
    stick,
    reset,
    invalidateGeometry: () => { geometry = null; },
    attach() {
      root.classList.add("is-on");
      stickEl.addEventListener("pointerdown", onDown);
      stickEl.addEventListener("pointermove", onMove);
      stickEl.addEventListener("pointerup", onUp);
      stickEl.addEventListener("pointercancel", onUp);
      stickEl.addEventListener("lostpointercapture", onUp);
      dashEl.addEventListener("pointerdown", onDash);
    },
    detach() {
      root.classList.remove("is-on");
      stickEl.removeEventListener("pointerdown", onDown);
      stickEl.removeEventListener("pointermove", onMove);
      stickEl.removeEventListener("pointerup", onUp);
      stickEl.removeEventListener("pointercancel", onUp);
      stickEl.removeEventListener("lostpointercapture", onUp);
      dashEl.removeEventListener("pointerdown", onDash);
      reset();
    },
  };
}

export function prefersTouch(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}
