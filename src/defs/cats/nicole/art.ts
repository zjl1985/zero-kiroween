/** Nicole's look: cream body, plum cape, moon-violet accents, fold-moon fields. */
import type { CatArt } from "../../../render/art-registry.js";
import { drawOrbitStar, drawSkillEffect, ring, star } from "../../../render/combat-fx.js";
import { drawCraftCat } from "../../../render/craft-cat.js";
import { drawPaperPortrait, PAPER_FACE_OUTLINE } from "../../../render/paper-face.js";
import { glow as light } from "../../../render/paper-material.js";
import { ellipse, line, polygon } from "../../../render/pixel-art.js";
import { NICOLE_STATS } from "./stats.js";

export const NICOLE_ART: CatArt = {
  id: "nicole",
  face: {
    outline: PAPER_FACE_OUTLINE,
    patches: [
      { color: "headDark", path: `M 15 16.4 Q 19.9 15.1 24.3 17.1 L 29.5 19.3 Q 31.8 20.7 31.3 24.5
        L 29.7 25.4 Q 28.6 22.2 26.6 22.6 Q 23.4 22.7 21.4 26.1 L 18.9 25.5
        L 17.5 27.5 L 15 23.1 L 16.3 20.3 Z` },
      { color: "headDark", path: "M 34 19.1 Q 35.6 18.8 37 19.4 L 36.4 24.7 L 34.6 25 Z" },
      // A heavier temple lock on one side, with the pale cheek still showing below it.
      { color: "headDark", path: `M 40 19.7 Q 43.1 17 48.6 16.2 L 53.4 18.1 L 54.8 22.7 L 53 25.1
        Q 56.2 31.5 54 36.8 L 51.4 40 Q 52.4 35.5 48.9 31.8 Q 47.5 27.7 43.2 27.2
        Q 40.3 25.6 40 19.7 Z` },
      { color: "headLight", path: "M 20.4 25.7 Q 22 24.4 23.5 22.7 L 25.1 23.2 L 24 24.7 L 26.3 25.9 Q 23.3 26.5 20.4 25.7 Z" },
    ],
  },
  body: {
    rim: "#cbbfae",
    tail: "#a98e77",
    paw: "#ceb28f",
    pawEdge: "#ead4af",
    cape: "#74536f",
    capeEdge: "#a77d83",
    capeFold: "#4c354f",
    body: "#e0d1b8",
    bodyEdge: "#f0dec1",
    bib: "#f3e8ce",
    belt: "#79556b",
    arm: "#c6b498",
    tailoring: "bell-coat",
    accessory: "moon-satchel",
    lantern: "petal",
    lining: "#b58a9d",
    trim: "#e2c8b0",
    metal: "#e4d2a2",
  },
  colors: {
    hud: "#c9b2f0",
    tone: "#7d64b8",
    cardPaper: "#3e3756",
    cardInk: "#cdb8f2",
    icon: "#c6b1ec",
    levelUp: "#c9b6f0",
    evolve: "#efe0b4",
  },
  draw(ctx, pose) {
    drawCraftCat(ctx, pose, NICOLE_ART.body);
  },
  skillPreview(ctx, pose) {
    drawSkillEffect(ctx, { kind: "fold", x: pose.x, y: pose.y - 16, life: 0.5 });
    NICOLE_ART.draw(ctx, { ...pose, dashing: false });
  },
  portrait(ctx, pose, scale) {
    drawPaperPortrait(ctx, pose, scale, NICOLE_ART.body.rim);
  },
  heroAura(ctx, x, y, time) {
    const color = "#b39ad9";
    light(ctx, x, y, 100, color, 0.14, 0.35);
    ring(ctx, x, y, 55, color, 0.28);
    for (let i = 0; i < NICOLE_STATS.orbitCount; i++) {
      const a = time * 1.3 + (i * Math.PI * 2) / NICOLE_STATS.orbitCount;
      drawOrbitStar(ctx, x + Math.cos(a) * 65, y + Math.sin(a) * 28, time, i);
    }
  },
  skillIcon(ctx, kind) {
    const color = NICOLE_ART.colors.icon;
    if (kind === "passive") {
      polygon(
        ctx,
        [
          [16, 4],
          [27, 9],
          [25, 20],
          [16, 29],
          [7, 20],
          [5, 9],
        ],
        "#64567a",
      );
      line(ctx, 16, 4, 27, 9, color);
      line(ctx, 27, 9, 25, 20, color);
      line(ctx, 25, 20, 16, 29, color);
      line(ctx, 16, 29, 7, 20, color);
      line(ctx, 7, 20, 5, 9, color);
      line(ctx, 5, 9, 16, 4, color);
      star(ctx, 16, 15, 6, color);
      return;
    }
    ring(ctx, 16, 16, 11, color, kind === "active" ? 0.7 : 1);
    star(ctx, 24, 9, 5, color);
    star(ctx, 7, 23, 4, color);
    if (kind === "active") ring(ctx, 16, 16, 6, "#8d80b2", 0.7);
  },
  /** Fold-moon fields: a matte violet sheet with sparse markers along its edge. */
  ground(ctx, state) {
    for (const f of state.fields) {
      const radius = f.radius ?? NICOLE_STATS.fieldRadius,
        remaining = f.life / (f.duration ?? NICOLE_STATS.fieldDuration);
      ctx.save();
      const fade = Math.min(1, f.life * 3);
      ctx.globalAlpha *= fade * 0.13;
      ellipse(ctx, f.x, f.y, radius, radius, "#9c84c2");
      ctx.globalAlpha = fade * 0.68;
      ring(ctx, f.x, f.y, radius, "#b5a4d0", 1, remaining);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        star(ctx, f.x + Math.cos(a) * radius, f.y + Math.sin(a) * radius, 2.6, "#b3a7d6", a);
      }
      ctx.restore();
    }
  },
  status: (state) => (state.player.rescueUsed ? "hud.rescue_used" : "hud.rescue_ready"),
};
