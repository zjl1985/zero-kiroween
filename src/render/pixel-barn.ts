import type { Ctx } from "./paper-material.js";
import type { PixelStackModel } from "./pixel-stack.js";

const EAVE = 26;
const KNEE = 35;
const RIDGE = 44;
const WALL_HALF = 20;
const WALL_DEPTH = 18;

// Four orthographic masks, on the same half-unit lattice. Front and back
// intentionally share the gambrel silhouette. Their boards and doors differ.
function topHalf(y: number): number {
  if (y >= 22 || y < -22) return y >= 22 && y < 23 ? 11 : 0;
  return 23.5;
}
function sideSpan(z: number): readonly [number, number] {
  if (z < 1.5) return [-20, 23];
  if (z < 3) return [-20, 20];
  if (z < EAVE) return [-WALL_DEPTH, WALL_DEPTH];
  if (z <= RIDGE) return [-22, 22];
  return [-5, 4];
}
function gableHalf(z: number): number {
  if (z < 3) return 22;
  if (z < EAVE) return WALL_HALF;
  if (z <= KNEE) return 23.5 - (z - EAVE) * 6 / (KNEE - EAVE);
  if (z <= RIDGE) return 17.5 - (z - KNEE) * 16 / (RIDGE - KNEE);
  return 3;
}

function foundation(x: number, y: number, z: number): string {
  if (y >= 20) return z < .5 ? "#6f7463" : "#aaa084";
  if (z < 1) return "#3f4e45";
  if (z >= 2.5) return "#a09881";
  return Math.floor((x + 22) / 8) % 2 ? "#888977" : "#94927e";
}

function frontBoards(x: number, z: number): string {
  const ax = Math.abs(x);
  if (z >= 28 && z < 36 && ax <= 5) {
    if (ax >= 3.5 || z < 29 || z >= 35) return "#ddc5a0";
    if (ax < .75 || z === 32) return "#a4957b";
    return z < 32 ? "#394c52" : "#516367";
  }
  if (z < 23 && ax <= 12) {
    if (ax >= 10.5 || z < 5 || z >= 21.5) return "#d4b58a";
    if (ax < .5) return "#50383b";
    if (z >= 12 && z < 13.5 && ax < 2.5) return "#c29260";
    const brace = (z - 5) / 16.5 * 19 - 9.5;
    if (Math.abs(x - brace) < .85 || Math.abs(x + brace) < .85) return "#b98c67";
    return Math.floor((x + 12) / 3.5) % 2 ? "#835146" : "#744641";
  }
  return Math.floor((x + 24) / 3) % 2 ? "#a76851" : "#ab6c54";
}

function rearBoards(x: number, z: number): string {
  const ax = Math.abs(x);
  if (ax < 6.5 && z >= 9 && z < 20) {
    if (ax >= 5 || z < 10.5 || z >= 18.5) return "#af9377";
    if (ax < .5 || z === 14) return "#a07c62";
    return "#554140";
  }
  if (ax < 3 && z >= 30 && z < 36) return z === 30 || ax >= 2.5 ? "#bda182" : "#634c4a";
  return Math.floor((x + 24) / 3) % 2 ? "#855347" : "#8c594a";
}

function sideBoards(x: number, y: number, z: number): string {
  if (z >= 11 && z < 20.5) {
    const window = Math.min(Math.abs(y + 9), Math.abs(y - 7));
    if (window < 4) {
      if (window >= 3 || z < 12.5 || z >= 19) return "#bea787";
      if (window < .75 || z === 16) return "#9d9278";
      return z < 16 ? "#42565a" : "#5d6a64";
    }
  }
  const board = Math.floor((y + 18) / 3) % 2;
  return x < 0 ? (board ? "#87564a" : "#8e594b") : (board ? "#a56750" : "#ad6d53");
}

function barnColor(x: number, y: number, z: number, half: number): string | undefined {
  if (z < 3) return foundation(x, y, z);
  if (z > RIDGE) {
    if (z >= 46.5) return y < -3.5 ? "#445658" : "#798582";
    if (Math.abs(x) < 1.5 && y >= 3.5 && z >= 45) return "#4d463f";
    return x < -1 ? "#795751" : "#af7d5d";
  }
  const ax = Math.abs(x), ay = Math.abs(y);
  const pastGable = y >= WALL_DEPTH || y < -WALL_DEPTH;
  // Upper rows step inward faster. Overlap their roof material far enough
  // for adjacent sections to hide the siding even from a strict side view.
  const roofSkin = z >= KNEE ? 4 : 2.5;
  // The eaves shelter the recessed gable. A silhouette intersection alone
  // fills this open space, so remove the notches between the roof edges.
  if (z >= 27 && z < 42.5 && pastGable && ax < half - roofSkin) return;
  if (z >= EAVE && (ax >= half - roofSkin || pastGable || z >= 42.5)) {
    if (z >= 42.5) return x < 0 ? "#87928d" : "#647577";
    if (ay >= 21) return y > 0 ? "#a89b81" : "#697574";
    if ((y + 22) % 7 < 1) return x < 0 ? "#697e80" : "#50686e";
    if (z === KNEE || z < 27) return x < 0 ? "#708182" : "#52696f";
    return x < 0 ? (z < KNEE ? "#576e73" : "#63787b") : "#405861";
  }
  if (z < 5 || (z >= 24 && z < EAVE)) return ax >= WALL_HALF - 1 ? "#a48c72" : "#c5a785";
  if (ay >= WALL_DEPTH - 1.5 && ax >= WALL_HALF - 1.5) return y > 0 ? "#dec29a" : "#b0987e";
  if (y >= WALL_DEPTH - 1) return frontBoards(x, z);
  if (y < -WALL_DEPTH + 1) return rearBoards(x, z);
  return sideBoards(x, y, z);
}

/** Intersect silhouettes before applying the face colours. Only the existing
 * atlas bake paints these rows. Live frames stamp the cached projection. */
export function barnModel(): PixelStackModel {
  return {
    id: "scene:barn:gambrel-hull", width: 60, depth: 48, count: 48,
    paint(ctx: Ctx, z: number) {
      const [back, front] = sideSpan(z);
      const gable = Math.round(gableHalf(z) * 2);
      for (let row = back * 2; row < front * 2; row++) {
        const y = row / 2;
        const half = Math.min(Math.round(topHalf(y) * 2), gable);
        // The footprint's central threshold belongs to the front elevation.
        const extent = z < 1.5 && y >= 20 ? Math.min(half, 22) : half;
        // Front and back profiles use the same width at this height. Sample
        // their opposing faces independently after this common intersection.
        let start = -extent;
        let color: string | undefined;
        for (let col = start; col <= extent; col++) {
          const next = col < extent ? barnColor(col / 2, y, z, gable / 2) : undefined;
          if (next === color) continue;
          if (color !== undefined) {
            ctx.fillStyle = color;
            ctx.fillRect(start, row, col - start, 1);
          }
          start = col;
          color = next;
        }
      }
    },
  };
}
