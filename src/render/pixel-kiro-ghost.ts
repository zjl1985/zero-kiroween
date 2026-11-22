/** A single connected cloth silhouette. The enclosing enemy sprite owns caching. */
import type { Ctx } from "./paper-material.js";

type Row = readonly [offset: number, pixels: string];
// Each cell is two native world pixels. The two hems travel sideways while the
// face remains readable: this is a billowing sheet, not a stretched round blob.
const POSES: readonly (readonly Row[])[] = [
  [
    [9, "#####"],
    [7, "##HHHHH##"],
    [6, "#HHLLLLLLS#"],
    [5, "#HLLLLLLLLSS#"],
    [4, "#HLLLLLLLLLSSS#"],
    [4, "#LLLEELLLEELSS#"],
    [4, "#LLLEELLLEELSS#"],
    [3, "#HLLLEELLLEELSSS#"],
    [3, "#HLLLLLLLLLLSSVV#"],
    [2, "#HLLLLLLSSLLSSVVV#"],
    [1, "#HLLLLLSSLLLSSVVVV#"],
    [0, "#HLLLLSSLLLLSSVVVVV#"],
    [0, "#HLLLSSLLLLSSSVVVV#"],
    [1, "#HLLSSLLLLLSSVVVV#"],
    [2, "#HLSSLLHLLSSVVVV#"],
    [3, "#HSSLLHHLSS#VVV#"],
    [4, "#SLLHH#LS#..###"],
    [4, "#HHH##.##"],
    [5, "###"],
  ],
  [
    [8, "#####"],
    [6, "##HHHHH##"],
    [5, "#HHLLLLLLS#"],
    [4, "#HLLLLLLLLSS#"],
    [4, "#HLLLLLLLLLSS#"],
    [4, "#LLLEELLLEELSS#"],
    [4, "#LLLEELLLEELSSS#"],
    [4, "#LLLEELLLEELSSVV#"],
    [4, "#HLLLLLLLLLLSSVVV#"],
    [4, "#HLLLLLSSLLLSSVVVV#"],
    [4, "#HLLLLLLSSLLSSVVVV#"],
    [3, "#HLLLLLLLSSLLSSVVVV#"],
    [3, "#HLLLLLLHSSLLLSSVVV#"],
    [3, "#HLLLLLHHSSLLLSSVVV#"],
    [4, "#HLLLHH#SSLLLHSSVV#"],
    [5, "#HHH##.#SLLLHHSSV#"],
    [6, "###....#HLLHHSSV#"],
    [13, "#HHHSSV#"],
    [14, "######"],
  ],
];

// Wash is quantized by the caller to 0 / .5 / 1. Every stage keeps solid eye
// contrast and a distinct underside; no transparent fades or colour blending.
const PALETTES: readonly Readonly<Record<string, string>>[] = [
  { "#": "#514363", H: "#fff8e9", L: "#eee9e3", S: "#b9a9cb", V: "#82709f", E: "#352b4a" },
  { "#": "#625d69", H: "#f7f0df", L: "#dfdcd5", S: "#b6b1bb", V: "#8f879c", E: "#3d3948" },
  { "#": "#666960", H: "#eee9d6", L: "#d9d8c8", S: "#b6b9ab", V: "#8e978b", E: "#3b453e" },
];

/** Body only, within [-23,23] × [-42,-4], above the caller's ground shadow.
 * Kiro has no wind-up: attack never adds a false telegraph or changes its pose.
 */
export function drawPixelKiroGhost(ctx: Ctx, frame: number, _attack: boolean, wash: number): void {
  const rows = POSES[Math.abs(Math.trunc(frame)) % 2]!;
  const palette = PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0]!;
  ctx.save();
  for (let row = 0; row < rows.length; row++) {
    const [offset, pixels] = rows[row]!;
    for (let col = 0; col < pixels.length; col++) {
      const color = palette[pixels[col]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(-23 + (offset + col) * 2, -42 + row * 2, 2, 2);
      // A one-pixel pale rim resolves the folded leading edge without adding
      // detached sparkle pixels. Face holes remain plain, legible dark cuts.
      if (pixels[col] === "H" && pixels[col + 1] === "S") {
        ctx.fillStyle = palette.L!;
        ctx.fillRect(-22 + (offset + col) * 2, -42 + row * 2, 1, 2);
      }
    }
  }
  ctx.restore();
}
