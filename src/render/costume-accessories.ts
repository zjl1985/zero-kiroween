/**
 * Head makeup pieces for costumes, in the shared 70 x 55 head box (the same
 * units as CatArt.face paths; Meow Wall view-box units map as v * 0.16 + 4).
 * Meow Wall's accessory overlays (sunglasses aside, which the heads already
 * own) are redrawn here as flat paper cuts, plus a few costume pieces.
 * Expressions are drawn by `paintExpression` after paper-face.ts has cleared
 * the eye area with the cat's own fur cuts. Painters are pure; no ids of cats
 * or costumes are named here. Hats stay above the gold marks' lower half and
 * clear of the side hair, so each cat stays recognisable.
 */
import type { MascotPalette } from "../cats/meow-wall-art.js";
import type { CostumeExpression } from "./art-registry.js";
import { flatCut, starPoints } from "./paper-kit.js";
import { line, mix, oval, path, stroke, type Ctx, type Point } from "./paper-material.js";

/** Face centre line and the two eye centres of the approved heads (paper-face.ts paintEyes). */
export const HEAD_CENTER = 34.8;
export const EYES: readonly (readonly [number, number])[] = [[HEAD_CENTER - 11.76, 32.65], [HEAD_CENTER + 11.76, 32.65]];

type Shape = Path2D | readonly Point[];
/** One head-scale paper cut: hard shadow down-right, lit rim, dark lip, thin card side. */
export function headCut(ctx: Ctx, shape: Shape, color: string, lift = 0.4, thickness = 0.4): Path2D {
  return flatCut(ctx, shape, { color, thickness, lift, rim: 0.32, texture: 0.35 });
}
/** Mirror a left-side point list across the face centre. */
const mirror = (pts: readonly Point[]): Point[] => pts.map(([x, y]) => [HEAD_CENTER * 2 - x, y] as Point);
const both = (ctx: Ctx, pts: readonly Point[], color: string, lift?: number) => {
  headCut(ctx, pts, color, lift);
  headCut(ctx, mirror(pts), color, lift);
};

const GOLD = "#d8b35c", INK = "#1f1a24", CREAM = "#efe2c4", RED = "#b8483e", BLUE = "#5876a8";

export type HeadAccessory = (ctx: Ctx, p: MascotPalette) => void;
/** Every head accessory painter, by id (CostumeMakeup.accessories). */
export const HEAD_ACCESSORIES: Readonly<Record<string, HeadAccessory>> = {
  // ---- Meow Wall's accessory list, as paper cuts ----
  headphones(ctx, p) {
    const band = new Path2D("M 12.4 27 Q 11 6.8 34.8 4.6 Q 58.6 6.8 57.2 27 L 55.4 27 Q 56 9 34.8 6.6 Q 13.6 9 14.2 27 Z");
    headCut(ctx, band, mix(p.ink, "#4a4458", 0.35), 0.5);
    for (const side of [-1, 1]) {
      const x = HEAD_CENTER + side * 22.6;
      headCut(ctx, new Path2D(`M ${x - 3.4} 26.6 Q ${x} 24.2 ${x + 3.4} 26.6 L ${x + 3.4} 35.2 Q ${x} 37.6 ${x - 3.4} 35.2 Z`), "#e0b64f", 0.55);
      headCut(ctx, oval(x, 30.9, 1.7, 3), "#a77d3a", 0);
    }
  },
  cap(ctx) {
    headCut(ctx, new Path2D("M 21.6 15.4 Q 22 6.6 34.8 6 Q 47.6 6.6 48 15.4 Q 34.8 13.6 21.6 15.4 Z"), "#4f6f9a", 0.5);
    headCut(ctx, new Path2D("M 40 14.2 Q 50 13.4 55.6 16.2 Q 50.6 18.2 41 16.8 Z"), "#3b5679", 0.6);
    headCut(ctx, oval(34.8, 6.4, 1.3, 0.9), CREAM, 0.2);
  },
  scarf(ctx) {
    headCut(ctx, new Path2D("M 20.4 45 Q 34.8 49.6 49.2 45 L 50 49.4 Q 34.8 53.6 19.6 49.4 Z"), RED, 0.55);
    headCut(ctx, [[37.4, 49.6], [42.4, 49], [43.6, 56.4], [38.6, 56.8]], mix(RED, INK, 0.2), 0.55);
    for (const x of [26, 31, 36, 41]) line(ctx, x, 46.6, x + 1, 50.8, CREAM, 0.5, 0.55);
  },
  "round-glasses"(ctx) {
    for (const [x, y] of EYES) {
      const rim = new Path2D();
      rim.ellipse(x, y, 6, 5.6, 0, 0, Math.PI * 2);
      rim.ellipse(x, y, 5, 4.6, 0, 0, Math.PI * 2, true);
      headCut(ctx, rim, GOLD, 0.25, 0.25);
    }
    stroke(ctx, new Path2D("M 29 31.6 Q 34.8 29.8 40.6 31.6"), GOLD, 0.8);
    stroke(ctx, new Path2D("M 17 31.6 L 13.4 30.4 M 52.6 31.6 L 56.2 30.4"), GOLD, 0.6);
  },
  bowtie(ctx) {
    headCut(ctx, [[28.4, 44.6], [34.6, 47.2], [28.4, 50.2]], "#6c4a8e", 0.5);
    headCut(ctx, [[41.2, 44.6], [35, 47.2], [41.2, 50.2]], "#6c4a8e", 0.5);
    headCut(ctx, oval(34.8, 47.3, 1.7, 1.6), GOLD, 0.3);
  },
  crown(ctx) {
    headCut(ctx, [[27, 13.8], [27.6, 5.4], [31, 9.6], [34.8, 3.2], [38.6, 9.6], [42, 5.4], [42.6, 13.8]], GOLD, 0.55);
    for (const x of [30, 34.8, 39.6]) headCut(ctx, oval(x, 11.6, 0.9, 0.9), RED, 0.15);
  },
  flower(ctx) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      headCut(ctx, oval(17.6 + Math.cos(a) * 2.6, 15.6 + Math.sin(a) * 2.6, 2, 2), "#e889a6", 0.35);
    }
    headCut(ctx, oval(17.6, 15.6, 1.6, 1.6), GOLD, 0.2);
  },
  headband(ctx) {
    headCut(ctx, new Path2D("M 16.4 13.4 Q 34.8 9.8 53.2 13.4 L 53 15.6 Q 34.8 12 16.6 15.6 Z"), "#d65f54", 0.4);
  },
  leaf(ctx) {
    headCut(ctx, new Path2D("M 50.4 13.6 Q 50 6 57.6 4.2 Q 58.8 11 50.4 13.6 Z"), "#6f9b5a", 0.5);
    line(ctx, 50.6, 13.2, 56.2, 6.2, "#3f6337", 0.45, 0.8);
  },
  "party-hat"(ctx) {
    headCut(ctx, [[27.6, 15.2], [34.8, 1], [42, 15.2]], "#7f74c4", 0.6);
    for (const [x, y] of [[32.4, 11], [36.8, 8], [35.2, 13]] as const) headCut(ctx, oval(x, y, 0.9, 0.9), GOLD, 0.1);
    headCut(ctx, oval(34.8, 1.4, 1.6, 1.6), "#e889a6", 0.3);
  },
  "wizard-hat"(ctx) {
    headCut(ctx, new Path2D("M 22 15.4 Q 34.8 12.6 47.6 15.4 Q 44 10.6 40.6 9 L 37.6 -2 Q 31.2 4.4 29.4 9.6 Q 25.4 11 22 15.4 Z"), "#3d3f78", 0.6);
    headCut(ctx, starPoints(34.4, 8.6, 2, 5, 0.45), GOLD, 0.2);
  },
  mustache(ctx) {
    both(ctx, [[34.2, 38.2], [29.8, 37.2], [25.4, 39.4], [24.4, 41.2], [29, 40.2], [34.2, 39.8]], INK, 0.3);
  },
  eyepatch(ctx) {
    stroke(ctx, new Path2D("M 14.6 24.6 Q 34.8 22 55.2 27.4"), INK, 0.9);
    headCut(ctx, new Path2D("M 17.6 28 Q 23 26.6 28.4 28 L 28 36.4 Q 23 38.6 18 36.4 Z"), INK, 0.4);
  },
  ribbon(ctx) {
    headCut(ctx, [[12.6, 12.4], [17.6, 15.6], [12.6, 18.8]], "#e889a6", 0.5);
    headCut(ctx, [[22.4, 12.4], [17.6, 15.6], [22.4, 18.8]], "#e889a6", 0.5);
    headCut(ctx, oval(17.6, 15.6, 1.4, 1.4), GOLD, 0.2);
  },

  // ---- Costume pieces ----
  /** Short spiky forehead tufts between the ears. */
  "spiky-tufts"(ctx, p) {
    headCut(ctx, [[24.6, 19.6], [25.6, 14.8], [28, 17.8], [30.2, 12.6], [32.6, 17.2], [35.2, 11.8], [37.4, 17], [39.8, 12.8], [41.8, 17.6],
      [44.2, 14.8], [45, 19.6], [34.8, 18.4]], mix(p.ink, "#3c3742", 0.5), 0.45);
  },
  /** Thick brows as short dark blocks on the upper eye rims. */
  "thick-brows"(ctx) {
    both(ctx, [[18.2, 27.2], [27.6, 26.2], [27.8, 27.9], [18.4, 28.6]], "#25202a", 0.3);
  },
  /** A dark rolled turtleneck collar under the chin, below the chain. */
  turtleneck(ctx) {
    headCut(ctx, new Path2D("M 19.4 47.4 Q 34.8 50.6 50.2 47.4 L 50.8 52.6 Q 34.8 56.4 18.8 52.6 Z"), "#26232c", 0.5);
    stroke(ctx, new Path2D("M 20 50 Q 34.8 53.2 49.6 50"), "#4a4552", 0.5, 0.8);
  },
  /** A plain black neck collar with a small ring. */
  "leather-collar"(ctx) {
    headCut(ctx, new Path2D("M 21.4 47.2 Q 34.8 50.4 48.2 47.2 L 48.4 50.2 Q 34.8 53.4 21.2 50.2 Z"), "#1e1b21", 0.45);
    const ring = new Path2D();
    ring.ellipse(34.8, 52.6, 1.6, 1.6, 0, 0, Math.PI * 2);
    ring.ellipse(34.8, 52.6, 0.8, 0.8, 0, 0, Math.PI * 2, true);
    headCut(ctx, ring, "#b9b0a2", 0.25);
  },
  /** Leather jacket lapels at the chin. */
  "jacket-collar"(ctx) {
    both(ctx, [[19.8, 45.2], [27.6, 47.8], [31.2, 55.4], [24.6, 54.2], [18.6, 49.4]], "#211e24", 0.5);
    both(ctx, [[22.4, 47.8], [26.6, 49.2], [28.6, 53.4], [25.2, 52.6]], "#3a3540", 0.15);
  },
  /** Folded paper driving goggles pushed up between the ears. */
  goggles(ctx) {
    stroke(ctx, new Path2D("M 18 18 Q 34.8 11.4 51.6 18"), "#5c4632", 1.3);
    for (const x of [29.4, 40.2]) {
      headCut(ctx, oval(x, 14.2, 4, 3.3), "#8a6a44", 0.45);
      headCut(ctx, oval(x, 14.2, 2.7, 2.1), "#9ec0c6", 0.1);
    }
  },
  /** A pencil tucked behind the right ear. */
  "pencil-ear"(ctx) {
    headCut(ctx, [[47.2, 15.4], [55.4, 3], [57.6, 4.4], [49.4, 16.8]], "#e3b44d", 0.45);
    headCut(ctx, [[55.4, 3], [57.6, 4.4], [58.2, 1.4]], "#e8c99a", 0.2);
    headCut(ctx, [[47.2, 15.4], [49.4, 16.8], [48.6, 17.8], [46.6, 16.6]], "#d9837e", 0.2);
  },
  /** A folded page hat (untitled; ruled lines only). */
  "page-hat"(ctx) {
    headCut(ctx, [[22.8, 16.6], [34.8, 1.6], [46.8, 16.6]], CREAM, 0.6);
    headCut(ctx, [[22, 15.2], [47.6, 15.2], [46.4, 18.2], [23.2, 18.2]], mix(CREAM, "#c7b38c", 0.5), 0.35);
    for (const y of [8.6, 11.4]) line(ctx, 30 + (y - 8) * 0.2, y, 39.6 - (y - 8) * 0.2, y, "#8d7d9c", 0.35, 0.8);
  },
  /** A little yellow note stuck on the right ear tip. */
  "sticky-note"(ctx) {
    headCut(ctx, [[49.6, 6.4], [56.6, 5.2], [57.4, 11.8], [50.4, 12.8]], "#ecd062", 0.45);
    line(ctx, 51.2, 8.6, 55.6, 8, "#9a8a3a", 0.35, 0.8);
  },
  /** One black and one white go-stone pin on the left ear. */
  "stone-pins"(ctx) {
    headCut(ctx, oval(16.8, 12.6, 2, 1.8), "#f2ecdc", 0.4);
    headCut(ctx, oval(20.4, 15.8, 2, 1.8), "#1d1a20", 0.4);
  },
  /** A night-shift lanyard with a blank paper badge. */
  lanyard(ctx) {
    stroke(ctx, new Path2D("M 24 46.2 L 32.6 52.6 M 45.6 46.2 L 37 52.6"), "#4f6f9a", 1.1);
    headCut(ctx, [[30.6, 51.6], [39, 51.6], [39, 57.4], [30.6, 57.4]], CREAM, 0.5);
    headCut(ctx, [[31.8, 53.4], [37.8, 53.4], [37.8, 54.4], [31.8, 54.4]], "#7f9bc1", 0);
  },
  /** A collar with an original folded blue-grey paper bird tag (round body, cream belly, side beak). */
  "bird-tag"(ctx) {
    headCut(ctx, new Path2D("M 21.4 47.2 Q 34.8 50.4 48.2 47.2 L 48.4 49.6 Q 34.8 52.8 21.2 49.6 Z"), "#6d5a47", 0.4);
    headCut(ctx, new Path2D("M 34.8 50.2 Q 39 50.8 38.8 54.4 Q 38.4 57.6 34.8 57.6 Q 31.2 57.6 31 54.4 Q 31 50.8 34.8 50.2 Z"), BLUE, 0.45);
    headCut(ctx, oval(34.4, 55, 2, 2.2), CREAM, 0);
    headCut(ctx, [[38.4, 52.6], [40.8, 53.2], [38.4, 54]], "#d98b45", 0.15);
  },
  /** A round comic bowler hat sitting back between the ears. */
  bowler(ctx) {
    headCut(ctx, new Path2D("M 26.4 16 Q 25.6 5.4 34.8 5 Q 44 5.4 43.2 16 Z"), "#2c2830", 0.55);
    headCut(ctx, new Path2D("M 21.6 17.2 Q 34.8 13.4 48 17.2 Q 34.8 19.4 21.6 17.2 Z"), "#2c2830", 0.45);
    headCut(ctx, [[26.6, 13.4], [43, 13.4], [43.1, 14.8], [26.5, 14.8]], RED, 0.05);
  },
};

/** Expression marks drawn into each eye spot after clearing (Meow Wall EXPRESSIONS idea). */
export function paintExpression(ctx: Ctx, expression: CostumeExpression, ink: string, opaqueLenses: boolean): void {
  const color = opaqueLenses ? "#f6efdf" : ink, width = opaqueLenses ? 0.9 : 1.15;
  EYES.forEach(([x, y], i) => {
    // The wink keeps the cat's own (left) eye; everything else draws both.
    if (expression === "wink" && i === 0) return;
    const arc = expression === "closed"
      ? `M ${x - 3.2} ${y + 0.2} Q ${x} ${y + 2.4} ${x + 3.2} ${y + 0.2}`
      : `M ${x - 3.2} ${y + 1.2} Q ${x} ${y - 2.8} ${x + 3.2} ${y + 1.2}`;
    stroke(ctx, new Path2D(arc), color, width);
    // A pale lip on the moonlit side keeps the ink stroke reading as a paper strip.
    ctx.save();
    ctx.translate(0.25, -0.35);
    stroke(ctx, new Path2D(arc), "#fff1cf", 0.35, opaqueLenses ? 0 : 0.45);
    ctx.restore();
  });
}
/** The cat's plain pupils, for eyes cleared under replacement eyewear without an expression. */
export function paintPlainEyes(ctx: Ctx, ink: string, white: string): void {
  for (const [x, y] of EYES) {
    ctx.fillStyle = ink;
    ctx.fill(path([[x - 2.2, y - 2.9], [x + 2.6, y - 2.9], [x + 2.6, y + 3.4], [x - 2.2, y + 3.4]]));
    ctx.fillStyle = white;
    ctx.fill(path([[x + 0.2, y - 2.5], [x + 2.2, y - 2.5], [x + 2.2, y - 0.5], [x + 0.2, y - 0.5]]));
  }
}
/** Accessories that replace the printed eyewear (the eye area is cleared under them). */
export const EYEWEAR_ACCESSORIES: ReadonlySet<string> = new Set(["round-glasses", "eyepatch"]);
