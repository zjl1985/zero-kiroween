import type { LandmarkArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, hash, line, oval, path, shadow, stroke, type Ctx } from "../../../render/paper-material.js";
import { cardBeam, foldedLeaf, foldedPot, paperSprig } from "../night-workshop-kit.art.js";

function roofRib(t: number): Path2D {
  const sx = -107 + 167 * t, rx = -66 + 146 * t, p = new Path2D();
  p.moveTo(sx, -88);
  p.bezierCurveTo(sx - 1, -117, rx - 16, -147, rx, -157);
  return p;
}

function building(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 2, 2, 113, 17);
  // Masonry skirt follows both visible wall faces, rather than a floating glass icon.
  paperCut(ctx, [[-99, -14], [61, -14], [111, -36], [111, -22], [63, 6], [-100, 6]], { color: "#777c68", thickness: 1.4, layers: 1, shadow: 2.3, texture: 0.95 });
  for (let i = 0; i < 8; i++) foldLine(ctx, -97 + i * 20, -10, -97 + i * 20, 4, 0.6);
  paperCut(ctx, [[60, -90], [109, -116], [109, -27], [60, -3]], { color: "#354e4e", thickness: 1.2, shadow: 1.3 });
  // A planted side bay seen through folded vellum, with opaque pale reflections.
  const side = path([[65, -88], [104, -109], [104, -31], [65, -10]]);
  ctx.save(); ctx.clip(side);
  paperSprig(ctx, 82, -27, 1.2, v + 31, true);
  paperSprig(ctx, 105, -38, 0.75, v + 9);
  ctx.globalAlpha *= 0.23;
  paperCut(ctx, side, { color: "#8eb9ad", thickness: 0.4, shadow: 0, texture: 0.7 });
  ctx.restore();
  paperCut(ctx, [[91, -99], [99, -104], [80, -19], [72, -15]], { color: "#90b5a7", thickness: 0.35, shadow: 0, texture: 0.8 });
  for (const t of [0, 0.5, 1]) cardBeam(ctx, 61 + t * 48, -90 - t * 26, 61 + t * 48, -3 - t * 24, 3.3, "#b4bea1");
  cardBeam(ctx, 61, -44, 109, -69, 3, "#9ba98c");
  const front = paperCut(ctx, [[-95, -91], [60, -91], [60, -7], [-95, -7]], { color: "#314b48", thickness: 1.2, shadow: 1.5, texture: 0.8 });
  ctx.save(); ctx.clip(front);
  // Foliage is behind the glazing and structural ribs, not pasted over the building.
  for (const [px, py, ps] of [[-78, -18, 0.8], [-43, -19, 1.05], [25, -17, 0.83], [49, -20, 0.65]] as const) {
    foldedPot(ctx, px, py, ps * 0.65, v + px);
    paperSprig(ctx, px, py - 16 * ps, ps, v + px * 7, px > 0);
  }
  cardBeam(ctx, -94, -23, 59, -23, 3.5, "#9b805b");
  ctx.globalAlpha *= 0.18;
  paperCut(ctx, front, { color: "#b0cdb6", thickness: 0.4, shadow: 0, texture: 0.65 });
  ctx.restore();
  // Each pane has its own reflected paper strip, leaving generous dark negative space.
  for (const [px, w] of [[-91, 28], [-57, 28], [13, 42]] as const) {
    paperCut(ctx, [[px + 3, -87], [px + 10, -87], [px + w - 3, -13], [px + w - 10, -13]], { color: "#779f92", shadow: 0, thickness: 0.3, texture: 0.7 });
    cardBeam(ctx, px, -90, px, -9, 3, "#bcc4a5");
    cardBeam(ctx, px + w, -90, px + w, -9, 3, "#9bab8f");
    cardBeam(ctx, px, -49, px + w, -49, 2.5, "#afbea0");
  }
  // Closed double-height door: lit translucent upper pane and folded timber lower panel.
  warmGlow(ctx, -8, -64, 28, 0.15);
  paperCut(ctx, box(-24, -91, 33, 85), { color: "#657e68", thickness: 1.5, shadow: 1.6 });
  paperCut(ctx, box(-19, -85, 23, 49), { color: "#aebd8c", thickness: 0.8, shadow: 0, texture: 0.9 });
  foldedLeaf(ctx, -8, -42, 28, 7, 0.15, "#7b966f");
  cardBeam(ctx, -8, -85, -8, -36, 2, "#d0d2a9");
  cardBeam(ctx, -19, -61, 4, -61, 2, "#d0d2a9");
  paperCut(ctx, box(-19, -30, 23, 19), { color: "#8f9e79", thickness: 0.7, shadow: 0.6, fold: { from: [-18, -30], to: [3, -12], depth: 0.18 } });
  line(ctx, 1, -33, 1, -25, "#eadba5", 2);
  cardBeam(ctx, -98, -7, 61, -7, 4, "#bec6a8");
  // The far roof return is darker and meets a raised ridge cap.
  paperCut(ctx, [[60, -88], [80, -157], [116, -118], [110, -109]], { color: "#567e79", thickness: 1.2, shadow: 2.2 });
  for (let i = 1; i < 4; i++) cardBeam(ctx, 80 + i * 9, -157 + i * 10, 60 + i * 12.5, -88 - i * 6, 2.8, "#b3c5ad");
  const roof = paperCut(ctx, (p) => {
    p.moveTo(-107, -88); p.bezierCurveTo(-108, -117, -82, -147, -66, -157);
    p.lineTo(80, -157); p.bezierCurveTo(64, -147, 59, -117, 60, -88); p.closePath();
  }, { color: "#5f8b85", thickness: 1.5, shadow: 2.3, texture: 0.9 });
  ctx.save(); ctx.clip(roof);
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6, t1 = (i + 1) / 6,
      sx0 = -107 + 167 * t0, sx1 = -107 + 167 * t1,
      rx0 = -66 + 146 * t0, rx1 = -66 + 146 * t1;
    paperCut(ctx, (p) => {
      p.moveTo(sx0, -88); p.bezierCurveTo(sx0 - 1, -117, rx0 - 16, -147, rx0, -157);
      p.lineTo(rx1, -157); p.bezierCurveTo(rx1 - 16, -147, sx1 - 1, -117, sx1, -88); p.closePath();
    }, { color: ["#739b91", "#638e87", "#88aa99"][i % 3]!, thickness: 0.5, shadow: 0.4, texture: 0.85 });
    paperCut(ctx, [[rx0 + 5, -151], [rx0 + 11, -151], [sx0 + 15, -94], [sx0 + 8, -94]], { color: "#b1c6ad", thickness: 0.25, shadow: 0, texture: 0.5 });
  }
  // Climbing silhouettes below the glass give the roof a translucent-paper reading.
  ctx.globalAlpha *= 0.38;
  for (let i = 0; i < 4; i++) foldedLeaf(ctx, -76 + i * 39, -90, 30 + hash(v + i) * 13, 8, -0.3 + i * 0.16, "#466c5d");
  ctx.restore();
  for (let i = 0; i <= 6; i++) {
    const rib = roofRib(i / 6);
    stroke(ctx, rib, "#3d5c50", 5);
    stroke(ctx, rib, "#bdcaaa", 2.8);
    stroke(ctx, rib, "#e0dfb7", 0.7, 0.7);
  }
  cardBeam(ctx, -104, -117, 62, -117, 2, "#afc1a5");
  cardBeam(ctx, -67, -158, 80, -158, 5, "#c5ccac");
  cardBeam(ctx, -108, -87, 62, -87, 5, "#cbd1af");
  cardBeam(ctx, 62, -87, 113, -113, 4, "#a9b69a");
  // Open vent: a dark cut-out beneath a propped-up, folded glass flap.
  paperCut(ctx, [[-29, -124], [6, -124], [23, -146], [-11, -146]], { color: "#293e3c", thickness: 1.1, shadow: 1.6 });
  cardBeam(ctx, -26, -125, -24, -141, 1.8, "#b1bf9c");
  cardBeam(ctx, 8, -126, 11, -143, 1.8, "#b1bf9c");
  const vent = [[-27, -141], [10, -143], [24, -161], [-12, -159]] as const;
  paperCut(ctx, vent, { color: "#a3bfb0", thickness: 1.3, shadow: 2, stitch: "#d6dcbd", stitchInset: 2, fold: { from: [-9, -142], to: [6, -160], depth: 0.16 } });
  cardBeam(ctx, -12, -160, 24, -162, 3, "#d4d7b6");
  for (let i = 0; i < 3; i++) paperCut(ctx, [[-29 - i * 3, 2 + i * 4], [13 + i * 3, 2 + i * 4], [17 + i * 3, 7 + i * 4], [-33 - i * 3, 7 + i * 4]], { color: i % 2 ? "#a2ac8e" : "#bdc3a1", thickness: 0.7, shadow: 0.6 });
  ctx.restore();
}

function trellis(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 2, 30, 7);
  for (const px of [-22, 22]) cardBeam(ctx, px, -94, px, 2, 4, "#8e8966");
  cardBeam(ctx, -25, -94, 25, -94, 4, "#b1a47c");
  const aperture = path([[-20, -90], [20, -90], [20, -12], [-20, -12]]);
  ctx.save(); ctx.clip(aperture);
  for (let i = -4; i < 7; i++) {
    cardBeam(ctx, -24, -112 + i * 18, 24, -64 + i * 18, 2, "#9ea37d");
    cardBeam(ctx, 24, -112 + i * 18, -24, -64 + i * 18, 2, "#9ea37d");
  }
  ctx.restore();
  const vine = new Path2D();
  vine.moveTo(-14, -1); vine.bezierCurveTo(12, -29, -24, -46, 5, -62); vine.quadraticCurveTo(30, -78, 5, -94);
  stroke(ctx, vine, "#486449", 3);
  for (let i = 0; i < 7; i++) {
    const px = Math.sin(i * 1.6) * 13, py = -12 - i * 12;
    foldedLeaf(ctx, px, py, 18 + hash(v + i) * 8, 6, i % 2 ? -0.9 : 1, i % 2 ? "#82a06e" : "#a3b784");
  }
  foldedPot(ctx, -12, 3, 0.85, v);
  ctx.restore();
}

function wateringCan(ctx: Ctx): void {
  const handle = new Path2D();
  handle.ellipse(28, -54, 8, 9, 0.3, 0, Math.PI * 2);
  handle.ellipse(28, -54, 4.5, 5.5, 0.3, 0, Math.PI * 2, true);
  paperCut(ctx, handle, { color: "#8eaa9f", thickness: 0.7, shadow: 0.7 });
  paperCut(ctx, [[20, -47], [38, -61], [42, -57], [27, -41]], { color: "#8aa79d", thickness: 0.8, shadow: 0.8 });
  paperCut(ctx, [[12, -57], [28, -57], [30, -39], [10, -39]], { color: "#76978f", thickness: 1, shadow: 1.2, fold: { from: [22, -57], to: [23, -39], depth: 0.18 } });
  paperCut(ctx, oval(20, -57, 8, 3), { color: "#435f5a", thickness: 0.7, shadow: 0 });
  paperCut(ctx, oval(41, -61, 5, 2.5, 1), { color: "#c2c5a1", thickness: 0.6, shadow: 0.7 });
  line(ctx, 39, -62, 43, -60, "#6f8173", 0.8);
}

function workbench(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 2, 47, 10);
  for (const px of [-35, 35]) cardBeam(ctx, px, -37, px, 3, 5, "#6b5840");
  cardBeam(ctx, -34, -4, 34, -29, 3, "#8d7652");
  paperCut(ctx, [[-39, -10], [36, -10], [41, -4], [-42, -4]], { color: "#9f8c61", thickness: 1, shadow: 1.3 });
  for (let i = 0; i < 3; i++) foldedPot(ctx, -24 + i * 18, -10, 0.48, v + i);
  paperCut(ctx, [[-44, -37], [-36, -47], [39, -44], [46, -33], [-42, -32]], { color: "#bea376", thickness: 1, layers: 1, shadow: 1.8, wear: 0.2, seed: v });
  foldLine(ctx, -40, -38, 43, -35, 0.7);
  foldedPot(ctx, -22, -43, 0.65, v + 7);
  paperSprig(ctx, -22, -57, 0.6, v + 9, true);
  wateringCan(ctx);
  paperCut(ctx, [[-8, -44], [6, -44], [10, -36], [-10, -36]], { color: "#534c3a", thickness: 0.7, shadow: 0.6 });
  for (let i = 0; i < 3; i++) foldedLeaf(ctx, -5 + i * 5, -39, 8, 2.7, (i - 1) * 0.5, "#abb882");
  cardBeam(ctx, 26, -30, 26, -18, 3, "#c2a67a");
  paperCut(ctx, [[22, -18], [30, -18], [31, -10], [26, -7], [21, -10]], { color: "#9fafa2", shadow: 0.8, thickness: 0.7, fold: { from: [26, -18], to: [26, -7], depth: 0.25 } });
  ctx.restore();
}

function pots(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 1, 34, 9);
  for (const [px, py, ps] of [[-14, -4, 1.1], [18, 2, 0.8], [-1, 7, 0.6]] as const) {
    foldedPot(ctx, px, py, ps, v + px);
    paperSprig(ctx, px, py - 23 * ps, ps * 0.72, v + px * 3, px > 0);
  }
  ctx.restore();
}

export const FOLD_GREENHOUSE_ART: LandmarkArt = {
  id: "fold-greenhouse",
  ink: "#95bc9d",
  reach: () => 215,
  ground(ctx, l) {
    ctx.save(); ctx.translate(l.x, l.y);
    const yard = paperCut(ctx, oval(0, 25, 183, 108, l.seed, 0.07), { color: "#63725a", thickness: 1.5, shadow: 1.8, texture: 0.95 });
    stitchAlong(ctx, oval(0, 25, 175, 100, l.seed, 0.07), "#a3b285", 0.6);
    ctx.save(); ctx.clip(yard);
    for (const [px, py, w] of [[-140, -23, 46], [116, -2, 47], [-120, 80, 65]] as const) {
      paperCut(ctx, oval(px, py, w, 26, l.seed + px, 0.13), { color: "#665747", thickness: 0.8, shadow: 0.6, texture: 0.9 });
      for (let i = 0; i < 5; i++) {
        const sx = px - w * 0.6 + i * w * 0.3, sy = py + hash(l.seed + i * 13 + px) * 10;
        paperCut(ctx, oval(sx, sy, 3.5, 1.5, i), { color: "#93816a", thickness: 0.4, shadow: 0.3 });
      }
    }
    ctx.restore();
    // The broad stepping route is intentionally unplanted, from the door to the road.
    for (let i = 0; i < 6; i++) {
      const py = 1 + i * 23, px = -8 + Math.sin(i * 0.8) * 12;
      paperCut(ctx, [[px - 23, py - 6], [px + 22, py - 8], [px + 26, py + 8], [px - 25, py + 9]], { color: i % 2 ? "#b0b294" : "#c1bda0", thickness: 0.9, shadow: 0.8, wear: 0.15, seed: l.seed + i });
      foldLine(ctx, px - 19, py + 5, px + 20, py + 4, 0.35);
    }
    // Coiled garden hose is flat ground detail, not an invisible obstacle.
    const hose = new Path2D();
    hose.ellipse(128, 102, 23, 9, -0.2, 0, Math.PI * 2);
    hose.moveTo(147, 98); hose.quadraticCurveTo(172, 81, 149, 67);
    stroke(ctx, hose, "#394a40", 4, 0.8);
    stroke(ctx, hose, "#99ab7b", 2.1, 0.9);
    for (let i = 0; i < 7; i++) foldedLeaf(ctx, -146 + hash(l.seed + i * 17) * 58, 108 + hash(l.seed + i * 11) * 12, 8, 3, hash(l.seed + i) * 6, "#a6ae79");
    ctx.restore();
  },
  pieces: [
    { kind: "fold-greenhouse-building", bounds: { l: -130, r: 134, t: -179, b: 33 }, paint: building, variants: 2, popup: true },
    { kind: "fold-greenhouse-trellis", bounds: { l: -48, r: 48, t: -125, b: 23 }, paint: trellis, variants: 3 },
    { kind: "fold-greenhouse-workbench", bounds: { l: -64, r: 64, t: -113, b: 24 }, paint: workbench, variants: 3 },
    { kind: "fold-greenhouse-pots", bounds: { l: -61, r: 58, t: -94, b: 25 }, paint: pots, variants: 3 },
  ],
};
