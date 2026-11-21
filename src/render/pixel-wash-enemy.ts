import type { Ctx } from "./paper-material.js";

// A pointed drop, not the squat ink carrier. The two contours redistribute
// its volume while the leaking hem and pooled foot stay at the world anchor.
const DROP = [
  [[0,0],[0,1],[-1,1],[-1,2],[-2,2],[-2,3],[-3,4],[-4,4],[-4,5],[-5,6],
    [-6,6],[-7,7],[-8,8],[-8,9],[-9,9],[-10,10],[-10,10],[-11,11],[-11,11],
    [-12,12],[-12,12],[-12,12],[-12,12],[-11,12],[-11,11],[-10,11],[-9,10],
    [-8,9],[-7,8],[-6,7],[-5,6],[-4,5],[-7,8],[-9,10]],
  [[1,1],[1,2],[0,2],[0,3],[-1,3],[-1,4],[-2,4],[-3,5],[-4,6],[-4,7],
    [-5,7],[-6,8],[-7,9],[-8,10],[-9,10],[-9,11],[-10,11],[-11,12],[-11,12],
    [-12,12],[-12,13],[-12,13],[-12,13],[-12,12],[-11,12],[-10,11],[-9,10],
    [-8,9],[-7,8],[-6,7],[-5,6],[-4,5],[-7,8],[-9,10]],
] as const;
const COLORS = [
  { edge: "#294656", dark: "#35657d", body: "#528da5", plane: "#7baebb", belly: "#abc9cc", pool: "#648f98", eye: "#d4d4be", pupil: "#263f4a" },
  { edge: "#414e52", dark: "#5c737b", body: "#839da3", plane: "#a5b7b7", belly: "#c2ccc3", pool: "#829697", eye: "#d3d1c0", pupil: "#3b4a4c" },
  { edge: "#505753", dark: "#7a8781", body: "#a6b0a5", plane: "#c1c7b8", belly: "#d4d5c2", pool: "#929f93", eye: "#dedac8", pupil: "#4d5953" },
] as const;

/** Static native frame; the existing enemy sprite cache owns all allocation. */
export function drawPixelWashEnemy(ctx: Ctx, frame: number, attack: boolean, wash: number): void {
  const phase = frame % 2 === 0 ? 0 : 1;
  const p = COLORS[wash >= 1 ? 2 : wash > 0 ? 1 : 0];
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  };
  ctx.save();
  // The quiet footprint is attached through a narrow leaking hem. It is part
  // of this creature, not a new water hazard or a detached animated droplet.
  r(-8, 0, 18, 2, p.edge); r(-11, 0, 23, 1, p.edge);
  r(-7, 0, 16, 1, p.pool); r(-4, 1, 9, 1, p.pool);
  DROP[phase].forEach(([left, right], row) => {
    const y = row - 33;
    r(left, y, right - left + 1, 1, p.edge);
    if (right - left < 2) return;
    r(left + 1, y, right - left - 1, 1, p.body);
    if (row >= 5 && row <= 28) {
      const darkEnd = Math.min(-2 + phase, right - 1);
      if (darkEnd >= left + 1) r(left + 1, y, darkEnd - left, 1, p.dark);
    }
    if (row >= 8 && row <= 23) {
      const start = Math.max(left + 1, right - 4);
      r(start, y, right - start, 1, p.plane);
    }
  });
  // Broad soaked belly with a rounded stepped outline. No glossy rim or
  // isolated flecks; its changing width is the breath before a water spit.
  const swell = attack ? 1 : 0;
  r(-3 - swell, -11, 9 + swell, 1, p.belly);
  r(-5 - swell, -10, 13 + swell, 5, p.belly);
  r(-3 - swell, -5, 10 + swell, 2, p.belly);
  r(-1, -3, 6, 1, p.plane);
  r(-4 + phase, -4, 2, 4, p.pool); r(-3 + phase, -1, 3, 2, p.pool);
  // Eyes sit above the pale belly, with unequal socket shapes and small
  // dark pupils so this reads as the blue ranged drop at native size.
  r(-7 + phase, -18, 5, 6, p.dark); r(2 + phase, -18, 5, 6, p.dark);
  r(-6 + phase, -17, 3, 4, p.eye); r(3 + phase, -17, 3, 4, p.eye);
  r(-5 + phase, -18, 2, 1, p.eye); r(3 + phase, -18, 2, 1, p.eye);
  r(-4 + phase, -16, 1, 3, p.pupil); r(4 + phase, -16, 1, 3, p.pupil);
  if (attack) {
    // A neck joins the charged bead to its mouth, unlike the smudge's carried
    // ink load. All its colours participate in wash-out with the same body.
    r(1, -12, 7, 3, p.dark); r(6, -14, 5, 5, p.body);
    r(10, -17, 3, 1, p.edge); r(9, -16, 5, 7, p.edge);
    r(8, -14, 7, 4, p.edge); r(10, -15, 3, 5, p.plane);
    r(9, -13, 4, 2, p.belly); r(10, -10, 3, 1, p.pool);
  } else {
    r(-1 + phase, -12, 3, 2, p.dark); r(0 + phase, -12, 1, 1, p.pupil);
  }
  ctx.restore();
}
