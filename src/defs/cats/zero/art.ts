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
    outline: "M 13.6 13.6 L 13.6 8 Q 13.6 7.2 14.5 7.2 L 19 7.2 L 29.6 20 L 40.8 20 L 49.6 7.2 L 54.4 7.2 Q 55.2 7.2 55.2 8 L 55.2 13.6 L 58.4 16 L 57.6 22 L 54.4 24 L 57.8 30 L 58.4 40.5 L 51.6 48 Q 35 49.5 17.5 48 L 11 41 L 11 30 L 14.4 24 L 11.2 21.6 L 11.2 15.5 Z",
    patches: [
      { color: "headDark", path: "M 11 15 L 16 8 L 29 21 L 25 24 L 18 21 L 17 40 L 14 44 L 11 40 Z" },
      { color: "headDark", path: "M 41 20 L 53 8 L 58 17 L 55 25 L 57 39 L 53 44 L 51 23 Z" },
      { color: "headLight", path: "M 28 34.4 L 40 34.4 L 43 38 L 42 40.8 L 27.2 40.8 L 26.5 37.5 Z" },
      { color: "headDark", path: "M 20 21 L 26 17.5 L 35 19 L 44 21 L 43 24 L 36 22 L 30 25 L 25 22 Z" },
      { color: "mark", path: "M 19.5 21 L 25 18 L 34 18.8 L 43 21 L 40 23 L 36.5 21.5 L 32 26.4 L 29 23 L 24.5 24 L 26 20.5 Z" },
      { color: "headDark", path: "M 17 44.2 Q 34 46 53 44.2 L 52 49.5 L 17 49.5 Z" },
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
