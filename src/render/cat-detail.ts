/** Articulated paper tailoring. No face data, cat ids, simulation state or wall clock. */
import { cachedSprite } from "../engine/sprite.js";
import type { CatBodyPalette } from "./art-registry.js";
import type { CatPose } from "./layout.js";
import { CAT_WEAR } from "./timeline.js";
import { foldLine, paperCut } from "./paper-kit.js";
import { box, line, mix, oval, path, shadow, stitch, stroke, type Ctx } from "./paper-material.js";

/** Body envelope at scale .16, including the articulated parts and cast shadows. */
export const CAT_DETAIL_BOUNDS = { l: -42, r: 42, t: -43, b: 14 } as const;
/**
 * World-unit box around the cat's base point that holds every cached part
 * (body, head, edge and ground shadow) with swing and bob margin. The lit-rim
 * composition rasterises this box at the live scale, so cue zoom never clips it.
 */
export const CAT_BOX = { l: -54, r: 54, t: -106, b: 22 } as const;

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
    arm: pose.hurt ? -0.22 : pose.dashing ? -0.42 : stride * 0.24,
    headTilt: pose.hurt ? -0.055 : pose.dashing ? 0.055 : stride * 0.025,
  };
}
type DetailPose = Readonly<ReturnType<typeof catDetailPose>>;
type CoatPalette = Extract<CatBodyPalette, { tailoring: "split-coat" }>;
type TeePalette = Extract<CatBodyPalette, { tailoring: "tee-and-jeans" }>;
type Part = "tail" | "leg" | "boot" | "cape-back" | "cape-front" | "torso" | "sleeve" | "forearm";
type Box = readonly [number, number, number, number];
// Local bounds include the baked contact shadows, not just the cut edges.
const PART_BOX: Record<Part, Box> = {
  tail: [-24, -20, 8, 9], leg: [-7, -4, 8, 12], boot: [-8, -5, 11, 11],
  "cape-back": [-27, -8, 10, 33], "cape-front": [-27, -8, 10, 33],
  torso: [-21, -36, 21, 0], sleeve: [-7, -5, 10, 12], forearm: [-6, -6, 13, 9],
};

function cut(ctx: Ctx, shape: Path2D, color: string, edge: string, thickness = 0.65, drop = 0.55): void {
  paperCut(ctx, shape, { color, edge, thickness, shadow: drop, texture: 0.48 });
}
function ink(ctx: Ctx, d: string, color: string, width = 0.55, alpha = 0.8): void {
  stroke(ctx, new Path2D(d), color, width, alpha);
}
function paintTail(ctx: Ctx, look: CatBodyPalette): void {
  const curved = look.tailoring === "tee-and-jeans";
  const shape = new Path2D(curved
    ? "M 2 -2 Q -8 4 -17 -1 Q -23 -6 -18 -13 Q -16 -15 -15 -12 Q -20 -6 -14 -3 Q -6 0 1 -5 Z"
    : "M 2 -2 Q -9 4 -18 -2 Q -21 -5 -19 -11 L -17 -13 L -16 -10 Q -18 -5 -14 -3 Q -7 0 1 -5 Z");
  cut(ctx, shape, look.tail, look.pawEdge, 0.75, 0.65);
  ctx.save();
  ctx.clip(shape);
  ink(ctx, "M -17 -12 L -14 -9 M -20 -8 L -16 -6 M -18 -3 L -14 -1", mix(look.tail, look.fold, 0.45), 1.15);
  ink(ctx, "M -13 -1 Q -6 2 0 -3", "#f3dbad", 0.45, 0.5);
  ctx.restore();
}

function paintLeg(ctx: Ctx, look: CatBodyPalette): void {
  if (look.tailoring === "tee-and-jeans") {
    cut(ctx, new Path2D("M -3.8 -1.5 L 3.8 -1.5 L 3.6 9.3 Q 3.6 10.65 2.2 10.75 L -3.4 10.5 Z"), look.denim, look.denimEdge);
    ctx.fillStyle = mix(look.denim, look.denimEdge, 0.38);
    ctx.fill(path([[-2.45, -0.6], [-0.2, -0.6], [-0.6, 8.6], [-2.2, 9.2]]));
    stitch(ctx, new Path2D("M 2.25 -0.5 L 2.4 8.6"), "#bfa47f", 0.8);
    cut(ctx, path([[-3.25, 9.1], [3.35, 9.35], [3.05, 10.6], [-3.2, 10.4]]),
      mix(look.denim, look.denimEdge, 0.5), look.denimEdge, 0.28, 0.2);
    return;
  }
  cut(ctx, new Path2D("M -3 -1 L 3 -1 L 3.4 5.5 L 1.6 8 L -3 7 Z"), look.body, look.bodyEdge);
  foldLine(ctx, -1.6, 0.5, -1.1, 6, 0.45);
  ink(ctx, "M -2 6 Q 0 5.3 2.3 6", look.fold, 0.6);
}
function paintBoot(ctx: Ctx, look: CatBodyPalette): void {
  if (look.tailoring === "tee-and-jeans") {
    cut(ctx, new Path2D("M -3.6 3.9 Q -1.65 2.9 2 3.65 Q 5.5 3.15 6.75 4.85 Q 7.65 6.25 5.1 6.7 L -3.8 6.5 Q -4.9 5.7 -3.6 3.9 Z"),
      look.paw, look.pawEdge, 0.62, 0.5);
    ink(ctx, "M -3.3 5.8 Q 1.9 6.55 5.85 5.75", look.pawEdge, 0.63);
    return;
  }
  cut(ctx, new Path2D("M -3 -2 L 3 -2 L 3 3 Q 7 3 7 5.2 Q 5 7 -4 6 L -4 2 Z"), look.paw, look.pawEdge, 0.7, 0.65);
  cut(ctx, path([[-3.6, -2.4], [3.6, -2.4], [3.3, 0], [-3.7, 0]]), look.belt, look.trim, 0.45, 0.3);
  ink(ctx, "M -3.2 5.2 Q 2 6.2 6.1 5", look.pawEdge, 0.65);
  ink(ctx, "M 1.6 3.1 L 1.4 4.4 M 3.5 3.7 L 3.3 4.7", mix(look.paw, look.fold, 0.55), 0.55);
  line(ctx, -1.5, -1.1, 1.6, -1.1, look.metal, 0.55);
}

function paintCape(ctx: Ctx, look: CoatPalette, front: boolean, swept: boolean): void {
  // Each panel is cut on the left; the front panel is mirrored at its shoulder hinge.
  const shape = new Path2D(swept
    ? front
      ? "M 1 -2 Q -7 -1 -9 8 L -10 17 L -3 20 L 4 19 L 3 0 Z"
      : "M 1 -2 L -6 0 Q -13 11 -22 17 L -17 20 L -8 18 L -10 23 L 2 20 L 5 0 Z"
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
  ctx.fillStyle = look.fold;
  ctx.fill(path([[-3, 1], [pleat, 22], [-6, 20], [0, 3]]));
  ctx.fillStyle = mix(look.cape, look.lining, 0.4);
  ctx.fill(path([[-5, 1], [-16, 21], [-12, 20]]));
  foldLine(ctx, -4, 3, pleat, 22, 0.65);
  foldLine(ctx, 1, 8, -1, 22, 0.35);
  stitch(ctx, new Path2D("M -18 22 L -13 23 L -4 19 L -4 23 L 4 19"), look.trim, 0.85);
  ink(ctx, "M -14 18 L -12 16 L -10 18 M -11 20 L -9 18 L -7 20", look.trim, 0.65);
  ctx.restore();
}

function paintCoat(ctx: Ctx, look: CoatPalette): void {
  const body = new Path2D("M -11 -29 L -4 -32 L 10 -29 L 11 -19 L 12 -10 L 3 -8 L 0 -12 L -4 -8 L -12 -11 L -10 -21 Z");
  cut(ctx, body, look.body, look.bodyEdge, 0.85, 1);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = mix(look.body, look.fold, 0.2);
  ctx.fill(path([[5, -29], [11, -25], [14, -8], [6, -8], [3, -20]]));
  foldLine(ctx, -7, -19, -8, -10, 0.45);
  foldLine(ctx, 6, -19, 8, -9, 0.55);
  stitch(ctx, new Path2D("M -10 -12 L -5 -10 L 0 -14 L 4 -10 L 10 -12"), look.bodyEdge, 0.8);
  ctx.restore();
  cut(ctx, new Path2D("M -8 -28 L 0 -24 L 8 -28 L 5 -15 L 0 -12 L -5 -15 Z"), look.bib, look.trim, 0.55, 0.45);
  ink(ctx, "M 0 -22 L 0 -15", mix(look.bib, look.fold, 0.5));
  for (const y of [-19, -16]) cut(ctx, oval(0, y, 0.65, 0.65, 1, 0), look.metal, look.trim, 0.25, 0.15);
  // Two folded collar leaves sit above the coat and below the untouched printed chin.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    cut(ctx, new Path2D("M 2 -30 L 10 -32 L 15 -25 L 10 -21 L 5 -25 Z"), look.cape, look.capeEdge, 0.7, 0.8);
    cut(ctx, path([[3, -29], [10, -30], [12, -26], [9, -24]]), look.lining, look.trim, 0.4, 0.25);
    foldLine(ctx, 5, -28, 10, -24, 0.5);
    ctx.restore();
  }
  cut(ctx, new Path2D("M -10 -15 Q 0 -13.5 10 -15 L 10 -12.5 Q 0 -11 -10 -12.5 Z"), look.belt, look.trim, 0.45, 0.35);
  cut(ctx, box(-1.7, -15, 3.4, 3.1), look.metal, "#f4dfb0", 0.4, 0.25);
  cut(ctx, box(-0.8, -14.3, 1.6, 1.6), look.belt, look.trim, 0.25, 0);
  // A folded watch-duty ribbon gives the dark coat a readable diagonal accent.
  cut(ctx, path([[-10, -28], [-7, -29], [5, -14], [2, -13]]), look.lining, look.trim, 0.4, 0.3);
  cut(ctx, path([[-9, -26], [-6, -27], [-3, -23], [-6, -22]]), look.metal, look.trim, 0.35, 0.25);
  cut(ctx, new Path2D("M -10 -19 L -4 -18 L -4 -14 L -9 -14 Z"), look.bib, look.bodyEdge, 0.45, 0.35);
  ink(ctx, "M -9 -18 L -5 -17.5", look.trim);
  ink(ctx, "M -6 -17 Q 0 -10 6 -17", look.fold, 1.6);
  ink(ctx, "M -6 -17 Q 0 -11 6 -17", look.metal, 0.85);
  stitch(ctx, new Path2D("M -6 -17 Q 0 -11 6 -17"), "#fae3ae", 0.9);
  cut(ctx, oval(7, -15.5, 1.8, 2.1), look.metal, look.trim, 0.4, 0.3);
  line(ctx, 7, -16.7, 7, -15.3, look.fold, 0.4);
  line(ctx, 7, -15.3, 8, -14.8, look.fold, 0.4);
}

function paintTee(ctx: Ctx, look: TeePalette): void {
  // The hip yoke overlaps the two hinged trouser legs.
  cut(ctx, new Path2D("M -9.4 -16.7 Q 0 -16 9.4 -16.7 L 10 -9.45 L 4.4 -8.7 Q 0 -10.2 -4.4 -8.7 L -10 -9.45 Z"),
    look.denim, look.denimEdge, 0.7, 0.55);
  const seam = mix(look.denim, look.fold, 0.64);
  ink(ctx, "M -8.9 -13.55 Q -7 -11.15 -4.25 -11.3 M 8.9 -13.55 Q 7 -11.15 4.25 -11.3 M 0.9 -13.7 L 0.7 -11.5 Q 0.5 -10.65 -0.35 -10.65",
    seam, 0.65, 0.92);
  stitch(ctx, new Path2D("M -8.4 -13.65 Q 0 -12.8 8.4 -13.65"), "#bfa47f", 0.8);
  cut(ctx, oval(0, -13.1, 0.63, 0.61), "#d1ae7a", "#f0d4a8", 0.2, 0.15);

  const shirt = new Path2D("M -11 -29 L -6.1 -30.3 Q -4.8 -23.5 0 -23.15 Q 4.8 -23.5 6.1 -30.3 L 11 -29 L 10 -23 L 8.9 -21 Q 8.9 -17.6 10.4 -14.65 Q 0 -13.55 -10.4 -14.65 Q -8.9 -17.6 -8.9 -21 L -10 -23 Z");
  cut(ctx, shirt, look.body, look.bodyEdge, 0.75, 0.55);
  ctx.save();
  ctx.clip(shirt);
  ctx.fillStyle = mix(look.body, look.fold, 0.17);
  ctx.fill(path([[9.1, -25.6], [12, -27], [11, -14.1], [6.3, -14.05], [8.5, -17.8]]));
  ink(ctx, "M -5.95 -27.9 Q -4.1 -21.9 0 -21.88 Q 4.1 -21.9 5.95 -27.9", mix(look.body, look.fold, 0.4), 0.55);
  stitch(ctx, new Path2D("M -8.7 -15.35 Q 0 -14.3 8.7 -15.35"), mix(look.body, look.fold, 0.34), 0.8);
  ctx.restore();
}

function paintSleeve(ctx: Ctx, look: CatBodyPalette): void {
  if (look.tailoring === "tee-and-jeans") {
    cut(ctx, new Path2D("M -3 -2 Q 1.5 -3.8 4.1 -1.3 L 6.2 6 Q 2.8 9.2 -1.2 8.1 Z"),
      look.body, look.bodyEdge, 0.65, 0.55);
    ink(ctx, "M -1 7.25 Q 2.8 8.35 5.45 5.85", mix(look.body, look.fold, 0.36), 0.48);
    return;
  }
  cut(ctx, new Path2D("M -2 -2 Q 2 -4 4 0 L 5 5 L 1 7 L -2 3 Z"), look.arm, look.bodyEdge, 0.7, 0.7);
  cut(ctx, new Path2D("M -2 -2 Q 2 -4 4 0 L 3 2 L -1 1 Z"), look.cape, look.capeEdge, 0.45, 0.35);
  foldLine(ctx, 1, 1.7, 3.3, 5.1, 0.45);
}
function paintForearm(ctx: Ctx, look: CatBodyPalette): void {
  if (look.tailoring === "tee-and-jeans") {
    cut(ctx, new Path2D("M -1 -1.85 Q 3.4 -1.9 6 -0.95 Q 9 -1.2 9 1.3 Q 8.9 3.6 6.1 3.45 L -1 2.25 Z"),
      look.arm, look.pawEdge, 0.55, 0.5);
    ink(ctx, "M 6.95 0.75 L 8.05 1.1 M 6.9 1.8 L 8 2.15", mix(look.arm, look.fold, 0.46), 0.42);
    return;
  }
  cut(ctx, new Path2D("M -1 -2 L 5 -1 L 8 0.5 L 7 3.5 L 3 3.5 L -1 2 Z"), look.arm, look.bodyEdge, 0.6, 0.6);
  cut(ctx, path([[4, -1.5], [6, -1], [6, 3.8], [4, 3.4]]), look.belt, look.trim, 0.45, 0.3);
  cut(ctx, new Path2D("M 6 -0.5 Q 9 -1 9 1 Q 9 3.8 6 3.2 Z"), look.tail, look.pawEdge, 0.45, 0.4);
  ink(ctx, "M 7 1 L 8.5 1.3 M 7 2 L 8.3 2.3", look.pawEdge, 0.4);
}

/**
 * Optional costume layers, each called inside the matching body frame:
 * `under` after the ground shadow, `back` behind the bobbing body, `torso`
 * right after the torso cut, `hand` in the front forearm's frame (rotated
 * so `upright` turns it back), `front` over the whole body. Plain cats pass none.
 */
export interface CatDetailHooks {
  under?(): void;
  back?(): void;
  torso?(): void;
  hand?(upright: number): void;
  front?(): void;
}

/** Ten body sprites per look at most, shared by world, title and gallery sizes. */
export function drawCatDetails(ctx: Ctx, look: CatBodyPalette, pose: DetailPose, hooks?: CatDetailHooks): void {
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
        case "cape-back": case "cape-front":
          if (look.tailoring === "split-coat") paintCape(c, look, name === "cape-front", pose.capeCut === 1);
          break;
        case "torso":
          if (look.tailoring === "tee-and-jeans") paintTee(c, look);
          else paintCoat(c, look);
          break;
        case "sleeve": paintSleeve(c, look); break;
        case "forearm": paintForearm(c, look); break;
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
  hooks?.under?.();
  stamp("tail", -9, -10 + pose.bob, pose.tail);
  for (const side of [-1, 1]) {
    const lift = Math.max(0, pose.stride * side) * 1.8;
    const x = side * 6 + pose.stride * side * 1.1;
    stamp("leg", x, -13, pose.stride * side * 0.1);
    stamp("boot", x, -6 - lift, -pose.stride * side * 0.045, side);
  }
  ctx.save();
  ctx.translate(0, pose.bob);
  hooks?.back?.();
  const hasCape = look.tailoring === "split-coat";
  if (hasCape) {
    stamp("cape-back", -9, -31, pose.cape);
    stamp("cape-front", 9, -31, -pose.cape * 0.7, -1);
  }
  // Both forearms hang from the sleeves and swing with the stride.
  stamp("sleeve", -11, -26, 0.25 - pose.arm * 0.7, -1);
  stamp("forearm", -13, hasCape ? -20 : -18, -1.15 + pose.arm * 0.5, -1);
  stamp("torso", 0, 0);
  hooks?.torso?.();
  ctx.save();
  ctx.translate(11, -27);
  ctx.rotate(pose.arm);
  stamp("sleeve", 0, 0);
  ctx.translate(2, hasCape ? 6 : 8);
  ctx.rotate(1.15 - pose.arm * 0.55);
  stamp("forearm", 0, 0);
  hooks?.hand?.(-(1.15 + pose.arm * 0.45));
  ctx.restore();
  hooks?.front?.();
  ctx.restore();
}

/**
 * Paper wear read from the run (never stored): `marks` 0..3 (a crease, then
 * a tear, then a second tear as hp drops) and `tape` 0..1 (tape patches
 * pressed on after a heal, fading out).
 */
export interface CatWear {
  readonly marks: number;
  readonly tape: number;
}
export function catWear(hpShare: number, healAt: number | undefined, elapsed: number): CatWear {
  const marks = hpShare < CAT_WEAR.tear2 ? 3 : hpShare < CAT_WEAR.tear ? 2 : hpShare < CAT_WEAR.crease ? 1 : 0;
  const since = healAt === undefined ? Infinity : elapsed - healAt;
  const left = CAT_WEAR.tapeSeconds - since;
  const tape = since < 0 || left <= 0 ? 0 : Math.min(1, left / CAT_WEAR.tapeFade);
  return { marks, tape };
}

type WearPart = "crease" | "tear" | "tear-hem" | "tape" | "tape-x";
/** Local box of each wear piece (contact shadows included) and where it sits on the body. */
const WEAR: Record<WearPart, { box: Box; at: readonly [number, number, number] }> = {
  crease: { box: [-5, -5, 5, 5], at: [-7, -11, 0.5] },
  tear: { box: [-5, -5, 5, 5], at: [6.5, -12.5, -0.3] },
  "tear-hem": { box: [-5, -5, 5, 5], at: [-15, -6, 0.2] },
  tape: { box: [-7, -3, 7, 3], at: [-7, -11, -0.35] },
  "tape-x": { box: [-7, -7, 7, 7], at: [6.5, -12.5, 0] },
};

/** A crease pressed into the coat: shaded valley, lit ridge, a tiny dog-ear at one end. */
function paintCrease(ctx: Ctx, look: CatBodyPalette): void {
  ctx.fillStyle = mix(look.body, "#1c142b", 0.35);
  ctx.globalAlpha = 0.45;
  ctx.fill(path([[-3.6, -3], [3.4, 2.8], [2.2, 3.4], [-4, -2]]));
  ctx.globalAlpha = 1;
  foldLine(ctx, -3.6, -3, 3.4, 2.8, 0.9);
  cut(ctx, path([[2.2, 1.6], [4, 3.6], [1.4, 3.4]]), mix(look.body, "#fff1cf", 0.25), look.bodyEdge, 0.3, 0.45);
}
/** A torn notch: the dark gap of the under-sheet, a jagged lit edge and a lifted flap of the coat. */
function paintTear(ctx: Ctx, color: string, edge: string): void {
  const gap = path([[-3.4, -3.2], [-1.6, -1.2], [-2.4, 0.2], [0.2, 1.4], [-0.4, 2.6], [2.8, 3.4], [0.6, 0.6], [1.2, -0.6], [-1.2, -1.8]]);
  ctx.fillStyle = "#140d1c";
  ctx.fill(gap);
  stroke(ctx, gap, "#fff1cf", 0.35, 0.55);
  // The torn flap curls up off the coat and casts a hard little shadow.
  cut(ctx, path([[0.6, 0.6], [2.8, 3.4], [4.2, 0.4], [1.6, -0.6]]), mix(color, "#fff1cf", 0.18), edge, 0.35, 0.8);
  line(ctx, 1.1, 0, 3.6, 0.6, "#f7e6c1", 0.3, 0.5);
}
/** One strip of translucent paper tape with torn serrated ends and a faint grain line. */
function paintTape(ctx: Ctx, w: number): void {
  const pts: [number, number][] = [];
  const teeth = 4;
  for (let i = 0; i <= teeth; i++) pts.push([-w + (i % 2 ? 0.6 : 0), -1.7 + (3.4 * i) / teeth]);
  for (let i = teeth; i >= 0; i--) pts.push([w - (i % 2 ? 0.6 : 0), -1.7 + (3.4 * i) / teeth]);
  const strip = path(pts);
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#120d1c";
  ctx.translate(0.5, 0.7);
  ctx.fill(strip);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#efe0b6";
  ctx.fill(strip);
  ctx.restore();
  line(ctx, -w + 0.8, -1.2, w - 0.8, -1.2, "#fff6dc", 0.4, 0.7);
  line(ctx, -w + 1, 0.4, w - 1, 0.4, "#c9b483", 0.25, 0.5);
}

/**
 * Tears and creases on the body as hp drops, tape over them after a heal.
 * Finite cached pieces (per look and part) stamped at fixed body spots below
 * the head, so the approved head geometry is never touched.
 */
export function drawCatWear(ctx: Ctx, look: CatBodyPalette, wear: CatWear, bob: number): void {
  if (wear.marks <= 0 && wear.tape <= 0) return;
  const tee = look.tailoring === "tee-and-jeans";
  const hemColor = tee ? look.body : look.cape, hemEdge = tee ? look.bodyEdge : look.capeEdge;
  const key = `${look.body}|${look.bodyEdge}|${hemColor}|${hemEdge}`;
  const stamp = (name: WearPart, alpha = 1) => {
    const { box, at } = WEAR[name], [l, t, r, b] = box;
    const [x, y, angle] = tee && name === "tear-hem" ? [-8.5, -11, at[2]] : at;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y + bob - (tee ? 7 : 0));
    ctx.rotate(angle);
    cachedSprite(`cat-wear:${key}:${name}`, r - l, b - t, 3, (c) => {
      c.translate(-l, -t);
      switch (name) {
        case "crease": paintCrease(c, look); break;
        case "tear": paintTear(c, look.body, look.bodyEdge); break;
        case "tear-hem": paintTear(c, hemColor, hemEdge); break;
        case "tape": paintTape(c, 5.6); break;
        case "tape-x":
          c.rotate(0.6);
          paintTape(c, 5);
          c.rotate(-1.2);
          paintTape(c, 5);
          break;
      }
    }, { x: -l / (r - l), y: -t / (b - t) }).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  };
  if (wear.marks >= 1) stamp("crease");
  if (wear.marks >= 2) stamp("tear");
  if (wear.marks >= 3) stamp("tear-hem");
  if (wear.tape > 0) {
    stamp("tape", wear.tape);
    stamp("tape-x", wear.tape);
  }
}
