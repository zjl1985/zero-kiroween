import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { flatCut } from "../../../render/paper-kit.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

export const MOON_HILL_ART: LandmarkArt = {
  id: "moon-hill",
  ink: "#cdb8f2",
  base(ctx, l) {
    // A grass mound in three tiers, each tier's lower edge fringe-cut into blades.
    fringedMound(ctx, l.x, l.y, [[180, 98, 10, "#4f5747"], [128, 70, -2, "#5d6553"], [76, 42, -10, "#6a7360"]], "#7c8763", l.seed);
  },
  ground(ctx, l) {
    // A pale moon-paper disc on the summit, flat (no glow).
    flatCut(ctx, blob(l.x, l.y - 12, 34, 14, l.seed + 5, 0.05), { color: "#9ba3ae", edge: "#e6eef4", thickness: 0.8, lift: 0.5 });
    flatCut(ctx, blob(l.x + 6, l.y - 14, 22, 8, l.seed + 6, 0.05), { color: "#6a7360", thickness: 0.5, lift: 0 });
  },
};
