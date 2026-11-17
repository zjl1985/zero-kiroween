/** Zero's look: dark cape and body, warm gold accents, empower ring, dash symbols. */
import type { CatArt } from "../../../render/art-registry.js";
import { ring, star } from "../../../render/combat-fx.js";
import { drawCraftCat } from "../../../render/craft-cat.js";
import { drawOfficialHead } from "../../../render/layout.js";
import { glow as light } from "../../../render/paper-material.js";
import { line, rect } from "../../../render/pixel-art.js";
import { ZERO_STATS } from "./stats.js";

export const ZERO_ART: CatArt = {
  id: "zero",
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
    chain: true,
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
  portrait(ctx, pose, scale) {
    drawOfficialHead(ctx, pose, { scale });
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
