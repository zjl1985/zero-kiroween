/** Articulated paper tailoring. No face data, cat ids, simulation state or wall clock. */
import { cachedSprite } from "../engine/sprite.js";
import type { CatBodyPalette } from "./art-registry.js";
import type { CatPose } from "./layout.js";
import { foldLine, paperCut } from "./paper-kit.js";
import { box, glow, line, mix, oval, path, shadow, stitch, stroke, type Ctx } from "./paper-material.js";

/** Body / lamp envelope at scale .16, including the soft lamp halo (head is unchanged). */
export const CAT_DETAIL_BOUNDS = { l: -42, r: 42, t: -43, b: 14 } as const;

/** Smooth hinges use pose time; only the cape's two cut patterns enter the cache key. */
export function catDetailPose(pose: CatPose) {
  const stride = pose.moving ? Math.sin(pose.time * 12) : 0;
  const breath = Math.sin(pose.time * 2);
  return {
    bob: pose.dashing ? 0 : pose.moving ? stride * 1.1 : breath * 0.25,
    stride: pose.dashing ? 0.65 : stride,
    capeCut: pose.dashing ? 1 as const : 0 as const,
    cape: pose.dashing ? -0.055 : Math.sin(pose.time * (pose.moving ? 6 : 2) - 0.6) * (pose.moving ? 0.045 : 0.018),
    tail: pose.dashing ? 0.13 : Math.sin(pose.time * (pose.moving ? 6 : 2) + 0.7) * (pose.moving ? 0.1 : 0.055),
    arm: pose.hurt ? -0.22 : pose.dashing ? -0.2 : stride * 0.13,
    headTilt: pose.hurt ? -0.055 : pose.dashing ? 0.055 : stride * 0.025,
    lantern: pose.dashing ? 0.12 : Math.sin(pose.time * (pose.moving ? 6 : 2) - 0.8) * (pose.moving ? 0.075 : 0.025),
    light: 0.105 + Math.sin(pose.time * 2 + 0.4) * 0.008,
  };
}
type DetailPose = Readonly<ReturnType<typeof catDetailPose>>;
type Part = "tail" | "leg" | "boot" | "cape-back" | "cape-front" | "torso" | "sleeve" | "forearm" | "lantern";
type Box = readonly [number, number, number, number];
// Local bounds include the baked contact shadows, not just the cut edges.
const PART_BOX: Record<Part, Box> = {
  tail: [-24, -20, 8, 9], leg: [-7, -4, 8, 12], boot: [-8, -5, 11, 11],
  "cape-back": [-27, -8, 10, 33], "cape-front": [-27, -8, 10, 33],
  torso: [-21, -36, 21, 0], sleeve: [-7, -5, 10, 12], forearm: [-6, -6, 13, 9],
  lantern: [-9, -5, 14, 23],
};

function cut(ctx: Ctx, shape: Path2D, color: string, edge: string, thickness = 0.65, drop = 0.55): void {
  paperCut(ctx, shape, { color, edge, thickness, shadow: drop, texture: 0.48 });
}
function ink(ctx: Ctx, d: string, color: string, width = 0.55, alpha = 0.8): void {
  stroke(ctx, new Path2D(d), color, width, alpha);
}
function crescent(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  const p = new Path2D();
  p.moveTo(x + r * 0.45, y - r);
  p.bezierCurveTo(x - r * 1.25, y - r, x - r * 1.25, y + r, x + r * 0.45, y + r);
  p.quadraticCurveTo(x - r * 0.45, y, x + r * 0.45, y - r);
  cut(ctx, p, color, "#f7e6c1", 0.35, 0.2);
}

function paintTail(ctx: Ctx, look: CatBodyPalette): void {
  const curved = look.tailoring === "bell-coat";
  const shape = new Path2D(curved
    ? "M 2 -2 Q -8 4 -17 -1 Q -23 -6 -18 -13 Q -16 -15 -15 -12 Q -20 -6 -14 -3 Q -6 0 1 -5 Z"
    : "M 2 -2 Q -9 4 -18 -2 Q -21 -5 -19 -11 L -17 -13 L -16 -10 Q -18 -5 -14 -3 Q -7 0 1 -5 Z");
  cut(ctx, shape, look.tail, look.pawEdge, 0.75, 0.65);
  ctx.save();
  ctx.clip(shape);
  ink(ctx, "M -17 -12 L -14 -9 M -20 -8 L -16 -6 M -18 -3 L -14 -1", mix(look.tail, look.capeFold, 0.45), 1.15);
  ink(ctx, "M -13 -1 Q -6 2 0 -3", "#f3dbad", 0.45, 0.5);
  ctx.restore();
}

function paintLeg(ctx: Ctx, look: CatBodyPalette): void {
  cut(ctx, new Path2D("M -3 -1 L 3 -1 L 3.4 5.5 L 1.6 8 L -3 7 Z"), look.body, look.bodyEdge);
  foldLine(ctx, -1.6, 0.5, -1.1, 6, 0.45);
  ink(ctx, "M -2 6 Q 0 5.3 2.3 6", look.capeFold, 0.6);
}
function paintBoot(ctx: Ctx, look: CatBodyPalette): void {
  cut(ctx, new Path2D("M -3 -2 L 3 -2 L 3 3 Q 7 3 7 5.2 Q 5 7 -4 6 L -4 2 Z"), look.paw, look.pawEdge, 0.7, 0.65);
  cut(ctx, path([[-3.6, -2.4], [3.6, -2.4], [3.3, 0], [-3.7, 0]]), look.belt, look.trim, 0.45, 0.3);
  ink(ctx, "M -3.2 5.2 Q 2 6.2 6.1 5", look.pawEdge, 0.65);
  ink(ctx, "M 1.6 3.1 L 1.4 4.4 M 3.5 3.7 L 3.3 4.7", mix(look.paw, look.capeFold, 0.55), 0.55);
  line(ctx, -1.5, -1.1, 1.6, -1.1, look.metal, 0.55);
}

function paintCape(ctx: Ctx, look: CatBodyPalette, front: boolean, swept: boolean): void {
  const bell = look.tailoring === "bell-coat";
  // Each panel is cut on the left; the front panel is mirrored at its shoulder hinge.
  const shape = new Path2D(swept
    ? front
      ? "M 1 -2 Q -7 -1 -9 8 L -10 17 L -3 20 L 4 19 L 3 0 Z"
      : "M 1 -2 L -6 0 Q -13 11 -22 17 L -17 20 L -8 18 L -10 23 L 2 20 L 5 0 Z"
    : bell
      ? "M 1 -2 Q -9 -1 -10 8 Q -14 18 -19 23 Q -17 27 -11 25 Q -7 28 -2 25 L 5 24 L 4 0 Z"
      : "M 1 -2 L -7 0 Q -9 12 -19 23 L -13 25 L -5 21 L -5 25 L 4 21 L 4 0 Z");
  paperCut(ctx, shape, { color: look.lining, edge: look.trim, layers: 1, thickness: 0.65, shadow: 0.9, texture: 0.55 });
  ctx.save();
  ctx.clip(shape);
  ctx.translate(0.5, -1.9);
  cut(ctx, shape, look.cape, look.capeEdge, 0.85, 0.6);
  ctx.restore();
  ctx.save();
  ctx.clip(shape);
  const pleat = swept ? -17 : -13;
  ctx.fillStyle = look.capeFold;
  ctx.fill(path([[-3, 1], [pleat, 22], [-6, 20], [0, 3]]));
  ctx.fillStyle = mix(look.cape, look.lining, 0.4);
  ctx.fill(path([[-5, 1], [-16, 21], [-12, 20]]));
  foldLine(ctx, -4, 3, pleat, 22, 0.65);
  foldLine(ctx, 1, 8, -1, 22, 0.35);
  stitch(ctx, new Path2D(bell ? "M -18 22 Q -10 26 -3 23 L 4 22" : "M -18 22 L -13 23 L -4 19 L -4 23 L 4 19"), look.trim, 0.85);
  // Restrained hem embroidery: cut chevrons or a moon, not all-over noise.
  if (bell) crescent(ctx, -12, 18.5, 1.5, look.trim);
  else ink(ctx, "M -14 18 L -12 16 L -10 18 M -11 20 L -9 18 L -7 20", look.trim, 0.65);
  ctx.restore();
}

function paintTorso(ctx: Ctx, look: CatBodyPalette): void {
  const bell = look.tailoring === "bell-coat";
  const body = new Path2D(bell
    ? "M -10 -29 Q 0 -33 10 -29 L 9 -20 Q 10 -13 14 -9 Q 7 -5 0 -8 Q -7 -5 -13 -9 L -9 -21 Z"
    : "M -11 -29 L -4 -32 L 10 -29 L 11 -19 L 12 -10 L 3 -8 L 0 -12 L -4 -8 L -12 -11 L -10 -21 Z");
  cut(ctx, body, look.body, look.bodyEdge, 0.85, 1);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = mix(look.body, look.capeFold, 0.2);
  ctx.fill(path([[5, -29], [11, -25], [14, -8], [6, -8], [3, -20]]));
  foldLine(ctx, -7, -19, -8, -10, 0.45);
  foldLine(ctx, 6, -19, 8, -9, 0.55);
  stitch(ctx, new Path2D(bell ? "M -10 -10 Q -4 -7 0 -10 Q 6 -7 11 -10" : "M -10 -12 L -5 -10 L 0 -14 L 4 -10 L 10 -12"), look.bodyEdge, 0.8);
  ctx.restore();
  cut(ctx, new Path2D(bell
    ? "M -8 -28 Q 0 -25 8 -28 L 6 -21 Q 0 -17 -6 -21 Z"
    : "M -8 -28 L 0 -24 L 8 -28 L 5 -15 L 0 -12 L -5 -15 Z"), look.bib, look.trim, 0.55, 0.45);
  ink(ctx, "M 0 -22 L 0 -15", mix(look.bib, look.capeFold, 0.5));
  for (const y of [-19, -16]) cut(ctx, oval(0, y, 0.65, 0.65, 1, 0), look.metal, look.trim, 0.25, 0.15);
  // Two folded collar leaves sit above the coat and below the untouched printed chin.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    cut(ctx, new Path2D(bell
      ? "M 2 -30 Q 10 -32 14 -27 Q 16 -23 11 -21 L 5 -25 Z"
      : "M 2 -30 L 10 -32 L 15 -25 L 10 -21 L 5 -25 Z"), look.cape, look.capeEdge, 0.7, 0.8);
    cut(ctx, path([[3, -29], [10, -30], [12, -26], [9, -24]]), look.lining, look.trim, 0.4, 0.25);
    foldLine(ctx, 5, -28, 10, -24, 0.5);
    ctx.restore();
  }
  cut(ctx, new Path2D("M -10 -15 Q 0 -13.5 10 -15 L 10 -12.5 Q 0 -11 -10 -12.5 Z"), look.belt, look.trim, 0.45, 0.35);
  cut(ctx, box(-1.7, -15, 3.4, 3.1), look.metal, "#f4dfb0", 0.4, 0.25);
  cut(ctx, box(-0.8, -14.3, 1.6, 1.6), look.belt, look.trim, 0.25, 0);
  if (look.accessory === "watch-chain") {
    // A folded watch-duty ribbon gives the dark coat a readable diagonal accent.
    cut(ctx, path([[-10, -28], [-7, -29], [5, -14], [2, -13]]), look.lining, look.trim, 0.4, 0.3);
    cut(ctx, path([[-9, -26], [-6, -27], [-3, -23], [-6, -22]]), look.metal, look.trim, 0.35, 0.25);
    cut(ctx, new Path2D("M -10 -19 L -4 -18 L -4 -14 L -9 -14 Z"), look.bib, look.bodyEdge, 0.45, 0.35);
    ink(ctx, "M -9 -18 L -5 -17.5", look.trim);
    ink(ctx, "M -6 -17 Q 0 -10 6 -17", look.capeFold, 1.6);
    ink(ctx, "M -6 -17 Q 0 -11 6 -17", look.metal, 0.85);
    stitch(ctx, new Path2D("M -6 -17 Q 0 -11 6 -17"), "#fae3ae", 0.9);
    cut(ctx, oval(7, -15.5, 1.8, 2.1), look.metal, look.trim, 0.4, 0.3);
    line(ctx, 7, -16.7, 7, -15.3, look.capeFold, 0.4);
    line(ctx, 7, -15.3, 8, -14.8, look.capeFold, 0.4);
  } else {
    // The moon coat has a scalloped paper rosette rather than the watch ribbon.
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      cut(ctx, oval(8 + Math.cos(a) * 1.8, -24 + Math.sin(a) * 1.8, 1.6, 1.2, i), look.lining, look.trim, 0.3, 0.2);
    }
    crescent(ctx, 8, -24, 1.3, look.metal);
    cut(ctx, path([[7, -28], [8.5, -27], [-8.5, -11], [-10, -12]]), look.belt, look.trim, 0.4, 0.3);
    cut(ctx, new Path2D("M -14 -16 L -6 -16 L -5 -9 Q -10 -6 -14 -10 Z"), look.cape, look.capeEdge, 0.65, 0.65);
    cut(ctx, new Path2D("M -14 -16 L -6 -16 L -6.5 -12 Q -10 -10 -14 -13 Z"), look.lining, look.trim, 0.45, 0.35);
    crescent(ctx, -10, -12.5, 1.4, look.metal);
    ink(ctx, "M 3 -12 L 6 -9 L 5 -7 M 6 -12 L 9 -10 L 8 -8", look.trim, 0.55);
  }
}

function paintSleeve(ctx: Ctx, look: CatBodyPalette): void {
  cut(ctx, new Path2D("M -2 -2 Q 2 -4 4 0 L 5 5 L 1 7 L -2 3 Z"), look.arm, look.bodyEdge, 0.7, 0.7);
  cut(ctx, new Path2D("M -2 -2 Q 2 -4 4 0 L 3 2 L -1 1 Z"), look.cape, look.capeEdge, 0.45, 0.35);
  foldLine(ctx, 1, 1.7, 3.3, 5.1, 0.45);
}
function paintForearm(ctx: Ctx, look: CatBodyPalette): void {
  cut(ctx, new Path2D("M -1 -2 L 5 -1 L 8 0.5 L 7 3.5 L 3 3.5 L -1 2 Z"), look.arm, look.bodyEdge, 0.6, 0.6);
  cut(ctx, path([[4, -1.5], [6, -1], [6, 3.8], [4, 3.4]]), look.belt, look.trim, 0.45, 0.3);
  cut(ctx, new Path2D("M 6 -0.5 Q 9 -1 9 1 Q 9 3.8 6 3.2 Z"), look.tail, look.pawEdge, 0.45, 0.4);
  ink(ctx, "M 7 1 L 8.5 1.3 M 7 2 L 8.3 2.3", look.pawEdge, 0.4);
}

function paintLantern(ctx: Ctx, look: CatBodyPalette): void {
  const petal = look.lantern === "petal";
  ink(ctx, "M 0 1 Q -1 -3 3 -3 Q 7 -3 6 1 L 5 5", look.capeFold, 1.6);
  ink(ctx, "M 0 1 Q -1 -3 3 -3 Q 7 -3 6 1 L 5 5", look.metal, 0.75);
  const shade = new Path2D(petal
    ? "M -2 5 Q 3 2 8 5 L 9 10 Q 8 15 3 17 Q -2 15 -3 10 Z"
    : "M -2 5 L 8 5 L 7.5 16 L -1.5 16 Z");
  cut(ctx, shade, "#e8b868", look.metal, 0.75, 0.8);
  ctx.save();
  ctx.clip(shade);
  ctx.fillStyle = "#ffe6a0";
  ctx.fill(new Path2D(petal ? "M 3 4 Q -1 10 3 17 Q 7 10 3 4 Z" : "M 1 6 L 5 6 L 5 15 L 1 15 Z"));
  ink(ctx, petal ? "M 0 5 Q -2 10 3 17 M 6 5 Q 8 10 3 17" : "M -1 6 L -0.5 15 M 7 6 L 6.5 15 M 3 5 L 3 16", "#957044", 0.6);
  ctx.restore();
  cut(ctx, new Path2D(petal
    ? "M -3 5 Q -1 1 3 2 Q 7 1 9 5 L 3 6 Z"
    : "M -3 5 L 0 2 L 6 2 L 9 5 Z"), look.belt, look.metal, 0.65, 0.4);
  cut(ctx, path([[-2, 16], [8, 16], [7, 17.5], [-1, 17.5]]), look.belt, look.metal, 0.55, 0.35);
  if (petal) crescent(ctx, 3, 10, 1.6, "#fff1c5");
  else {
    ink(ctx, "M -1 7 L 0.5 7 M -1 9 L 0.5 9 M -1 11 L 0.5 11", look.belt, 0.7);
    cut(ctx, new Path2D("M 3 10 Q 0 13 3 14.5 Q 5 13 3 10 Z"), "#fff1c5", "#ffdb84", 0.3, 0);
  }
  line(ctx, -0.5, 3.5, 6.5, 3.5, look.trim, 0.45);
}

/** Eleven body sprites per look at most, shared by world, title and gallery sizes. */
export function drawCatDetails(ctx: Ctx, look: CatBodyPalette, pose: DetailPose): void {
  // All appearance inputs, not just the id: recolouring a registered look cannot hit stale art.
  const key = JSON.stringify(look);
  const part = (name: Part) => {
    const [l, t, r, b] = PART_BOX[name];
    const cape = name === "cape-back" || name === "cape-front";
    return cachedSprite(`cat-detail:${key}:${name}:${cape ? pose.capeCut : 0}`, r - l, b - t, 2, (c) => {
      c.translate(-l, -t);
      switch (name) {
        case "tail": paintTail(c, look); break;
        case "leg": paintLeg(c, look); break;
        case "boot": paintBoot(c, look); break;
        case "cape-back": case "cape-front": paintCape(c, look, name === "cape-front", pose.capeCut === 1); break;
        case "torso": paintTorso(c, look); break;
        case "sleeve": paintSleeve(c, look); break;
        case "forearm": paintForearm(c, look); break;
        case "lantern": paintLantern(c, look); break;
      }
    }, { x: -l / (r - l), y: -t / (b - t) });
  };
  const stamp = (name: Part, x: number, y: number, angle = 0, mirror = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(mirror, 1);
    part(name).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  };
  cachedSprite("cat-detail:ground", 56, 18, 2, (c) => shadow(c, 28, 6, 21, 4)).draw(ctx, { x: -28, y: -5 });
  stamp("tail", -9, -10 + pose.bob, pose.tail);
  for (const side of [-1, 1]) {
    const lift = Math.max(0, pose.stride * side) * 1.8;
    const x = side * 6 + pose.stride * side * 1.1;
    stamp("leg", x, -13, pose.stride * side * 0.1);
    stamp("boot", x, -6 - lift, -pose.stride * side * 0.045, side);
  }
  ctx.save();
  ctx.translate(0, pose.bob);
  stamp("cape-back", -9, -31, pose.cape);
  stamp("cape-front", 9, -31, -pose.cape * 0.7, -1);
  // Back arm is tucked at the hip; the lamp arm has independent shoulder and elbow joints.
  stamp("sleeve", -11, -26, 0.25 - pose.arm * 0.7, -1);
  stamp("forearm", -13, -20, -0.6 + pose.arm * 0.5, -1);
  stamp("torso", 0, 0);
  ctx.save();
  ctx.translate(11, -27);
  ctx.rotate(pose.arm);
  stamp("sleeve", 0, 0);
  ctx.translate(2, 6);
  ctx.rotate(-pose.arm * 0.55);
  stamp("forearm", 0, 0);
  ctx.translate(7.5, 1.2);
  ctx.rotate(pose.lantern);
  stamp("lantern", 0, 0);
  glow(ctx, 3, 10, 14, "#f9c46d", pose.light);
  ctx.restore();
  ctx.restore();
}
