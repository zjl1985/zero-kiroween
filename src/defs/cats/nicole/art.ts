/** Nicole's look: cream body, plum cape, moon-violet accents, fold-moon fields. */
import type { CatArt } from "../../../render/art-registry.js";
import { drawOrbitStar, drawSkillEffect, ring, star } from "../../../render/combat-fx.js";
import { drawCraftCat } from "../../../render/craft-cat.js";
import { drawPaperPortrait } from "../../../render/paper-face.js";
import { glow as light } from "../../../render/paper-material.js";
import { ellipse, line, polygon, rect } from "../../../render/pixel-art.js";
import { NICOLE_STATS } from "./stats.js";

export const NICOLE_ART: CatArt = {
  id: "nicole",
  face: {
    outline: "M 13.6 13.6 L 13.6 8 Q 13.6 7.2 14.5 7.2 L 19 7.2 L 29.6 20 L 42.4 20 L 49.6 7.2 L 54.4 7.2 Q 55.2 7.2 55.2 8 L 55.2 13.6 L 58.4 16 L 57.6 22 L 54.4 24 L 57.8 30 L 58.4 40.5 L 51.6 48 Q 35 49.5 17.5 48 L 11 41 L 11 30 L 14.4 24 L 11.2 21.6 L 11.2 15.5 Z",
    patches: [
      { color: "headDark", path: "M 11 15 L 16 8 L 29 21 L 25 24 L 21 26 L 20 30 L 17 30 L 17 41 L 19 46 L 14 44 L 11 40 Z" },
      { color: "headDark", path: "M 40.8 20 L 53 8 L 58 16 L 55.5 25 L 58 34 L 56 45 L 51 49 L 47 47 L 49 40 L 46 31 L 43 27 L 43 22 Z" },
      { color: "headLight", path: "M 28 34.4 L 40 34.4 L 43 38 L 42 40.8 L 27.2 40.8 L 26.5 37.5 Z" },
      { color: "white", path: "M 26 43.5 L 31 43.5 L 29 46.5 L 34 48 L 23 48 L 24 45 Z" },
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
  /** Fold-moon fields: a soft violet pool with a countdown ring and paper stars. */
  ground(ctx, state) {
    for (const f of state.fields) {
      const radius = f.radius ?? NICOLE_STATS.fieldRadius,
        remaining = f.life / (f.duration ?? NICOLE_STATS.fieldDuration);
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life * 3);
      light(ctx, f.x, f.y, radius + 22, "#7772c6", 0.13, 0.75);
      ctx.globalAlpha *= 0.065;
      ellipse(ctx, f.x, f.y, radius, radius, "#b49ee9");
      ctx.globalAlpha = Math.min(1, f.life * 3);
      ring(ctx, f.x, f.y, radius, "#80769e");
      ring(ctx, f.x, f.y, radius - 4, "#c0a8e5", 1, remaining);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          x = f.x + Math.cos(a) * (radius - 10),
          y = f.y + Math.sin(a) * (radius - 10);
        star(ctx, x, y, 3, "#b3a7d6", a);
      }
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + state.elapsed * 0.45,
          r = 20 + i * 6;
        rect(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 1, 2, "#c8bcdf");
      }
      ctx.restore();
    }
  },
  status: (state) => (state.player.rescueUsed ? "hud.rescue_used" : "hud.rescue_ready"),
};
