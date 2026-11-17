/**
 * Render-only game feel: camera shake, hit flashes, damage tags, dissolving
 * paper flakes, level-up bursts, shard trails and the interactive yard objects.
 * Everything is derived from SimState and view time; nothing here consumes the
 * sim RNG or writes to the state.
 */
import { EFFECT_LIFE, type ChestState, type Impact, type InteractState, type SimState, type TreatState, type EnemyState, type PickupState } from "../game/types.js";
import { ENEMIES, type EnemyKind } from "../game/enemies.js";
import { enemyRadius } from "../game/sim.js";
import { PUMPKIN } from "../game/interactions.js";
import { box, glow, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "./paper-material.js";
import { visHash } from "./hash.js";
import { YARD_PROPS } from "./scene.js";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function progress(e: Impact, life: number): number {
  return clamp01(1 - e.life / life);
}

/** Camera offset from recent hurts, Boss attacks and evolutions. Zero under reduced motion. */
export function cameraShake(sim: SimState, time: number, reduced: boolean): { x: number; y: number } {
  if (reduced) return { x: 0, y: 0 };
  let amp = 0;
  for (const e of sim.impacts) {
    if (e.kind === "hurt") amp = Math.max(amp, (e.life / 0.35) * 4);
    else if (e.kind === "evolve") amp = Math.max(amp, (e.life / EFFECT_LIFE.evolve) * 3);
    else if (e.kind === "erase") amp = Math.max(amp, (e.life / 0.6) * 4.5);
    else if (e.kind === "boss-down") amp = Math.max(amp, (e.life / 1.6) * 5);
    else if (e.kind === "moon-stun") amp = Math.max(amp, (e.life / EFFECT_LIFE["moon-stun"]) * 2.5);
  }
  for (const e of sim.enemies)
    if (e.kind === "eraser-boss" && e.act?.kind === "charge" && e.act.t <= 0 && e.act.run > 0) amp = Math.max(amp, 2);
  if (amp < 0.05) return { x: 0, y: 0 };
  amp = Math.min(amp, 5);
  return {
    x: Math.sin(time * 73) * amp * 0.8 + Math.sin(time * 41) * amp * 0.3,
    y: Math.cos(time * 67) * amp * 0.6,
  };
}

/** A brief white paper flash over a freshly hit enemy. */
export function drawHitFlash(ctx: Ctx, e: EnemyState): void {
  const f = (e.hitFlash ?? 0) / 0.14;
  if (f <= 0) return;
  const r = enemyRadius(e);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, f) * 0.55;
  ctx.fillStyle = "#fff6e6";
  ctx.fill(oval(e.x, e.y - r * 0.9, r * 1.05, r * 0.95, e.id, 0.1));
  ctx.restore();
}

/** Small paper stars circling enemies frozen by the moon-lantern. */
export function drawStun(ctx: Ctx, e: EnemyState, time: number): void {
  if (!e.stun || e.stun <= 0) return;
  const r = enemyRadius(e),
    cy = e.y - r * 2.1;
  ctx.save();
  ctx.globalAlpha = Math.min(1, e.stun * 2);
  for (let i = 0; i < 3; i++) {
    const a = time * 3 + (i * Math.PI * 2) / 3;
    paperStar(ctx, e.x + Math.cos(a) * r * 0.9, cy + Math.sin(a) * 3, 2.6, "#cfe2f2", a);
  }
  ctx.restore();
}

function paperStar(ctx: Ctx, x: number, y: number, r: number, color: string, rot = 0): void {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2,
      k = i % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]);
  }
  piece(ctx, path(pts), color, { shadow: 0.5, texture: 0.3, thickness: 0.4 });
}

/** A rising cut-paper tag with the damage number. */
function drawDamageTag(ctx: Ctx, e: Impact): void {
  const t = progress(e, EFFECT_LIFE.damage),
    amount = e.amount ?? 0;
  if (amount <= 0) return;
  const rise = (1 - (1 - t) ** 2) * 16,
    drift = (visHash(e.seed ?? 0) - 0.5) * 10 * t,
    x = e.x + drift,
    y = e.y - rise,
    big = amount >= 3,
    label = Number.isInteger(amount) ? String(amount) : amount.toFixed(1),
    w = 6 + label.length * 5 + (big ? 3 : 0),
    h = big ? 11 : 9,
    tilt = (visHash((e.seed ?? 0) + 7) - 0.5) * 0.3;
  ctx.save();
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Pop in, then settle.
  const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.15 - Math.min(0.15, (t - 0.15) * 0.6);
  ctx.scale(pop, pop);
  const tag = path([
    [-w / 2, -h / 2 + 0.6],
    [w / 2 - 0.4, -h / 2],
    [w / 2, h / 2 - 0.5],
    [-w / 2 + 0.5, h / 2],
  ]);
  piece(ctx, tag, e.src === "eraser-boss" ? "#f3c2c9" : big ? "#f4d48e" : "#efe3c8", {
    shadow: 0.8,
    texture: 0.35,
    thickness: 0.5,
  });
  ctx.fillStyle = "#3a2733";
  ctx.font = `700 ${big ? 9 : 7.5}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 0.5);
  ctx.restore();
}

const FLAKE_COLORS: Record<EnemyKind, readonly string[]> = {
  "ink-blob": ["#2c2340", "#3d3156", "#5a4a74", "#e8d9bd"],
  "paper-bat": ["#221c2c", "#372d42", "#4b3d55", "#c9a76f"],
  crumple: ["#e8dcc4", "#d9c9ab", "#f2e8d4", "#b9a582"],
  smudge: ["#3a2c4b", "#54406a", "#e3d3b5", "#6d5684"],
  "eraser-boss": ["#f0a3b1", "#e58e9f", "#4f6f9c", "#f6ece0"],
};

/**
 * Petal Dissolve, rebuilt for paper: the defeated piece erodes into cut flakes
 * that tumble outward and flutter down. Crumples first un-crumple into a flat
 * sheet that tears in two (Crumple Reveal).
 */
function drawDissolve(ctx: Ctx, e: Impact): void {
  const t = progress(e, EFFECT_LIFE.dissolve),
    seed = e.seed ?? 0,
    kind = e.src ?? "ink-blob",
    colors = FLAKE_COLORS[kind],
    r = ENEMIES[kind].radius,
    count = kind === "eraser-boss" ? 26 : kind === "crumple" ? 14 : 10;
  ctx.save();
  if (kind === "crumple" && t < 0.55) drawUncrumple(ctx, e.x, e.y - r, r, t / 0.55, seed);
  for (let i = 0; i < count; i++) {
    const h1 = visHash(seed * 37 + i * 11),
      h2 = visHash(seed * 53 + i * 7 + 1),
      h3 = visHash(seed * 71 + i * 3 + 2),
      // Flakes leave the edge one after another, like petals letting go.
      start = (kind === "crumple" ? 0.35 : 0) + h1 * 0.3,
      k = clamp01((t - start) / (1 - start));
    if (k <= 0) continue;
    const a = h2 * Math.PI * 2,
      out = r * (0.5 + h3 * 0.6) + k * (14 + h1 * 20) * (kind === "eraser-boss" ? 2.4 : 1),
      fall = k * k * (10 + h2 * 12),
      x = e.x + Math.cos(a) * out + Math.sin(k * 6 + i) * 3 * k,
      y = e.y - r + Math.sin(a) * out * 0.6 + fall - k * 6,
      size = (kind === "eraser-boss" ? 3.6 : 2.6) * (1 - k * 0.5) + h3,
      spin = a + k * (4 + h1 * 6),
      flip = Math.abs(Math.cos(k * 7 + i)) * 0.8 + 0.2;
    ctx.save();
    ctx.globalAlpha = 1 - k ** 1.6;
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.scale(1, flip);
    const flake = path([
      [-size, -size * 0.4],
      [size * 0.2, -size * 0.8],
      [size, size * 0.1],
      [-size * 0.2, size * 0.7],
    ]);
    piece(ctx, flake, colors[i % colors.length]!, { shadow: 0.4, texture: 0.25, thickness: 0.35 });
    ctx.restore();
  }
  ctx.restore();
}

/** The ball opens into a creased sheet, then the two halves tear apart. */
function drawUncrumple(ctx: Ctx, x: number, y: number, r: number, k: number, seed: number): void {
  const open = Math.min(1, k * 1.6),
    tear = clamp01((k - 0.55) / 0.45),
    w = r * (0.9 + open * 0.9),
    h = r * (0.9 + open * 0.5);
  ctx.save();
  ctx.globalAlpha = 1 - tear * 0.8;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x + side * tear * 9, y + tear * 4);
    ctx.rotate(side * tear * 0.35);
    const pts: Point[] = [];
    // Each half is a crumpled outline that relaxes into a flat torn sheet.
    for (let i = 0; i <= 6; i++) {
      const v = i / 6,
        jag = (visHash(seed + i * 13) - 0.5) * (1 - open) * r * 0.6;
      pts.push([side * (w * (0.15 + 0.85 * Math.sin(v * Math.PI))) + jag, -h + v * h * 2]);
    }
    for (let i = 6; i >= 0; i--) pts.push([side * ((visHash(seed + i * 17) - 0.5) * 3), -h + (i / 6) * h * 2]);
    const sheet = path(pts);
    piece(ctx, sheet, "#ece0c8", { shadow: 1, texture: 0.6, thickness: 0.6 });
    // Creases fade as the sheet flattens.
    ctx.globalAlpha *= 1 - open * 0.6;
    for (let i = 0; i < 3; i++)
      line(ctx, side * w * 0.1, -h + i * h * 0.7, side * w * 0.8, -h * 0.4 + i * h * 0.6, "#a8946f", 0.5);
    ctx.restore();
  }
  ctx.restore();
}

/** A radial burst of paper strips for level-ups, evolutions and kill chains. */
function drawPaperBurst(ctx: Ctx, e: Impact, life: number, strips: number, reach: number, colors: readonly string[]): void {
  const t = progress(e, life),
    ease = 1 - (1 - t) ** 3,
    seed = e.seed ?? 0;
  ctx.save();
  ctx.globalAlpha = 1 - t ** 2;
  for (let i = 0; i < strips; i++) {
    const a = (i / strips) * Math.PI * 2 + visHash(seed + i) * 0.3,
      r0 = 8 + ease * reach * 0.35,
      r1 = 12 + ease * reach * (0.8 + visHash(seed * 3 + i) * 0.4),
      cy = e.y - 18,
      x0 = e.x + Math.cos(a) * r0,
      y0 = cy + Math.sin(a) * r0 * 0.6,
      x1 = e.x + Math.cos(a) * r1,
      y1 = cy + Math.sin(a) * r1 * 0.6,
      nx = -Math.sin(a) * 1.6,
      ny = Math.cos(a) * 1.0;
    piece(
      ctx,
      path([
        [x0 + nx, y0 + ny],
        [x1 + nx * 0.4, y1 + ny * 0.4],
        [x1 - nx * 0.4, y1 - ny * 0.4],
        [x0 - nx, y0 - ny],
      ]),
      colors[i % colors.length]!,
      { shadow: 0.5, texture: 0.25, thickness: 0.35 },
    );
  }
  ctx.restore();
}

/** Sparkles chase a shard that the magnet is pulling in. */
export function drawShardTrail(ctx: Ctx, s: PickupState, sim: SimState, reach: number, time: number): void {
  const dx = s.x - sim.player.x,
    dy = s.y - sim.player.y,
    d = Math.hypot(dx, dy);
  if (d > reach || d < 4) return;
  const ux = dx / d,
    uy = dy / d;
  ctx.save();
  for (let i = 1; i <= 3; i++) {
    const k = i * 6 + Math.sin(time * 9 + s.id + i) * 1.5;
    ctx.globalAlpha = 0.65 - i * 0.17;
    paperStar(ctx, s.x + ux * k, s.y - 6 + uy * k, 2.2 - i * 0.4, "#f6dc9a", time * 4 + i);
  }
  ctx.restore();
}

function propScale(o: InteractState): number {
  return o.s ?? YARD_PROPS.find((p) => p.kind === "pumpkin" && p.x === o.x && p.y === o.y)?.s ?? 1;
}

/** Ground light under lit pumpkins and the charged lantern; drawn before sprites. */
export function drawInteractGround(ctx: Ctx, sim: SimState, time: number): void {
  for (const o of sim.interactables) {
    if (o.kind === "pumpkin" && o.lit > 0) {
      const fade = Math.min(1, o.lit / 0.6),
        pulse = 0.85 + Math.sin(time * 7 + o.id) * 0.15;
      glow(ctx, o.x, o.y, PUMPKIN.auraRadius * 1.1, "#ffb456", 0.32 * fade * pulse, 0.55);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -time * 12;
      stroke(ctx, oval(o.x, o.y, PUMPKIN.auraRadius, PUMPKIN.auraRadius * 0.55, o.id, 0.05), "#f3b765", 1.2, 0.55 * fade);
      ctx.restore();
    } else if (o.kind === "lantern" && o.charge >= 1) {
      glow(ctx, o.x, o.y, 48, "#bcd8f2", 0.22 + Math.sin(time * 4) * 0.06, 0.5);
    }
  }
  for (const t of sim.treats) if (t.alive) shadow(ctx, t.x, t.y + 1, 9, 2.5);
}

/** States drawn on top of the cached props: carved glow, recharge arc, moon charge. */
export function drawInteractable(ctx: Ctx, o: InteractState, time: number): void {
  if (o.kind === "pumpkin") {
    const s = propScale(o),
      cx = o.x,
      cy = o.y - 11 * s;
    if (o.lit > 0) {
      const flicker = 0.8 + Math.sin(time * 13 + o.id) * 0.1 + Math.sin(time * 5.3) * 0.1;
      glow(ctx, cx, cy, 26 * s, "#ffd36e", 0.55 * flicker);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,214,120,${0.75 * flicker})`;
      // Carved eyes and grin glowing from inside.
      for (const side of [-1, 1])
        ctx.fill(path([[cx + side * 9 * s, cy - 2 * s], [cx + side * 4 * s, cy - 6 * s], [cx + side * 2 * s, cy - 1 * s]]));
      ctx.fill(path([[cx - 8 * s, cy + 3 * s], [cx - 3 * s, cy + 6 * s], [cx, cy + 4 * s], [cx + 3 * s, cy + 6 * s], [cx + 8 * s, cy + 3 * s], [cx + 3 * s, cy + 9 * s], [cx - 3 * s, cy + 9 * s]]));
      ctx.restore();
    } else if (o.cooldown > 0) {
      // A paper ring fills back in while the pumpkin recharges.
      const k = 1 - o.cooldown / PUMPKIN.recharge,
        p = new Path2D();
      p.arc(cx, cy - 18 * s, 4.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      stroke(ctx, oval(cx, cy - 18 * s, 4.5, 4.5, o.id, 0.02), "#2a2033", 2.4, 0.5);
      stroke(ctx, p, "#e9b86a", 1.6, 0.9);
    } else {
      // Ready: a little paper flame tag bobs above, inviting a touch.
      const bob = Math.sin(time * 3 + o.id) * 1.5,
        fy = cy - 22 * s + bob;
      piece(ctx, path([[cx, fy - 6], [cx + 3.5, fy + 1], [cx, fy + 4], [cx - 3.5, fy + 1]], true), "#f2a94e", {
        shadow: 0.8,
        edge: "#ffd890",
        texture: 0.4,
        thickness: 0.5,
      });
    }
  } else {
    // Moon-lantern: a hanging paper moon tag fills with light as it charges.
    const x = o.x + 15,
      y = o.y - 66 + Math.sin(time * 1.6) * 1,
      r = 7,
      full = o.charge >= 1;
    line(ctx, o.x + 4, o.y - 72, x, y - r, "#b28d54", 0.7);
    piece(ctx, oval(x, y, r, r, 9, 0.02), "#2d3550", { shadow: 1.2, texture: 0.5, thickness: 0.6 });
    ctx.save();
    ctx.clip(oval(x, y, r - 1, r - 1, 9, 0.02));
    const fill = new Path2D();
    fill.rect(x - r, y + r - o.charge * r * 2, r * 2, o.charge * r * 2);
    ctx.fillStyle = full ? "#f4e3a8" : "#c9b98a";
    ctx.fill(fill);
    ctx.restore();
    stitch(ctx, oval(x, y, r + 2, r + 2, 4, 0.02), "#cbb27c", 0.7);
    if (full) {
      glow(ctx, x, y, 22 + Math.sin(time * 5) * 3, "#f7e7b0", 0.5);
      paperStar(ctx, x + 9, y - 7 + Math.sin(time * 4) * 1.5, 2.4, "#f7e7b0", time);
    }
  }
}

/** A papercraft fish treat with a fold line, bobbing and blinking out when it expires. */
export function drawTreat(ctx: Ctx, t: TreatState, time: number): void {
  if (t.life < 3 && Math.floor(time * 8) % 2 === 0) return;
  const bob = Math.sin(time * 3 + t.id) * 1.5,
    x = t.x,
    y = t.y - 8 + bob;
  glow(ctx, x, y, 16, "#ffd9a0", 0.2);
  const body = new Path2D(`M ${x - 9} ${y} Q ${x - 2} ${y - 7} ${x + 6} ${y} Q ${x - 2} ${y + 7} ${x - 9} ${y} Z`),
    tail = path([[x + 5, y], [x + 11, y - 5], [x + 10, y], [x + 11, y + 5]]);
  piece(ctx, tail, "#d98a5c", { shadow: 0.8, edge: "#f1b68a", texture: 0.5, thickness: 0.5 });
  piece(ctx, body, "#9fc2c9", { shadow: 1.2, edge: "#d8eef0", texture: 0.5, thickness: 0.6 });
  line(ctx, x - 2, y - 4, x - 2, y + 4, "#6f979f", 0.6);
  ctx.fillStyle = "#2a2033";
  ctx.fill(oval(x - 6, y - 1, 0.9, 0.9));
  // A small heart tag shows what it does.
  const hx = x + 1,
    hy = y - 12;
  piece(ctx, new Path2D(`M ${hx} ${hy + 3} C ${hx - 5} ${hy - 1} ${hx - 2} ${hy - 4} ${hx} ${hy - 1.5} C ${hx + 2} ${hy - 4} ${hx + 5} ${hy - 1} ${hx} ${hy + 3} Z`), "#e46f78", {
    shadow: 0.5,
    texture: 0.3,
    thickness: 0.4,
  });
}

/**
 * A cut-paper treasure chest: contact shadow, a darker side strip for card
 * thickness, a rounded lid, gold paper bands with stitching and a keyhole.
 * The Boss chest is larger and moon-blue. Bobs gently until opened.
 */
export function drawChest(ctx: Ctx, c: ChestState, time: number): void {
  const s = c.big ? 1.4 : 1,
    lift = Math.max(0, 1 - c.age / 0.4) * 18 + Math.sin(time * 2.4 + c.id) * 0.8,
    x = c.x,
    y = c.y,
    w = 26 * s,
    h = 14 * s,
    lid = 9 * s,
    x0 = x - w / 2,
    top = y - h - lift,
    body = c.big ? "#5d7fb0" : "#a8643d",
    side = c.big ? "#3e5a86" : "#7a4429",
    band = c.big ? "#e8e2c4" : "#e5bd62";
  shadow(ctx, x, y + 1, w * 0.6, 4 * s);
  glow(ctx, x, top - lid * 0.3, 34 * s, c.big ? "#cfe0ff" : "#ffd27a", 0.22 + Math.sin(time * 3 + c.id) * 0.05);
  ctx.save();
  // Card thickness: an offset darker strip behind the front face.
  piece(ctx, box(x0 + 2.2 * s, top + 1.8 * s, w, h, c.id + 3), side, { shadow: 0, texture: 0.3, thickness: 0.6 });
  piece(ctx, box(x0, top, w, h, c.id), body, { shadow: 1.4, edge: c.big ? "#a9c4ea" : "#e0a073", texture: 0.65, thickness: 0.9 });
  // Rounded lid as its own cut piece, overlapping the body.
  const lidPath = new Path2D(
    `M ${x0 - 1} ${top + 1} L ${x0 - 1} ${top - lid * 0.35} Q ${x0 + w / 2} ${top - lid * 1.45} ${x0 + w + 1} ${top - lid * 0.35} L ${x0 + w + 1} ${top + 1} Z`,
  );
  piece(ctx, lidPath, mix(body, "#ffffff", 0.08), { shadow: 1, edge: c.big ? "#c4d7f4" : "#eab184", texture: 0.6, thickness: 0.9 });
  // Gold paper bands down the front.
  for (const bx of [x0 + w * 0.2, x0 + w * 0.8 - 3 * s]) {
    const strap = box(bx, top - lid * 0.8, 3 * s, h + lid * 0.8, c.id + bx);
    piece(ctx, strap, band, { shadow: 0.5, texture: 0.4, thickness: 0.5 });
    stitch(ctx, strap, c.big ? "#8ea3c8" : "#9c7434", 0.7);
  }
  // Clasp and keyhole.
  const clasp = box(x - 3.5 * s, top - 2 * s, 7 * s, 7 * s, c.id + 9);
  piece(ctx, clasp, band, { shadow: 0.6, texture: 0.4, thickness: 0.5 });
  ctx.fillStyle = "#2a1c22";
  ctx.fill(oval(x, top + 0.6 * s, 1.1 * s, 1.1 * s, c.id));
  line(ctx, x, top + 1.2 * s, x, top + 3.2 * s, "#2a1c22", 0.9 * s);
  ctx.restore();
}

/** Effects owned by this module; returns false for kinds handled elsewhere. */
export function drawJuiceEffect(ctx: Ctx, e: Impact): boolean {
  switch (e.kind) {
    case "chest-open": {
      const t = progress(e, EFFECT_LIFE["chest-open"]);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      glow(ctx, e.x, e.y - 14, 30 + t * 60, "#ffe2a0", 0.5);
      ctx.restore();
      drawPaperBurst(ctx, e, EFFECT_LIFE["chest-open"], 16, 70, ["#e5bd62", "#f6e4c6", "#a8643d", "#9fc2c9"]);
      return true;
    }
    case "damage":
      drawDamageTag(ctx, e);
      return true;
    case "dissolve":
      drawDissolve(ctx, e);
      return true;
    case "streak":
      drawPaperBurst(ctx, e, EFFECT_LIFE.streak, 12, 46, ["#f4d48e", "#e58e5f", "#efe3c8"]);
      return true;
    case "pumpkin-light":
      drawPaperBurst(ctx, e, EFFECT_LIFE["pumpkin-light"], 10, 40, ["#f2a94e", "#ffd36e", "#c47735"]);
      return true;
    case "pumpkin-pulse": {
      const t = progress(e, EFFECT_LIFE["pumpkin-pulse"]);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.6;
      stroke(ctx, oval(e.x, e.y, 14 + t * PUMPKIN.auraRadius, (14 + t * PUMPKIN.auraRadius) * 0.55, 3, 0.04), "#ffc56a", 2 - t);
      ctx.restore();
      return true;
    }
    case "treat":
      drawPaperBurst(ctx, e, EFFECT_LIFE.treat, 8, 30, ["#e46f78", "#9fc2c9", "#f6e4c6"]);
      return true;
    case "moon-stun": {
      const t = progress(e, EFFECT_LIFE["moon-stun"]),
        ease = 1 - (1 - t) ** 3;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      glow(ctx, e.x, e.y - 30, 60 + ease * 500, "#d9e8f8", 0.4, 0.6);
      for (let i = 0; i < 3; i++) {
        const r = 20 + ease * (260 + i * 120);
        ctx.save();
        ctx.setLineDash([8, 6]);
        stroke(ctx, oval(e.x, e.y - 20, r, r * 0.55, i + 2, 0.03), "#e8f0ff", 2.2 - i * 0.5);
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    case "levelup":
    case "evolve":
      // Extra strip burst layered under the existing star burst in combat-fx.
      drawPaperBurst(
        ctx,
        e,
        EFFECT_LIFE[e.kind],
        e.kind === "evolve" ? 20 : 12,
        e.kind === "evolve" ? 110 : 60,
        e.kind === "evolve" ? ["#f6dfa8", "#e8c06f", "#9d84d6", "#fff1ce"] : ["#f4d48e", "#efe3c8", "#9fc2c9"],
      );
      return false;
    default:
      return false;
  }
}
