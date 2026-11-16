import {
  ellipse,
  hash,
  light,
  line,
  mix,
  polygon,
  rect,
  surface,
  type Ctx,
  type Point,
} from "./pixel-art.js";

export const WIDTH = 960,
  HEIGHT = 540;
export const LAMPS = [
  { x: 350, y: 244, s: 1 },
  { x: 663, y: 240, s: 1 },
  { x: 792, y: 354, s: 1.12 },
  { x: 446, y: 330, s: 0.9 },
  { x: 166, y: 413, s: 0.86 },
  { x: 610, y: 447, s: 0.85 },
] as const;
export interface SceneProp {
  kind: "tree" | "bush" | "pumpkin" | "fence" | "stone" | "candles";
  x: number;
  y: number;
  s: number;
  seed: number;
}
export const YARD_PROPS: readonly SceneProp[] = [
  { kind: "bush", x: 56, y: 298, s: 0.9, seed: 32 },
  { kind: "pumpkin", x: 130, y: 318, s: 0.85, seed: 33 },
  { kind: "stone", x: 111, y: 306, s: 1.1, seed: 34 },
  { kind: "pumpkin", x: 150, y: 327, s: 0.45, seed: 35 },
  { kind: "candles", x: 92, y: 351, s: 0.8, seed: 36 },
  { kind: "stone", x: 839, y: 307, s: 1.1, seed: 37 },
  { kind: "bush", x: 865, y: 324, s: 1.25, seed: 38 },
  { kind: "pumpkin", x: 820, y: 324, s: 1, seed: 39 },
  { kind: "bush", x: 342, y: 323, s: 0.72, seed: 41 },
  { kind: "stone", x: 631, y: 365, s: 0.6, seed: 42 },
  { kind: "bush", x: 641, y: 318, s: 0.85, seed: 43 },
  { kind: "candles", x: 354, y: 425, s: 0.75, seed: 44 },
  { kind: "stone", x: 216, y: 427, s: 0.7, seed: 45 },
  { kind: "fence", x: 70, y: 438, s: 1.1, seed: 46 },
  { kind: "bush", x: 28, y: 451, s: 1.1, seed: 47 },
  { kind: "pumpkin", x: 79, y: 461, s: 1.2, seed: 48 },
  { kind: "pumpkin", x: 862, y: 478, s: 1.35, seed: 49 },
  { kind: "pumpkin", x: 889, y: 488, s: 0.75, seed: 50 },
  { kind: "fence", x: 759, y: 500, s: 1.25, seed: 51 },
  { kind: "bush", x: 919, y: 476, s: 1.1, seed: 52 },
];
let background: HTMLCanvasElement | undefined;
const sprites = new Map<
  string,
  { canvas: HTMLCanvasElement; ox: number; oy: number }
>();

// Broad coherent noise shapes the ground; fine details follow those shapes.
function noise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell),
    gy = Math.floor(y / cell),
    fx = x / cell - gx,
    fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx + gy * 7919 + seed),
    b = hash(gx + 1 + gy * 7919 + seed),
    c = hash(gx + (gy + 1) * 7919 + seed),
    d = hash(gx + 1 + (gy + 1) * 7919 + seed);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}
export function pathCenter(y: number): number {
  if (y < 225) return 252;
  if (y < 348) {
    const t = (y - 225) / 123;
    return 252 + 292 * Math.sin((t * Math.PI) / 2);
  }
  const t = (y - 348) / 192;
  return 544 - 60 * Math.sin(t * Math.PI * 0.9);
}
const pathWidth = (y: number) => 14 + (y - 225) * 0.038;
function ground(ctx: Ctx): void {
  const image = ctx.createImageData(WIDTH, HEIGHT - 166),
    d = image.data;
  for (let y = 166; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const broad = noise(x, y, 58, 91),
        small = noise(x, y, 13, 712),
        grain = hash(x * 59 + y * 6781);
      const p = y >= 220 ? Math.abs(x - pathCenter(y)) : 1000;
      const edge = pathWidth(y) + noise(x, y, 6, 55) * 2;
      const road = p < edge;
      let r: number, g: number, b: number;
      const perspective = (y - 166) / (HEIGHT - 166);
      if (road) {
        const mortar =
          y % 7 === 0 || (x + (Math.floor(y / 7) % 2) * 7) % 17 === 0;
        const v = broad * 14 + small * 6 + grain * 5 - (mortar ? 11 : 0);
        r = 94 + v;
        g = 91 + v * 0.88;
        b = 78 + v * 0.78;
        if (p > edge - 2) {
          r -= 18;
          g -= 16;
          b -= 13;
        }
      } else {
        const v = broad * 20 + small * 9 + grain * 5;
        r = 25 + v * 0.7;
        g = 40 + v;
        b = 43 + v * 0.63;
        if (p < edge + 4) {
          r *= 0.72;
          g *= 0.74;
          b *= 0.76;
        }
      }
      // Ambient moonlight across the right half; distant ground is cooler.
      b += 7 * (1 - perspective);
      g += 4 * (1 - perspective);
      for (const l of LAMPS) {
        const a =
          Math.max(0, 1 - Math.hypot((x - l.x) / 85, (y - l.y + 2) / 43)) ** 2;
        r += a * 62;
        g += a * 36;
        b += a * 8;
      }
      const i = ((y - 166) * WIDTH + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] =
        y < 178 + Math.sin(x * 0.012) * 9 + Math.sin(x * 0.037) * 3 ? 0 : 255;
    }
  const terrain = surface(WIDTH, HEIGHT - 166);
  terrain.getContext("2d")!.putImageData(image, 0, 0);
  ctx.drawImage(terrain, 0, 166);
  // Thousands of short directional blades, organized into patches, not bright confetti.
  for (let i = 0; i < 9200; i++) {
    const x = Math.floor(hash(i * 17 + 1) * WIDTH),
      y = 170 + Math.floor(hash(i * 37 + 3) * 370);
    if (y >= 220 && Math.abs(x - pathCenter(y)) < pathWidth(y) + 3) continue;
    const patch = noise(x, y, 33, 318),
      contrast = hash(i * 23);
    if (patch < 0.47 && contrast > 0.12) continue;
    if (x > 350 && x < 665 && y > 290 && y < 445 && contrast > 0.3) continue;
    const h = 1 + Math.floor(hash(i + 900) * 3);
    const c =
      contrast < 0.45 ? "#354a46" : contrast < 0.9 ? "#43564b" : "#56654e";
    rect(ctx, x, y, 2, 1, c);
    if (patch > 0.55) line(ctx, x + 1, y, x + 2, y - h, c);
    if (i % 7 === 0) rect(ctx, x - 1, y + 1, 3, 1, "#293e3e");
  }
  // Road stones have bevels, varied seams and tiny moss at their edges.
  for (let y = 230; y < 540; y += 8) {
    const cx = pathCenter(y),
      w = pathWidth(y);
    for (let x = Math.floor(cx - w) + 3; x < cx + w - 3; x += 11) {
      const n = hash(x * 19 + y * 13);
      const xx = x + (y % 16 === 6 ? 4 : 0);
      if (Math.abs(xx - cx) > w - 4) continue;
      rect(ctx, xx, y, 7 + n * 3, 1, n > 0.5 ? "#aaa18a" : "#958e79");
      rect(ctx, xx + 1, y + 1, 6, 2, "#888675");
    }
    if (hash(y) > 0.4) {
      const side = hash(y + 4) > 0.5 ? 1 : -1;
      tuft(ctx, cx + side * (w + 3), y, 0.55, Math.floor(y));
    }
  }
}

function sky(ctx: Ctx): void {
  const skyImage = ctx.createImageData(WIDTH, 210);
  for (let y = 0; y < 210; y++)
    for (let x = 0; x < WIDTH; x++) {
      const cloud =
        noise(x + Math.sin(y * 0.025) * 40, y * 2.4, 75, 414) * 0.6 +
        noise(x, y * 2.8, 26, 512) * 0.3 +
        noise(x, y, 8, 31) * 0.1;
      const nebula = Math.max(0, cloud - 0.35) * 25;
      const moon = Math.max(0, 1 - Math.hypot((x - 771) / 230, (y - 60) / 130));
      const grain = hash(x * 47 + y * 7919) * 2;
      const i = (y * WIDTH + x) * 4;
      skyImage.data[i] = 15 + y * 0.12 + nebula + moon * 10 + grain;
      skyImage.data[i + 1] = 21 + y * 0.085 + nebula * 0.65 + moon * 8 + grain;
      skyImage.data[i + 2] = 40 + y * 0.17 + nebula * 1.2 + moon * 15 + grain;
      skyImage.data[i + 3] = 255;
    }
  ctx.putImageData(skyImage, 0, 0);
  // The brighter cloud banks retain scalloped, stepped pixel silhouettes.
  for (const [x, y, w] of [
    [318, 79, 48],
    [836, 115, 60],
    [604, 84, 42],
  ]) {
    for (let i = 0; i < 7; i++) {
      const xx = x + ((i - 3) * w) / 5,
        yy = y - Math.sin((i / 6) * Math.PI) * 9;
      ellipse(ctx, xx, yy, w / 5 + 4, 5 + hash(i + x) * 5, "#44435a");
      line(ctx, xx - w / 7, yy + 4, xx + w / 7, yy + 4, "#5b5267");
    }
  }
  for (let i = 0; i < 100; i++) {
    const x = hash(i * 31) * WIDTH,
      y = 10 + hash(i * 43 + 5) * 130;
    rect(ctx, x, y, 1, 1, i % 9 === 0 ? "#e7cf9b" : "#77788c");
  }
  for (const [x, y] of [
    [434, 24],
    [548, 57],
    [654, 35],
    [885, 31],
    [330, 94],
  ]) {
    line(ctx, x - 2, y, x + 2, y, "#ccbf91");
    line(ctx, x, y - 2, x, y + 2, "#ccbf91");
    rect(ctx, x, y, 1, 1, "#fff2be");
  }
  // Crescent is cut from a textured disc; no smooth vector circles.
  light(ctx, 771, 59, 85, "#b998c4", 0.16, 1);
  for (let y = -26; y <= 26; y++)
    for (let x = -26; x <= 26; x++) {
      if (x * x + y * y <= 26 * 26 && (x - 11) ** 2 + (y + 8) ** 2 > 24 * 24) {
        const n = hash(x * 47 + y * 311);
        rect(
          ctx,
          771 + x,
          59 + y,
          1,
          1,
          n > 0.84 ? "#d8bd7e" : n > 0.5 ? "#f0d99e" : "#e8cf90",
        );
      }
    }
  // Three depths of wooded hills, each with its own edge silhouette and contrast.
  for (let layer = 0; layer < 3; layer++) {
    const col = ["#35334a", "#282d42", "#1d2b39"][layer]!;
    for (let x = 0; x < WIDTH; x++) {
      const top =
        122 +
        layer * 17 +
        Math.sin(x * 0.014 + layer * 2) * 12 +
        Math.sin(x * 0.043 + layer) * 5;
      rect(ctx, x, top, 1, 208 - top, col);
    }
    for (let i = 0; i < 38; i++) {
      const x = i * 29 + hash(i + layer * 33) * 12,
        y = 153 + layer * 14 + Math.sin(x * 0.014 + layer * 2) * 12;
      pine(ctx, x, y, 0.35 + hash(i * 7 + layer) * 0.6, col);
    }
  }
  // Tiny lived-in silhouettes make the world extend beyond the two houses.
  for (const [x, y, s] of [
    [394, 176, 0.6],
    [585, 170, 0.7],
    [628, 185, 0.45],
  ]) {
    rect(ctx, x, y - 19 * s, 27 * s, 19 * s, "#242c3d");
    polygon(
      ctx,
      [
        [x - 4 * s, y - 19 * s],
        [x + 14 * s, y - 34 * s],
        [x + 31 * s, y - 19 * s],
      ],
      "#1a2435",
    );
    rect(ctx, x + 8 * s, y - 13 * s, 4 * s, 6 * s, "#9c7854");
    rect(ctx, x + 19 * s, y - 13 * s, 3 * s, 5 * s, "#715d50");
  }
}
function pine(ctx: Ctx, x: number, y: number, s: number, c: string): void {
  rect(ctx, x - 1, y - 31 * s, 2, 31 * s, c);
  for (let i = 0; i < 4; i++)
    polygon(
      ctx,
      [
        [x, y - (48 - i * 7) * s],
        [x - (7 + i * 2) * s, y - (28 - i * 7) * s],
        [x + (7 + i * 2) * s, y - (28 - i * 7) * s],
      ],
      c,
    );
}

function tree(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  // Ground contact and cast shadow establish weight before the branches.
  ellipse(ctx, x - 19 * s, y + 4 * s, 43 * s, 10 * s, "#203234");
  polygon(
    ctx,
    [
      [x - 6 * s, y],
      [x + 7 * s, y],
      [x - 28 * s, y + 28 * s],
      [x - 61 * s, y + 27 * s],
    ],
    "#263a3a",
  );
  const wood = ["#352c31", "#514039", "#72503d", "#9b6b48"];
  polygon(
    ctx,
    [
      [x - 9 * s, y],
      [x - 5 * s, y - 64 * s],
      [x + 4 * s, y - 88 * s],
      [x + 8 * s, y - 32 * s],
      [x + 13 * s, y],
    ],
    wood[1]!,
  );
  line(
    ctx,
    x + 5 * s,
    y - 3 * s,
    x + 1 * s,
    y - 79 * s,
    wood[2]!,
    Math.max(1, 3 * s),
  );
  line(
    ctx,
    x + 7 * s,
    y - 2 * s,
    x + 8 * s,
    y - 35 * s,
    wood[3]!,
    Math.max(1, s),
  );
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1,
      by = y - (32 + i * 6) * s,
      bx = x + side * (20 + hash(seed + i) * 24) * s;
    line(ctx, x, by + 10 * s, bx, by - 27 * s, wood[0]!, Math.max(1, 5 * s));
    line(
      ctx,
      x + 2 * s,
      by + 8 * s,
      bx + 2 * s,
      by - 27 * s,
      wood[2]!,
      Math.max(1, 2 * s),
    );
  }
  // Overlapping irregular leaf masses, with shadow pockets and moon-facing tips.
  const clusters = [
    [-32, -89, 29],
    [-5, -117, 34],
    [28, -103, 32],
    [43, -72, 27],
    [-36, -62, 27],
    [3, -76, 37],
  ];
  const colors =
    seed % 2
      ? ["#4e343e", "#704247", "#95534a", "#b56e4b", "#d39756"]
      : ["#4c3441", "#743d43", "#9d5044", "#bc7148", "#d99554"];
  clusters.forEach(([dx, dy, r], index) => {
    const cx = x + dx! * s,
      cy = y + dy! * s,
      rr = r! * s;
    for (let row = -Math.ceil(rr * 0.72); row <= rr * 0.76; row += 2) {
      const ww = rr * Math.sqrt(Math.max(0, 1 - (row / (rr * 0.8)) ** 2));
      const inset = hash(seed + index * 31 + row) * 5 * s;
      rect(ctx, cx - ww + inset, cy + row, ww * 2 - inset, 2, colors[0]!);
    }
    for (let i = 0; i < 180 * s; i++) {
      const a = hash(seed * 53 + index * 721 + i * 7) * Math.PI * 2,
        rad = Math.sqrt(hash(i * 13 + index * 91 + seed)) * rr * 0.92;
      const xx = cx + Math.cos(a) * rad,
        yy = cy + Math.sin(a) * rad * 0.72;
      const shade = Math.min(
        4,
        Math.max(
          1,
          Math.floor(
            2.5 - (yy - cy) / rr + ((xx - cx) / rr) * 0.8 + hash(i * 23) * 1.3,
          ),
        ),
      );
      const w = (3 + hash(i * 31) * 6) * s,
        h = (2 + hash(i * 43) * 3) * s;
      rect(ctx, xx, yy, w, h, colors[shade]!);
      if (i % 3 === 0)
        rect(
          ctx,
          xx + 1,
          yy - 1,
          w - 2,
          1,
          mix(colors[shade]!, "#e7b96f", 0.22),
        );
      if (i % 5 === 0) rect(ctx, xx - 1, yy + h, 3 * s, 1, colors[1]!);
    }
    line(
      ctx,
      cx + 3 * s,
      cy + 17 * s,
      cx + 12 * s,
      cy - 5 * s,
      "#9b6d4b",
      Math.max(1, s),
    );
  });
  for (let i = 0; i < 15; i++) {
    const xx = x + (hash(seed + i * 31) - 0.5) * 87 * s,
      yy = y + hash(seed + i * 59) * 12;
    leaf(ctx, xx, yy, hash(i * 17) * Math.PI, seed + i, 0.8 * s);
  }
  tuft(ctx, x - 10 * s, y + 2, 1.2 * s, seed);
  tuft(ctx, x + 15 * s, y + 3, 0.8 * s, seed + 1);
}
function roof(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
): void {
  polygon(
    ctx,
    [
      [x - w / 2 - 5, y],
      [x, y - h - 4],
      [x + w / 2 + 7, y],
    ],
    "#1b2030",
  );
  // Each row of shingles tapers with the pitch; staggered seams and irregular highlights.
  for (let row = 0; row < h; row += 6) {
    const half = ((row / h) * w) / 2 + 4,
      yy = y - h + row;
    for (let xx = x - half; xx < x + half; xx += 10) {
      const width = Math.min(10, x + half - xx),
        n = hash(Math.floor(xx) * 71 + row + seed);
      rect(
        ctx,
        xx,
        yy,
        width,
        6,
        n > 0.6 ? "#454252" : n > 0.25 ? "#363849" : "#2d3042",
      );
      rect(ctx, xx + 1, yy, width - 2, 1, n > 0.5 ? "#736474" : "#545367");
      rect(ctx, xx + 1, yy + 5, width - 1, 1, "#232a3b");
      if (n > 0.8) rect(ctx, xx + 2, yy + 2, 3, 1, "#88715b");
    }
  }
  line(ctx, x - w / 2 - 6, y, x, y - h - 4, "#a37b50", 2);
  line(ctx, x, y - h - 4, x + w / 2 + 7, y, "#ba8a55", 2);
  line(ctx, x - w / 2 - 7, y + 2, x + w / 2 + 9, y + 2, "#161e2c", 4);
  line(ctx, x - w / 2 - 5, y + 2, x + w / 2 + 7, y + 2, "#826147", 1);
}
function windowArt(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  arched = true,
): void {
  rect(ctx, x - 3, y - 3, w + 6, h + 7, "#3e3435");
  rect(ctx, x - 1, y - 1, w + 2, h + 2, "#bc8852");
  rect(ctx, x, y, w, h, "#bc7036");
  for (let row = 0; row < h; row++)
    rect(ctx, x + 1, y + row, w - 2, 1, mix("#fff0ae", "#e9a24b", row / h));
  if (arched) {
    rect(ctx, x, y, 3, 3, "#3e3435");
    rect(ctx, x + w - 3, y, 3, 3, "#3e3435");
  }
  rect(ctx, x + w / 2 - 1, y, 2, h, "#74492e");
  rect(ctx, x, y + h * 0.52, w, 2, "#8e582e");
  rect(ctx, x - 4, y + h + 2, w + 8, 3, "#d3ab74");
  rect(ctx, x - 4, y + h + 5, w + 8, 2, "#3b3435");
  line(ctx, x - 2, y + 2, x - 2, y + h, "#e0ba82");
}
function cottage(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  const target = ctx,
    tile = surface(280, 190);
  ctx = tile.getContext("2d")!;
  ctx.save();
  ctx.translate(140, 145);
  ellipse(ctx, 0, 7, 91, 17, "#203234");
  polygon(
    ctx,
    [
      [-72, -54],
      [0, -104],
      [67, -58],
      [67, 0],
      [-72, 0],
    ],
    "#42383c",
  );
  rect(ctx, -67, -56, 126, 57, "#8a7c68");
  polygon(
    ctx,
    [
      [-67, -55],
      [0, -101],
      [59, -55],
    ],
    "#998771",
  );
  polygon(
    ctx,
    [
      [59, -55],
      [75, -61],
      [75, -3],
      [59, 1],
    ],
    "#60594f",
  );
  // Plaster weathering, stone foundation and exposed structural timber.
  for (let i = 0; i < 100; i++) {
    const xx = -63 + hash(seed + i * 17) * 117,
      yy = -54 + hash(seed + i * 29) * 53;
    rect(
      ctx,
      xx,
      yy,
      2 + hash(i) * 5,
      1,
      hash(i + 2) > 0.4 ? "#a59377" : "#796e60",
    );
  }
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 10; col++) {
      const xx = -69 + col * 14 - (row % 2) * 6;
      rect(ctx, xx, 1 + row * 5, 13, 4, col % 3 ? "#555753" : "#697069");
      rect(ctx, xx, 1 + row * 5, 11, 1, "#8c8a76");
    }
  for (const xx of [-65, -6, 56]) {
    rect(ctx, xx, -55, 4, 57, "#463c38");
    rect(ctx, xx, -55, 1, 56, "#af946c");
  }
  rect(ctx, -67, -22, 126, 3, "#59473c");
  if (s > 0.9) {
    rect(ctx, -105, -38, 38, 39, "#6d6b5e");
    polygon(
      ctx,
      [
        [-111, -39],
        [-74, -67],
        [-51, -39],
      ],
      "#242c3b",
    );
    for (let i = 0; i < 5; i++) {
      rect(
        ctx,
        -105 + i * 3,
        -43 - i * 4,
        42 - i * 6,
        3,
        i % 2 ? "#4b4653" : "#35394b",
      );
      line(ctx, -104 + i * 3, -43 - i * 4, -66 - i * 3, -43 - i * 4, "#786555");
    }
    line(ctx, -111, -39, -75, -67, "#ae8250", 2);
    windowArt(ctx, -97, -30, 15, 21);
    rect(ctx, -111, 2, 43, 6, "#555650");
    rect(ctx, -111, 2, 43, 1, "#93917c");
    for (let i = 0; i < 3; i++) {
      rect(ctx, -107 + i * 11, -3, 9, 6, "#76523a");
      rect(ctx, -106 + i * 11, -7, 7, 5, "#506345");
    }
  }
  // Side roof, steep main gable, roof ridge and masonry chimney.
  roof(ctx, -12, -56, 152, 62, seed);
  rect(ctx, -47, -123, 16, 45, "#786c62");
  rect(ctx, -45, -123, 5, 43, "#ad9276");
  for (let row = 0; row < 8; row++) {
    rect(ctx, -47, -121 + row * 5, 16, 1, "#4c4948");
    rect(ctx, -42 + (row % 2) * 5, -120 + row * 5, 1, 4, "#65574b");
  }
  rect(ctx, -50, -128, 22, 5, "#b39572");
  rect(ctx, -48, -124, 18, 3, "#453e3d");
  // Small attic window nested inside the gable, with its own short roof.
  rect(ctx, -18, -83, 21, 18, "#9a856b");
  polygon(
    ctx,
    [
      [-22, -83],
      [-8, -96],
      [7, -83],
    ],
    "#433d4b",
  );
  line(ctx, -22, -83, -8, -96, "#a67f55");
  windowArt(ctx, -13, -80, 10, 11, false);
  // Warm windows recessed into the wall.
  windowArt(ctx, -53, -48, 17, 25);
  windowArt(ctx, -25, -48, 17, 25);
  windowArt(ctx, 27, -47, 17, 25);
  // Dark arched door with bevelled wooden planks and a tiny crescent fitting.
  rect(ctx, 2, -36, 21, 37, "#302c2e");
  rect(ctx, 4, -34, 17, 35, "#554132");
  for (let i = 0; i < 4; i++)
    line(ctx, 5 + i * 4, -32, 5 + i * 4, 0, "#765439");
  rect(ctx, 18, -15, 2, 3, "#eac77c");
  rect(ctx, 3, -36, 19, 2, "#af8556");
  for (let i = 0; i < 3; i++) {
    rect(ctx, -1 - i * 3, 7 + i * 3, 28 + i * 6, 3, "#727467");
    rect(ctx, -1 - i * 3, 7 + i * 3, 27 + i * 6, 1, "#aaa38b");
  }
  // Ivy is attached to the gable and wall, not random points on the roof.
  line(ctx, -64, -3, -55, -64, "#3e4a38", 2);
  line(ctx, -55, -64, -8, -89, "#655336", 1);
  for (let i = 0; i < 30; i++) {
    const xx = -62 + i * 1.7,
      yy = -45 - i * 1.2 + Math.sin(i) * 5;
    leaf(ctx, xx, yy, i * 0.7, seed + i, 0.6);
  }
  // Small shutter, flower box, porch light and stacked firewood.
  rect(ctx, -58, -18, 25, 5, "#4c3a31");
  rect(ctx, -58, -18, 25, 1, "#b48752");
  for (let i = 0; i < 7; i++)
    flower(ctx, -56 + i * 3, -20 - (i % 2), 0.5, i + seed);
  for (let i = 0; i < 5; i++) {
    rect(ctx, 61 + (i % 2) * 7, -3 - Math.floor(i / 2) * 6, 14, 5, "#3a302c");
    ellipse(ctx, 74 + (i % 2) * 7, -1 - Math.floor(i / 2) * 6, 3, 2, "#9a7b51");
  }
  lantern(ctx, 52, -20, 0.65, 0, false);
  // Hanging moon sign and a garden bench make the cottage feel inhabited.
  line(ctx, 73, -40, 91, -40, "#826645", 2);
  line(ctx, 89, -40, 89, -29, "#b49664");
  rect(ctx, 81, -29, 18, 17, "#2a3639");
  rect(ctx, 82, -28, 16, 1, "#b39359");
  ellipse(ctx, 89, -21, 4, 5, "#d1b073");
  ellipse(ctx, 91, -23, 3, 4, "#2a3639");
  rect(ctx, -44, 15, 34, 4, "#73553a");
  rect(ctx, -44, 15, 34, 1, "#b28c59");
  rect(ctx, -41, 19, 3, 8, "#3c3430");
  rect(ctx, -16, 19, 3, 8, "#3c3430");

  ctx.restore();
  target.imageSmoothingEnabled = false;
  target.drawImage(
    tile,
    Math.round(x - 140 * s),
    Math.round(y - 145 * s),
    Math.round(280 * s),
    Math.round(190 * s),
  );
}
function fence(ctx: Ctx, x: number, y: number, s: number): void {
  polygon(
    ctx,
    [
      [x - 34 * s, y + 1],
      [x + 39 * s, y - 4],
      [x + 14 * s, y + 17],
      [x - 58 * s, y + 20],
    ],
    "#253538",
  );
  for (const yy of [-19, -8]) {
    rect(ctx, x - 38 * s, y + yy * s, 78 * s, 4 * s, "#322c2b");
    rect(ctx, x - 38 * s, y + yy * s, 78 * s, 1, "#876541");
  }
  for (let i = 0; i < 4; i++) {
    const xx = x + (-34 + i * 24) * s;
    rect(ctx, xx - 3 * s, y - 29 * s, 6 * s, 33 * s, "#3a3030");
    rect(ctx, xx - 2 * s, y - 28 * s, 2 * s, 30 * s, "#846142");
    polygon(
      ctx,
      [
        [xx - 5 * s, y - 29 * s],
        [xx, y - 36 * s],
        [xx + 5 * s, y - 29 * s],
      ],
      "#694a37",
    );
    line(ctx, xx - 5 * s, y - 29 * s, xx, y - 36 * s, "#ac7c48");
    rect(ctx, xx + 1, y - 18 * s, 1, 1, "#ccb583");
  }
}
function leaf(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  seed: number,
  s = 1,
): void {
  const colors = ["#ad6b37", "#c08742", "#926043", "#ae5140", "#796344"];
  const c = colors[Math.floor(hash(seed + 15) * colors.length)]!;
  const dx = Math.cos(angle) * 4 * s,
    dy = Math.sin(angle) * 2 * s;
  polygon(
    ctx,
    [
      [x - dx, y - dy],
      [x + dy, y - dx * 0.4],
      [x + dx, y + dy],
      [x - dy, y + dx * 0.4],
    ],
    c,
  );
  line(
    ctx,
    x - dx * 0.6,
    y - dy * 0.6,
    x + dx * 0.8,
    y + dy * 0.8,
    mix(c, "#efb96c", 0.4),
  );
}
function tuft(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  for (let i = 0; i < 7; i++) {
    const dx = (i - 3) * 2 * s,
      hh = (4 + hash(seed + i * 3) * 7) * s;
    line(ctx, x, y, x + dx, y - hh, "#273f3d");
    line(ctx, x + 1, y - 1, x + dx + 1, y - hh, "#657351");
    if (i % 2 === 0) rect(ctx, x + dx + 1, y - hh, 1, 2, "#82905f");
  }
}
function flower(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  line(ctx, x, y, x, y - 6 * s, "#546b49");
  const c = seed % 3 ? "#bfb68a" : "#ac8c91";
  rect(ctx, x - 3 * s, y - 8 * s, 6 * s, 2 * s, c);
  rect(ctx, x - s, y - 10 * s, 2 * s, 6 * s, c);
  rect(ctx, x, y - 8 * s, s, s, "#e7c77b");
}
function bush(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ellipse(ctx, x, y + 2, 28 * s, 6 * s, "#223537");
  for (let j = 0; j < 4; j++) {
    const xx = x + (j - 1.5) * 12 * s,
      yy = y - 7 * s - Math.sin(j) * 6 * s;
    ellipse(ctx, xx, yy, 14 * s, 11 * s, "#293f3b");
    for (let i = 0; i < 55 * s; i++) {
      const a = hash(i * 13 + seed + j) * Math.PI * 2,
        r = Math.sqrt(hash(i * 31 + seed + j)) * 12 * s;
      const px = xx + Math.cos(a) * r,
        py = yy + Math.sin(a) * r * 0.8;
      rect(
        ctx,
        px,
        py,
        3 * s,
        2 * s,
        py < yy
          ? i % 4
            ? "#657049"
            : "#959459"
          : i % 4
            ? "#3b5440"
            : "#4a6446",
      );
    }
  }
  if (seed % 3 === 0)
    for (let i = 0; i < 5; i++)
      flower(
        ctx,
        x + (i - 2) * 8 * s,
        y - 13 * s + (i % 2) * 4 * s,
        0.5 * s,
        seed + i,
      );
}
function stone(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ellipse(ctx, x, y + 2, 12 * s, 4 * s, "#203235");
  polygon(
    ctx,
    [
      [x - 12 * s, y - 3 * s],
      [x - 7 * s, y - 10 * s],
      [x + 4 * s, y - 12 * s],
      [x + 12 * s, y - 5 * s],
      [x + 10 * s, y + 1 * s],
      [x - 6 * s, y + 3 * s],
    ],
    "#55585d",
  );
  polygon(
    ctx,
    [
      [x - 12 * s, y - 3 * s],
      [x - 7 * s, y - 10 * s],
      [x + 4 * s, y - 12 * s],
      [x + 9 * s, y - 5 * s],
      [x - 4 * s, y - 3 * s],
    ],
    "#83807b",
  );
  line(ctx, x - 7 * s, y - 10 * s, x + 4 * s, y - 12 * s, "#b9aa8c");
  line(ctx, x - 1 * s, y - 10 * s, x - 3 * s, y - 4 * s, "#646267");
  for (let i = 0; i < 5; i++)
    rect(
      ctx,
      x + (hash(i + seed) * 16 - 8) * s,
      y - 4 * s + hash(i * 23) * 5 * s,
      3 * s,
      1,
      "#66704f",
    );
}
function pumpkin(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  ellipse(ctx, x, y + 2, 15 * s, 5 * s, "#243336");
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 5 * s;
    ellipse(
      ctx,
      x + dx,
      y - 10 * s,
      7 * s,
      (10 - Math.abs(i - 2)) * s,
      ["#80412e", "#ad572e", "#d28238", "#d99140", "#9d512d"][i]!,
    );
    line(ctx, x + dx + 2 * s, y - 16 * s, x + dx + 3 * s, y - 7 * s, "#e2a04d");
  }
  rect(ctx, x - 2 * s, y - 23 * s, 4 * s, 6 * s, "#605a39");
  rect(ctx, x, y - 25 * s, 5 * s, 3 * s, "#7b7041");
  if (seed % 4 !== 0) {
    polygon(
      ctx,
      [
        [x - 10 * s, y - 11 * s],
        [x - 5 * s, y - 15 * s],
        [x - 3 * s, y - 9 * s],
      ],
      "#ffe09b",
    );
    polygon(
      ctx,
      [
        [x + 3 * s, y - 9 * s],
        [x + 5 * s, y - 15 * s],
        [x + 10 * s, y - 11 * s],
      ],
      "#ffe09b",
    );
    polygon(
      ctx,
      [
        [x - 9 * s, y - 6 * s],
        [x - 4 * s, y - 4 * s],
        [x, y - 6 * s],
        [x + 4 * s, y - 4 * s],
        [x + 9 * s, y - 6 * s],
        [x + 6 * s, y - 1 * s],
        [x - 6 * s, y - 1 * s],
      ],
      "#ffce71",
    );
  }
  // A curling vine and a grounded leaf finish the silhouette.
  line(ctx, x + 3 * s, y - 23 * s, x + 10 * s, y - 24 * s, "#918454");
  line(ctx, x + 10 * s, y - 24 * s, x + 11 * s, y - 21 * s, "#918454");
  leaf(ctx, x + 15 * s, y + 2, 0.2, seed, s);
}
function candles(ctx: Ctx, x: number, y: number, s: number): void {
  ellipse(ctx, x, y + 1, 15 * s, 5 * s, "#273333");
  rect(ctx, x - 14 * s, y - 5 * s, 28 * s, 7 * s, "#554135");
  ellipse(ctx, x, y - 5 * s, 14 * s, 4 * s, "#8d7353");
  for (const [dx, h] of [
    [-7, 12],
    [0, 19],
    [7, 10],
  ]) {
    rect(
      ctx,
      x + dx! * s - 2 * s,
      y - h! * s,
      4 * s,
      h! * s - 4 * s,
      "#e3ca94",
    );
    rect(ctx, x + dx! * s + 1, y - h! * s, 1, h! * s - 4 * s, "#9d8159");
    rect(ctx, x + dx! * s, y - h! * s - 5 * s, 2 * s, 5 * s, "#e9a346");
    rect(ctx, x + dx! * s, y - h! * s - 3 * s, s, 3 * s, "#fff2bf");
  }
}
function lantern(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  time: number,
  post = true,
): void {
  if (post) {
    polygon(
      ctx,
      [
        [x - 3 * s, y],
        [x + 4 * s, y],
        [x - 22 * s, y + 16 * s],
        [x - 29 * s, y + 13 * s],
      ],
      "#253334",
    );
    rect(ctx, x - 3 * s, y - 36 * s, 6 * s, 37 * s, "#352f30");
    rect(ctx, x + 1 * s, y - 36 * s, 2 * s, 36 * s, "#8e6848");
    rect(ctx, x - 6 * s, y - 2 * s, 12 * s, 4 * s, "#484039");
  }
  const top = y - (post ? 51 : 24) * s;
  polygon(
    ctx,
    [
      [x - 11 * s, top + 2 * s],
      [x, top - 6 * s],
      [x + 11 * s, top + 2 * s],
    ],
    "#6d5342",
  );
  line(ctx, x, top - 6 * s, x + 11 * s, top + 2 * s, "#d5ab69");
  rect(ctx, x - 8 * s, top + 3 * s, 16 * s, 19 * s, "#c0803e");
  rect(ctx, x - 6 * s, top + 4 * s, 12 * s, 16 * s, "#f6c970");
  rect(ctx, x - 3 * s, top + 5 * s, 6 * s, 14 * s, "#ffe6a0");
  rect(ctx, x - s, top + 7 * s, 2 * s, 10 * s, "#fff3c7");
  for (const dx of [-8, 0, 7])
    line(
      ctx,
      x + dx * s,
      top + 3 * s,
      x + dx * 0.7 * s,
      top + 23 * s,
      "#63482f",
      Math.max(1, s),
    );
  line(ctx, x - 7 * s, top + 22 * s, x + 7 * s, top + 22 * s, "#a77b46", 2);
  line(ctx, x, top - 6 * s, x, top - 11 * s, "#a48757");
  void time;
}
function bunting(ctx: Ctx): void {
  const x0 = 548,
    y0 = 211,
    y1 = 197;
  for (let i = 0; i < 335; i++) {
    const x = x0 + i,
      y = y0 + ((y1 - y0) * i) / 336 + Math.sin((i / 336) * Math.PI) * 24;
    rect(ctx, x, y, 1, 1, "#9c7d52");
    if (i % 27 === 13) {
      polygon(
        ctx,
        [
          [x - 5, y + 1],
          [x + 5, y + 1],
          [x + 1, y + 14],
        ],
        i % 2 ? "#b98343" : "#9c5544",
      );
      line(ctx, x - 4, y + 2, x + 4, y + 2, "#d2a65d");
    }
  }
}
function gardenBeds(ctx: Ctx): void {
  for (const [x, y, s] of [
    [62, 255, 1],
    [149, 251, 0.8],
    [304, 237, 0.9],
    [560, 231, 0.7],
    [760, 258, 0.8],
    [919, 264, 1.1],
  ]) {
    bush(ctx, x!, y!, s!, Math.floor(x!));
    for (let i = 0; i < 6; i++)
      flower(ctx, x! + (i - 3) * 8, y! + 10 + (i % 2) * 3, 0.7, i);
  }
  for (const [x, y] of [
    [318, 260],
    [697, 265],
    [873, 282],
    [51, 337],
    [865, 403],
    [290, 476],
    [716, 456],
  ]) {
    for (let i = 0; i < 6; i++)
      leaf(
        ctx,
        x + (hash(i + x) * 28 - 14),
        y + hash(i + y) * 9,
        i,
        Math.floor(x) + i,
      );
    tuft(ctx, x - 12, y + 6, 0.8, x);
  }
  for (const [x, y] of [
    [209, 282],
    [701, 304],
    [270, 349],
    [746, 396],
    [315, 471],
    [882, 425],
  ]) {
    for (let i = 0; i < 3; i++)
      flower(ctx, x + i * 6, y + (i % 2) * 4, 0.65, i + x);
  }
}
function build(): HTMLCanvasElement {
  const c = surface(WIDTH, HEIGHT),
    ctx = c.getContext("2d")!;
  sky(ctx);
  ground(ctx);
  tree(ctx, 63, 241, 1.03, 9);
  tree(ctx, 887, 242, 1.06, 6);
  tree(ctx, 470, 215, 0.65, 11);
  cottage(ctx, 239, 220, 1.13, 102);
  cottage(ctx, 729, 229, 0.77, 71);
  gardenBeds(ctx);
  fence(ctx, 138, 259, 1.05);
  fence(ctx, 224, 254, 1.05);
  fence(ctx, 699, 264, 0.9);
  fence(ctx, 769, 264, 0.9);
  pumpkin(ctx, 449, 244, 0.8, 31);
  pumpkin(ctx, 322, 254, 0.48, 32);
  pumpkin(ctx, 845, 274, 0.65, 41);
  candles(ctx, 112, 261, 0.8);
  bunting(ctx);
  stone(ctx, 916, 369, 1.8, 31);
  stone(ctx, 891, 378, 0.8, 32);
  stone(ctx, 47, 394, 1.1, 22);
  stone(ctx, 29, 402, 0.7, 23);
  for (const [x, y] of [
    [305, 246],
    [810, 281],
    [51, 325],
    [855, 429],
    [297, 485],
  ]) {
    rect(ctx, x, y - 5, 2, 6, "#a6a18a");
    ellipse(ctx, x + 1, y - 6, 5, 2, "#a16550");
    rect(ctx, x, y - 8, 2, 1, "#d3af80");
    rect(ctx, x + 8, y - 2, 1, 4, "#a6a18a");
    ellipse(ctx, x + 8, y - 3, 3, 2, "#997153");
  }

  // Window spill: geometric panes reach the ground and are broken by the path stones.
  polygon(
    ctx,
    [
      [192, 210],
      [227, 210],
      [251, 251],
      [178, 251],
    ],
    "rgba(230,163,66,0.06)",
  );
  light(ctx, 235, 231, 75, "#e9a351", 0.14, 0.45);
  light(ctx, 729, 237, 52, "#efb967", 0.14, 0.45);
  return c;
}
export function drawScene(ctx: Ctx): void {
  background ??= build();
  ctx.drawImage(background, 0, 0);
}
export function drawProp(ctx: Ctx, p: SceneProp): void {
  const key = `${p.kind}-${p.s}-${p.seed}`;
  let cached = sprites.get(key);
  if (!cached) {
    const c = surface(180, 180),
      cctx = c.getContext("2d")!,
      x = 90,
      y = 150;
    if (p.kind === "bush") bush(cctx, x, y, p.s, p.seed);
    if (p.kind === "pumpkin") pumpkin(cctx, x, y, p.s, p.seed);
    if (p.kind === "fence") fence(cctx, x, y, p.s);
    if (p.kind === "stone") stone(cctx, x, y, p.s, p.seed);
    if (p.kind === "candles") candles(cctx, x, y, p.s);
    if (p.kind === "tree") tree(cctx, x, y, p.s, p.seed);
    cached = { canvas: c, ox: 90, oy: 150 };
    sprites.set(key, cached);
  }
  ctx.drawImage(
    cached.canvas,
    Math.round(p.x - cached.ox),
    Math.round(p.y - cached.oy),
  );
}
export function drawLamp(
  ctx: Ctx,
  l: (typeof LAMPS)[number],
  time: number,
): void {
  lantern(ctx, l.x, l.y, l.s, time);
}
export function drawGroundLight(
  ctx: Ctx,
  x: number,
  y: number,
  time: number,
  s = 1,
): void {
  light(
    ctx,
    x,
    y,
    60 * s,
    "#ffa94b",
    0.17 + Math.sin(time * 5 + x) * 0.018,
    0.5,
  );
}
export function drawAtmosphere(ctx: Ctx, time: number): void {
  // Only the light changes: opaque lantern frames retain their pixel definition.
  for (const l of LAMPS) {
    light(
      ctx,
      l.x,
      l.y - 36 * l.s,
      35 * l.s,
      "#ffb84f",
      0.3 + Math.sin(time * 7 + l.x) * 0.025,
      1,
    );
    rect(
      ctx,
      l.x,
      l.y - 42 * l.s + (Math.floor(time * 7) % 2),
      1,
      3,
      "#fff2bb",
    );
  }
  // Chimney smoke drifts in little stepped puffs, with warm edges near its source.
  for (let i = 0; i < 6; i++) {
    const phase = (time * 7 + i * 8) % 48,
      x = 195 - phase * 0.22 + Math.sin(time + i) * 3,
      y = 74 - phase;
    ctx.save();
    ctx.globalAlpha = (1 - phase / 55) * 0.28;
    ellipse(ctx, x, y, 4 + phase * 0.12, 3 + phase * 0.06, "#9c8d9d");
    ctx.restore();
  }
  // Falling leaves are local to tree canopies.
  for (let i = 0; i < 11; i++) {
    const phase = (time * 9 + i * 19) % 130,
      side = i % 2 ? 875 : 66;
    const x = side + Math.sin(time * 0.9 + i) * 25 + phase * 0.12,
      y = 142 + phase;
    leaf(ctx, x, y, time + i, i, 0.65);
  }
  // Two small bat silhouettes, far behind gameplay.
  for (let i = 0; i < 2; i++) {
    const x = 368 + i * 198 + Math.sin(time * 0.22 + i) * 38,
      y = 52 + i * 29 + Math.cos(time * 0.4 + i) * 4,
      flap = Math.floor(time * 7 + i) % 2 ? 2 : -2;
    line(ctx, x - 7, y + flap, x, y, "#161b2e", 2);
    line(ctx, x, y, x + 7, y + flap, "#161b2e", 2);
    rect(ctx, x - 1, y, 3, 3, "#161b2e");
  }
  // Fireflies use a different scale and slower motion than the projectiles.
  for (let i = 0; i < 15; i++) {
    const x = 65 + hash(i * 73) * 830 + Math.sin(time * 0.6 + i) * 9,
      y = 270 + hash(i * 91) * 230 + Math.cos(time * 0.8 + i) * 4;
    const a = 0.3 + Math.sin(time * 1.6 + i) * 0.25;
    ctx.save();
    ctx.globalAlpha = a;
    rect(ctx, x, y, 1, 2, "#f6d37d");
    rect(ctx, x - 1, y, 3, 1, "#d4bc6c");
    ctx.restore();
  }
  // Near-corner grasses frame the scene without laying a solid bar over the action.
  for (let i = 0; i < 16; i++) {
    const x = i < 8 ? i * 9 : WIDTH - (i - 8) * 9,
      y = HEIGHT - 3;
    tuft(ctx, x, y, 1.1 + hash(i) * 0.8, i);
  }
}
export function drawWind(ctx: Ctx, time: number): void {
  for (let i = 0; i < 95; i++) {
    const x = hash(i * 31 + 9) * WIDTH,
      y = 258 + hash(i * 71) * 270;
    if (Math.abs(x - pathCenter(y)) < pathWidth(y) + 7) continue;
    const wave = Math.round(Math.sin(time * 1.8 + x * 0.02) * 1.5);
    line(ctx, x, y, x + wave, y - 3, "#56684e");
    line(ctx, x + 2, y, x + 3 + wave, y - 4, "#647253");
  }
}

let foreground: HTMLCanvasElement | undefined;
export function drawForeground(
  ctx: Ctx,
  viewer?: { x: number; y: number },
): void {
  if (!foreground) {
    foreground = surface(WIDTH, HEIGHT);
    const c = foreground.getContext("2d")!;
    // Ground-hugging fern leaves overlap only the corners; each has a shaded fold and a vein.
    for (const side of [-1, 1]) {
      const base = side === -1 ? 28 : 932;
      for (let i = 0; i < 14; i++) {
        const x = base + side * -hash(i + 51) * 125,
          y = 534 + hash(i + 81) * 11;
        const dx = (hash(i * 11 + 6) - 0.55) * 47,
          dy = -24 - hash(i * 7 + 3) * 46;
        const w = 9 + hash(i * 17 + 9) * 10;
        const left: Point[] = [],
          right: Point[] = [];
        for (let j = 0; j <= 8; j++) {
          const t = j / 8,
            ww = Math.sin(t * Math.PI) * w * (j % 2 ? 0.8 : 1);
          left.push([x + dx * t - ww, y + dy * t]);
          right.push([x + dx * t + ww, y + dy * t]);
        }
        polygon(c, [...left, ...right.slice().reverse()], "#282c40");
        polygon(
          c,
          [[x, y], [x + dx, y + dy], ...right.slice().reverse()],
          i % 2 ? "#4e4058" : "#41394d",
        );
        line(c, x, y, x + dx, y + dy, "#8c7181");
        for (let j = 1; j < 7; j++) {
          const t = j / 8,
            ww = Math.sin(t * Math.PI) * w * 0.75;
          line(
            c,
            x + dx * t,
            y + dy * t,
            x + dx * t - ww,
            y + dy * t - 4,
            "#51465e",
          );
          line(
            c,
            x + dx * t,
            y + dy * t,
            x + dx * t + ww,
            y + dy * t - 4,
            "#796079",
          );
          if (j % 2 === 0)
            rect(c, x + dx * t + ww, y + dy * t - 4, 1, 2, "#aa8172");
        }
      }
      // Near fence posts and berries frame the town without obstructing the play area.
      for (let i = 0; i < 5; i++) {
        const x = base - side * i * 22;
        line(c, x, 540, x - 4, 498 - (i % 3) * 7, "#514139", 2);
        for (let j = 0; j < 4; j++)
          leaf(c, x - 3 + (j % 2 ? 5 : -5), 505 + j * 6, j * 2, i + j, 1.3);
      }
    }
  }
  ctx.save();
  ctx.globalAlpha =
    viewer && viewer.y > 475 && (viewer.x < 180 || viewer.x > 780) ? 0.35 : 1;
  ctx.drawImage(foreground, 0, 0);
  ctx.restore();
}

let dawnWash: HTMLCanvasElement | undefined;
/** The last 30 seconds visibly approach dawn; the completed night keeps this light. */
export function drawNightShift(ctx: Ctx, progress: number): void {
  const dawn = Math.max(0, Math.min(1, (progress - 0.9) / 0.1));
  if (dawn === 0) return;
  if (!dawnWash) {
    dawnWash = surface(WIDTH, HEIGHT);
    const c = dawnWash.getContext("2d")!;
    for (let y = 0; y < 200; y++)
      rect(c, 0, y, WIDTH, 1, mix("#647498", "#b69a88", y / 200));
    for (let y = 200; y < HEIGHT; y++)
      rect(
        c,
        0,
        y,
        WIDTH,
        1,
        mix("#8d9790", "#748b88", (y - 200) / (HEIGHT - 200)),
      );
  }
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = dawn * 0.23;
  ctx.drawImage(dawnWash, 0, 0);
  ctx.restore();
}
