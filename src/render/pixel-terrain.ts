/** Native terrain pixels, anchored to the world lattice before chunk caching. */
import type { BiomeArt } from "./art-registry.js";
import { hash, type Ctx } from "./paper-material.js";
export const TERRAIN_PIXEL = 2;
export type PixelTerrainKind = "ruled" | "furrow" | "torn" | "wave" | "scallop";
export const TERRAIN_PALETTE = {
  ruled: ["#46505a", "#67716c", "#92977c"],
  furrow: ["#51433b", "#856649", "#b58b56"],
  torn: ["#373d50", "#56615c", "#849477"],
  wave: ["#324b56", "#52786d", "#81a58a"],
  scallop: ["#354e48", "#5c805a", "#92ad6c"],
} as const;
export function terrainPalette(kind: string): readonly [string, string, string] {
  return TERRAIN_PALETTE[kind as PixelTerrainKind] ?? TERRAIN_PALETTE.scallop;
}
export function pixelRect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, Math.max(2, Math.round(w / 2) * 2), Math.max(2, Math.round(h / 2) * 2));
}
/** One authored cluster: rocks, furrows, reeds or little grass fans, never uniform noise. */
export function pixelTerrainCluster(ctx: Ctx, x: number, y: number, seed: number, kind: string): void {
  const [dark, mid, light] = terrainPalette(kind);
  const q = (dx: number, dy: number, w: number, h: number, c: string) => pixelRect(ctx, x + dx, y + dy, w, h, c);
  if (kind === "ruled") {
    for (let n = 0; n < 3; n++) {
      const dx = n * 12 - 16, dy = (n % 2) * 6;
      q(dx, dy + 3, 12, 6, dark); q(dx, dy, 10, 6, mid); q(dx + 2, dy, 8, 2, light);
    }
  } else if (kind === "furrow") {
    for (let n = 0; n < 3; n++) {
      q(-18, n * 8, 34, 4, dark); q(-16, n * 8 - 2, 30, 2, light);
      q(-12 + n * 8, n * 8 - 6, 2, 6, "#638454");
      q(-14 + n * 8, n * 8 - 4, 6, 2, "#91ab63");
    }
  } else if (kind === "wave") {
    for (let n = 0; n < 4; n++) {
      const dx = n * 4 - 8, h = 6 + Math.floor(hash(seed + n) * 4) * 2;
      q(dx + 2, 2, 4, 2, dark); q(dx, -h, 2, h + 2, mid); q(dx, -h, 2, 4, light);
      if (n % 2) q(dx, -h - 4, 2, 4, "#bd9d67");
    }
  } else {
    for (let n = 0; n < 4; n++) {
      const dx = n * 6 - 12, dy = Math.floor(hash(seed + n * 3) * 3) * 2;
      q(dx - 2, dy + 2, 8, 2, dark); q(dx, dy - 4, 2, 6, mid); q(dx - 2, dy - 2, 2, 4, light);
      q(dx + 2, dy - 2, 2, 4, mid);
    }
    if (kind === "torn") {
      q(-7, 5, 10, 4, dark); q(-7, 3, 8, 4, mid); q(-5, 3, 6, 2, light);
    } else if (hash(seed + 31) > 0.45) {
      q(10, -2, 2, 4, "#b0bb76"); q(8, -4, 6, 2, "#e1c997");
    }
  }
}

/** Reuse biome identity/placement, replace every flat detail painter with native pixels. */
export function pixelBiomeArt(art: BiomeArt): BiomeArt {
  return {
    ...art,
    patch(ctx, x, y, r, seed) {
      const kind = art.sheet.seam, [dark, mid, light] = terrainPalette(kind),
        count = Math.max(4, Math.min(9, Math.round(r / 10)));
      ctx.save();
      // Group motifs in staggered rows with open space, rather than noise across a disc.
      for (let i = 0; i < count; i++) {
        const column = i % 3, row = Math.floor(i / 3),
          px = x + (column - 1) * r * 0.54 + (row % 2) * 8,
          py = y + (row - 1) * r * 0.25 + (hash(seed + i * 17) - 0.5) * 6 + (kind === "wave" ? 6 : 0);
        if (i === 0 || hash(seed + i * 37) > 0.14) pixelTerrainCluster(ctx, px, py, seed + i * 131, kind);
      }
      if (kind === "ruled") {
        // Recessed drain: dark cavity, raised stone surround, sparse metal bars.
        pixelRect(ctx, x + 8, y - 8, 26, 18, dark);
        pixelRect(ctx, x + 8, y - 10, 26, 4, light);
        pixelRect(ctx, x + 8, y - 6, 4, 12, mid);
        pixelRect(ctx, x + 30, y - 6, 4, 12, mid);
        for (let i = 0; i < 4; i++) pixelRect(ctx, x + 14 + i * 4, y - 6, 2, 12, light);
        pixelRect(ctx, x + 8, y + 6, 26, 4, mid);
      } else if (kind === "torn") {
        // A small broken graveyard flag with moss creeping along its shadowed foot.
        pixelRect(ctx, x + 4, y + 2, 22, 10, dark);
        pixelRect(ctx, x + 6, y - 2, 18, 10, mid);
        pixelRect(ctx, x + 10, y - 4, 12, 4, light);
        pixelRect(ctx, x + 12, y + 6, 16, 4, "#667c59");
      } else if (kind === "furrow") {
        // Fallen squash/gourd cluster, volume built from stepped three-tone pixels.
        for (let i = 0; i < 2; i++) {
          const px = x - 8 + i * 16, py = y + i * 4;
          pixelRect(ctx, px - 6, py + 2, 14, 8, "#674b3f");
          pixelRect(ctx, px - 6, py, 12, 8, "#c1844c");
          pixelRect(ctx, px - 4, py - 2, 8, 4, "#e1ac61");
          pixelRect(ctx, px, py - 4, 2, 4, "#708450");
        }
      } else if (kind === "scallop") {
        pixelRect(ctx, x - 4, y - 2, 2, 8, "#8ba86c");
        pixelRect(ctx, x - 8, y - 4, 10, 2, "#d9c2ad");
        pixelRect(ctx, x - 4, y - 6, 2, 6, "#efd9ba");
      }
      ctx.restore();
    },
  };
}
