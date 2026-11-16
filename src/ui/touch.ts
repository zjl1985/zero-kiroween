import { length } from "../game/collision.js";
import type { PointerStick } from "../game/input.js";

export function createTouch(root: HTMLElement, stickEl: HTMLElement, dashEl: HTMLElement): {
  stick: PointerStick;
  attach: () => void;
  detach: () => void;
} {
  const stick: PointerStick = { ax: 0, ay: 0, dashQueued: false };
  let pointerId: number | null = null;

  const setFromEvent = (event: PointerEvent) => {
    const rect = stickEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    let ax = (event.clientX - cx) / radius;
    let ay = (event.clientY - cy) / radius;
    const len = length(ax, ay);
    if (len > 1) {
      ax /= len;
      ay /= len;
    }
    stick.ax = ax;
    stick.ay = ay;
    stickEl.style.setProperty("--kx", `${ax * 28}px`);
    stickEl.style.setProperty("--ky", `${ay * 28}px`);
  };

  const reset = () => {
    stick.ax = 0;
    stick.ay = 0;
    pointerId = null;
    stickEl.style.setProperty("--kx", "0px");
    stickEl.style.setProperty("--ky", "0px");
  };

  const onDown = (event: PointerEvent) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    stickEl.setPointerCapture(event.pointerId);
    setFromEvent(event);
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    setFromEvent(event);
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    reset();
  };
  const onDash = (event: Event) => {
    event.preventDefault();
    stick.dashQueued = true;
  };

  return {
    stick,
    attach() {
      root.classList.add("is-on");
      stickEl.addEventListener("pointerdown", onDown);
      stickEl.addEventListener("pointermove", onMove);
      stickEl.addEventListener("pointerup", onUp);
      stickEl.addEventListener("pointercancel", onUp);
      dashEl.addEventListener("pointerdown", onDash);
    },
    detach() {
      root.classList.remove("is-on");
      stickEl.removeEventListener("pointerdown", onDown);
      stickEl.removeEventListener("pointermove", onMove);
      stickEl.removeEventListener("pointerup", onUp);
      stickEl.removeEventListener("pointercancel", onUp);
      dashEl.removeEventListener("pointerdown", onDash);
      reset();
    },
  };
}

export function prefersTouch(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}
