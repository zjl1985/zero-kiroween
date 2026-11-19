/** Nicole's look: a white tee, blue jeans, moon-violet accents and fold-moon fields. */
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
    // A small inset leaves the chin's cut edge visible between the side locks.
    stock: `
      M 16 22.7 Q 21.5 19.1 29.3 20.1 Q 35 19.4 40.6 20.1 Q 48.5 19 53.4 23
      L 54.6 24.1 Q 57.1 28.3 57.9 32.7 L 58.5 38.6 Q 58.7 41.1 55.45 42.45
      L 52.15 45.9 Q 50.55 47.55 48.35 47.55 L 21.35 47.55 Q 19.05 47.55 17.7 45.93
      L 14.45 42.43 Q 11.2 41.07 11.1 38.6 L 11.53 32.9 Q 12.6 27.8 14.7 24.1 Z`,
    patches: [
      // One crown cut sweeps out from the part and continues into both side locks.
      { color: "headDark", path: `
        M 15 20.6 Q 20.5 18.4 26.6 17.6 Q 34.4 16.6 42.3 17.6 Q 50.2 18 54.8 22.7 L 54.7 24.1
        Q 58.9 28.3 60.5 34.6 L 60.8 39.2 Q 60.9 42 57.5 43.3 Q 55.5 44.4 52.55 44.7
        Q 53.5 42.6 53.2 40.25 Q 51.8 42.35 49.7 42.75 Q 51.75 39.1 50.9 36.4
        Q 49.7 31.4 43.1 27.95 Q 37.55 25.65 35.05 23.4 Q 33.5 24.45 30.5 24.7
        Q 25.95 24.75 22.25 26.05 Q 19.15 27.1 17.5 28.8
        Q 15.9 30.9 16.8 35.7 Q 16.7 39.9 19 42 Q 17.3 42.05 15.8 41.25
        L 16.6 43.5 Q 13.1 42.05 10.65 40.1 L 9.8 36.3 Q 10.1 29.7 13.85 23.4 Z` },
      { color: "head", path: "M 34.55 19.45 Q 34.15 21.45 34.37 23.8 L 35.12 23.5 Q 34.97 21.5 35.45 19.45 Z" },
      { color: "headLight", path: "M 20.9 27.8 Q 22.9 26.35 24.15 26.5 L 25.1 25.9 L 24.6 27.05 L 26.05 27.65 Q 23.6 28.5 20.9 27.8 Z" },
    ],
  },
  body: {
    rim: "#cbbfae",
    tail: "#a98e77",
    paw: "#ceb28f",
    pawEdge: "#ead4af",
    body: "#f6f1e7",
    bodyEdge: "#fffdf6",
    arm: "#d3b69b",
    fold: "#576174",
    tailoring: "tee-and-jeans",
    denim: "#547da2",
    denimEdge: "#a4b9cb",
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
