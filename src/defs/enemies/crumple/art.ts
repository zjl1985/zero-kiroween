import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { hash, mix, path, type Ctx, type Point } from "../../../render/paper-material.js";
import { crease, flatLayer, PAPER_LIGHT } from "../../../render/paper-kit.js";
import { paperFleck } from "../../../render/craft-combat.js";
import type { EnemyState } from "../../../game/types.js";
import { enemyRadius } from "../../../game/sim.js";

const SHADE = "#8f7f6d", LIT = "#fbf1db";
/** The moon as a 3D direction: top-right and toward the viewer. */
const L3 = (() => {
  const z = 0.75, n = Math.hypot(PAPER_LIGHT.dirX, PAPER_LIGHT.dirY, z);
  return [PAPER_LIGHT.dirX / n, PAPER_LIGHT.dirY / n, z / n] as const;
})();

/**
 * A crumpled sheet: a lumpy silhouette triangulated into facets around an
 * inner ring. Each facet is shaded by where it sits on the ball relative to
 * the moon, nudged by its own crumple tilt; creases radiate from the hubs.
 */
function paintCrumple(c: Ctx, v: number): void {
  const R = 18, rim: Point[] = [], inner: Point[] = [], n = 7;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + v * 0.3,
      rr = R * (0.84 + hash(v * 13 + i) * 0.22);
    rim.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.95]);
  }
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2 + v * 0.3 + (hash(v * 7 + i) - 0.5) * 0.5,
      rr = R * (0.42 + hash(v * 5 + i) * 0.2);
    inner.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const hub: Point = [(hash(v + 50) - 0.5) * 5, (hash(v + 51) - 0.5) * 5],
    cut = path(rim);
  flatLayer(c, { shape: cut, color: "#d9cab0", rim: "#fff6df", texture: 0.5, lift: 1.3, thickness: 1.4 });
  const facets: Point[][] = [];
  for (let k = 0; k < n; k++) {
    const i0 = inner[k]!, i1 = inner[(k + 1) % n]!,
      r0 = rim[(2 * k + 1) % (n * 2)]!, r1 = rim[(2 * k + 2) % (n * 2)]!, r2 = rim[(2 * k + 3) % (n * 2)]!;
    facets.push([hub, i0, i1], [i0, r0, r1], [i0, r1, i1], [i1, r1, r2]);
  }
  c.save();
  c.clip(cut);
  facets.forEach((f, i) => {
    const mx = (f[0]![0] + f[1]![0] + f[2]![0]) / 3 / R,
      my = (f[0]![1] + f[1]![1] + f[2]![1]) / 3 / R,
      mz = Math.sqrt(Math.max(0.05, 1 - mx * mx - my * my)),
      // A crumpled facet tilts away from the smooth ball by its own amount.
      tilt = (hash(v * 101 + i * 17) - 0.5) * 0.7,
      lit = Math.max(0, Math.min(1, 0.5 + 0.55 * (mx * L3[0] + my * L3[1] + mz * L3[2] - 0.45) + tilt));
    c.fillStyle = mix(SHADE, LIT, lit);
    // Slightly overgrown triangles close the hairline gaps between facets.
    c.fill(path(f.map(([x, y]) => [x * 1.02, y * 1.02] as Point)));
  });
  c.restore();
  // Creases radiate from the hub and run along the sharpest ridges.
  inner.forEach(([x, y], i) => {
    crease(c, hub[0], hub[1], x, y, 0.75);
    const r = rim[(2 * i + 2) % (n * 2)]!;
    crease(c, x, y, r[0] * 0.95, r[1] * 0.95, i % 2 ? 0.45 : 0.7);
  });
  // A torn corner of the sheet still sticks out of the ball.
  const tip = rim[(v * 3 + 2) % (n * 2)]!, ang = Math.atan2(tip[1], tip[0]);
  flatLayer(c, {
    shape: path([[tip[0] - Math.sin(ang) * 3.5, tip[1] + Math.cos(ang) * 3.5], [tip[0] + Math.cos(ang) * 5, tip[1] + Math.sin(ang) * 5], [tip[0] + Math.sin(ang) * 3, tip[1] - Math.cos(ang) * 3]]),
    color: "#ede1c8", rim: "#fff8e6", lift: 0.6, texture: 0.3, thickness: 0.6,
  });
}

/** Three finite crumpled balls; the ball bounces and wobbles but its light never rotates. */
function drawCrumple(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#b9a98e")) return;
  const r = enemyRadius(e) * 1.05, v = Math.abs(e.id) % 3,
    hop = Math.abs(Math.sin(time * 4.2 + e.id)),
    cy = e.y - r * 0.95 - hop * 2.5;
  enemyShadow(ctx, e.x, e.y, r * (0.95 - hop * 0.08), r * 0.32);
  ctx.save();
  ctx.translate(e.x, cy);
  ctx.rotate(Math.sin(time * 2.1 + e.id * 1.9) * 0.12);
  ctx.scale(1 + (1 - hop) * 0.04, 1 - (1 - hop) * 0.05);
  enemyPart(`crumple:${v}`, 60, 60, (c) => paintCrumple(c, v)).draw(ctx, { x: 0, y: 0, scale: r / 18 });
  ctx.restore();
  googly(ctx, e.x - r * 0.3, cy - r * 0.12, 3.1, look, time, e.id);
  googly(ctx, e.x + r * 0.3, cy - r * 0.18, 2.8, look, time, e.id + 1);
  hpStrip(ctx, e, e.y + 5, r * 1.6);
}
export const CRUMPLE_ART: EnemyArt = {
  id: "crumple", draw: drawCrumple,
  previewBounds: { l: -23, r: 23, t: -32, b: 8 }, crownY: -40,
  dissolve: { flakes: ["#e8dcc4", "#d9c9ab", "#f2e8d4", "#b9a582"], count: 14, start: 0.35, uncrumple: true },
  effects: {
    crumple(ctx, e, { ease }) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, r = 6 + ease * 24;
        paperFleck(ctx, e.x + Math.cos(a) * r, e.y - 12 + Math.sin(a) * r * 0.6 - ease * 6, 3, "#e3d6bd", a + ease);
      }
    },
  },
};
