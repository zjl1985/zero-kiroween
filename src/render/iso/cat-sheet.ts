/**
 * Isometric chosen-cat sprites (plan steps 6.2 / 6.3, docs/iso-art-spec.md
 * sections 3 to 6). One shared body build in four directions: SE and NE are
 * painted here, SW and NW are the bake-time mirrors from sprite-sheet.ts.
 * Idle 2 frames, walk 6, hurt 1. The cat stands 48 px from the feet to the
 * ear tips (50 px with the 1 px sel-out), inside the spec's 44 to 52.
 *
 * Every cat-specific colour and accessory comes from the cat's art file
 * (src/defs/cats/<id>/iso.art.ts), which reads the official head palette and
 * accessories from src/cats/ without changing them. This module names no cat.
 * A worn costume recolours the garments through the frame palette (the
 * costume id) and keeps its old-style accessory layer on top until plan M5.
 */
import type { MascotPalette } from "../../cats/types.js";
import { costumeArtOf, type CatArt, type CatBodyPalette } from "../art-registry.js";
import type { CatPose } from "../layout.js";
import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
import { drawPixelCostumeLayer } from "../pixel-actors.js";
import { hexRgb, rampColour, type Rgb } from "./palette.js";
import { snap } from "./projection.js";
import {
  drawIsoSprite, frameFor, isMirroredDir, isoSpriteFrame,
  type IsoAnim, type IsoDir, type IsoFrameInfo, type IsoPixelTarget, type IsoSheet,
} from "./sprite-sheet.js";

export const ISO_CAT = {
  width: 40,
  height: 56,
  /** Foot pixel: the sel-out row under the soles, on the body's centre column. */
  foot: { x: 20, y: 53 },
  walkFrames: 6,
  /** Opaque rows of the idle frame including the sel-out (feet to ear tips is 48). */
  stand: 50,
  /** Half width used by the actor fire / wet overlays. */
  radius: 13,
  /** Hard contact shadow, offset to the screen lower-left (spec section 5). */
  shadow: { rx: 11, ry: 4, dx: -2, dy: 1, alpha: 0.42 },
  /** Old-style costume layer boxes: chin and body offsets above the foot and scale onto the iso head / torso. */
  costume: {
    head: { dy: -26, kx: 0.36, ky: 0.39 },
    body: { dy: -5, kx: 0.5, ky: 0.72 },
  },
  /** Paper wear marks on the torso, relative to the foot (x mirrors with the frame). */
  wear: { marks: [[-5, -20, 3, 2], [3, -16, 2, 2]], tape: [2, -23, 5, 2] },
} as const;

export interface IsoCatLook {
  /** Stable sprite identity, part of every cache key. */
  readonly identity: string;
  /** Official head palette (read only). */
  readonly palette: MascotPalette;
  /** Official accessories (read only): eyewear and the chain are drawn from these. */
  readonly accessories: readonly string[];
  /** The cat's clothing palette from its art definition. */
  readonly body: CatBodyPalette;
  /** Hair colour role in `palette`, the root colour role and the cut. */
  readonly hair: { readonly color: keyof MascotPalette; readonly root?: keyof MascotPalette; readonly style: "swept" | "long" };
  readonly build: "broad" | "slim";
}

const NIGHT: Rgb = hexRgb(rampColour("ink", 1));
const MOON: Rgb = hexRgb(rampColour("cloth", 4));
const SEL: Rgb = hexRgb(rampColour("ink", 0));
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
/** Cool shadow and warm moonlit step of a colour (spec: hue-shifted, not only darker). */
const dark = (c: Rgb) => mix(c, NIGHT, 0.38);
const lit = (c: Rgb) => mix(c, MOON, 0.32);
const selOut = (c: Rgb) => mix(c, SEL, 0.72);

/** A small private pixel buffer, so the sel-out pass can read what was painted. */
class Grid {
  readonly px: (Rgb | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.px = new Array<Rgb | null>(w * h).fill(null);
  }
  set(x: number, y: number, c: Rgb): void {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  get(x: number, y: number): Rgb | null {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x]! : null;
  }
  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) this.set(x + u, y + v, c);
  }
  /** Filled ellipse over pixel centres; `shade` picks each pixel's colour. */
  ellipse(cx: number, cy: number, rx: number, ry: number, shade: (x: number, y: number) => Rgb): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) this.set(x, y, shade(x, y));
      }
  }
  /** A 2 px brush along integer polyline points. */
  stroke(points: readonly (readonly [number, number])[], c: Rgb, edge: Rgb): void {
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]!, [x1, y1] = points[i]!, n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= n; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / n), y = Math.round(y0 + ((y1 - y0) * s) / n);
        this.set(x, y, c); this.set(x + 1, y, edge); this.set(x, y + 1, c);
      }
    }
  }
  /** 1 px sel-out: each empty pixel touching the figure takes a darker step of its first opaque neighbour. */
  outline(): void {
    const src = this.px.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[y * this.w + x]! : null);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y * this.w + x]) continue;
        const n = at(x, y - 1) ?? at(x - 1, y) ?? at(x + 1, y) ?? at(x, y + 1);
        if (n) this.px[y * this.w + x] = selOut(n);
      }
  }
  flush(t: IsoPixelTarget): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.px[y * this.w + x];
        if (c) t.set(x, y, c);
      }
  }
}

interface Limb { readonly dx: number; readonly dy: number }
interface FramePose {
  /** Torso and head lift (negative is up). */
  readonly bob: number;
  readonly legs: readonly [Limb, Limb];
  /** Arm offsets down (positive) per side. */
  readonly arms: readonly [number, number];
  readonly headDy: number;
  readonly lean: number;
  readonly tail: number;
  readonly hurt: boolean;
}
const STILL: Limb = { dx: 0, dy: 0 };
const pose = (bob: number, l: Limb, r: Limb, arms: [number, number], extra: Partial<FramePose> = {}): FramePose =>
  ({ bob, legs: [l, r], arms, headDy: 0, lean: 0, tail: 0, hurt: false, ...extra });
/** Contact, passing, reach on each side; the body rises one pixel while a foot is in the air. */
const WALK: readonly FramePose[] = [
  pose(0, { dx: -2, dy: 0 }, { dx: 2, dy: 0 }, [1, -1]),
  pose(-1, { dx: -1, dy: -2 }, { dx: 1, dy: 0 }, [0, 0], { tail: 1 }),
  pose(-1, { dx: 1, dy: -1 }, { dx: -1, dy: 0 }, [-1, 1], { tail: 1 }),
  pose(0, { dx: 2, dy: 0 }, { dx: -2, dy: 0 }, [-1, 1]),
  pose(-1, { dx: 1, dy: 0 }, { dx: -1, dy: -2 }, [0, 0]),
  pose(-1, { dx: -1, dy: 0 }, { dx: 1, dy: -1 }, [1, -1]),
];
const IDLE: readonly FramePose[] = [pose(0, STILL, STILL, [0, 0]), pose(0, STILL, STILL, [0, 1], { headDy: 1, tail: 1 })];
const HURT = pose(0, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, [-3, -3], { headDy: 1, lean: -1, tail: 2, hurt: true });
function framePose(anim: IsoAnim, frame: number): FramePose {
  return anim === "walk" ? WALK[frame % WALK.length]! : anim === "idle" ? IDLE[frame % IDLE.length]! : HURT;
}

/** The cat's clothing with a worn costume's garment colours merged on (clothing only). */
function wornBody(body: CatBodyPalette, palette: string): CatBodyPalette {
  const costume = palette ? costumeArtOf(palette) : undefined;
  if (!costume) return body;
  return body.tailoring === "split-coat" ? { ...body, ...costume.outfit.coat } : { ...body, ...costume.outfit.tee };
}

const CX = 20, FEET = 52, TORSO = 28, HEAD = 18;
const HALF: Readonly<Record<IsoCatLook["build"], readonly number[]>> = {
  broad: [7, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8],
  slim: [6, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7],
};

function paintCat(look: IsoCatLook, g: Grid, info: IsoFrameInfo): void {
  const P = look.palette, body = wornBody(look.body, info.palette), front = info.dir === "se", p = framePose(info.anim, info.frame);
  const rgb = (hex: string) => hexRgb(hex);
  const fur = rgb(P.head), furLit = mix(fur, rgb(P.headLight), 0.5), furDark = dark(fur), ink = rgb(P.ink);
  const hair = rgb(P[look.hair.color] ?? P.headDark), hairLit = mix(hair, MOON, 0.42), hairDark = dark(hair);
  const root = look.hair.root ? rgb(P[look.hair.root] ?? P.headDark) : hairDark;
  const coat = body.tailoring === "split-coat";
  const top = TORSO + p.bob, cx = CX + p.lean, half = HALF[look.build];
  const hx = CX + p.lean, hy = HEAD + p.bob + p.headDy;
  const cloth = rgb(body.body), clothLit = rgb(body.bodyEdge), clothDark = coat ? rgb(body.fold) : mix(cloth, rgb(body.fold), 0.28);
  const tail = rgb(body.tail), tw = p.tail;

  const drawTail = () => g.stroke(front
    ? [[CX - 6, top + 14], [CX - 9, top + 13], [CX - 11, top + 11], [CX - 12, top + 8], [CX - 12 + tw, top + 5], [CX - 11 + tw, top + 3]]
    : [[CX - 1, top + 14], [CX - 4, top + 15], [CX - 8, top + 14], [CX - 11, top + 11], [CX - 12, top + 7], [CX - 11 + tw, top + 4]],
  tail, dark(tail));

  // Behind the body: tail (front view), the cape edges and the long hair's back curtain.
  if (front) drawTail();
  if (coat && front) {
    const cape = rgb(body.cape);
    for (let r = 1; r <= 13; r++) g.rect(cx - half[r]! - 2, top + r, 2, 1, r > 10 ? dark(cape) : cape);
    for (let r = 2; r <= 10; r++) g.set(cx + half[r]!, top + r, rgb(body.capeEdge));
  }
  if (look.hair.style === "long" && front) {
    for (let y = hy - 2; y <= hy + 14; y++) g.rect(hx - 12 + (y > hy + 11 ? 1 : 0), y, 3, 1, hairDark);
    for (let y = hy - 2; y <= hy + 17; y++) g.rect(hx + 9, y, y > hy + 14 ? 2 : 4, 1, y > hy + 12 ? hairDark : hair);
  }

  // Legs, then the torso hem covers their tops.
  const legCloth = coat ? cloth : rgb(body.denim), legLit = coat ? clothLit : rgb(body.denimEdge), legDark = coat ? clothDark : dark(legCloth);
  const paw = rgb(body.paw), pawLit = rgb(body.pawEdge);
  p.legs.forEach((limb, i) => {
    const x0 = CX + (i === 0 ? -5 : 1) + limb.dx, foot = FEET + limb.dy, legTop = top + 14;
    for (let y = legTop; y <= foot - 2; y++) {
      g.rect(x0, y, 4, 1, legCloth);
      g.set(x0, y, legDark);
      g.set(x0 + 3, y, legLit);
    }
    const toe = front ? x0 : x0 - 1;
    g.rect(toe, foot - 1, 5, 2, paw);
    g.rect(toe + (front ? 3 : 1), foot - 1, 1, 1, pawLit);
  });

  // Torso: dark left face, lit right face (moon from the top right).
  for (let r = 0; r < half.length; r++) {
    const y = top + r, h = half[r]!, l = cx - h, rr = cx + h - 1;
    for (let x = l; x <= rr; x++) g.set(x, y, x <= l + 1 ? clothDark : x >= rr ? clothLit : cloth);
  }
  if (coat) {
    if (front) {
      const trim = rgb(body.trim), bib = rgb(body.bib);
      for (let r = 1; r <= 5; r++) {
        for (let x = cx - 6 + r + 1; x <= cx + 5 - r - 1; x++) g.set(x, top + r, bib);
        g.set(cx - 6 + r, top + r, trim);
        g.set(cx + 5 - r, top + r, lit(trim));
      }
      g.rect(cx - half[11]!, top + 11, half[11]! * 2, 1, rgb(body.belt));
      g.rect(cx - 1, top + 11, 2, 1, rgb(body.metal));
      g.rect(cx - 1, top + 12, 1, 3, clothDark);
      g.rect(cx - half[15]!, top + 15, half[15]! * 2, 1, rgb(body.trim));
    } else {
      const cape = rgb(body.cape), edge = rgb(body.capeEdge);
      for (let r = 0; r <= 14; r++) {
        const h = Math.min(half[r]! + 1, 4 + r), l = cx - h, rr = cx + h - 1;
        for (let x = l; x <= rr; x++) g.set(x, top + r, x <= l ? dark(cape) : x >= rr ? edge : cape);
      }
      g.rect(cx - 1, top + 6, 1, 8, rgb(body.lining));
    }
  } else {
    const denim = rgb(body.denim);
    g.rect(cx - half[12]!, top + 12, half[12]! * 2, 1, clothDark);
    for (let r = 13; r < half.length; r++) {
      const h = half[r]!;
      g.rect(cx - h, top + r, h * 2, 1, denim);
      g.set(cx - h, top + r, dark(denim));
      g.set(cx + h - 1, top + r, rgb(body.denimEdge));
    }
    if (front) {
      g.rect(cx - 3, top + 1, 6, 1, clothDark);
      g.rect(cx + 2, top + 5, 3, 1, clothDark);
      g.rect(cx + 2, top + 6, 1, 2, clothDark);
      g.rect(cx + 4, top + 6, 1, 2, clothDark);
    }
  }

  // Arms at the sides; the forearm swings against the opposite leg.
  const sleeve = rgb(coat ? body.arm : body.body), forearm = rgb(body.arm);
  p.arms.forEach((dy, i) => {
    const r = 2, h = half[r]!, x0 = i === 0 ? cx - h - 2 : cx + h - 1, y0 = top + 2 + dy;
    for (let k = 0; k < 10; k++) {
      const c = coat ? sleeve : k < 4 ? cloth : forearm;
      g.rect(x0, y0 + k, 3, 1, k >= 8 ? paw : c);
      g.set(i === 0 ? x0 : x0 + 2, y0 + k, k >= 8 ? paw : i === 0 ? dark(c) : lit(c));
    }
  });

  // The chain sits on the bib under the chin.
  const chain = look.accessories.includes("gold-chain") ? rgb(P.mark ?? (coat ? body.metal : P.white)) : null;
  if (chain) {
    if (front) {
      for (let k = 0; k <= 3; k++) {
        g.set(cx - 4 + k, top + 1 + k, k % 2 ? lit(chain) : chain);
        g.set(cx + 3 - k, top + 1 + k, k % 2 ? chain : lit(chain));
      }
      g.rect(cx - 1, top + 5, 2, 2, chain);
      g.set(cx, top + 5, lit(chain));
    } else g.rect(cx - 4, top + 1, 8, 1, chain);
  }
  if (!front) drawTail();

  // Head and ears.
  g.ellipse(hx, hy, 11, 9, (x) => (x >= hx + 6 ? furLit : x <= hx - 7 ? furDark : fur));
  for (const side of [-1, 1] as const) {
    const tipX = p.hurt ? hx + side * 12 - (side > 0 ? 1 : 0) : hx + side * 9 - (side > 0 ? 1 : 0), tipY = p.hurt ? hy - 10 : hy - 13;
    const base = hy - 6, inner = side < 0 ? [hx - 11, hx - 4] : [hx + 3, hx + 10];
    for (let y = tipY; y <= base; y++) {
      const t = (y - tipY) / Math.max(1, base - tipY);
      const a = Math.round(tipX + (inner[0]! - tipX) * t), b = Math.round(tipX + (inner[1]! - tipX) * t);
      for (let x = a; x <= b; x++) g.set(x, y, side > 0 ? (x === b ? furLit : fur) : x === a ? furDark : fur);
      if (front && y >= tipY + 2 && y < base && b - a >= 3) g.rect(a + 1, y, b - a - 1, 1, rgb(P.earInner));
    }
  }

  // Hair.
  const inHead = (x: number, y: number) => {
    const u = (x + 0.5 - hx) / 11, v = (y + 0.5 - hy) / 9;
    return u * u + v * v <= 1;
  };
  const paintHair = (x: number, y: number) => { if (inHead(x, y)) g.set(x, y, x <= hx - 7 ? hairDark : hair); };
  if (look.hair.style === "swept") {
    const reach = front ? [99, 99, 99, 7, 4] : [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];
    reach.forEach((right, i) => {
      for (let x = hx - 11; x <= hx + 11; x++) if (x <= hx + right) paintHair(x, hy - 9 + i);
    });
    if (front) {
      for (let x = hx - 7; x <= hx + 1; x++) paintHair(x, hy - 4);
      for (const [x, y] of [[hx + 5, hy - 5], [hx + 6, hy - 5], [hx + 2, hy - 4], [hx + 3, hy - 4], [hx - 3, hy - 3]] as const) g.set(x, y, root);
    } else for (const [x, y] of [[hx - 5, hy - 6], [hx - 1, hy - 4], [hx + 3, hy - 6], [hx + 6, hy - 3], [hx - 7, hy - 2], [hx + 1, hy - 1]] as const) {
      g.set(x, y, root);
      g.set(x, y + 1, root);
    }
  } else {
    for (let y = hy - 9; y <= hy + (front ? -5 : 9); y++) for (let x = hx - 11; x <= hx + 11; x++) paintHair(x, y);
    if (front) {
      for (let x = hx + 1; x <= hx + 11; x++) paintHair(x, hy - 4);
      for (let x = hx + 5; x <= hx + 11; x++) paintHair(x, hy - 3);
      for (let y = hy - 4; y <= hy - 2; y++) for (let x = hx - 11; x <= hx - 7; x++) paintHair(x, y);
      for (let y = hy - 4; y <= hy + 6; y++) for (let x = hx + 8; x <= hx + 11; x++) paintHair(x, y);
      for (let y = hy - 4; y <= hy + 2; y++) for (let x = hx - 11; x <= hx - 9; x++) paintHair(x, y);
    } else {
      // The long hair falls over the back of the shirt.
      for (let r = 0; r <= 9; r++) {
        const h = 8 - Math.floor(r / 3);
        for (let x = hx - h; x <= hx + h - 1; x++) g.set(x, hy + 9 + r, x >= hx + h - 2 ? hair : x <= hx - h ? hairDark : hair);
      }
    }
  }
  // A cool moonlit rim on the top-right of the hair keeps dark hair readable at night.
  for (let x = hx + 1; x <= hx + 11; x++)
    for (let y = hy - 9; y <= hy + 9; y++) {
      const c = g.get(x, y);
      if (c === hair) { g.set(x, y, hairLit); break; }
      if (c) break;
    }

  // Face (front only), shifted one pixel towards the facing side.
  const fx = hx + 1;
  if (front) {
    g.ellipse(fx + 0.5, hy + 4.5, 4, 2.2, () => rgb(P.headLight));
    g.rect(fx, hy + 3, 2, 1, rgb(P.nose));
    if (p.hurt) {
      g.rect(fx, hy + 5, 2, 2, ink);
    } else {
      g.set(fx - 1, hy + 5, ink);
      g.set(fx + 2, hy + 5, ink);
    }
    const blush = rgb(P.blush);
    g.rect(fx - 9, hy + 3, 2, 1, blush);
    g.rect(fx + 7, hy + 3, 2, 1, blush);
    for (const ex of [fx - 5, fx + 3]) {
      if (p.hurt) g.rect(ex - 1, hy + 1, 3, 1, ink);
      else {
        g.rect(ex, hy, 2, 2, ink);
        g.set(ex + 1, hy, rgb(P.white));
      }
    }
  }
  const frame = ink;
  if (look.accessories.includes("sunglasses") && front) {
    g.rect(fx - 7, hy - 1, 5, 3, frame);
    g.rect(fx + 2, hy - 1, 5, 3, frame);
    g.rect(fx - 2, hy - 1, 4, 1, frame);
    g.rect(fx + 7, hy - 1, 3, 1, frame);
    g.set(fx - 4, hy - 1, mix(frame, MOON, 0.55));
    g.set(fx + 5, hy - 1, mix(frame, MOON, 0.55));
  }
  if (look.accessories.includes("glasses")) {
    if (front) {
      for (const x0 of [fx - 7, fx + 2]) {
        g.rect(x0, hy - 2, 6, 1, frame);
        g.rect(x0, hy + 2, 6, 1, frame);
        g.rect(x0, hy - 1, 1, 3, frame);
        g.rect(x0 + 5, hy - 1, 1, 3, frame);
      }
      g.rect(fx - 1, hy - 1, 3, 1, frame);
    } else {
      g.set(hx - 11, hy - 1, frame);
      g.set(hx + 10, hy - 1, frame);
    }
  }
  g.outline();
}

/** The four-direction sprite sheet of a cat look. */
export function isoCatSheet(look: IsoCatLook): IsoSheet {
  return {
    identity: look.identity,
    width: ISO_CAT.width,
    height: ISO_CAT.height,
    foot: ISO_CAT.foot,
    walkFrames: ISO_CAT.walkFrames,
    paint(px, info) {
      const g = new Grid(px.width, px.height);
      paintCat(look, g, info);
      g.flush(px);
    },
  };
}

/** The animation a cat pose shows: hurt, walking or idle. */
export function isoCatAnim(pose: CatPose): IsoAnim {
  return pose.hurt ? "hurt" : pose.moving ? "walk" : "idle";
}

/**
 * Draw the chosen cat's iso frame at its foot (x, y) in the current
 * (foot-placed) context: contact shadow, sprite, the worn costume's
 * old-style layer, then clothing wear.
 */
export function drawIsoCat(ctx: Ctx, art: CatArt, sheet: IsoSheet, pose: CatPose, dir: IsoDir): void {
  const anim = isoCatAnim(pose), frame = frameFor(anim, pose.time, reducedPaperMotion(), sheet.walkFrames);
  const costume = costumeArtOf(pose.costume);
  const f = isoSpriteFrame(sheet, dir, anim, frame, costume?.id ?? "");
  const x = snap(pose.x), y = snap(pose.y), sign = isMirroredDir(dir) ? -1 : 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (pose.decoy) ctx.globalAlpha *= 0.35;
  const s = ISO_CAT.shadow;
  ctx.save();
  ctx.globalAlpha *= s.alpha;
  ctx.fillStyle = rampColour("ink", 0);
  for (let dy = -s.ry; dy <= s.ry; dy++) {
    const w = Math.floor(s.rx * Math.sqrt(1 - (dy / (s.ry + 1)) ** 2));
    ctx.fillRect(x + s.dx - w, y + s.dy + dy, w * 2 + 1, 1);
  }
  ctx.restore();
  drawIsoSprite(ctx, f, x, y);
  if (costume) drawPixelCostumeLayer(ctx, art, costume, x, y, sign, ISO_CAT.costume.head, ISO_CAT.costume.body);
  if (pose.wear && !pose.decoy) {
    ctx.fillStyle = rampColour("ink", 0);
    const marks = ISO_CAT.wear.marks.slice(0, Math.min(2, pose.wear.marks));
    for (const [mx, my, w, h] of marks) ctx.fillRect(sign > 0 ? x + mx : x - mx - w + 1, y + my, w, h);
    if (pose.wear.tape > 0) {
      const [tx, ty, w, h] = ISO_CAT.wear.tape;
      ctx.globalAlpha *= Math.min(1, pose.wear.tape);
      ctx.fillStyle = rampColour("wax", 4);
      ctx.fillRect(sign > 0 ? x + tx : x - tx - w + 1, y + ty, w, h);
    }
  }
  ctx.restore();
}
