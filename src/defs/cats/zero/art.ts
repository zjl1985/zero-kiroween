/** Zero's look: dark cape and body, warm gold accents, empower ring, dash symbols. */
import type { CatArt } from "../../../render/art-registry.js";
import { ring, star } from "../../../render/combat-fx.js";
import { drawCraftCat } from "../../../render/craft-cat.js";
import { drawPaperPortrait, PAPER_FACE_OUTLINE } from "../../../render/paper-face.js";
import { glow as light } from "../../../render/paper-material.js";
import { line, rect } from "../../../render/pixel-art.js";
import { ZERO_STATS } from "./stats.js";

export const ZERO_ART: CatArt = {
  id: "zero",
  face: {
    outline: PAPER_FACE_OUTLINE,
    patches: [
      // Fur at the roots of the gold locks, kept clear of the eyes.
      { color: "headDark", path: `M 21 21.4 Q 25.3 18.3 29.2 19.5 L 32.7 19.8 L 31.8 23.1
        Q 30.1 24.2 28.5 22.6 L 26.8 24.5 L 25 22.2 Q 23.3 22.8 21 21.4 Z` },
      { color: "headDark", path: `M 34.1 19.2 L 37.2 19.4 L 36.7 24.3 Q 35.3 26 34.3 24.3 Z
        M 40.2 19.8 Q 43.9 17.6 47.8 19.9 L 49.8 23.7 L 46.5 23 L 43.7 21.5 L 41.7 24.7 Z` },
      // Three separate sweeps echo the asymmetric gold marks in the source.
      { color: "mark", path: `M 16 18.2 Q 18.8 15.9 21.6 17.1 Q 24.5 18 25.9 20.4
        Q 23 19.2 21 19.8 L 18.6 22.1 L 19 19.3 Q 17.7 19.5 16 18.2 Z` },
      { color: "mark", path: `M 23 20.1 Q 25.9 17.8 29.8 18.9 Q 33.3 20 34.5 22.5
        Q 31.5 22.1 30.2 24.9 L 28.1 25.9 L 28.6 23.2 Q 25.9 23.5 23 20.1 Z` },
      { color: "mark", path: "M 38.1 20.7 Q 39.7 17.7 43.9 17.4 L 45.9 18.1 Q 43.7 20.6 39 22.1 Z" },
    ],
  },
  body: {
    rim: "#c9bba6",
    tail: "#c6a05b",
    paw: "#51424a",
    pawEdge: "#8d746c",
    cape: "#483a50",
    capeEdge: "#a18664",
    fold: "#282537",
    body: "#302a34",
    bodyEdge: "#726055",
    bib: "#4c3c3c",
    belt: "#77613f",
    arm: "#3c303b",
    tailoring: "split-coat",
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
