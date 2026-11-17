import { TEA } from "../../landmark-activities.js";
import type { LandmarkArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, hash, line, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { cardBeam, foldedLeaf, foldedPot, paperSprig } from "../night-workshop-kit.art.js";
import { plaza } from "../plaza.art.js";

function cup(ctx: Ctx, x: number, y: number, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  paperCut(ctx, oval(0, 0, 7, 2.3), { color: "#baa989", shadow: 0.6, thickness: 0.6 });
  paperCut(ctx, [[-5, -8], [5, -8], [3.5, -1], [-3.5, -1]], { color: "#eee0ba", shadow: 0.8, thickness: 0.7 });
  paperCut(ctx, oval(0, -8, 4.7, 1.7), { color: "#76573b", shadow: 0, thickness: 0.5 });
  line(ctx, -2, -3, 2, -3, "#6d8e80", 1.2);
  ctx.restore();
}

function teapot(ctx: Ctx, x: number, y: number, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const handle = new Path2D();
  handle.ellipse(10, -10, 7, 7, 0, 0, Math.PI * 2);
  handle.ellipse(10, -10, 3.5, 3.5, 0, 0, Math.PI * 2, true);
  paperCut(ctx, handle, { color: "#76968a", shadow: 0.8, thickness: 0.7 });
  paperCut(ctx, [[-7, -6], [-16, -14], [-18, -20], [-13, -18], [-6, -13]], { color: "#8ba89b", shadow: 0.7, thickness: 0.8 });
  paperCut(ctx, oval(0, -9, 11, 10, 17), { color: "#90aa93", shadow: 1.3, thickness: 0.9, fold: { from: [3, -18], to: [5, -1], depth: 0.13 } });
  paperCut(ctx, oval(0, -18, 8, 2.4), { color: "#b8c7a2", shadow: 0.7, thickness: 0.6 });
  paperCut(ctx, oval(0, -21, 2.5, 2.2), { color: "#d8c995", shadow: 0.4, thickness: 0.5 });
  foldedLeaf(ctx, -1, -4, 9, 2.5, 0.45, "#526f61");
  ctx.restore();
}

function window(ctx: Ctx, x: number, seed: number): void {
  paperCut(ctx, box(x, -91, 43, 55, seed), { color: "#493e35", shadow: 1.2, thickness: 1.5 });
  warmGlow(ctx, x + 21, -65, 32, 0.2);
  paperCut(ctx, box(x + 4, -87, 35, 46, seed + 1), { color: "#dcb879", shadow: 0, thickness: 0.7, texture: 0.9 });
  paperCut(ctx, [[x + 4, -87], [x + 16, -87], [x + 34, -41], [x + 4, -41]], { color: "#ead09a", shadow: 0, thickness: 0.3, texture: 0.7 });
  for (let i = 1; i < 4; i++) cardBeam(ctx, x + 4 + i * 8, -87, x + 4 + i * 8, -41, 1.7, "#806342");
  for (const wy of [-73, -57]) cardBeam(ctx, x + 3, wy, x + 40, wy, 2, "#806342");
  cardBeam(ctx, x - 3, -35, x + 46, -35, 4, "#aa8155");
}

function building(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 3, 3, 106, 16);
  // The turned wall and layered verandah establish depth before the roof is laid on.
  paperCut(ctx, [[-87, -12], [80, -12], [106, -28], [108, 0], [82, 11], [-91, 11]], { color: "#654d40", thickness: 1.6, layers: 2, shadow: 2.3 });
  paperCut(ctx, [[-91, -3], [79, -3], [106, -23], [108, -15], [82, 4], [-94, 4]], { color: "#ac885c", thickness: 1, shadow: 1.3 });
  for (let i = 0; i < 8; i++) foldLine(ctx, -83 + i * 23, -3, -85 + i * 23, 4, 0.65);
  paperCut(ctx, [[78, -105], [103, -119], [103, -24], [78, -5]], { color: "#9a805f", thickness: 1.2, shadow: 1.5, texture: 0.9 });
  for (let i = 0; i < 6; i++) line(ctx, 80, -91 + i * 15, 101, -104 + i * 15, "#6d5846", 1, 0.7);
  paperCut(ctx, [[-83, -106], [78, -106], [78, -5], [-83, -5]], { color: "#c5b28b", thickness: 1.4, shadow: 2.4, texture: 0.95, wear: 0.12, seed: v });
  for (const px of [-82, -22, 17, 77]) cardBeam(ctx, px, -108, px, -4, 5, "#765238");
  cardBeam(ctx, -80, -29, 78, -29, 5, "#79573e");
  window(ctx, -73, v + 1);
  window(ctx, 24, v + 2);
  // Deep doorway, a narrow turned jamb, and the front steps; no interior gameplay.
  paperCut(ctx, box(-18, -83, 30, 79), { color: "#302e32", thickness: 1.2, shadow: 0.5 });
  paperCut(ctx, [[7, -81], [13, -85], [13, -5], [7, -8]], { color: "#94734c", thickness: 0.7, shadow: 1 });
  for (let i = 0; i < 3; i++) {
    const sy = 7 + i * 4;
    paperCut(ctx, [[-25 - i * 3, sy - 4], [19 + i * 3, sy - 4], [23 + i * 3, sy + 1], [-29 - i * 3, sy + 1]], { color: i % 2 ? "#a18a68" : "#bea079", thickness: 0.8, shadow: 0.8 });
  }
  // Tea tins on the sheltered serving ledge, large enough to read as objects.
  for (let i = 0; i < 3; i++) {
    const tx = 32 + i * 12;
    paperCut(ctx, box(tx, -30, 9, 11, i), { color: ["#8d574a", "#687b68", "#a48959"][i]!, shadow: 0.8, thickness: 0.6 });
    cardBeam(ctx, tx, -30, tx + 9, -30, 2, "#d4bd8d");
    line(ctx, tx + 3, -25, tx + 6, -25, "#e2cc9a", 1.5);
  }
  cardBeam(ctx, 25, -17, 76, -17, 5, "#ba9160");
  // Overhanging awning: broad folded panels, deep valance and timber braces.
  for (const px of [-90, 86]) {
    cardBeam(ctx, px, -73, px, 1, 4.5, "#75523c");
    cardBeam(ctx, px, -55, px + (px < 0 ? 15 : -15), -74, 3, "#9d744c");
  }
  paperCut(ctx, [[-91, -104], [81, -104], [97, -76], [-105, -76]], { color: "#b27b52", thickness: 1.2, shadow: 2.5, layers: 1 });
  for (let i = 0; i < 7; i++) {
    const a = -91 + i * 24.6, b = -105 + i * 28.9;
    paperCut(ctx, [[a + 1, -103], [a + 23, -103], [b + 27, -77], [b + 1, -77]], { color: i % 2 ? "#c4925f" : "#d8b481", shadow: 0.6, thickness: 0.55, fold: { from: [a + 12, -103], to: [b + 14, -77], depth: 0.12 } });
    paperCut(ctx, [[b + 1, -76], [b + 27, -76], [b + 26, -65], [b + 14, -62], [b + 2, -65]], { color: "#a66c4b", shadow: 1.1, thickness: 0.75, stitch: "#e1bc82", stitchInset: 2 });
  }
  // Two stepped hipped roofs: broad front slope, darker end return, separate eave lips.
  paperCut(ctx, [[-103, -109], [-71, -151], [66, -151], [112, -119], [101, -105]], { color: "#3d4848", thickness: 1.6, shadow: 2.5 });
  const lowerRoof: Point[] = [[-71, -151], [51, -151], [91, -113], [-111, -107], [-99, -118]];
  const lower = paperCut(ctx, lowerRoof, { color: "#506360", thickness: 1.3, shadow: 2.4, edge: "#b8ab82" });
  ctx.save(); ctx.clip(lower);
  for (let row = 0; row < 4; row++) {
    const ry = -147 + row * 10;
    paperCut(ctx, [[-108, ry], [91, ry - 3], [99, ry + 7], [-114, ry + 10]], { color: ["#637771", "#526a66", "#53625f", "#677972"][row]!, shadow: 0.8, thickness: 0.8 });
    for (let i = 0; i < 10; i++) foldLine(ctx, -100 + i * 22 + (row % 2) * 10, ry + 1, -105 + i * 22 + (row % 2) * 10, ry + 9, 0.5);
  }
  ctx.restore();
  cardBeam(ctx, -112, -106, 92, -112, 4.5, "#b1976b");
  cardBeam(ctx, 92, -112, 112, -119, 4, "#785c42");
  paperCut(ctx, [[-43, -169], [45, -169], [48, -142], [-46, -140]], { color: "#b59b73", shadow: 1.6, thickness: 1 });
  for (const px of [-37, -24, 25, 39]) cardBeam(ctx, px, -166, px, -143, 2.5, "#6a513c");
  paperCut(ctx, oval(0, -153, 13, 12, 4), { color: "#e2c28a", shadow: 1.2, thickness: 1, stitch: "#86633f" });
  teapot(ctx, 0, -148, 0.48);
  const upper = paperCut(ctx, [[-71, -168], [-36, -191], [29, -191], [79, -169], [68, -162], [-66, -161]], { color: "#4d6260", thickness: 1.4, layers: 1, shadow: 2.2 });
  ctx.save(); ctx.clip(upper);
  for (let row = 0; row < 3; row++) {
    const ry = -188 + row * 9;
    paperCut(ctx, [[-70, ry], [72, ry], [79, ry + 7], [-76, ry + 9]], { color: row % 2 ? "#536d67" : "#6e8176", shadow: 0.7, thickness: 0.8 });
    for (let i = 0; i < 6; i++) foldLine(ctx, -58 + i * 23, ry, -62 + i * 23, ry + 8, 0.5);
  }
  ctx.restore();
  cardBeam(ctx, -69, -161, 69, -162, 4, "#b39769");
  cardBeam(ctx, -39, -192, 31, -192, 4.5, "#c0a575");
  for (const px of [-39, 31]) paperCut(ctx, [[px - 5, -192], [px - 8, -200], [px, -197], [px + 6, -192]], { color: "#8a7556", thickness: 0.8, shadow: 1 });
  ctx.restore();
}

function table(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 1, 48, 11);
  for (const px of [-22, 22]) cardBeam(ctx, px, -27, px - Math.sign(px) * 2, 2, 5, "#6e523d");
  cardBeam(ctx, -21, -8, 21, -8, 3, "#8b6647");
  paperCut(ctx, [[-32, -29], [-24, -40], [31, -37], [35, -26]], { color: "#c29a69", thickness: 1.1, layers: 2, shadow: 1.4 });
  paperCut(ctx, [[-14, -39], [10, -38], [13, -26], [12, -17], [-13, -18]], { color: v % 2 ? "#8c5552" : "#617c73", shadow: 0.7, thickness: 0.7, stitch: "#d9c297", stitchInset: 2 });
  for (const px of [-42, 44]) {
    cardBeam(ctx, px - 6, -10, px - 5, 4, 3, "#76583f");
    cardBeam(ctx, px + 6, -10, px + 5, 4, 3, "#76583f");
    paperCut(ctx, oval(px, -11, 11, 5, v + px), { color: "#a98459", thickness: 0.9, shadow: 1.2, layers: 1 });
  }
  teapot(ctx, -2, -35, 0.9);
  cup(ctx, -23, -32, 0.85);
  cup(ctx, 22, -30, 0.9);
  paperCut(ctx, oval(15, -39, 7, 2.6), { color: "#dbbd85", shadow: 0.4, thickness: 0.5 });
  for (let i = 0; i < 3; i++) paperCut(ctx, oval(11 + i * 4, -41, 2.2, 1.8, i), { color: "#c38650", shadow: 0.4, thickness: 0.4 });
  ctx.restore();
}

function planter(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 1, 25, 7);
  foldedPot(ctx, -6, 0, 1.25, v);
  paperSprig(ctx, -6, -28, 1.05, v + 7);
  foldedPot(ctx, 18, 4, 0.7, v + 2);
  paperSprig(ctx, 18, -12, 0.52, v + 17, true);
  ctx.restore();
}

export const PAPER_TEAHOUSE_ART: LandmarkArt = {
  id: "paper-teahouse",
  ink: "#d7ac74",
  reach: () => 210,
  ground(ctx, l) {
    ctx.save(); ctx.translate(l.x, l.y);
    plaza(ctx, 0, 28, 177, 102, l.seed);
    // A broad unoccupied entrance path, framed by two planted islands.
    for (const [px, py, rx, ry] of [[-133, -38, 40, 35], [137, -25, 30, 26]] as const) {
      paperCut(ctx, oval(px, py, rx, ry, l.seed + px, 0.1), { color: "#59634a", thickness: 1, shadow: 1, texture: 0.9 });
      stitchAlong(ctx, oval(px, py, rx - 4, ry - 4, l.seed + px, 0.1), "#9b9c6c", 0.5);
    }
    for (let i = 0; i < 5; i++) {
      const py = 14 + i * 24, px = Math.sin(i * 0.8) * 9;
      paperCut(ctx, [[px - 21, py - 7], [px + 22, py - 8], [px + 24, py + 7], [px - 23, py + 8]], { color: i % 2 ? "#bca98b" : "#c7b69a", thickness: 0.7, shadow: 0.5, wear: 0.18, seed: l.seed + i });
    }
    const mat = [[69, 51], [129, 49], [144, 92], [63, 95]] as const;
    paperCut(ctx, mat, { color: "#795246", thickness: 0.8, shadow: 0.8, stitch: "#bba078", stitchInset: 4 });
    for (let i = 0; i < 6; i++) line(ctx, 69 + i * 11, 53, 67 + i * 13, 91, "#aa8060", 0.7, 0.6);
    for (let i = 0; i < 8; i++) {
      const px = -146 + hash(l.seed + i * 13) * 52, py = 102 + hash(l.seed + i * 7) * 15;
      foldedLeaf(ctx, px, py, 7 + hash(l.seed + i) * 4, 2.5, hash(l.seed + i * 3) * 5, "#af8451");
    }
    // A stitched tea mat marks the reachable waiting place, beside rather than under the table.
    const { x: tx, y: ty } = TEA.point;
    paperCut(ctx, oval(tx, ty, 25, 14, l.seed), { color: "#8b6751", thickness: 0.75, shadow: 0.6, stitch: "#e0c399", stitchInset: 3 });
    paperCut(ctx, [[tx - 7, ty - 5], [tx + 7, ty - 5], [tx + 5, ty + 4], [tx - 5, ty + 4]], { color: "#d9c49b", thickness: 0.4, shadow: 0.3 });
    stroke(ctx, new Path2D(`M ${tx + 7} ${ty - 4} Q ${tx + 15} ${ty - 3} ${tx + 7} ${ty + 2}`), "#d9c49b", 1.7);
    stroke(ctx, path([[-37, -14], [-37, -7], [32, -7], [32, -14]]), "#d2bc97", 1, 0.6);
    ctx.restore();
  },
  pieces: [
    { kind: "paper-teahouse-building", bounds: { l: -130, r: 130, t: -216, b: 34 }, paint: building, variants: 2, popup: true },
    { kind: "paper-teahouse-table", bounds: { l: -64, r: 66, t: -69, b: 23 }, paint: table, variants: 2 },
    { kind: "paper-teahouse-planter", bounds: { l: -61, r: 56, t: -108, b: 22 }, paint: planter, variants: 3 },
  ],
};
