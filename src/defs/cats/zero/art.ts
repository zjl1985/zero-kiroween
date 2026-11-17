/** Zero's look: dark cape and body, warm gold accents, empower ring, dash symbols. */
import type { CatArt } from "../../../render/art-registry.js";
import { ring, star } from "../../../render/combat-fx.js";
import { drawCraftCat } from "../../../render/craft-cat.js";
import { drawPaperPortrait } from "../../../render/paper-face.js";
import { glow as light } from "../../../render/paper-material.js";
import { line, rect } from "../../../render/pixel-art.js";
import { ZERO_STATS } from "./stats.js";

export const ZERO_ART: CatArt = {
  id: "zero",
  face: {
    outline: "M 13 27 L 12 9 Q 12 6 15 8 L 27 20 Q 35 17 43 20 L 55 8 Q 59 6 58 10 L 57 28 Q 62 34 58 40 L 52 46 Q 35 54 19 47 L 12 41 Q 8 34 13 27 Z",
    patches: [
      { color: "headDark", path: "M 12 28 L 12 8 L 27 20 L 24 25 L 18 24 L 16 38 L 13 41 Z" },
      { color: "headDark", path: "M 43 20 L 58 7 L 57 29 L 59 37 L 54 42 L 51 25 Z" },
      { color: "headLight", path: "M 20 37 Q 27 34 35 38 Q 43 34 51 38 L 48 45 Q 35 51 22 45 Z" },
      { color: "headDark", path: "M 18 23 Q 22 16 31 18 L 40 19 L 47 24 L 40 25 L 34 22 L 27 26 Z" },
      { color: "mark", path: "M 18 23 Q 23 15 31 19 Q 38 17 46 23 L 39 22 L 34 27 L 31 23 L 25 25 L 26 21 Z" },
      { color: "headDark", path: "M 18 46 Q 35 51 53 45 L 52 53 L 18 53 Z" },
    ],
  },
  body: {
    rim: "#c9bba6",
    tail: "#c6a05b",
    paw: "#51424a",
    pawEdge: "#8d746c",
    cape: "#483a50",
    capeEdge: "#a18664",
    capeFold: "#282537",
    body: "#302a34",
    bodyEdge: "#726055",
    bib: "#4c3c3c",
    belt: "#77613f",
    arm: "#3c303b",
    tailoring: "split-coat",
    accessory: "watch-chain",
    lantern: "shutter",
    lining: "#79604e",
    trim: "#c5a16a",
    metal: "#ddb66b",
  },
  colors: {
    hud: "#f0b863",
    tone: "#c4553f",
    cardPaper: "#4a3a2c",
    cardInk: "#ecc47e",
    icon: "#e5be7b",
    levelUp: "#e9bf72",
    evolve: "#a9d4e4",
  },
  draw(ctx, pose) {
    drawCraftCat(ctx, pose, ZERO_ART.body);
  },
  skillPreview(ctx, pose) {
    light(ctx, pose.x, pose.y - 24, 46, "#ffd27a", 0.35);
    ZERO_ART.draw(ctx, { ...pose, dashing: true });
  },
  portrait(ctx, pose, scale) {
    drawPaperPortrait(ctx, pose, scale, ZERO_ART.body.rim);
  },
  heroAura(ctx, x, y, time) {
    const color = "#d5a65d";
    light(ctx, x, y, 100, color, 0.14, 0.35);
    ring(ctx, x, y, 55, color, 0.28);
    for (let i = 0; i < 5; i++) {
      const a = time * 0.3 + i * 1.25;
      rect(ctx, x + Math.cos(a) * 48, y - 5 - Math.sin(a) ** 2 * 20, 2, 1, "#bca26b");
    }
  },
  skillIcon(ctx, kind) {
    const color = ZERO_ART.colors.icon;
    if (kind === "active") {
      for (let i = 0; i < 3; i++) {
        line(ctx, 5 + i * 6, 9, 12 + i * 6, 16, color, 2);
        line(ctx, 12 + i * 6, 16, 5 + i * 6, 23, color, 2);
      }
    } else if (kind === "attack") {
      line(ctx, 5, 25, 25, 5, color, 2);
      line(ctx, 13, 5, 25, 5, color, 2);
      line(ctx, 25, 5, 25, 17, color, 2);
      rect(ctx, 5, 15, 4, 2, "#9e8056");
    } else {
      star(ctx, 16, 16, 12, color);
      line(ctx, 4, 26, 9, 21, "#927650");
      line(ctx, 23, 10, 28, 5, "#927650");
    }
  },
  ground(ctx, state) {
    const p = state.player;
    if (p.empowerTime <= 0) return;
    light(ctx, p.x, p.y, 38, "#d9a35b", 0.13, 0.45);
    ring(ctx, p.x, p.y, 25, "#bca16e", 0.3, p.empowerTime / ZERO_STATS.empowerDuration);
  },
};
