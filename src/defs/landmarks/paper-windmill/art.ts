import { cachedSprite } from "../../../engine/sprite.js";
import { LANDMARK_ACTIONS, WINDMILL } from "../../landmark-activities.js";
import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { grassTuft } from "../../../render/craft-scene.js";
import { flatCut, foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

/** One lattice sail on its arm, pointing along angle `a` from the hub. */
function sail(ctx: Ctx, a: number, seed: number): void {
  ctx.save();
  ctx.rotate(a);
  paperCut(ctx, [[-1.6, 0], [1.6, 0], [1.2, -86], [-1.2, -86]], { color: "#6b4d34", shadow: 1.4, thickness: 0.6, texture: 0.7 });
  const cloth: Point[] = [[3, -20], [20, -24], [22, -84], [3, -84]];
  paperCut(ctx, cloth, { color: "#e3d6b4", shadow: 1.8, thickness: 0.8, texture: 0.85, wear: 0.3, seed, edge: "#fff1cf" });
  for (let k = 0; k < 6; k++) line(ctx, 3, -28 - k * 10, 21, -30 - k * 10, "#9a845e", 0.6, 0.8);
  line(ctx, 12, -22, 12.5, -84, "#9a845e", 0.6, 0.8);
  ctx.restore();
}
/** Cached tower only. The live rotor is deliberately absent to prevent duplicate sails. */
export function paintWindmillTower(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 4, 2, 48, 11);
  // Tower front and the turned side face give it volume.
  paperCut(ctx, [[-34, 4], [-22, -128], [16, -130], [26, 4]], { color: "#d8c8a4", shadow: 3, thickness: 1.2, texture: 0.9, edge: "#f2dfb6", wear: 0.25, seed: v });
  paperCut(ctx, [[26, 4], [16, -130], [24, -124], [38, 0]], { color: "#a8946e", shadow: 1, thickness: 0.8, texture: 0.85 });
  for (let r = 0; r < 6; r++) line(ctx, -31 + r * 2, -12 - r * 20, 24 - r * 1.6, -13 - r * 20, "#b8a47e", 0.6, 0.7);
  // Shingled cap.
  const cap = path([[-30, -124], [-4, -170], [26, -126]]);
  piece(ctx, cap, "#5a3f4a", { shadow: 3, edge: "#b48b59", texture: 0.8, thickness: 1.4 });
  ctx.save();
  ctx.clip(cap);
  for (let row = 0; row < 7; row++)
    for (let xx = -34 - (row % 2) * 4; xx < 30; xx += 9)
      piece(ctx, box(xx, -132 - row * 7, 10, 6, row * 9 + xx), ["#664553", "#57404e", "#704c58"][(row + Math.abs(xx)) % 3]!, {
        shadow: 0.8,
        texture: 0.7,
        edge: "#98765e",
        thickness: 0.4,
      });
  ctx.restore();
  // Warm windows and the door.
  for (const [wx, wy] of [[-6, -92], [2, -52]] as const) {
    warmGlow(ctx, wx, wy, 18, 0.35);
    paperCut(ctx, new Path2D(`M ${wx - 5} ${wy + 6} L ${wx - 5} ${wy - 4} Q ${wx} ${wy - 10} ${wx + 5} ${wy - 4} L ${wx + 5} ${wy + 6} Z`), {
      color: "#efb35a",
      shadow: 0.8,
      thickness: 1.4,
      texture: 0.4,
      edge: "#634431",
    });
  }
  paperCut(ctx, new Path2D("M -14 4 L -14 -20 Q -4 -30 6 -20 L 6 4 Z"), { color: "#5f4530", shadow: 2, thickness: 1.2, texture: 0.9, edge: "#b68e56" });
  for (let i = 0; i < 3; i++) line(ctx, -10 + i * 6, -18, -10 + i * 6, 3, "#a07a47", 0.6);
  ctx.restore();
}

export const WINDMILL_SAILS = {
  hub: { x: -4, y: -118 },
  bounds: { l: -104, r: 104, t: -232, b: 14 },
} as const;

/**
 * Live overlay API: pass the SAME (x, y, s, variant) as the windmill DecorPiece,
 * plus a render-only angle in radians (0 gives the gallery pose). Its base is
 * (landmark.x, landmark.y - 10), not the court anchor. Call after the cached
 * tower, under the same popup transform/depth order. Never cache by angle/time.
 * Only three rotor textures are cached; rotation is a Canvas transform.
 */
export function paintWindmillSails(ctx: Ctx, x: number, y: number, s: number, v: number, angle = 0): void {
  const variant = ((Math.trunc(v) % 3) + 3) % 3;
  const rotor = cachedSprite(`windmill-sails:${variant}`, 192, 192, 2, (c) => {
    c.translate(96, 96);
    for (let k = 0; k < 4; k++) sail(c, (k * Math.PI) / 2, variant + k);
    paperCut(c, oval(0, 0, 6, 6, variant), { color: "#6b4d34", shadow: 1.6, thickness: 0.8, texture: 0.6, edge: "#c49a62" });
  }, { x: 0.5, y: 0.5 });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(WINDMILL_SAILS.hub.x, WINDMILL_SAILS.hub.y);
  ctx.rotate(0.35 + variant * 0.5 + angle);
  rotor.draw(ctx, { x: 0, y: 0 });
  ctx.restore();
}

export const PAPER_WINDMILL_ART: LandmarkArt = {
  id: "paper-windmill",
  ink: "#e3d6b4",
  base(ctx, l) {
    const { x, y, seed } = l;
    // A mown turf disc: wedge stripes cut from two greens radiate from the mill, on a raised plinth of turf.
    const turf = flatCut(ctx, blob(x, y + 14, 170, 92, seed, 0.05, 36), { color: "#56603f", edge: "#8c9a64", thickness: 1.4, lift: 1.4, rim: 1.1 });
    ctx.save();
    ctx.clip(turf);
    const stripes = new Path2D();
    for (let i = 0; i < 16; i += 2) {
      const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
      stripes.moveTo(x, y + 4);
      stripes.lineTo(x + Math.cos(a0) * 240, y + 4 + Math.sin(a0) * 140);
      stripes.lineTo(x + Math.cos(a1) * 240, y + 4 + Math.sin(a1) * 140);
      stripes.closePath();
    }
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = "#636e48";
    ctx.fill(stripes);
    ctx.restore();
    flatCut(ctx, polygon(x, y, 112, 58, 10, 0.2), { color: "#64704a", edge: "#9aa872", thickness: 1.1, lift: 1.1, rim: 1, stitch: "#a4ac74", stitchInset: 5 });
  },
  ground(ctx, l) {
    const { x, y, seed } = l;
    const walk = new Path2D();
    walk.moveTo(x - 6, y + 4);
    walk.quadraticCurveTo(x + 20, y + 50, x - 10, y + 96);
    stroke(ctx, walk, "#7a6450", 16, 0.85);
    stroke(ctx, walk, "#a08a6c", 11, 0.9);
    const px = x + WINDMILL.point.x, py = y + WINDMILL.point.y;
    paperCut(ctx, oval(px, py, 25, 15, seed), { color: "#b4a27b", shadow: 0.7, thickness: 0.7, stitch: "#e2d1aa", stitchInset: 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, dx = Math.cos(a), dy = Math.sin(a) * 0.6;
      paperCut(ctx, [[px, py], [px + dx * 17 - dy * 5, py + dy * 17 + dx * 3], [px + dx * 16 + dy * 6, py + dy * 16 - dx * 4]], { color: i % 2 ? "#688b82" : "#e3d6b4", shadow: 0.4, thickness: 0.5 });
    }
    for (let i = 0; i < 6; i++) grassTuft(ctx, x + (hash(seed + i) - 0.5) * 260, y + 40 + hash(seed + i * 3) * 40, 0.9, seed + i);
  },
  pieces: [{
    kind: "windmill", bounds: WINDMILL_SAILS.bounds, paint: paintWindmillTower, variants: 3, popup: true,
    live(ctx, x, y, s, v, time, activity) {
      paintWindmillSails(ctx, x, y, s, v, activity?.turn ?? time * LANDMARK_ACTIONS.idleTurn);
    },
  }],
};
