import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { flatCut } from "../../../render/paper-kit.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

function clockTower(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 2, 2, 46, 11);
  // Stone plinth, then a tall shaft with a folded side face.
  piece(ctx, path([[-38, 4], [-36, -46], [36, -48], [38, 4]]), "#8d8190", {
    shadow: 3,
    edge: "#bba7ad",
    texture: 0.95,
    thickness: 1.2,
  });
  for (let r = 0; r < 4; r++)
    line(ctx, -35, -8 - r * 10, 35, -9 - r * 10, "#6e6273", 0.6, 0.7);
  piece(ctx, path([[-27, -46], [-25, -176], [25, -178], [27, -46]]), "#cdbb9c", {
    shadow: 3,
    edge: "#ecd6b0",
    texture: 0.9,
    thickness: 1.2,
  });
  piece(ctx, path([[27, -46], [25, -178], [34, -172], [35, -52]]), "#9d8a72", {
    shadow: 1,
    edge: "#bba487",
    texture: 0.85,
    thickness: 0.8,
  });
  for (let i = 0; i < 18; i++)
    piece(ctx, box(-22 + hash(i * 7) * 38, -170 + hash(i * 13) * 118, 4 + hash(i) * 4, 2.2, i), "#b8a586", {
      shadow: 0,
      texture: 0.7,
      thickness: 0.18,
    });
  // Pointed roof of overlapping paper shingles.
  const roof = path([[-36, -172], [0, -236], [38, -172]]);
  piece(ctx, roof, "#4a3449", { shadow: 3.5, edge: "#b48b59", texture: 0.8, thickness: 1.6 });
  ctx.save();
  ctx.clip(roof);
  for (let row = 0; row < 9; row++)
    for (let xx = -40 - (row % 2) * 4; xx < 40; xx += 9)
      piece(ctx, box(xx, -178 - row * 7, 10, 6, row * 9 + xx), ["#57404e", "#644553", "#4c3749"][(row + Math.abs(xx)) % 3]!, {
        shadow: 0.9,
        texture: 0.8,
        edge: "#98765e",
        thickness: 0.45,
      });
  ctx.restore();
  stroke(ctx, new Path2D("M -38 -171 L 0 -237 L 40 -171"), "#c29a61", 0.9);
  line(ctx, 0, -236, 0, -250, "#78543b", 1.6);
  piece(ctx, oval(0, -252, 3, 3, 4), "#e3b866", { shadow: 0.6, texture: 0.4, thickness: 0.4 });
  // Clock face stopped just before midnight.
  glow(ctx, 0, -134, 34, "#f6d38e", 0.25);
  piece(ctx, oval(0, -134, 19, 19, 7, 0.02), "#f2e1b8", { shadow: 2, edge: "#fff4d4", texture: 0.5, thickness: 1.2 });
  stitch(ctx, oval(0, -134, 15.5, 15.5, 8, 0.02), "#a88a60", 0.8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    line(ctx, Math.cos(a) * 13, -134 + Math.sin(a) * 13, Math.cos(a) * 15, -134 + Math.sin(a) * 15, "#5b4535", 1);
  }
  line(ctx, 0, -134, -1.5, -147, "#3a2b2e", 1.8);
  line(ctx, 0, -134, -4, -142, "#3a2b2e", 2.2);
  // A warm arched window and door.
  const win = new Path2D("M -7 -86 L -7 -100 Q 0 -110 7 -100 L 7 -86 Z");
  glow(ctx, 0, -94, 22, "#ffc065", 0.35);
  piece(ctx, win, "#efb35a", { shadow: 1, edge: "#634431", thickness: 1.6, texture: 0.4 });
  line(ctx, 0, -104, 0, -86, "#805337", 1.2);
  const door = new Path2D("M -11 4 L -11 -24 Q 0 -36 11 -24 L 11 4 Z");
  piece(ctx, door, "#624731", { shadow: 2, edge: "#b68e56", texture: 0.9, thickness: 1.3 });
  for (let i = 0; i < 4; i++) line(ctx, -8 + i * 5, -22, -8 + i * 5, 3, "#a07a47", 0.6);
  ctx.restore();
}

export const CLOCK_TOWER_ART: LandmarkArt = {
  id: "clock-tower",
  ink: "#c9a35f",
  base(ctx, l) {
    // Paved paper tiles on a stepped octagonal apron around the tower.
    const apron = polygon(l.x, l.y + 12, 136, 82, 8, Math.PI / 8);
    pavedTiles(ctx, apron, l.x, l.y + 12, 136, 82, 17, ["#958a7b", "#80776b", "#a29683"], l.seed);
  },
  ground(ctx, l) {
    // A darker inlaid ring of tiles marks the clock's footprint.
    stoneRing(ctx, l.x, l.y + 8, 64, 26, 12, 0.28, l.seed + 3, false);
  },
  pieces: [{ kind: "clock-tower", bounds: { l: -52, r: 52, t: -258, b: 14 }, paint: clockTower, popup: true }],
};
