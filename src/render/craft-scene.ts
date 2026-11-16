import {
  piece,
  path,
  oval,
  box,
  grain,
  stitch,
  stroke,
  line,
  glow,
  shadow,
  noise,
  mix,
  hash,
  surface,
  type Ctx,
  type Point,
} from "./paper-material.js";
import {
  LAMPS,
  YARD_PROPS,
  type SceneProp,
  pathCenter as oldPathCenter,
} from "./scene.js";
export { LAMPS, YARD_PROPS };
const W = 960,
  H = 540;
function pathCenter(y: number): number {
  return (
    oldPathCenter(y) + (y < 348 ? 17 * Math.max(0, 1 - (y - 222) / 126) : 0)
  );
}
let background: HTMLCanvasElement | undefined,
  foreground: HTMLCanvasElement | undefined;
const propCache = new Map<string, HTMLCanvasElement>();

function paperSky(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, 210);
  g.addColorStop(0, "#24203c");
  g.addColorStop(0.55, "#39304f");
  g.addColorStop(1, "#68506c");
  const p = box(0, 0, W, 240);
  ctx.fillStyle = g;
  ctx.fill(p);
  grain(ctx, p, 0.85);
  // Blotches are pigment variations in the same sheet, not glowing decorative circles.
  const wash = surface(480, 110),
    wc = wash.getContext("2d")!,
    im = wc.createImageData(480, 110);
  for (let y = 0; y < 110; y++)
    for (let x = 0; x < 480; x++) {
      const n = noise(x, y, 36, 52) * 0.6 + noise(x, y, 9, 243) * 0.4;
      const i = (y * 480 + x) * 4;
      im.data[i] = 108;
      im.data[i + 1] = 91;
      im.data[i + 2] = 140;
      im.data[i + 3] = Math.max(0, n - 0.33) * 100;
    }
  wc.putImageData(im, 0, 0);
  ctx.drawImage(wash, 0, 0, W, 220);
  for (let i = 0; i < 65; i++) {
    const x = 20 + hash(i * 47) * 920,
      y = 17 + hash(i * 73) * 117;
    if (i % 8 === 0) star(ctx, x, y, 2.4, "#e8c78b");
    else {
      ctx.fillStyle = i % 3 ? "#bca4a9" : "#e2c097";
      ctx.fill(oval(x, y, 0.6, 0.7, i));
    }
  }
  cloud(ctx, 263, 71, 1.0, 11);
  cloud(ctx, 589, 62, 0.76, 21);
  cloud(ctx, 880, 95, 0.85, 33);
  ctx.save();
  ctx.translate(770, 61);
  glow(ctx, 0, 0, 66, "#dfb374", 0.23);
  const crescent = new Path2D(
    "M 13 -28 C -8 -35 -33 -18 -32 4 C -32 28 -3 42 22 22 C 2 27 -18 16 -18 -4 C -17 -17 -4 -26 13 -28 Z",
  );
  piece(ctx, crescent, "#edd198", {
    shadow: 2.3,
    texture: 0.65,
    edge: "#fff0c4",
  });
  stitch(ctx, oval(0, 2, 43, 43, 12, 0.018), "#b99565", 0.65);
  stitch(ctx, oval(0, 2, 48, 48, 13, 0.012), "#b99565", 0.35);
  ctx.restore();
  // Paper silhouettes soften into the distance; each ridge casts its own thin edge.
  for (let layer = 0; layer < 3; layer++) {
    const pts: Point[] = [[0, 230]];
    for (let x = -10; x <= 970; x += 22)
      pts.push([
        x,
        137 +
          layer * 20 +
          Math.sin(x * 0.013 + layer * 2) * 15 +
          Math.sin(x * 0.038 + layer) * 7,
      ]);
    pts.push([960, 245]);
    piece(ctx, path(pts), ["#51415e", "#39354f", "#2e3241"][layer]!, {
      shadow: 2,
      texture: 0.65,
      thickness: 0.8,
    });
    for (let i = 0; i < 10; i++)
      pine(
        ctx,
        55 + i * 98 + hash(i * 17 + layer) * 21,
        172 + layer * 17,
        0.45 + hash(i * 5) * 0.35,
        layer === 2 ? "#29313b" : "#3b3650",
      );
  }
}
function star(ctx: Ctx, x: number, y: number, r: number, c: string): void {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      rr = i % 2 ? r * 0.42 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  piece(ctx, path(pts), c, { shadow: 0.6, texture: 0.35, thickness: 0.3 });
}
function cloud(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = 0.7;
  const p = new Path2D(
    "M -54 11 C -41 6 -38 -2 -26 -1 C -27 -20 -1 -26 6 -10 C 18 -16 32 -7 29 2 C 42 -3 53 9 47 15 C 15 20 -21 17 -54 11 Z",
  );
  piece(ctx, p, "#7a6885", {
    shadow: 2,
    texture: 0.8,
    edge: "#a48b94",
    stitch: true,
  });
  const inner = new Path2D("M -28 7 Q -8 -2 7 6 Q 21 1 34 11");
  stroke(ctx, inner, "#9a8196", 0.6, 0.5);
  void seed;
  ctx.restore();
}
function pine(ctx: Ctx, x: number, y: number, s: number, c: string): void {
  const pts: Point[] = [
    [x - 2 * s, y],
    [x - 2 * s, y - 18 * s],
    [x - 13 * s, y - 18 * s],
    [x - 6 * s, y - 29 * s],
    [x - 11 * s, y - 29 * s],
    [x - 4 * s, y - 39 * s],
    [x - 7 * s, y - 39 * s],
    [x, y - 53 * s],
    [x + 7 * s, y - 39 * s],
    [x + 4 * s, y - 39 * s],
    [x + 11 * s, y - 29 * s],
    [x + 6 * s, y - 29 * s],
    [x + 13 * s, y - 18 * s],
    [x + 2 * s, y - 18 * s],
    [x + 2 * s, y],
  ];
  piece(ctx, path(pts), c, { shadow: 1, texture: 0.6, thickness: 0.4 });
}
function ground(ctx: Ctx): void {
  const p = new Path2D();
  p.moveTo(0, 194);
  for (let x = 0; x <= 960; x += 12)
    p.lineTo(x, 190 + Math.sin(x * 0.015) * 8 + Math.sin(x * 0.043) * 2);
  p.lineTo(960, 540);
  p.lineTo(0, 540);
  p.closePath();
  piece(ctx, p, "#52574b", { shadow: 2, texture: 0.7, edge: "#68705b" });
  const c = surface(960, 360),
    cc = c.getContext("2d")!,
    im = cc.createImageData(960, 360);
  for (let y = 0; y < 360; y++)
    for (let x = 0; x < 960; x++) {
      const worldY = y + 180,
        n =
          noise(x, worldY, 85, 15) * 0.2 +
          noise(x, worldY, 22, 316) * 0.3 +
          noise(x, worldY, 3, 818) * 0.5;
      const fine = hash(x * 17 + y * 797),
        light = Math.max(
          0,
          1 - Math.hypot((x - 490) / 460, (worldY - 340) / 270),
        );
      let r = 45 + n * 29 + fine * 7,
        g = 49 + n * 28 + fine * 6,
        b = 40 + n * 22 + fine * 5;
      r += light * 5;
      g += light * 4;
      for (const l of LAMPS) {
        const k =
          Math.max(0, 1 - Math.hypot((x - l.x) / 78, (worldY - l.y) / 47)) ** 2;
        r += k * 48;
        g += k * 27;
        b += k * 4;
      }
      const i = (y * 960 + x) * 4;
      im.data[i] = r;
      im.data[i + 1] = g;
      im.data[i + 2] = b;
      im.data[i + 3] = 255;
    }
  cc.putImageData(im, 0, 0);
  ctx.save();
  ctx.clip(p);
  ctx.drawImage(c, 0, 180);
  grain(ctx, p, 0.45);
  ctx.restore();
  // Quiet, short hatching follows patches of moss; it never becomes confetti.
  for (let i = 0; i < 6500; i++) {
    const x = hash(i * 17) * 960,
      y = 205 + hash(i * 37) * 325;
    const center = y >= 225 ? pathCenter(y) : 0;
    if (y > 225 && Math.abs(x - center) < 24) continue;
    if (noise(x, y, 30, 65) < 0.43) continue;
    const c = hash(i * 29) > 0.85 ? "#92906a" : "#6c7358";
    line(ctx, x, y, x + 1.2, y - 1.5, c, 0.35, 0.32);
  }
}
function road(ctx: Ctx): void {
  const left: Point[] = [],
    right: Point[] = [];
  for (let y = 222; y <= 550; y += 4) {
    const cx = pathCenter(y),
      w = 13 + (y - 222) * 0.044;
    left.push([cx - w + (hash(y) - 0.5), y]);
    right.push([cx + w + (hash(y + 11) - 0.5), y]);
  }
  const p = path([...left, ...right.reverse()]);
  piece(ctx, p, "#bfb399", {
    shadow: 2.7,
    edge: "#e4cfaa",
    texture: 0.75,
    thickness: 2,
  });
  ctx.save();
  ctx.clip(p);
  for (let i = 0; i < 1100; i++) {
    const y = 225 + hash(i * 29) * 315,
      x = pathCenter(y) + (hash(i * 43) - 0.5) * (28 + (y - 220) * 0.085);
    const d = new Path2D();
    d.ellipse(
      x,
      y,
      1 + hash(i + 8) * 2,
      0.3 + hash(i) * 0.6,
      hash(i + 2) * 2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = i % 3 ? "rgba(95,77,64,.12)" : "rgba(245,224,186,.28)";
    ctx.fill(d);
  }
  ctx.restore();
  const edges = new Path2D();
  for (const side of [-1, 1]) {
    for (let y = 225; y < 540; y += 4) {
      const x = pathCenter(y) + side * (10 + (y - 222) * 0.044);
      if (y === 225) edges.moveTo(x, y);
      else edges.lineTo(x, y);
    }
  }
  stitch(ctx, edges, "#826c55", 0.9);
  for (const y of [249, 285, 337, 413, 481]) {
    const x = pathCenter(y),
      p = oval(x + 2, y, 6 + (y - 220) / 90, 3, y, 0.09);
    piece(ctx, p, "#a89e88", { shadow: 0.5, texture: 0.75, thickness: 0.45 });
  }
}
function leaf(
  ctx: Ctx,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
  color: string,
  seed: number,
  stitched = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const p = new Path2D(
    `M 0 0 C ${-width} ${-length * 0.3} ${-width * 0.8} ${-length * 0.72} 0 ${-length} C ${width * 0.9} ${-length * 0.7} ${width} ${-length * 0.2} 0 0 Z`,
  );
  piece(ctx, p, color, {
    shadow: length > 18 ? 1.7 : 0.55,
    edge: mix(color, "#e2b272", 0.5),
    texture: 0.65,
    thickness: length > 18 ? 0.7 : 0.35,
  });
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = "rgba(24,17,32,.13)";
  ctx.fill(
    path([
      [0, 0],
      [0, -length],
      [width * 2, -length / 2],
      [width, 0],
    ]),
  );
  ctx.restore();
  line(ctx, 0, -2, 0, -length + 2, mix(color, "#f3c17e", 0.5), 0.5, 0.8);
  if (length > 13)
    for (let j = 1; j < 4; j++) {
      const yy = (-length * j) / 4;
      line(
        ctx,
        0,
        yy,
        -width * 0.55,
        yy - 3,
        mix(color, "#e4b983", 0.3),
        0.35,
        0.65,
      );
      line(
        ctx,
        0,
        yy,
        width * 0.55,
        yy - 3,
        mix(color, "#e4b983", 0.3),
        0.35,
        0.65,
      );
    }
  if (stitched) stitch(ctx, p, "#d6aa70", 0.6);
  void seed;
  ctx.restore();
}
function tree(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 40, 11);
  const trunk = new Path2D(
    "M -14 2 Q -5 -29 -9 -61 L -22 -91 L -15 -94 L -2 -66 L 2 -109 L 9 -111 L 7 -65 L 26 -91 L 31 -86 L 10 -47 Q 8 -20 18 3 L 6 -2 L 0 3 L -4 -2 Z",
  );
  piece(ctx, trunk, "#665044", { shadow: 2.6, edge: "#98774e", texture: 0.7 });
  const bark = new Path2D(
    "M -5 -3 Q 1 -31 -3 -54 M 5 -7 Q 2 -39 6 -61 M 0 -69 L 5 -97 M -6 -55 L -17 -84 M 9 -49 L 26 -83",
  );
  stroke(ctx, bark, "#a07850", 0.7, 0.75);
  const clumps = [
    [-38, -84, 30, 33],
    [-18, -113, 33, 32],
    [15, -111, 33, 34],
    [41, -83, 29, 31],
    [-22, -66, 32, 27],
    [12, -72, 37, 33],
  ];
  const palette =
    seed % 2
      ? ["#934b4f", "#bc7050", "#d18b50", "#c77b45", "#974c4e", "#ba6b48"]
      : ["#8c4351", "#aa5949", "#d18a4a", "#c77842", "#9b4b49", "#bd6742"];
  clumps.forEach(([cx, cy, rx, ry], i) => {
    const p = oval(cx!, cy!, rx!, ry!, seed + i * 17, 0.13);
    piece(ctx, p, palette[i]!, {
      shadow: 3.2,
      texture: 0.95,
      edge: "#bb8c5c",
      thickness: 0.85,
    });
    ctx.save();
    ctx.clip(p);
    const foldLight = ctx.createLinearGradient(
      cx! - rx! * 0.8,
      cy! - ry!,
      cx! + rx! * 0.5,
      cy! + ry!,
    );
    foldLight.addColorStop(0, "rgba(249,201,136,.2)");
    foldLight.addColorStop(0.45, "rgba(245,194,128,.02)");
    foldLight.addColorStop(1, "rgba(44,19,41,.26)");
    ctx.fillStyle = foldLight;
    ctx.fill(p);
    ctx.restore();
    stitch(
      ctx,
      oval(cx!, cy!, rx! - 2.6, ry! - 2.5, seed + i * 17, 0.12),
      "#d9ab6c",
      0.75,
    );
    const branch = new Path2D();
    branch.moveTo(cx!, cy! + ry! * 0.8);
    branch.quadraticCurveTo(cx! - 3, cy!, cx! + 3, cy! - ry! * 0.7);
    branch.moveTo(cx! - 1, cy! + 7);
    branch.lineTo(cx! - rx! * 0.5, cy! - ry! * 0.3);
    branch.moveTo(cx!, cy! + 4);
    branch.lineTo(cx! + rx! * 0.5, cy! - ry! * 0.4);
    stroke(ctx, branch, "#a7794f", 1.4, 0.85);
    stroke(ctx, branch, "#d1a260", 0.45, 0.8);
    // Pressed irregular leaf marks are kept within the paper clump.
    ctx.save();
    ctx.clip(p);
    for (let j = 0; j < 20; j++) {
      const xx = cx! + (hash(j * 13 + i * 71 + seed) - 0.5) * rx! * 1.5,
        yy = cy! + (hash(j * 31 + i * 5 + seed) - 0.5) * ry! * 1.5;
      line(ctx, xx, yy, xx + 2, yy - 1, "#e6ae72", 0.45, 0.25);
    }
    ctx.restore();
  });
  for (let i = 0; i < 10; i++)
    leaf(
      ctx,
      (hash(seed + i * 11) - 0.5) * 75,
      hash(seed + i * 31) * 10,
      7,
      3,
      hash(i) * 5,
      ["#b57944", "#a0583b", "#c28c49"][i % 3]!,
      i,
    );
  ctx.restore();
}
function windowArt(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const p = new Path2D(
    `M ${x} ${y + h} L ${x} ${y + 7} Q ${x + w / 2} ${y - 7} ${x + w} ${y + 7} L ${x + w} ${y + h} Z`,
  );
  glow(ctx, x + w / 2, y + h * 0.6, w * 2.6, "#ffc065", 0.37);
  piece(ctx, p, "#edbb64", {
    shadow: 1.1,
    edge: "#634431",
    thickness: 2,
    texture: 0.4,
  });
  ctx.save();
  ctx.clip(p);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#ffe4a1");
  g.addColorStop(0.6, "#efb35a");
  g.addColorStop(1, "#bd6e32");
  ctx.fillStyle = g;
  ctx.fill(p);
  grain(ctx, p, 0.32);
  ctx.restore();
  line(ctx, x + w / 2, y + 2, x + w / 2, y + h, "#805337", 1.6);
  line(ctx, x + 1, y + h * 0.58, x + w - 1, y + h * 0.58, "#8f5b35", 1.4);
  piece(ctx, box(x - 3, y + h, w + 6, 3), "#baa07e", {
    shadow: 1,
    texture: 0.7,
    edge: "#e2c095",
    thickness: 0.7,
  });
}
function cottage(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, -9, 6, 99, 16);
  // A turned side wall and a cream front gable give the cottage a folded-paper volume.
  piece(
    ctx,
    path([
      [-96, -57],
      [-23, -62],
      [-23, 3],
      [-96, -1],
    ]),
    "#b6a58a",
    { shadow: 3.2, edge: "#e0c6a0", texture: 0.9, thickness: 1.1 },
  );
  piece(
    ctx,
    path([
      [-24, -61],
      [23, -123],
      [83, -62],
      [83, 4],
      [-24, 4],
    ]),
    "#dcc9a9",
    { shadow: 2.7, edge: "#f0d7af", texture: 0.9, thickness: 1.1 },
  );
  piece(
    ctx,
    path([
      [83, -62],
      [91, -68],
      [91, -2],
      [83, 4],
    ]),
    "#aa9478",
    { shadow: 1.3, texture: 0.9, edge: "#c2a887", thickness: 0.8 },
  );
  ctx.save();
  ctx.clip(
    path([
      [-24, -61],
      [23, -123],
      [83, -62],
      [83, 4],
      [-24, 4],
    ]),
  );
  const wallLight = ctx.createLinearGradient(-24, -70, 83, 5);
  wallLight.addColorStop(0, "rgba(255,224,175,.13)");
  wallLight.addColorStop(1, "rgba(88,52,43,.12)");
  ctx.fillStyle = wallLight;
  ctx.fillRect(-24, -123, 108, 127);
  ctx.restore();
  for (let i = 0; i < 48; i++) {
    const xx = -91 + hash(seed + i * 13) * 167,
      yy = -48 + hash(seed + i * 31) * 46;
    piece(
      ctx,
      box(xx, yy, 3 + hash(i) * 5, 2.3, i),
      xx < -24 ? "#a69377" : "#c5af8c",
      { shadow: 0, texture: 0.75, thickness: 0.18 },
    );
  }
  piece(
    ctx,
    path([
      [-97, -4],
      [83, -1],
      [83, 9],
      [-97, 5],
    ]),
    "#847b69",
    { shadow: 1.5, edge: "#bbab8d", texture: 0.85, thickness: 0.8 },
  );
  for (let i = 0; i < 15; i++)
    line(ctx, -94 + i * 12, 1, -94 + i * 12, 6, "#625a50", 0.6, 0.65);
  // The broad roof is a receding plane; the front gable remains visible below the ridge.
  const roof = path([
    [-111, -58],
    [-40, -130],
    [24, -133],
    [-24, -57],
  ]);
  piece(ctx, roof, "#4a3449", {
    shadow: 4,
    edge: "#b48b59",
    texture: 0.8,
    thickness: 1.7,
  });
  ctx.save();
  ctx.clip(roof);
  for (let row = 0; row < 12; row++) {
    const yy = -58 - row * 6.4;
    for (let xx = -116 - (row % 2) * 5; xx < 35; xx += 11) {
      const p = new Path2D(
        `M ${xx} ${yy - 7} L ${xx + 12} ${yy - 7} L ${xx + 10} ${yy + 1} Q ${xx + 5} ${yy + 4} ${xx - 1} ${yy + 1} Z`,
      );
      const palette = ["#57404e", "#644553", "#714d59", "#4c3749"];
      piece(
        ctx,
        p,
        palette[Math.floor(hash(seed + row * 71 + Math.floor(xx)) * 4)]!,
        { shadow: 1.25, texture: 0.8, edge: "#98765e", thickness: 0.5 },
      );
    }
  }
  const shade = ctx.createLinearGradient(-102, -75, 15, -121);
  shade.addColorStop(0, "rgba(17,15,29,.16)");
  shade.addColorStop(1, "rgba(228,170,108,.09)");
  ctx.fillStyle = shade;
  ctx.fill(roof);
  ctx.restore();
  const eaves = new Path2D("M -112 -57 L -24 -56 L 24 -134 L 90 -58");
  stroke(ctx, eaves, "#48332e", 3.8);
  stroke(ctx, eaves, "#c29a61", 1.0);
  const ridge = new Path2D("M -40 -131 L 24 -134");
  stroke(ctx, ridge, "#74513b", 3);
  stroke(ctx, ridge, "#d0a767", 0.7);
  stitch(
    ctx,
    new Path2D("M -107 -60 L -27 -59 L 23 -128 L 85 -60"),
    "#d1ad77",
    0.7,
  );
  // Chimney with a folded side, irregular brick seams, and a heavy cap.
  piece(ctx, box(-68, -132, 17, 40), "#c1aa89", {
    shadow: 2,
    edge: "#e5cda6",
    texture: 0.9,
  });
  piece(
    ctx,
    path([
      [-51, -132],
      [-46, -135],
      [-46, -95],
      [-51, -92],
    ]),
    "#927b62",
    { shadow: 0.5, texture: 0.8, thickness: 0.5 },
  );
  for (let row = 0; row < 7; row++) {
    line(ctx, -67, -127 + row * 5, -52, -127 + row * 5, "#93785b", 0.65);
    line(
      ctx,
      -62 + (row % 2) * 5,
      -126 + row * 5,
      -62 + (row % 2) * 5,
      -123 + row * 5,
      "#a58a68",
      0.5,
    );
  }
  piece(ctx, box(-71, -137, 26, 5), "#6f4d3d", {
    shadow: 1.8,
    edge: "#ba9160",
    texture: 0.85,
  });
  // Windows are recessed and light their cream surrounds.
  windowArt(ctx, -83, -44, 17, 27);
  windowArt(ctx, -52, -43, 17, 26);
  windowArt(ctx, -10, -43, 19, 27);
  windowArt(ctx, 57, -43, 17, 27);
  windowArt(ctx, 19, -82, 12, 18);
  const door = new Path2D("M 24 4 L 24 -34 Q 35 -47 46 -34 L 46 4 Z");
  piece(ctx, door, "#624731", {
    shadow: 2,
    edge: "#b68e56",
    texture: 0.9,
    thickness: 1.4,
  });
  for (let i = 0; i < 4; i++)
    line(ctx, 27 + i * 4.6, -31, 27 + i * 4.6, 3, "#a07a47", 0.6);
  ctx.fillStyle = "#d5b269";
  ctx.fill(oval(41, -13, 1.1, 1.1));
  for (let i = 0; i < 3; i++)
    piece(ctx, box(19 - i * 3, 10 + i * 3, 32 + i * 6, 3.6), "#b0a084", {
      shadow: 1.2,
      edge: "#dac49c",
      texture: 0.8,
      thickness: 0.6,
    });
  line(ctx, -24, -56, -24, 2, "#ac9471", 1.3);
  line(ctx, 82, -57, 82, 3, "#927451", 1.3);
  piece(ctx, box(-86, -13, 24, 5), "#876044", {
    shadow: 1.3,
    edge: "#bf955d",
    texture: 0.85,
  });
  piece(ctx, box(-12, -12, 24, 5), "#876044", {
    shadow: 1.3,
    edge: "#bf955d",
    texture: 0.85,
  });
  for (let i = 0; i < 6; i++) {
    flower(ctx, -83 + i * 3.6, -13 - (i % 2), 0.45, i);
    flower(ctx, -9 + i * 3.6, -12 - (i % 2), 0.42, i + 1);
  }
  const ivy = new Path2D("M -22 -8 Q -31 -39 -16 -69 Q 2 -83 15 -116");
  stroke(ctx, ivy, "#785c3d", 1.1);
  for (let i = 0; i < 25; i++)
    leaf(
      ctx,
      -24 + i * 1.65,
      -27 - i * 3.4,
      5.5 + (i % 3),
      2.6,
      i % 2 ? -1 : 0.8,
      ["#b97a3d", "#956a39", "#c89349"][i % 3]!,
      seed + i,
    );
  lantern(ctx, 77, -19, 0.58, false);
  for (let i = 0; i < 5; i++)
    piece(
      ctx,
      oval(-97 + (i % 2) * 9, -2 - Math.floor(i / 2) * 5, 7, 3, i, 0.12),
      "#9e7a4c",
      { shadow: 1, edge: "#c5a172", texture: 0.85, thickness: 0.5 },
    );
  ctx.restore();
}
function lantern(ctx: Ctx, x: number, y: number, s: number, post = true): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 2, 11, 3);
  if (post) {
    piece(
      ctx,
      path([
        [-3, 1],
        [-3, -39],
        [2, -43],
        [4, 1],
      ]),
      "#705038",
      { shadow: 1.7, edge: "#a9804b", texture: 0.8 },
    );
    piece(ctx, box(-6, 0, 12, 3), "#66513e", { shadow: 0.8, edge: "#a58658" });
  }
  const top = post ? -53 : -24;
  const handle = new Path2D(
    `M -4 ${top - 1} C -6 ${top - 14} 7 ${top - 13} 5 ${top - 1}`,
  );
  stroke(ctx, handle, "#b28d54", 1.1);
  glow(ctx, 0, top + 12, 31, "#ffc15b", 0.28);
  piece(
    ctx,
    path([
      [-10, top + 3],
      [0, top - 4],
      [11, top + 3],
    ]),
    "#816044",
    { shadow: 1.3, edge: "#d5ad6c", texture: 0.8 },
  );
  piece(
    ctx,
    path([
      [-9, top + 4],
      [9, top + 4],
      [7, top + 24],
      [-7, top + 24],
    ]),
    "#e2a956",
    { shadow: 1.7, edge: "#664a35", texture: 0.45, thickness: 1.1 },
  );
  const g = ctx.createLinearGradient(-7, top + 8, 7, top + 20);
  g.addColorStop(0, "#efb95e");
  g.addColorStop(0.5, "#fff0b1");
  g.addColorStop(1, "#efbb69");
  ctx.fillStyle = g;
  ctx.fill(
    path([
      [-6, top + 6],
      [6, top + 6],
      [5, top + 21],
      [-5, top + 21],
    ]),
  );
  for (const dx of [-8, 0, 8])
    line(ctx, dx, top + 4, dx * 0.75, top + 24, "#755136", 1.1);
  line(ctx, -7, top + 24, 7, top + 24, "#9e7745", 2);
  line(ctx, -5, top + 25, 5, top + 25, "#d7b175", 0.65);
  ctx.restore();
}
function bush(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  shadow(ctx, x, y + 2, 29 * s, 6 * s);
  for (let i = 0; i < 4; i++) {
    const xx = x + (i - 1.5) * 13 * s,
      yy = y - 8 * s - Math.sin(i) * 7 * s,
      p = oval(xx, yy, 15 * s, 13 * s, seed + i, 0.13);
    piece(ctx, p, ["#556044", "#6c7150", "#737850", "#5a6548"][i]!, {
      shadow: 1.7,
      edge: "#a49e63",
      texture: 0.8,
      thickness: 0.8,
    });
    stitch(
      ctx,
      oval(xx, yy, 13.6 * s, 11.7 * s, seed + i, 0.12),
      "#b4a76a",
      0.6,
    );
    for (let j = 0; j < 4; j++)
      leaf(
        ctx,
        xx + (hash(j + seed) - 0.5) * 17 * s,
        yy + 5 * s,
        5 * s,
        2 * s,
        j,
        "#737c51",
        j,
      );
  }
  if (seed % 3 === 0)
    for (let i = 0; i < 4; i++)
      flower(
        ctx,
        x + (i - 1.5) * 8 * s,
        y - 13 * s + (i % 2) * 4,
        0.45 * s,
        seed + i,
      );
}
function flower(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  line(ctx, x, y, x, y - 10 * s, "#8c915b", 0.7 * s);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2,
      p = oval(
        x + Math.cos(a) * 3 * s,
        y - 12 * s + Math.sin(a) * 3 * s,
        2.6 * s,
        1.6 * s,
        seed + i,
      );
    piece(ctx, p, seed % 2 ? "#dac69c" : "#c39d8a", {
      shadow: 0.4,
      texture: 0.6,
      thickness: 0.3,
    });
  }
  piece(ctx, oval(x, y - 12 * s, 1.6 * s, 1.6 * s), "#dfb366", {
    shadow: 0.4,
    texture: 0.6,
    thickness: 0.2,
  });
}
function pumpkin(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 17, 5);
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 5,
      p = oval(dx, -11, 7.5, 11 - Math.abs(i - 2) * 0.7, seed + i, 0.07);
    piece(ctx, p, ["#a4542b", "#c47735", "#e5a34c", "#d1903e", "#ae632d"][i]!, {
      shadow: i === 0 ? 1.7 : 0.5,
      edge: "#e9b86a",
      texture: 0.8,
      thickness: 0.75,
    });
  }
  piece(
    ctx,
    path([
      [-2, -20],
      [-2, -27],
      [3, -28],
      [2, -21],
    ]),
    "#68603e",
    { shadow: 0.6, edge: "#a38c50", texture: 0.8, thickness: 0.6 },
  );
  if (seed % 4 !== 0) {
    glow(ctx, 0, -8, 19, "#f9c264", 0.15);
    for (const p of [
      path([
        [-11, -12],
        [-6, -16],
        [-3, -10],
      ]),
      path([
        [3, -10],
        [6, -16],
        [11, -12],
      ]),
      path([
        [-10, -6],
        [-6, -5],
        [-4, -7],
        [-2, -5],
        [2, -5],
        [4, -7],
        [6, -5],
        [10, -6],
        [6, -1],
        [-6, -1],
      ]),
    ]) {
      piece(ctx, p, "#ffe4a0", {
        shadow: 0,
        edge: "#9c541f",
        texture: 0.35,
        thickness: 0.65,
      });
    }
  }
  leaf(ctx, 12, 1, 9, 4, 1.0, "#b38c46", seed);
  ctx.restore();
}
function fence(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 3, 44, 7);
  for (const yy of [-19, -8])
    piece(
      ctx,
      path([
        [-39, yy + 1],
        [40, yy - 2],
        [40, yy + 2],
        [-39, yy + 5],
      ]),
      "#624b35",
      { shadow: 1.3, edge: "#947747", texture: 0.8, thickness: 0.7 },
    );
  for (let i = 0; i < 4; i++) {
    const xx = -34 + i * 24;
    piece(
      ctx,
      path([
        [xx - 3, 2],
        [xx - 3, -28],
        [xx - 6, -29],
        [xx, -36],
        [xx + 6, -29],
        [xx + 3, -28],
        [xx + 3, 2],
      ]),
      "#6b4d34",
      { shadow: 2, edge: "#b2884f", texture: 0.8, thickness: 0.8 },
    );
    line(ctx, xx - 1, -25, xx - 1, 0, "#ac8251", 0.65);
    for (const yy of [-17, -7]) {
      ctx.fillStyle = "#c2a270";
      ctx.fill(oval(xx + 1, yy, 0.65, 0.65));
    }
  }
  ctx.restore();
}
function stone(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  shadow(ctx, x, y + 2, 12 * s, 4 * s);
  const p = path(
    [
      [x - 12 * s, y - 3 * s],
      [x - 7 * s, y - 10 * s],
      [x + 4 * s, y - 12 * s],
      [x + 12 * s, y - 5 * s],
      [x + 10 * s, y + 1 * s],
      [x - 6 * s, y + 3 * s],
    ],
    true,
  );
  piece(ctx, p, "#9a8b7e", {
    shadow: 1.8,
    edge: "#c2ae91",
    texture: 0.85,
    thickness: 0.8,
  });
  stroke(
    ctx,
    path(
      [
        [x - 7 * s, y - 8 * s],
        [x + 3 * s, y - 10 * s],
        [x + 8 * s, y - 5 * s],
      ],
      true,
    ),
    "#d3bca0",
    0.6,
    0.6,
  );
  void seed;
}
function candles(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 2, 17, 5);
  piece(ctx, box(-16, -4, 32, 8), "#6a4c3b", {
    shadow: 1.5,
    edge: "#95704d",
    texture: 0.8,
  });
  piece(ctx, oval(0, -4, 16, 4, 9, 0.07), "#b4986b", {
    shadow: 0,
    texture: 0.8,
    edge: "#dac297",
    thickness: 0.7,
  });
  stitch(ctx, oval(0, -4, 10, 2.6), "#8e714e", 0.5);
  for (const [dx, h] of [
    [-8, 14],
    [0, 20],
    [8, 12],
  ]) {
    piece(ctx, box(dx! - 2, -h!, 4, h! - 4), "#e6d0a4", {
      shadow: 1,
      edge: "#fff0c8",
      texture: 0.7,
      thickness: 0.55,
    });
    line(ctx, dx! + 1, -h! + 3, dx! + 1, -h! + 6, "#f7e7c1", 1.2);
    const p = new Path2D(
      `M ${dx! - 2} ${-h! - 1} Q ${dx! - 4} ${-h! - 5} ${dx!} ${-h! - 10} Q ${dx! + 5} ${-h! - 4} ${dx! + 2} ${-h! - 1} Z`,
    );
    glow(ctx, dx!, -h! - 4, 13, "#f4bf65", 0.17);
    piece(ctx, p, "#f7ca76", {
      shadow: 0,
      texture: 0.25,
      edge: "#ffdca1",
      thickness: 0.3,
    });
  }
  ctx.restore();
}
function grassTuft(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  for (let i = 0; i < 6; i++) {
    const h = (5 + hash(seed + i * 11) * 8) * s,
      d = (i - 2.5) * 2.2 * s,
      p = new Path2D();
    p.moveTo(x, y);
    p.quadraticCurveTo(x + d * 0.4, y - h * 0.5, x + d, y - h);
    stroke(ctx, p, i % 3 ? "#929768" : "#676f4f", 0.7 * s, 0.7);
  }
}
function garden(ctx: Ctx): void {
  for (const [x, y, s] of [
    [54, 252, 1.05],
    [147, 250, 0.8],
    [307, 236, 0.8],
    [548, 230, 0.7],
    [770, 256, 0.9],
    [916, 264, 1.1],
  ])
    bush(ctx, x!, y!, s!, Math.floor(x!));
  for (const [x, y] of [
    [64, 280],
    [311, 267],
    [687, 273],
    [875, 290],
    [274, 350],
    [746, 397],
    [292, 480],
    [46, 369],
  ]) {
    for (let i = 0; i < 4; i++)
      flower(ctx, x! + (i - 1.5) * 6, y! + Math.sin(i) * 4, 0.6, i);
    grassTuft(ctx, x! - 8, y! + 3, 0.7, x!);
  }
  for (const [x, y] of [
    [320, 259],
    [677, 267],
    [850, 280],
    [70, 345],
    [295, 430],
    [840, 420],
    [285, 490],
  ])
    for (let i = 0; i < 8; i++)
      leaf(
        ctx,
        x! + (hash(i + x!) - 0.5) * 32,
        y! + hash(i + y!) * 10,
        6 + hash(i) * 3,
        3,
        hash(i * 11) * 6,
        ["#b97a3e", "#9f5740", "#b68b48"][i % 3]!,
        i,
      );
}
function gardenDetails(ctx: Ctx): void {
  // A tiny memorial garden tucked into the left edge, with layered stone and moss.
  shadow(ctx, 39, 475, 21, 6);
  const tomb = new Path2D(
    "M 23 475 L 23 446 Q 22 429 38 426 Q 54 428 55 445 L 57 475 Z",
  );
  piece(ctx, tomb, "#817486", {
    shadow: 3,
    edge: "#b39a9a",
    texture: 0.95,
    thickness: 1.2,
  });
  const inset = new Path2D(
    "M 29 467 L 29 447 Q 29 435 39 433 Q 49 435 49 447 L 50 467",
  );
  stroke(ctx, inset, "#b199a1", 0.7);
  stitch(ctx, inset, "#bfa48f", 0.45);
  ctx.fillStyle = "#55435e";
  ctx.fill(oval(39, 445, 3, 5));
  line(ctx, 33, 459, 45, 459, "#a58b8f", 0.6);
  line(ctx, 35, 462, 43, 462, "#a58b8f", 0.5);
  for (let i = 0; i < 5; i++)
    leaf(
      ctx,
      24 + i * 8,
      478,
      12,
      4,
      (i - 2) * 0.4,
      ["#766645", "#916a45", "#8a6846"][i % 3]!,
      i,
    );
  bush(ctx, 185, 317, 0.7, 84);
  stone(ctx, 173, 325, 0.85, 81);
  for (let i = 0; i < 4; i++)
    flower(ctx, 190 + i * 6, 329 + (i % 2) * 3, 0.65, i);
  // A bent boundary stone and a fern nest on the opposite side of the path.
  piece(
    ctx,
    path(
      [
        [810, 504],
        [809, 473],
        [814, 462],
        [830, 460],
        [840, 474],
        [839, 503],
      ],
      true,
    ),
    "#827681",
    { shadow: 2.5, edge: "#ad9295", texture: 0.9, thickness: 0.9 },
  );
  for (const [x, y] of [
    [818, 475],
    [829, 474],
    [818, 486],
    [830, 485],
  ])
    piece(ctx, oval(x, y, 1.7, 3.2), "#504252", {
      shadow: 0,
      texture: 0.55,
      thickness: 0.35,
    });
  const crack = new Path2D("M 833 465 L 829 474 L 834 482");
  stroke(ctx, crack, "#5e4c60", 0.6, 0.8);
  for (let i = 0; i < 6; i++)
    leaf(
      ctx,
      802 + i * 8,
      509,
      17 + hash(i) * 10,
      6,
      (i - 3) * 0.4,
      ["#78604f", "#8d664e", "#6c5a54"][i % 3]!,
      i,
      true,
    );
  // Each patch has a clear centre: a rock, flower heads, then a few surrounding leaves.
  for (const [x, y] of [
    [259, 388],
    [690, 355],
    [210, 473],
    [718, 445],
  ]) {
    stone(ctx, x, y, 0.5, x);
    grassTuft(ctx, x - 9, y + 3, 0.85, x);
    for (let i = 0; i < 3; i++)
      flower(ctx, x + 7 + i * 5, y + 4 + (i % 2) * 2, 0.55, i + x);
    for (let i = 0; i < 5; i++)
      leaf(
        ctx,
        x + (hash(i + x) - 0.5) * 35,
        y + 5 + hash(i + y) * 8,
        6.5,
        2.5,
        hash(i * 13) * 6,
        ["#b47741", "#9e5f42", "#b58c4e"][i % 3]!,
        i,
      );
  }
  // A folded Halloween pennant hangs between the right tree and a garden post.
  const cord = new Path2D("M 879 201 Q 904 211 931 202");
  stroke(ctx, cord, "#bf985b", 0.75);
  piece(
    ctx,
    path([
      [913, 205],
      [929, 204],
      [929, 235],
      [921, 230],
      [914, 235],
    ]),
    "#c39555",
    { shadow: 1.8, edge: "#e0b779", texture: 0.85, thickness: 0.7 },
  );
  const face = new Path2D(
    "M 917 216 L 920 213 L 922 217 L 925 213 L 928 216 L 925 217 L 922 216 L 920 218 Z M 917 222 Q 922 228 927 222 Q 922 224 917 222 Z",
  );
  ctx.fillStyle = "#694135";
  ctx.fill(face);
  line(ctx, 933, 202, 933, 257, "#78543b", 2);
  line(ctx, 934, 202, 934, 256, "#b48c56", 0.6);
}
function bunting(ctx: Ctx): void {
  const p = new Path2D("M 542 207 Q 704 258 892 200");
  stroke(ctx, p, "#ba965f", 0.7);
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12,
      x = 542 + t * 350,
      y = 207 + (200 - 207) * t + Math.sin(t * Math.PI) * 25;
    piece(
      ctx,
      path([
        [x - 6, y],
        [x + 6, y],
        [x + 1, y + 15],
      ]),
      ["#bd7543", "#d0a357", "#a55b4d"][i % 3]!,
      { shadow: 1, texture: 0.75, edge: "#d5ad74", thickness: 0.6 },
    );
  }
}
function buildBackground(): HTMLCanvasElement {
  const c = surface(W * 2, H * 2),
    ctx = c.getContext("2d")!;
  ctx.scale(2, 2);
  paperSky(ctx);
  ground(ctx);
  road(ctx);
  tree(ctx, 82, 246, 1.12, 9);
  tree(ctx, 858, 246, 1.13, 6);
  tree(ctx, 477, 215, 0.65, 11);
  cottage(ctx, 238, 219, 1.14, 102);
  cottage(ctx, 729, 230, 0.77, 71);
  garden(ctx);
  gardenDetails(ctx);
  fence(ctx, 139, 260, 1.05);
  fence(ctx, 224, 255, 1.05);
  fence(ctx, 697, 265, 0.9);
  fence(ctx, 769, 265, 0.9);
  pumpkin(ctx, 448, 244, 0.85, 31);
  pumpkin(ctx, 322, 255, 0.48, 32);
  pumpkin(ctx, 846, 274, 0.68, 41);
  candles(ctx, 112, 261, 0.8);
  bunting(ctx);
  glow(ctx, 232, 229, 73, "#dfa358", 0.13, 0.5);
  glow(ctx, 730, 239, 52, "#e4ab60", 0.14, 0.5);
  for (const [x, y] of [
    [915, 370],
    [892, 380],
    [46, 398],
  ])
    stone(ctx, x, y, x > 900 ? 1.6 : 0.8, x);
  return c;
}
export function drawScene(ctx: Ctx): void {
  background ??= buildBackground();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(background, 0, 0, W, H);
}
export function drawProp(ctx: Ctx, p: SceneProp): void {
  const key = `${p.kind}-${p.s}-${p.seed}`;
  let c = propCache.get(key);
  if (!c) {
    c = surface(360, 360);
    const target = c.getContext("2d")!;
    target.scale(2, 2);
    const x = 90,
      y = 148;
    if (p.kind === "tree") tree(target, x, y, p.s, p.seed);
    if (p.kind === "bush") bush(target, x, y, p.s, p.seed);
    if (p.kind === "pumpkin") pumpkin(target, x, y, p.s, p.seed);
    if (p.kind === "fence") fence(target, x, y, p.s);
    if (p.kind === "stone") stone(target, x, y, p.s, p.seed);
    if (p.kind === "candles") candles(target, x, y, p.s);
    propCache.set(key, c);
  }
  ctx.drawImage(c, p.x - 90, p.y - 148, 180, 180);
}
const lamps = new Map<number, HTMLCanvasElement>();
export function drawLamp(
  ctx: Ctx,
  l: (typeof LAMPS)[number],
  _time: number,
): void {
  let c = lamps.get(l.s);
  if (!c) {
    c = surface(140, 190);
    const target = c.getContext("2d")!;
    target.scale(2, 2);
    lantern(target, 35, 85, l.s);
    lamps.set(l.s, c);
  }
  ctx.drawImage(c, l.x - 35, l.y - 85, 70, 95);
}
export function drawGroundLight(
  ctx: Ctx,
  x: number,
  y: number,
  _time: number,
  s = 1,
): void {
  glow(ctx, x, y, 55 * s, "#eab563", 0.13, 0.55);
}
export function drawWind(_ctx: Ctx, _time: number): void {}
export function drawAtmosphere(ctx: Ctx, time: number): void {
  for (const l of LAMPS)
    glow(
      ctx,
      l.x,
      l.y - 38 * l.s,
      25 * l.s,
      "#f5bd5f",
      0.14 + 0.01 * Math.sin(time * 5 + l.x),
    );
  // A few suspended details complete the still composition; they never resemble enemies.
  for (let i = 0; i < 10; i++) {
    const x = 65 + hash(i * 71) * 830,
      y = 280 + hash(i * 91) * 220;
    glow(ctx, x, y, 5, "#f9c971", 0.16);
    ctx.fillStyle = "#e8c57e";
    ctx.fill(oval(x, y, 0.6, 0.7));
  }
  for (let i = 0; i < 5; i++) {
    const phase = (time * 5 + i * 9) % 44;
    ctx.save();
    ctx.globalAlpha = (1 - phase / 52) * 0.48;
    piece(
      ctx,
      oval(
        170 - phase * 0.17 + Math.sin(i) * 2,
        67 - phase,
        6 + phase * 0.12,
        4 + phase * 0.08,
        i,
        0.14,
      ),
      "#a393a1",
      { shadow: 0, texture: 0.7, thickness: 0.3 },
    );
    ctx.restore();
  }
  for (const [x, y, s] of [
    [348, 49, 1],
    [600, 109, 0.75],
  ]) {
    const p = new Path2D(
      `M ${x - 13 * s} ${y + 3 * s} Q ${x - 8 * s} ${y - 9 * s} ${x - 3 * s} ${y - 1 * s} L ${x - s} ${y - 5 * s} L ${x + s} ${y - 1 * s} Q ${x + 8 * s} ${y - 9 * s} ${x + 13 * s} ${y + 3 * s} Q ${x + 6 * s} ${y - 1 * s} ${x + 2 * s} ${y + 5 * s} L ${x - 2 * s} ${y + 5 * s} Q ${x - 6 * s} ${y - 1 * s} ${x - 13 * s} ${y + 3 * s} Z`,
    );
    piece(ctx, p, "#241c34", { shadow: 0.7, texture: 0.6, thickness: 0.4 });
  }
}
function buildForeground(): HTMLCanvasElement {
  const c = surface(W * 2, H * 2),
    ctx = c.getContext("2d")!;
  ctx.scale(2, 2);
  for (const [x, y, rx, ry] of [
    [25, 546, 84, 39],
    [118, 554, 91, 39],
    [223, 557, 78, 34],
    [319, 563, 68, 31],
    [689, 562, 70, 33],
    [787, 552, 83, 39],
    [885, 549, 92, 42],
    [961, 550, 81, 40],
  ]) {
    const p = oval(x, y, rx, ry, x, 0.12);
    piece(ctx, p, x % 2 ? "#59405d" : "#65445f", {
      shadow: 4,
      edge: "#a88176",
      texture: 1,
      thickness: 1.1,
    });
    stitch(ctx, oval(x, y, rx - 3, ry - 3, x, 0.11), "#cba17d", 0.7);
  }
  for (const side of [-1, 1]) {
    const bx = side === -1 ? 36 : 924;
    for (let i = 0; i < 5; i++) {
      const x = bx - side * i * 23,
        y = 550 + (i % 2) * 6,
        p = oval(x, y, 38 + hash(i) * 9, 27 + hash(i + 4) * 9, 20 + i, 0.13);
      piece(
        ctx,
        p,
        ["#4f3e61", "#624765", "#6c4b6c", "#59425e", "#6e506b"][i]!,
        { shadow: 3, edge: "#a47f77", texture: 0.9, thickness: 1.6 },
      );
      stitch(
        ctx,
        oval(x, y, 35 + hash(i) * 9, 24 + hash(i + 4) * 9, 20 + i, 0.13),
        "#c19a72",
        0.7,
      );
    }
    for (let i = 0; i < 13; i++) {
      const x = bx - side * hash(i * 7 + 5) * 101,
        y = 538 + hash(i + 1) * 10;
      leaf(
        ctx,
        x,
        y,
        23 + hash(i * 13) * 32,
        8 + hash(i * 21) * 7,
        (hash(i * 33) - 0.5) * 2.1,
        ["#5b4767", "#735471", "#4d405c", "#8c656f"][i % 4]!,
        i,
        true,
      );
    }
    for (let i = 0; i < 6; i++) {
      const x = bx - side * i * 17;
      line(ctx, x, 541, x + side * 9, 492 - (i % 2) * 12, "#79503b", 1.2);
      for (let j = 0; j < 4; j++)
        leaf(
          ctx,
          x + (j % 2 ? 5 : -5),
          502 + j * 7,
          12,
          4,
          j % 2 ? 0.9 : -0.9,
          ["#bd8149", "#c28c51", "#a76144"][j % 3]!,
          j,
        );
    }
  }
  // A branch at the top corner establishes the diorama's frontmost layer.
  const branch = new Path2D("M 2 88 Q 29 56 109 35");
  stroke(ctx, branch, "#71513d", 2.5);
  stroke(ctx, branch, "#b68a55", 0.6);
  for (let i = 0; i < 11; i++)
    leaf(
      ctx,
      10 + i * 8,
      77 - i * 3.7,
      13,
      4.5,
      i % 2 ? 1.1 : -1.6,
      ["#bb8646", "#be9251", "#a96b3b"][i % 3]!,
      i,
    );
  return c;
}
export function drawForeground(
  ctx: Ctx,
  viewer?: { x: number; y: number },
): void {
  foreground ??= buildForeground();
  ctx.save();
  ctx.globalAlpha =
    viewer && viewer.y > 485 && (viewer.x < 390 || viewer.x > 620) ? 0.35 : 1;
  ctx.drawImage(foreground, 0, 0, W, H);
  ctx.restore();
  drawFrame(ctx);
}
let frame: HTMLCanvasElement | undefined;
function drawFrame(ctx: Ctx): void {
  if (!frame) {
    frame = surface(W * 2, H * 2);
    const c = frame.getContext("2d")!;
    c.scale(2, 2);
    const pts: Point[] = [];
    for (let x = 6; x <= 954; x += 6)
      pts.push([x, 7 + (hash(x * 3) - 0.5) * 4]);
    for (let y = 7; y <= 533; y += 6)
      pts.push([953 + (hash(y * 7) - 0.5) * 3, y]);
    for (let x = 954; x >= 6; x -= 6)
      pts.push([x, 532 + (hash(x * 11) - 0.5) * 4]);
    for (let y = 533; y >= 7; y -= 6)
      pts.push([7 + (hash(y * 13) - 0.5) * 3, y]);
    const inner = path(pts),
      outer = new Path2D();
    outer.rect(0, 0, W, H);
    outer.addPath(inner);
    c.fillStyle = "#ead2ae";
    c.fill(outer, "evenodd");
    c.save();
    c.clip(outer, "evenodd");
    grain(c, outer, 0.6);
    c.restore();
    stroke(c, inner, "#b08058", 1.5, 0.9);
    stroke(c, inner, "#f4dfbb", 0.6, 0.8);
    for (let i = 0; i < 260; i++) {
      const x = hash(i * 13) * 960,
        y = i % 2 ? 4 : 536;
      line(c, x, y, x + 3, y + (hash(i) - 0.5) * 2, "#f6e4c6", 0.6, 0.5);
    }
  }
  ctx.drawImage(frame, 0, 0, W, H);
}
export function drawNightShift(ctx: Ctx, progress: number): void {
  const t = Math.max(0, (progress - 0.9) / 0.1);
  if (!t) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.min(1, t) * 0.15;
  ctx.fillStyle = "#ba9b86";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
