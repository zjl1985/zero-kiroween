/**
 * Cache-time blur for the HD-2D layers (plan steps 8.1 and 8.3): light
 * spots, fog tiles, the far off-map band and the near foreground leaves are
 * softened once when their cached image is built. Nothing here runs per
 * frame, and no canvas filter is ever set (tests/paper-value.test.mjs).
 */

/**
 * Separable box blur of an RGBA buffer in place, `passes` times (three
 * passes approximate a Gaussian). Colour is blurred premultiplied by alpha,
 * so transparent pixels never darken a soft edge. Pixels past the border
 * count as transparent. Pure: same input, same output.
 */
export function boxBlurRGBA(data: Uint8ClampedArray, width: number, height: number, radius: number, passes = 2): Uint8ClampedArray {
  const r = Math.max(0, Math.floor(radius));
  if (!r || width <= 0 || height <= 0) return data;
  const n = width * height, pm = new Float32Array(n * 4), tmp = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3]! / 255;
    pm[i * 4] = data[i * 4]! * a;
    pm[i * 4 + 1] = data[i * 4 + 1]! * a;
    pm[i * 4 + 2] = data[i * 4 + 2]! * a;
    pm[i * 4 + 3] = data[i * 4 + 3]!;
  }
  const span = 2 * r + 1;
  const run = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    const lines = horizontal ? height : width, len = horizontal ? width : height;
    for (let line = 0; line < lines; line++) {
      const at = (k: number) => (horizontal ? line * width + k : k * width + line) * 4;
      const sum = [0, 0, 0, 0];
      for (let k = -r; k <= r; k++) if (k >= 0 && k < len) for (let c = 0; c < 4; c++) sum[c]! += src[at(k) + c]!;
      for (let k = 0; k < len; k++) {
        const o = at(k);
        for (let c = 0; c < 4; c++) dst[o + c] = sum[c]! / span;
        const out = k - r, inn = k + r + 1;
        if (out >= 0) for (let c = 0; c < 4; c++) sum[c]! -= src[at(out) + c]!;
        if (inn < len) for (let c = 0; c < 4; c++) sum[c]! += src[at(inn) + c]!;
      }
    }
  };
  for (let p = 0; p < passes; p++) {
    run(pm, tmp, true);
    run(tmp, pm, false);
  }
  for (let i = 0; i < n; i++) {
    const a = pm[i * 4 + 3]!;
    data[i * 4 + 3] = Math.round(a);
    if (a <= 0) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0; continue; }
    const k = 255 / a;
    data[i * 4] = Math.round(pm[i * 4]! * k);
    data[i * 4 + 1] = Math.round(pm[i * 4 + 1]! * k);
    data[i * 4 + 2] = Math.round(pm[i * 4 + 2]! * k);
  }
  return data;
}

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Puts a pixel buffer into a new surface from `make`, or returns undefined
 * where the platform has no usable canvas (Node, mock contexts).
 */
export function pixelsToSurface(
  make: ((w: number, h: number) => Surface) | undefined,
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Surface | undefined {
  if (!make || typeof ImageData === "undefined") return undefined;
  const canvas = make(width, height), c = canvas.getContext("2d") as Ctx2D | null;
  if (!c || typeof c.putImageData !== "function") return undefined;
  c.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas;
}

/**
 * Blurs what `paint` draws into `target` at cache time. `paint(c, dx, dy)`
 * draws the image with its top-left corner at (dx, dy) of `c`. It runs on a
 * scratch surface with a margin of `radius * passes` pixels on every side
 * (painted from the same global function, so neighbouring cached blocks
 * stay seamless), the scratch is blurred and its inner part copied. Where
 * pixels cannot be read (Node, mock contexts) the painter draws straight
 * into `target`, unblurred.
 */
export function paintBlurred(
  target: Ctx2D,
  make: ((w: number, h: number) => Surface) | undefined,
  width: number,
  height: number,
  radius: number,
  passes: number,
  paint: (c: Ctx2D, ox: number, oy: number) => void,
): void {
  const m = Math.max(0, Math.floor(radius)) * passes;
  const scratch = make?.(width + 2 * m, height + 2 * m), c = scratch?.getContext("2d") as Ctx2D | null | undefined;
  let img: ImageData | undefined;
  if (c && typeof c.getImageData === "function" && typeof ImageData !== "undefined") {
    paint(c, m, m);
    img = c.getImageData(0, 0, width + 2 * m, height + 2 * m) as ImageData | undefined;
  }
  if (!img?.data) {
    if (scratch) { scratch.width = 0; scratch.height = 0; }
    paint(target, 0, 0);
    return;
  }
  boxBlurRGBA(img.data, width + 2 * m, height + 2 * m, radius, passes);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    out.set(img.data.subarray(((y + m) * (width + 2 * m) + m) * 4, ((y + m) * (width + 2 * m) + m + width) * 4), y * width * 4);
  target.putImageData(new ImageData(out, width, height), 0, 0);
  if (scratch) { scratch.width = 0; scratch.height = 0; }
}
