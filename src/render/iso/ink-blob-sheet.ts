/**
 * The ink blob as an isometric pixel sprite (plan step 6.5, docs/iso-art-spec.md
 * sections 3 to 6). A soft ink dome over a 2:1 puddle on the ground plane:
 * SE (face, amber eyes) and NE (glossy back, one drip) are painted, SW / NW
 * are the bake-time mirrors. Idle 2 frames, move 4 (squash and stretch,
 * leaning into the step), hurt 1. Opaque rows 28 to 32 px including the
 * 1 px sel-out, inside the spec's 28 to 48 for normal enemies.
 *
 * The frame palette carries the wash step and the attack squint
 * (isoWashPalette: `<wash index>` or `<wash index>a`), so the cache stays finite: three wash
 * palettes from pixel-ink-blob.ts (painted 0, fading 0.5, colourless 1).
 */
import { INK_BLOB_PALETTES } from "../pixel-ink-blob.js";
import { hexRgb, type Rgb } from "./palette.js";
import type { IsoAnim, IsoFrameInfo, IsoPixelTarget, IsoSheet } from "./sprite-sheet.js";

export const ISO_INK_BLOB = {
  width: 40,
  height: 36,
  /** Foot pixel: the centre of the puddle on the ground plane. */
  foot: { x: 20, y: 29 },
  walkFrames: 4,
  /** Elite crown seat above the foot (unscaled), clear of the dome top. */
  crownY: -30,
} as const;

function paletteOf(key: string) {
  const index = Math.max(0, Math.min(2, Number.parseInt(key, 10) || 0));
  const p = INK_BLOB_PALETTES[index]!;
  return {
    edge: hexRgb(p.edge), body: hexRgb(p.body), shade: hexRgb(p.shade), plane: hexRgb(p.plane),
    eye: hexRgb(p.eye), mouth: hexRgb(p.mouth), attack: key.endsWith("a"),
  };
}

interface BlobPose {
  /** Dome half width and height above the puddle row. */
  readonly rx: number;
  readonly ry: number;
  /** Top shift toward the facing side (the dome leans into the step). */
  readonly lean: number;
  /** Puddle half width. */
  readonly puddle: number;
  readonly hurt: boolean;
}
const P = (rx: number, ry: number, lean: number, puddle: number, hurt = false): BlobPose => ({ rx, ry, lean, puddle, hurt });
const IDLE = [P(11, 24, 0, 14), P(11.5, 23, 0, 14.5)] as const;
/** Gather, push, stretch, land. */
const MOVE = [P(12, 23, 0, 15), P(10.5, 26, 1, 13), P(10, 27, 2, 13), P(12.5, 22, 1, 15.5)] as const;
const HURT = P(13, 21, -1, 16, true);
function poseOf(anim: IsoAnim, frame: number): BlobPose {
  return anim === "walk" ? MOVE[frame % MOVE.length]! : anim === "idle" ? IDLE[frame % IDLE.length]! : HURT;
}

/** Binary pixel grid with a sel-out pass in the edge colour. */
class Grid {
  readonly px: (Rgb | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.px = new Array<Rgb | null>(w * h).fill(null);
  }
  set(x: number, y: number, c: Rgb): void {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && !!this.px[y * this.w + x];
  }
  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) this.set(x + u, y + v, c);
  }
  outline(edge: Rgb): void {
    const src = this.px.slice();
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && !!src[y * this.w + x];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!src[y * this.w + x] && (on(x, y - 1) || on(x - 1, y) || on(x + 1, y) || on(x, y + 1))) this.px[y * this.w + x] = edge;
  }
  flush(t: IsoPixelTarget): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.px[y * this.w + x];
        if (c) t.set(x, y, c);
      }
  }
}

function paintBlob(g: Grid, info: IsoFrameInfo): void {
  const c = paletteOf(info.palette), p = poseOf(info.anim, info.frame), front = info.dir === "se";
  const fx = ISO_INK_BLOB.foot.x, fy = ISO_INK_BLOB.foot.y;
  const cx = fx + 0.5, base = fy + 0.5, top = base - p.ry;
  // Puddle: a 2:1 ellipse lying on the ground (the floor the dome sits in).
  const pry = p.puddle / 4;
  for (let y = Math.floor(base - pry); y <= Math.ceil(base + pry); y++)
    for (let x = Math.floor(cx - p.puddle); x <= Math.ceil(cx + p.puddle); x++) {
      const u = (x + 0.5 - cx) / p.puddle, v = (y + 0.5 - base) / pry;
      if (u * u + v * v <= 1) g.set(x, y, y + 0.5 > base ? c.shade : c.body);
    }
  // Dome: an upper half ellipse whose top leans toward the step; the lower
  // third flares into the puddle.
  for (let y = Math.floor(top); y <= Math.floor(base); y++) {
    const t = (y + 0.5 - top) / p.ry;
    if (t < 0) continue;
    const shift = p.lean * (1 - t);
    const half = p.rx * Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, t * 1.25)) ** 2)) + Math.max(0, t - 0.7) * 6;
    for (let x = Math.floor(cx + shift - half); x <= Math.ceil(cx + shift + half); x++) {
      const u = (x + 0.5 - cx - shift) / Math.max(half, 0.5);
      if (Math.abs(u) > 1) continue;
      // Moon top right: a broad muted plane on the upper-right shoulder, cool shade low and left.
      const plane = t > 0.12 && t < 0.55 && u > -0.1 && u < 0.75 - t * 0.4;
      const shade = t > 0.8 || u < -0.78;
      g.set(x, y, plane ? c.plane : shade ? c.shade : c.body);
    }
  }
  const row = (t: number) => Math.round(top + p.ry * t);
  if (front) {
    // Face toward the screen, shifted one pixel to the facing side.
    const ey = row(p.hurt ? 0.42 : 0.38), ex = fx + 1 + Math.round(p.lean * 0.5);
    for (const sx of [ex - 6, ex + 2]) {
      if (p.hurt) {
        // Squeezed shut: a short chevron in the eye colour.
        g.rect(sx, ey + 1, 4, 1, c.eye);
        g.set(sx + (sx < ex ? 0 : 3), ey, c.eye);
        g.set(sx + (sx < ex ? 0 : 3), ey + 2, c.eye);
        continue;
      }
      g.rect(sx - 1, ey - 1, 6, 6, c.shade);
      g.rect(sx, ey, 4, 4, c.eye);
      g.rect(sx + 1, ey - 1, 2, 1, c.eye);
      g.rect(sx + (sx < ex ? 2 : 1), ey + 1, 1, 3, c.edge);
      if (c.attack) {
        // Narrowed lids only: the body colour closes the top of each eye.
        g.rect(sx - 1, ey - 1, 6, 2, c.body);
        g.rect(sx + (sx < ex ? 3 : -1), ey + 1, 2, 1, c.body);
      }
    }
    const my = row(p.hurt ? 0.66 : 0.68);
    if (p.hurt) g.rect(ex - 1, my, 3, 2, c.edge);
    else {
      g.rect(ex - 2, my, 2, 1, c.mouth);
      g.rect(ex, my + 1, 2, 1, c.mouth);
      g.rect(ex + 2, my, 2, 1, c.mouth);
    }
  } else {
    // The back: a glossy crest seam and one drip running into the puddle.
    for (let k = 0; k < 4; k++) g.set(fx + 2 + Math.round(p.lean * 0.5), row(0.18 + k * 0.08), c.plane);
    const dx = fx - 6;
    for (let y = row(0.5); y <= Math.floor(base); y++) if (g.has(dx, y)) { g.set(dx, y, c.shade); g.set(dx + 1, y, c.shade); }
  }
  // Two flow tongues joined to the mass at the puddle's rim.
  g.rect(Math.round(cx - p.puddle) + 1, fy - 1, 3, 1, c.body);
  g.rect(Math.round(cx + p.puddle) - 4, fy - 1, 3, 1, c.body);
  g.outline(c.edge);
}

/** The four-direction ink-blob sheet. */
export const INK_BLOB_ISO: IsoSheet = {
  identity: "enemy-ink-blob",
  width: ISO_INK_BLOB.width,
  height: ISO_INK_BLOB.height,
  foot: ISO_INK_BLOB.foot,
  walkFrames: ISO_INK_BLOB.walkFrames,
  paint(px, info) {
    const g = new Grid(px.width, px.height);
    paintBlob(g, info);
    g.flush(px);
  },
};
