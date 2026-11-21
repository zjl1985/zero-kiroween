import { length } from "./collision.js";
import type { FrameInput } from "./types.js";

export interface PointerStick {
  ax: number;
  ay: number;
}

export function createInput(): {
  attach: (target: Window) => void;
  detach: () => void;
  sample: (stick: PointerStick) => FrameInput;
  wantsPause: () => boolean;
  consumePause: () => boolean;
  reset: () => void;
  consumeChoice: () => number | null;
} {
  const keys = new Set<string>();
  let pauseQueued = false;
  let choiceQueued: number | null = null;
  let attached: Window | null = null;

  const down = (event: KeyboardEvent) => {
    const code = event.code;
    keys.add(code);
    const digit = /^(?:Digit|Numpad)([1-3])$/.exec(code);
    if (digit && !event.repeat) choiceQueued = Number(digit[1]) - 1;
    if ((code === "Escape" || code === "KeyP") && !event.repeat) {
      event.preventDefault();
      pauseQueued = true;
    }
    if (
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight"
    ) {
      event.preventDefault();
    }
  };
  const up = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const blur = () => {
    keys.clear();
    pauseQueued = false;
    choiceQueued = null;
  };

  const axisFromKeys = (): { ax: number; ay: number } => {
    let ax = 0;
    let ay = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) ax -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ax += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) ay -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) ay += 1;
    const len = length(ax, ay);
    if (len > 1) {
      ax /= len;
      ay /= len;
    }
    return { ax, ay };
  };

  return {
    reset: blur,
    attach(target) {
      if (attached) return;
      attached = target;
      target.addEventListener("keydown", down);
      target.addEventListener("keyup", up);
      target.addEventListener("blur", blur);
    },
    detach() {
      if (!attached) return;
      attached.removeEventListener("keydown", down);
      attached.removeEventListener("keyup", up);
      attached.removeEventListener("blur", blur);
      attached = null;
      keys.clear();
    },
    sample(stick) {
      const keysAxis = axisFromKeys();
      let ax = keysAxis.ax;
      let ay = keysAxis.ay;
      if (length(stick.ax, stick.ay) > 0.05) {
        ax = stick.ax;
        ay = stick.ay;
      }
      const len = length(ax, ay);
      if (len > 1) {
        ax /= len;
        ay /= len;
      }
      return { ax, ay };
    },
    wantsPause() {
      return pauseQueued;
    },
    consumeChoice() {
      const v = choiceQueued;
      choiceQueued = null;
      return v;
    },
    consumePause() {
      const v = pauseQueued;
      pauseQueued = false;
      return v;
    },
  };
}
