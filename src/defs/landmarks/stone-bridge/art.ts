import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { RIVER } from "./def.js";

export const STONE_BRIDGE_ART: LandmarkArt = {
  id: "stone-bridge",
  ink: "#8fb6c6",
  reach: (l) => Math.max(l.radius, (l.span ?? 0) + 30),
  ground(ctx, l) {
    const { x, y, seed } = l;
    const r = RIVER,
      span = l.span ?? r.halfLength,
      top: Point[] = [],
      bottom: Point[] = [];
    for (let dx = -span; dx <= span; dx += 16) {
      const taper = Math.min(1, (span - Math.abs(dx)) / 60 + 0.25);
      top.push([x + dx, y - r.halfWidth * taper + Math.sin((x + dx) * 0.03) * 3]);
      bottom.push([x + dx, y + r.halfWidth * taper + Math.sin((x + dx) * 0.027 + 1) * 3]);
    }
    const water = path([...top, ...bottom.reverse()], true);
    piece(ctx, water, "#2c4560", { shadow: 2.2, edge: "#7d9bb0", texture: 0.75, thickness: 1.8 });
    ctx.save();
    ctx.clip(water);
    for (let i = 0; i < 26; i++) {
      const rx = x - span + hash(seed + i) * span * 2,
        ry = y + (hash(seed + i * 3) - 0.5) * r.halfWidth * 1.3,
        ripple = new Path2D();
      ripple.moveTo(rx, ry);
      ripple.quadraticCurveTo(rx + 8, ry - 2, rx + 18, ry);
      stroke(ctx, ripple, "#8fb0c4", 0.8, 0.6);
    }
    ctx.restore();
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) grassTuft(ctx, x + side * (span - 10 - i * 14), y + (i % 2 ? -1 : 1) * 18, 1, seed + i);
    // Stone deck with plank seams, low parapets and posts.
    const halfH = r.halfWidth + 16,
      deck = box(x - r.deckHalf, y - halfH, r.deckHalf * 2, halfH * 2, seed);
    shadow(ctx, x, y + halfH - 2, r.deckHalf + 6, 8);
    piece(ctx, deck, "#9a8b7e", { shadow: 2.6, edge: "#c2ae91", texture: 0.9, thickness: 1.6 });
    for (let i = 1; i < 7; i++) line(ctx, x - r.deckHalf + 3, y - halfH + i * (halfH / 3.5), x + r.deckHalf - 3, y - halfH + i * (halfH / 3.5), "#7c6f66", 0.7, 0.8);
    for (const side of [-1, 1]) {
      const rail = box(x + side * r.deckHalf - 4, y - halfH - 4, 8, halfH * 2 + 6, seed + side);
      piece(ctx, rail, "#8a7c76", { shadow: 1.8, edge: "#c2ae91", texture: 0.9, thickness: 1 });
      for (const py of [-halfH - 2, 0, halfH - 2])
        piece(ctx, box(x + side * r.deckHalf - 6, y + py - 4, 12, 9, py + side), "#776a66", {
          shadow: 1.4,
          edge: "#ad9a8a",
          texture: 0.85,
          thickness: 0.8,
        });
    }
  },
};
