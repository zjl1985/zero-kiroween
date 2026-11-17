import { OBSERVATORY } from "../../landmark-activities.js";
import type { LandmarkArt } from "../../../render/art-registry.js";
import { paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, hash, line, oval, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { cardBeam, cardStar } from "../night-workshop-kit.art.js";

/** A ring with real transparent negative space between the inner and outer cuts. */
function ring(ctx: Ctx, x: number, y: number, rx: number, ry: number, width: number, color: string): void {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  p.ellipse(x, y, rx - width, ry - width, 0, 0, Math.PI * 2, true);
  paperCut(ctx, p, { color, thickness: 0.8, shadow: 0.8, texture: 0.7 });
}

function archedWindow(ctx: Ctx, x: number, y: number): void {
  warmGlow(ctx, x, y - 10, 23, 0.2);
  paperCut(ctx, (p) => {
    p.moveTo(x - 8, y); p.lineTo(x - 8, y - 24);
    p.quadraticCurveTo(x, y - 38, x + 8, y - 24); p.lineTo(x + 8, y); p.closePath();
  }, { color: "#d5ad6b", thickness: 1.7, edge: "#ead0a0", shadow: 0.8 });
  paperCut(ctx, [[x - 4, y - 25], [x + 2, y - 29], [x + 5, y - 3], [x - 4, y - 3]], { color: "#edd39b", thickness: 0.3, shadow: 0 });
  cardBeam(ctx, x, y - 30, x, y, 2, "#766657");
  cardBeam(ctx, x - 7, y - 13, x + 7, y - 13, 2, "#766657");
  cardBeam(ctx, x - 11, y + 2, x + 11, y + 2, 4, "#c3b4a0");
}

function telescope(ctx: Ctx): void {
  ctx.save(); ctx.translate(20, -137); ctx.rotate(-0.62);
  // Faceted tube: underside, broad upper face, metal-paper bands, and an inset lens.
  paperCut(ctx, [[-10, -6], [0, -6], [0, 6], [-10, 6]], { color: "#6c6b7d", thickness: 0.8, shadow: 1.3 });
  paperCut(ctx, [[-1, -8], [77, -12], [83, -10], [83, 12], [-1, 8]], { color: "#bda36e", thickness: 1.4, layers: 1, shadow: 2 });
  paperCut(ctx, [[2, 1], [79, 3], [80, 11], [2, 7]], { color: "#84704f", thickness: 0.6, shadow: 0.4 });
  paperCut(ctx, [[2, -7], [77, -11], [77, -5], [2, -3]], { color: "#e0cb94", thickness: 0.5, shadow: 0.3 });
  for (const tx of [10, 51, 75]) {
    paperCut(ctx, [[tx, -10], [tx + 5, -10], [tx + 5, 11], [tx, 11]], { color: "#747d85", thickness: 0.8, shadow: 1.1 });
    line(ctx, tx + 1, -8, tx + 1, 8, "#c6c4ad", 0.8);
  }
  paperCut(ctx, oval(83, 0, 6, 14, 3, 0.02), { color: "#d5be84", thickness: 1, shadow: 1.3 });
  paperCut(ctx, oval(84, 0, 3.7, 10.5, 4, 0.02), { color: "#334b68", thickness: 0.7, shadow: 0, texture: 0.5 });
  line(ctx, 84, -6, 86, 0, "#c8dfd5", 1.1, 0.8);
  cardBeam(ctx, 20, 9, 16, 19, 3.5, "#a08a61");
  paperCut(ctx, oval(16, 20, 5, 3, 7), { color: "#cebb89", thickness: 0.6, shadow: 0.8 });
  ctx.restore();
}

function building(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 4, 87, 18);
  const plinth: Point[] = [[-74, -17], [-49, -28], [45, -28], [71, -16], [70, 5], [46, 17], [-49, 17], [-74, 4]];
  paperCut(ctx, plinth, { color: "#69667b", thickness: 1.5, layers: 2, shadow: 2.4 });
  paperCut(ctx, [[-76, -17], [-49, -29], [45, -29], [73, -16], [48, -3], [-50, -3]], { color: "#9c99a3", thickness: 1.1, shadow: 1.1 });
  // Eight-sided drum: three visible planes and narrow folded pilasters.
  paperCut(ctx, [[-67, -105], [-46, -96], [-46, -5], [-67, -17]], { color: "#858398", thickness: 1.2, shadow: 1.4 });
  paperCut(ctx, [[45, -96], [67, -106], [67, -18], [45, -5]], { color: "#79798e", thickness: 1.2, shadow: 1.4 });
  const wall = paperCut(ctx, [[-46, -97], [45, -97], [45, -5], [-46, -5]], { color: "#aaa6b2", thickness: 1.3, shadow: 2, texture: 0.95 });
  ctx.save(); ctx.clip(wall);
  for (let row = 0; row < 6; row++) {
    line(ctx, -46, -90 + row * 16, 45, -90 + row * 16, "#747286", 0.7, 0.55);
    for (let i = 0; i < 4; i++) line(ctx, -45 + i * 27 + (row % 2) * 13, -90 + row * 16, -45 + i * 27 + (row % 2) * 13, -75 + row * 16, "#747286", 0.7, 0.5);
  }
  ctx.restore();
  for (const px of [-47, 46]) {
    paperCut(ctx, box(px - 3, -96, 6, 91), { color: "#c2b9b5", thickness: 0.9, shadow: 1.1 });
    cardBeam(ctx, px - 5, -92, px + 5, -92, 5, "#d1c6b7");
    cardBeam(ctx, px - 5, -7, px + 5, -7, 4, "#b6a9a1");
  }
  archedWindow(ctx, -31, -31);
  archedWindow(ctx, 31, -31);
  // Recessed arched door and a folded little hood below the star medallion.
  paperCut(ctx, new Path2D("M -14 -5 L -14 -41 Q 0 -62 14 -41 L 14 -5 Z"), { color: "#343445", thickness: 1.4, shadow: 0.7, edge: "#d0b78c" });
  paperCut(ctx, [[7, -42], [13, -45], [13, -6], [7, -9]], { color: "#6d6571", thickness: 0.8, shadow: 0.5 });
  for (let i = 0; i < 3; i++) line(ctx, -10 + i * 5, -37, -10 + i * 5, -7, "#686479", 0.7);
  paperCut(ctx, [[-23, -44], [0, -62], [24, -44], [0, -51]], { color: "#68758b", thickness: 1.2, shadow: 1.8, fold: { from: [0, -62], to: [0, -51], depth: 0.22 } });
  cardStar(ctx, 0, -77, 9, "#dfc58f");
  for (let i = 0; i < 3; i++) {
    const sy = 6 + i * 5;
    paperCut(ctx, [[-23 - i * 4, sy - 4], [22 + i * 4, sy - 4], [26 + i * 4, sy + 1], [-27 - i * 4, sy + 1]], { color: i % 2 ? "#9394a1" : "#b8b5b9", thickness: 0.9, shadow: 0.8 });
  }
  // Domed paper shell with broad radial gores, not a flat semicircle.
  const dome = paperCut(ctx, (p) => {
    p.moveTo(-77, -111); p.bezierCurveTo(-77, -160, -43, -193, -4, -195);
    p.bezierCurveTo(43, -198, 79, -161, 80, -111); p.quadraticCurveTo(0, -88, -77, -111); p.closePath();
  }, { color: "#5b6d85", thickness: 1.5, shadow: 2.5, texture: 0.95 });
  ctx.save(); ctx.clip(dome);
  const toes = [-78, -49, -12, 26, 58, 83];
  for (let i = 0; i < 5; i++) {
    const left = toes[i]!, right = toes[i + 1]!;
    paperCut(ctx, (p) => {
      p.moveTo(-4, -195); p.bezierCurveTo(left * 0.7, -184, left, -145, left, -103);
      p.lineTo(right, -98); p.bezierCurveTo(right, -145, right * 0.7, -184, -4, -195); p.closePath();
    }, { color: ["#778aa0", "#8d9eae", "#6e8299", "#52647e", "#465971"][i]!, thickness: 0.45, shadow: 0.5, texture: 0.9 });
  }
  for (const tx of [-49, -12, 26, 58]) {
    const rib = new Path2D(); rib.moveTo(-4, -195); rib.bezierCurveTo(tx * 0.7, -184, tx, -145, tx, -101);
    stroke(ctx, rib, "#394b64", 2.4); stroke(ctx, rib, "#b8b6ab", 0.8, 0.85);
  }
  const seam = new Path2D(); seam.moveTo(-76, -133); seam.quadraticCurveTo(0, -112, 79, -133);
  stroke(ctx, seam, "#c5baa1", 0.9, 0.65);
  ctx.restore();
  // The roof slit has its own black interior and two thick sliding-shutter lips.
  const slit = new Path2D("M -3 -195 C 0 -172 7 -139 13 -106 Q 27 -103 42 -111 C 27 -137 22 -170 9 -195 Z");
  paperCut(ctx, slit, { color: "#222b40", thickness: 1.2, shadow: 0, texture: 0.7, edge: "#cfbf94" });
  for (let i = 0; i < 3; i++) cardBeam(ctx, 6 + i * 5, -169 + i * 21, 21 + i * 6, -170 + i * 21, 2, "#55647b");
  telescope(ctx);
  paperCut(ctx, new Path2D("M -8 -194 L -3 -195 C 0 -172 7 -139 13 -106 L 7 -106 C 1 -140 -5 -173 -8 -194 Z"), { color: "#b2b3ab", thickness: 0.9, shadow: 1.2 });
  paperCut(ctx, new Path2D("M 10 -194 L 15 -192 C 29 -161 34 -134 46 -112 L 41 -109 C 27 -137 22 -169 10 -194 Z"), { color: "#8b9297", thickness: 0.8, shadow: 1.2 });
  // Curved rail under the rotating dome; rivets are spaced at readable intervals.
  paperCut(ctx, new Path2D("M -80 -113 Q 0 -89 82 -113 L 82 -103 Q 0 -78 -80 -103 Z"), { color: "#b2a784", thickness: 1.2, shadow: 1.7, layers: 1 });
  for (let i = 0; i < 9; i++) {
    const px = -70 + i * 17.5, py = -101 + 12 * (1 - Math.pow(px / 76, 2));
    paperCut(ctx, oval(px, py, 1.7, 1.7, v + i), { color: "#e2d3a8", thickness: 0.4, shadow: 0.4 });
  }
  cardBeam(ctx, -4, -196, -4, -210, 2.5, "#beab7d");
  cardStar(ctx, -4, -215, 6.5);
  ctx.restore();
}

function armillary(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 2, 35, 8);
  paperCut(ctx, [[-22, -4], [-12, -11], [14, -11], [24, -3], [20, 4], [-19, 4]], { color: "#8c8790", thickness: 1, layers: 1, shadow: 1.5 });
  paperCut(ctx, [[-7, -31], [7, -31], [11, -7], [-11, -7]], { color: "#ac9c80", thickness: 1, shadow: 1.2, fold: { from: [1, -30], to: [3, -7], depth: 0.25 } });
  ring(ctx, 0, -57, 29, 29, 2.8, "#cbb37e");
  ctx.save(); ctx.translate(0, -57); ctx.rotate(-0.48);
  ring(ctx, 0, 0, 13, 29, 2.5, "#9b936f");
  ring(ctx, 0, 0, 29, 9, 2.3, "#dfc68a");
  cardBeam(ctx, 0, -35, 0, 35, 2.1, "#b6a87c");
  ctx.restore();
  paperCut(ctx, oval(0, -57, 6.5, 6.5, v), { color: "#7e99ac", thickness: 0.8, shadow: 0.9, fold: { from: [0, -63], to: [0, -51], depth: 0.22 } });
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    line(ctx, Math.cos(a) * 26, -57 + Math.sin(a) * 26, Math.cos(a) * 29, -57 + Math.sin(a) * 29, "#6d6354", 0.7);
  }
  cardStar(ctx, -18, -90, 5);
  ctx.restore();
}

function chart(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 3, 53, 14);
  const deck = [[-49, -7], [-29, -19], [31, -19], [50, -6], [37, 12], [-35, 12]] as const;
  paperCut(ctx, deck, { color: "#767187", thickness: 1.1, layers: 2, shadow: 1.8 });
  for (let i = 0; i < 6; i++) line(ctx, -36 + i * 14, -12, -36 + i * 14, 8, "#a5a0ac", 0.6, 0.7);
  for (const px of [-26, 26]) {
    cardBeam(ctx, px, -34, px, 0, 4, "#83745e");
    cardBeam(ctx, px, -1, -px, -26, 2.5, "#b4a283");
  }
  paperCut(ctx, [[-40, -34], [-30, -52], [36, -47], [43, -29]], { color: "#96856a", thickness: 1.1, layers: 1, shadow: 1.5 });
  const sheet = [[-33, -48], [29, -45], [34, -28], [-39, -31]] as const;
  paperCut(ctx, sheet, { color: "#d8cfb2", thickness: 0.8, shadow: 1.2, stitch: "#938b78", stitchInset: 2 });
  paperCut(ctx, [[-26, -45], [23, -42], [27, -31], [-31, -34]], { color: "#4d6077", thickness: 0.4, shadow: 0, texture: 0.8 });
  const constellation: Point[] = [[-22, -38], [-12, -42], [-3, -36], [9, -39], [21, -34]];
  for (let i = 0; i < constellation.length - 1; i++) line(ctx, ...constellation[i]!, ...constellation[i + 1]!, "#ddcf9d", 0.65);
  for (const [px, py] of constellation) cardStar(ctx, px, py, 2.4, "#efdfb0");
  for (const px of [-36, 30]) {
    paperCut(ctx, [[px, -48], [px + 5, -48], [px + 9, -29], [px + 3, -29]], { color: "#eee0bd", thickness: 0.8, shadow: 1.1, fold: { from: [px + 3, -48], to: [px + 6, -29], depth: 0.12 } });
    paperCut(ctx, oval(px + 5, -29, 3.5, 1.8, v + px), { color: "#a39475", thickness: 0.5, shadow: 0 });
  }
  // A brass divider and a closed folded atlas on the side shelf, without text.
  cardBeam(ctx, 22, -45, 17, -52, 1.1, "#d5bd84");
  cardBeam(ctx, 22, -45, 28, -51, 1.1, "#d5bd84");
  paperCut(ctx, [[18, -19], [34, -18], [38, -9], [21, -10]], { color: "#80546a", thickness: 0.8, layers: 1, shadow: 1 });
  cardStar(ctx, 28, -14, 3, "#e2c592");
  ctx.restore();
}

export const STAR_OBSERVATORY_ART: LandmarkArt = {
  id: "star-observatory",
  ink: "#b4b7d0",
  reach: () => 210,
  ground(ctx, l) {
    ctx.save(); ctx.translate(l.x, l.y);
    paperCut(ctx, oval(0, 24, 177, 105, l.seed, 0.055), { color: "#66667b", thickness: 1.4, shadow: 2, texture: 0.9 });
    const court = paperCut(ctx, oval(0, 26, 161, 92, l.seed + 1, 0.04), { color: "#858595", thickness: 0.9, shadow: 0.6, texture: 0.9 });
    ctx.save(); ctx.clip(court);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6, b = a + Math.PI / 6,
        outerA: Point = [Math.cos(a) * 160, 26 + Math.sin(a) * 91],
        outerB: Point = [Math.cos(b) * 160, 26 + Math.sin(b) * 91];
      paperCut(ctx, [[Math.cos(a) * 113, 26 + Math.sin(a) * 62], outerA, outerB, [Math.cos(b) * 113, 26 + Math.sin(b) * 62]], { color: i % 2 ? "#8f8d9a" : "#787c91", thickness: 0.5, shadow: 0.3, texture: 0.8 });
    }
    ctx.restore();
    stitchAlong(ctx, oval(0, 26, 151, 84, l.seed + 1, 0.04), "#cdc2a6", 0.75);
    stroke(ctx, oval(0, 26, 112, 62, 5, 0.015), "#c6bba1", 1.5, 0.65);
    stroke(ctx, oval(0, 26, 104, 56, 5, 0.015), "#c6bba1", 0.65, 0.6);
    // The alignment activity and its compass rose share a walkable court anchor.
    const { x: ox, y: oy } = OBSERVATORY.point;
    ring(ctx, ox, oy, 49, 29, 1.5, "#d7c9a3");
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, r = i % 2 ? 28 : 44,
        tip: Point = [ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.55],
        left: Point = [ox + Math.cos(a - 0.3) * 10, oy + Math.sin(a - 0.3) * 6],
        right: Point = [ox + Math.cos(a + 0.3) * 10, oy + Math.sin(a + 0.3) * 6];
      paperCut(ctx, [[ox, oy], left, tip, right], { color: i % 2 ? "#a6a1a4" : "#cabd98", thickness: 0.5, shadow: 0.3, fold: { from: [ox, oy], to: tip, depth: 0.18 } });
    }
    for (let i = 0; i < 3; i++) paperCut(ctx, [[-22, 83 + i * 18], [22, 83 + i * 18], [25, 96 + i * 18], [-25, 96 + i * 18]], { color: "#b4adab", thickness: 0.7, shadow: 0.6 });
    for (let i = 0; i < 6; i++) {
      const px = 117 + hash(l.seed + i * 7) * 33, py = 13 + hash(l.seed + i * 11) * 27;
      paperCut(ctx, oval(px, py, 3 + hash(l.seed + i) * 2, 1.7, i), { color: "#aaa5a1", thickness: 0.4, shadow: 0.5 });
    }
    ctx.restore();
  },
  pieces: [
    { kind: "star-observatory-building", bounds: { l: -100, r: 116, t: -236, b: 38 }, paint: building, variants: 2, popup: true },
    { kind: "star-observatory-armillary", bounds: { l: -49, r: 49, t: -110, b: 24 }, paint: armillary, variants: 2 },
    { kind: "star-observatory-chart", bounds: { l: -69, r: 69, t: -69, b: 33 }, paint: chart, variants: 2 },
  ],
};
