/** Integer-only drawing primitives. Every visible environment pixel is generated here. */
export type Ctx = CanvasRenderingContext2D;
export type Point = readonly [number, number];
export const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x6d2b79f5, 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
export function rect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h)),
  );
}
export function line(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 1,
): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0),
    sx = x0 < x1 ? 1 : -1,
    dy = -Math.abs(y1 - y0),
    sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, width, width);
    if (x0 === x1 && y0 === y1) break;
    const e = err * 2;
    if (e >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
export function polygon(
  ctx: Ctx,
  points: readonly Point[],
  color: string,
): void {
  const min = Math.floor(Math.min(...points.map((p) => p[1]))),
    max = Math.ceil(Math.max(...points.map((p) => p[1])));
  ctx.fillStyle = color;
  for (let y = min; y < max; y++) {
    const hits: number[] = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i]!,
        b = points[j]!;
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        hits.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i < hits.length; i += 2)
      ctx.fillRect(
        Math.round(hits[i]!),
        y,
        Math.max(1, Math.round(hits[i + 1]! - hits[i]!)),
        1,
      );
  }
}
export function ellipse(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let dy = -Math.ceil(ry); dy <= ry; dy++) {
    const w = Math.round(
      rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))),
    );
    if (w) ctx.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1);
  }
}
export function mix(a: string, b: string, t: number): string {
  t = Math.max(0, Math.min(1, t));
  const read = (v: string, i: number) => parseInt(v.slice(i, i + 2), 16);
  const part = (i: number) =>
    Math.round(read(a, i) * (1 - t) + read(b, i) * t)
      .toString(16)
      .padStart(2, "0");
  return "#" + part(1) + part(3) + part(5);
}
export function surface(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Quantized light rendered in a small cached canvas, preserving the pixel lattice. */
const lights = new Map<string, HTMLCanvasElement>();
export function light(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color = "#ffb84f",
  strength = 0.5,
  flat = 0.65,
): void {
  const key = `${r}-${color}-${flat}`;
  let c = lights.get(key);
  if (!c) {
    c = surface(r * 2 + 2, Math.ceil(r * 2 * flat) + 2);
    const cx = c.getContext("2d")!;
    const data = cx.createImageData(c.width, c.height);
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    for (let yy = 0; yy < c.height; yy++)
      for (let xx = 0; xx < c.width; xx++) {
        const d = Math.hypot((xx - r) / r, (yy - r * flat) / (r * flat));
        const a = Math.round(Math.max(0, 1 - d) ** 2 * 24) / 24;
        const i = (yy * c.width + xx) * 4;
        data.data[i] = rgb[0]!;
        data.data[i + 1] = rgb[1]!;
        data.data[i + 2] = rgb[2]!;
        data.data[i + 3] = a * 255;
      }
    cx.putImageData(data, 0, 0);
    lights.set(key, c);
  }
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = strength;
  ctx.drawImage(c, Math.round(x - r), Math.round(y - r * flat));
  ctx.restore();
}
