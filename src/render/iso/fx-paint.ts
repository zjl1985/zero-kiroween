// Native-pixel recipes built on the vendored MIT pixelfx core. All positions
// and lifetimes are presentation inputs, so any frame can be sampled in isolation.
import { ENEMY_FX_LIFE } from "../../defs/enemies/fx-life.js";
import { impactContact, type ContactFamily } from "../../game/combat-observation.js";
import { EFFECT_LIFE, type EffectKind, type Impact, type ShotState } from "../../game/types.js";
import {
  INK, RAMP, TAU, burst, clamp, ease, hex, rand, sparkle, star, type Color, type Painter,
} from "../pixelfx/index.js";
import { ISO, screenAngle } from "./projection.js";

type Tone = readonly [Color, Color, Color, Color];
const tone = (dark: string, mid: string, bright: string, tip: string): Tone => [hex(dark), hex(mid), hex(bright), hex(tip)];
const GOLD = tone("#5b322d", "#b9703d", "#eeb755", "#ffe8a2");
const MOON = tone("#3c386b", "#767bb5", "#b6ccf5", "#eff5ff");
const WATER = tone("#253d56", "#457d92", "#76c5d0", "#baf4f0");
const FIRE = tone("#612734", "#b84a2b", "#ef892f", "#ffdc7d");
const PAPER = tone("#5b515a", "#9c8480", "#dec6a0", "#f3e2c4");
const INK_DROP = tone("#222033", "#494059", "#75677e", "#ac8d9b");
const HEAL = tone("#304d49", "#53836b", "#91c88a", "#ddf6b8");
const ALERT = tone("#592b45", "#9b4a61", "#da7c79", "#ffb6a3");

type Look = "spark" | "shards" | "ring" | "splash" | "steam" | "column" | "slash" | "fall" | "number";
interface Recipe {
  readonly look: Look;
  readonly tone: Tone;
  readonly life: number;
  readonly size: number;
  readonly lift?: number;
  readonly light?: number;
}
const LIFE = { ...EFFECT_LIFE, ...ENEMY_FX_LIFE };
const recipe = (look: Look, tone: Tone, life: number, size: number, lift = 0, light = 0): Recipe =>
  ({ look, tone, life, size, lift, light });

export const ISO_IMPACT_FX = {
  hit: recipe("spark", GOLD, .16, 11, 8, .34),
  defeat: recipe("spark", PAPER, .32, 14, 7, .16),
  dash: recipe("slash", MOON, .35, 15, 8),
  fold: recipe("ring", MOON, .6, 28),
  shield: recipe("ring", MOON, .4, 15, 6, .12),
  rescue: recipe("column", HEAL, .8, 20, 0, .18),
  hurt: recipe("spark", ALERT, .35, 11, 13),
  levelup: recipe("column", GOLD, LIFE.levelup, 22, 0, .27),
  evolve: recipe("column", GOLD, LIFE.evolve, 34, 0, .36),
  "echo-burst": recipe("ring", MOON, LIFE["echo-burst"], 32, 0, .24),
  "moon-pulse": recipe("ring", MOON, LIFE["moon-pulse"], 46, 0, .25),
  collect: recipe("spark", GOLD, LIFE.collect, 9, 7, .11),
  splat: recipe("splash", INK_DROP, LIFE.splat, 19),
  erase: recipe("ring", ALERT, LIFE.erase, 36, 0, .19),
  summon: recipe("column", ALERT, LIFE.summon, 26, 0, .17),
  "boss-down": recipe("column", GOLD, LIFE["boss-down"], 48, 0, .4),
  crumple: recipe("shards", PAPER, LIFE.crumple, 16, 5),
  damage: recipe("number", PAPER, LIFE.damage, 0, 18),
  dissolve: recipe("shards", INK_DROP, LIFE.dissolve, 23, 11),
  "pumpkin-light": recipe("column", FIRE, LIFE["pumpkin-light"], 16, 0, .24),
  "pumpkin-pulse": recipe("ring", FIRE, LIFE["pumpkin-pulse"], 23, 0, .18),
  treat: recipe("spark", HEAL, LIFE.treat, 16, 14, .14),
  "moon-stun": recipe("ring", MOON, LIFE["moon-stun"], 54, 0, .24),
  streak: recipe("number", GOLD, LIFE.streak, 0, 29),
  "chest-open": recipe("column", GOLD, LIFE["chest-open"], 34, 0, .42),
  claw: recipe("slash", GOLD, LIFE.claw, 29, 6, .17),
  "star-fall": recipe("fall", MOON, LIFE["star-fall"], 26, 0, .3),
  "seed-burst": recipe("splash", FIRE, LIFE["seed-burst"], 16, 0, .18),
  "prop-tear": recipe("shards", PAPER, LIFE["prop-tear"], 10, 7),
  "prop-scraps": recipe("shards", PAPER, LIFE["prop-scraps"], 20, 10),
  ember: recipe("shards", FIRE, LIFE.ember, 15, 7, .18),
  steam: recipe("steam", WATER, LIFE.steam, 12, 4),
  regrow: recipe("column", HEAL, LIFE.regrow, 13),
  "ink-wash": recipe("splash", INK_DROP, LIFE["ink-wash"], 20),
  "landmark-reward": recipe("column", GOLD, LIFE["landmark-reward"], 21, 0, .26),
  splash: recipe("splash", WATER, LIFE.splash, 19, 0, .1),
  pigment: recipe("splash", HEAL, LIFE.pigment, 15),
  "paper-cut": recipe("ring", PAPER, LIFE["paper-cut"], 24),
  "page-fold": recipe("slash", MOON, LIFE["page-fold"], 22, 1),
  "costume-burst": recipe("ring", MOON, LIFE["costume-burst"], 28, 0, .12),
  "costume-push": recipe("ring", GOLD, LIFE["costume-push"], 26),
  "costume-pull": recipe("ring", HEAL, LIFE["costume-pull"], 26),
} satisfies Record<EffectKind, Recipe>;

export const ISO_WEAPON_FX = {
  "meow-bolt": "bolt",
  "moon-stars": "orbit",
  "night-claw": "claw",
  "star-fall": "star-fall",
  "paper-crane": "crane",
  "pumpkin-seed": "seed",
  "echo-legion": "echo-burst",
  "full-moon": "moon-pulse",
  "watercolour-brush": "pigment",
  "paper-cut": "paper-cut",
  "page-fold": "page-fold",
} as const;

const CONTACT_TONE: Record<ContactFamily, Tone> = {
  bolt: GOLD, orbit: MOON, "star-fall": MOON, claw: GOLD, crane: PAPER,
  seed: FIRE, brush: HEAL, cut: PAPER, fold: MOON, fire: FIRE, wash: WATER,
};

export function paintGroundRing(p: Painter, radius: number, c: Color, opacity: number, progress = 1, start = 0): void {
  // Round simulation areas project to ellipses. Use a polyline so work grows
  // with the perimeter, and thick rings never hide the enemies inside them.
  const steps = Math.max(12, Math.min(128, Math.ceil(radius * 3)));
  const end = Math.ceil(steps * progress);
  let x = Math.cos(start) * radius, y = Math.sin(start) * radius * .5;
  for (let i = 1; i <= end; i++) {
    const angle = start + i / steps * TAU, nx = Math.cos(angle) * radius, ny = Math.sin(angle) * radius * .5;
    p.line(x, y, nx, ny, c, opacity);
    x = nx;
    y = ny;
  }
}

export function impactSeed(e: Impact): number {
  return e.seed ?? (Math.round(e.x * 31) ^ Math.round(e.y * 47));
}

function scatter(p: Painter, seed: number, t: number, radius: number, colors: Tone, look: Look, opacity: number): void {
  const count = look === "shards" ? 11 : look === "column" ? 13 : look === "spark" ? 6 : 9;
  burst(count, seed, (r, i) => {
    const a = r.range(0, TAU), speed = r.range(.35, 1), dist = radius * speed * (.14 + ease.outQuad(t) * .86);
    const rise = Math.sin(Math.PI * t) * radius * r.range(.15, .6);
    const x = Math.cos(a) * dist, y = Math.sin(a) * dist * .46 - rise;
    const c = t > .58 ? colors[1] : colors[i % 3 === 0 ? 3 : 2];
    if (look === "shards" && t < .72 && i % 3 === 0) p.rect(x, y, 2, 2, c, opacity);
    else if (look === "column" && i % 4 === 0) sparkle(p, x, y - 8, 2, c, colors[1], .13 * opacity);
    else if (look === "spark" && t < .58) p.line(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 2, c, opacity);
    else if (look === "splash" && i % 3 === 0) p.line(x, y, x + Math.cos(a), y + (t < .6 ? 2 : 1), c, opacity);
    else p.dot(x, y, c, opacity);
  });
}

export function paintImpact(p: Painter, e: Impact, reduced: boolean, zoom = 1, life = e.life): void {
  const r: Recipe = ISO_IMPACT_FX[e.kind];
  if (!(life > 0)) return;
  const k = clamp(1 - life / r.life), t = reduced ? .31 : k, remaining = 1 - k;
  const contact = impactContact(e), colors = contact && (e.kind === "hit" || e.kind === "defeat" || e.kind === "damage")
    ? CONTACT_TONE[contact.family] : e.kind === "prop-scraps" && e.amount === 1 ? INK_DROP : r.tone;
  const [dark, mid, bright, tip] = colors;
  const size = Math.min(170, e.radius === undefined ? r.size * zoom : e.radius * ISO.k * Math.SQRT2 * zoom);
  const seed = impactSeed(e), lift = (r.lift ?? 0) * zoom, y = -lift, fade = Math.min(1, remaining * 1.7);
  if (r.look === "number") {
    if (e.amount !== undefined) p.text(e.kind === "streak" ? `X${Math.round(e.amount)}` : Math.max(1, Math.round(e.amount)), 0,
      y - t * 11, tip, { align: "center", outline: INK, a: fade });
    return;
  }
  // Intentionally modest light footprints. Extra particles stay on the color
  // buffer so overlapping hits do not turn a crowd into a white circle.
  if (r.light && k < .74) p.glow(0, y, Math.max(3, Math.min(16, size * .4)), mid, r.light * remaining * .85);
  const pull = e.kind === "costume-pull";
  const reach = size * (.3 + .7 * (pull ? 1 - t : ease.outCubic(t)));
  if (r.look === "splash" || r.look === "column") paintGroundRing(p, reach, bright, fade * .71);
  if (r.look === "ring") {
    if (e.kind === "shield") {
      const w = reach * .62, h = w * .68;
      p.poly([[-w, y - h], [w, y - h], [w, y], [0, y + h], [-w, y]], dark, fade * .62);
      p.line(-w, y - h, w, y - h, bright, fade);
      p.line(-w, y, 0, y + h, tip, fade);
      p.line(0, y + h, w, y, bright, fade);
    } else if (e.kind === "erase") {
      const w = reach * .84, h = reach * .35;
      p.line(-w, 0, 0, -h, bright, fade);
      p.line(0, -h, w, 0, bright, fade);
      p.line(w, 0, 0, h, mid, fade);
      p.line(0, h, -w, 0, mid, fade);
      p.line(-w * .35, -h * .35, w * .4, h * .4, tip, fade * .7);
    } else if (e.kind === "echo-burst" || e.kind === "fold" || e.kind === "paper-cut") {
      const turn = e.kind === "echo-burst" ? t * 1.7 : 0;
      paintGroundRing(p, reach, bright, fade, .42, turn);
      paintGroundRing(p, reach * .84, mid, fade, .42, turn + Math.PI);
    } else {
      paintGroundRing(p, reach, bright, fade * .82);
      if (e.kind === "moon-pulse") paintGroundRing(p, reach * .77, mid, fade * .55);
      if (e.kind === "moon-stun")
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + t * .7;
          sparkle(p, Math.cos(a) * reach, Math.sin(a) * reach * .5 - 2, 2, bright, tip, .12 * fade);
        }
      if (e.kind === "costume-pull" || e.kind === "costume-push")
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          const x = Math.cos(a) * reach, y = Math.sin(a) * reach * .5;
          const dx = Math.cos(a) * (pull ? -3 : 3), dy = Math.sin(a) * (pull ? -2 : 2);
          p.line(x - dy, y + dx * .6, x + dx, y + dy, tip, fade);
          p.line(x + dy, y - dx * .6, x + dx, y + dy, bright, fade);
        }
    }
  }
  switch (r.look) {
    case "slash": {
      const base = e.angle === undefined ? 0 : screenAngle(Math.cos(e.angle), Math.sin(e.angle));
      const back = p.tx, bottom = p.ty;
      p.place(back, bottom + y, false, base + (t - .5) * .52);
      for (let i = -1; i < 2; i++) {
        const x = size * (.15 + t * .26), width = size * (1 - Math.abs(i) * .14);
        const dy = i * 4;
        p.poly([[x, dy + 2], [x + width * .46, dy - width * .16], [x + width, dy - 1], [x + width * .52, dy - 1]], mid, fade);
        p.line(x + 2, dy + 1, x + width * .48, dy - width * .15, bright, fade);
        p.line(x + width * .48, dy - width * .15, x + width, dy - 1, tip, fade * .8);
      }
      p.place(back, bottom);
      return;
    }
    case "steam":
      for (let i = 0; i < 6; i++) {
        const x = (rand(seed, i) - .5) * size * (1 + t);
        const py = y - 3 - t * 17 + (rand(seed, i, 1) - .5) * 9;
        p.ellipse(x, py, 2.2 + t * 2, 1.5 + t, i % 2 ? mid : bright, fade * .57);
        if (i % 3 === 0) p.dot(x + .5, py - 2 - t, tip, fade * .65);
      }
      return;
    case "fall": {
      const descent = Math.max(0, .5 - t) * 60;
      const f = Math.min(1, fade * 1.3);
      paintGroundRing(p, size * (.35 + .65 * t), mid, f);
      p.line(-7, y - 22 - descent, 0, y - descent, mid, f * .8);
      p.line(-6, y - 14 - descent, 0, y - descent, bright, f);
      p.poly(star(0, y - descent, 2, 5, 4), tip, f);
      break;
    }
    case "spark":
      if (k < .75) {
        p.fade = fade;
        const arm = Math.max(2, Math.round((1 - t) * Math.min(7, size)));
        if (contact) {
          const a = screenAngle(contact.dx, contact.dy), x = Math.cos(a) * arm, dy = Math.sin(a) * arm;
          p.line(-x * .64, y - dy * .64, x, y + dy, bright);
          p.line(-dy * .56, y + x * .56, 0, y, tip);
          p.line(dy * .56, y - x * .56, 0, y, tip);
          p.glow(0, y, 5, mid, .2);
        } else sparkle(p, 0, y, arm, tip, bright, .25);
        p.fade = 1;
      }
      break;
    case "splash":
      p.ellipse(0, 1, size * (.27 + t * .24), size * (.12 + t * .08), dark, fade * .47);
      if (e.kind === "splat") {
        p.ellipse(size * .19, 1, size * .23, size * .11, dark, fade * .74);
        p.ellipse(-size * .21, -size * .07, size * .2, size * .1, mid, fade * .53);
      }
      break;
    case "column": {
      const height = size * (.47 + ease.outCubic(t));
      const half = size * .35;
      for (let i = -1; i <= 1; i++) {
        const x = i * half, h = height * (1 - Math.abs(i) * .22);
        p.line(x, -1 - h * .16, x * .6, -h, i === 0 ? bright : mid, fade * .8);
      }
      if (e.kind === "chest-open" || e.kind === "evolve") {
        paintGroundRing(p, reach * .72, tip, fade * .85);
        p.fade = fade;
        sparkle(p, 0, -height, 5, tip, bright, .18);
        if (e.kind === "chest-open") {
          sparkle(p, -half * .9, -height * .62, 3, bright, tip, .12);
          sparkle(p, half * .9, -height * .52, 3, bright, tip, .12);
        }
        p.fade = 1;
      } else p.dot(0, -height, tip, fade);
      break;
    }
    case "shards":
      if (e.kind === "dissolve") {
        p.ellipse(0, 0, size * .57, size * .22, dark, fade * .77);
        p.ellipse(3, -1, size * .2, size * .06, mid, fade * .5);
      }
      break;
    case "ring":
      break;
  }
  scatter(p, seed, t, size, colors, r.look, fade * (r.look === "ring" ? .75 : 1));
}

export function paintFlight(p: Painter, s: ShotState, time: number, reduced: boolean): void {
  const colors = s.weapon === "crane" ? PAPER : s.weapon === "seed" ? FIRE : s.echo ? MOON : GOLD;
  const [dark, mid, bright, tip] = colors, angle = screenAngle(s.vx, s.vy), x = p.tx, y = p.ty;
  p.ellipse(0, 0, 4, 1.5, INK, .45);
  p.place(x, y - 8, false, angle);
  if (s.weapon === "crane") {
    const wing = reduced ? 4 : 3 + Math.round(Math.abs(Math.sin(time * 13 + s.id)) * 3);
    p.poly([[-8, 1], [-4, -1], [-2, -wing], [0, -1], [4, -1], [8, -3], [6, 1], [0, 2], [-2, wing], [-4, 2]], dark);
    p.poly([[-6, 1], [-2, -wing + 1], [1, 0], [6, -2], [5, 0], [0, 1], [-2, wing - 1]], bright);
    p.line(-2, 0, 4, 0, tip);
  } else if (s.weapon === "seed") {
    p.ellipse(0, 0, 5, 3, dark);
    p.ellipse(0, 0, 4, 2, bright);
    p.line(-2, -1, 3, -1, tip);
    p.dot(-6, 1, mid);
  } else {
    const reach = s.empowered ? 2 : 0;
    p.poly([[-5, -6], [1, -5], [5 + reach, -2], [7 + reach, 0], [4, 3], [0, 5], [-5, 6], [0, 1], [0, -1]], dark);
    p.poly([[-3, -5], [2, -4], [6 + reach, 0], [3, 3], [-3, 5], [1, 1], [1, -1]], bright);
    p.line(1, -4, 6 + reach, 0, tip);
    p.glow(3, 0, 9, mid, s.empowered ? .35 : .2);
  }
  if (!reduced) {
    for (let i = 0; i < 4; i++) {
      const dx = -7 - i * 2 - rand(s.id, i) * 3;
      p.dot(dx, (rand(s.id, i, 1) - .5) * 4, i < 2 ? bright : mid, 1 - i * .19);
    }
  }
  p.place(x, y);
}

export function paintOrbit(p: Painter, i: number, time: number, reduced: boolean, full: boolean): void {
  const [dark, mid, bright, tip] = full ? GOLD : MOON;
  const rx = reduced ? 1 : .55 + Math.abs(Math.sin(i + time * 7)) * .45;
  const r = full ? 6 : 5;
  const points = star(0, -8, r * .44, r, 5).map(([x, y]) => [x * rx, y] as const);
  p.ellipse(0, 0, 5, 1.5, INK, .45);
  p.poly(points, dark);
  p.poly(points.map(([x, y]) => [x * .8, (y + 8) * .8 - 8]), bright);
  p.line(0, -8, 0, -8 - r + 1, tip);
  p.line(0, -8, points[6]![0] * .85, (points[6]![1] + 8) * .8 - 8, mid);
  p.glow(0, -8, 7, mid, .17);
}

export type LootKind = "shard" | "chest" | "treat";
export function paintLoot(p: Painter, kind: LootKind, id: number, time: number, reduced: boolean, big: boolean): void {
  const bob = reduced ? 0 : Math.round(Math.sin(time * 3.7 + id) * 1.5);
  const [dark, mid, bright, tip] = kind === "shard" ? WATER : big ? MOON : GOLD;
  if (kind === "shard") {
    const r = big ? 5 : 3, y = -4 + bob;
    p.ellipse(0, 0, r, 1.4, INK, .65);
    p.poly([[0, y - r], [r, y - 1], [r - 1, y + 1], [0, y + r], [-r, y]], dark);
    p.poly([[0, y - r + 1], [r - 1, y - 1], [0, y + r - 1], [-r + 1, y]], bright);
    p.line(0, y - r + 1, -1, y, tip);
    p.dot(1, y + 1, mid);
    if (big) p.glow(0, y, 7, mid, .22);
    return;
  }
  if (kind === "treat") {
    p.ellipse(0, 0, 6, 2, INK, .6);
    p.poly([[-7, -9], [-4, -8], [0, -10], [5, -9], [7, -6], [5, -4], [0, -3], [-4, -5], [-7, -4]], dark);
    p.poly([[-6, -8], [-3, -7], [1, -9], [5, -8], [6, -6], [3, -4], [-1, -4], [-4, -6], [-6, -5]], bright);
    p.line(-2, -7, 2, -8, tip);
    p.px(4, -7, dark);
    return;
  }
  const hw = big ? 10 : 8, h = big ? 12 : 9;
  const pulse = reduced ? .65 : .45 + .35 * Math.sin(time * 4 + id);
  paintGroundRing(p, hw + 5 + (reduced ? 0 : Math.sin(time * 3 + id) * 1.5), bright, pulse * .85);
  if (big) paintGroundRing(p, hw + 9, tip, pulse * .6);
  p.ellipse(0, 0, hw + 2, 3, INK, .64);
  p.poly([[-hw, -h], [-hw + 3, -h - 3], [hw - 3, -h - 3], [hw, -h], [hw, -1], [hw - 4, 1], [-hw, 0]], dark);
  p.rect(-hw + 1, -h + 2, hw * 2 - 3, h - 3, mid);
  p.poly([[-hw + 1, -h], [-hw + 4, -h - 2], [hw - 3, -h - 2], [hw - 1, -h], [hw - 2, -h + 2], [-hw + 1, -h + 2]], bright);
  p.line(-hw + 1, -h + 3, hw - 2, -h + 3, dark);
  p.rect(-1, -h + 2, 3, 3, tip);
  p.px(0, -h + 4, mid);
  if (!reduced && Math.sin(time * 3.4 + id) > .25) sparkle(p, hw - 2, -h - 4, big ? 4 : 3, tip, bright, .28);
  p.glow(0, -h + 4, big ? 18 : 13, bright, .24);
}

const FLAMES = [
  ["...d.", "..cc.", ".cb..", ".cb..", "abcb.", "abcba", ".aba."],
  ["..d..", "..c..", ".bcb.", "..cb.", ".bccb", "abcba", ".aba."],
  ["..d..", "..cb.", "...c.", "..cbc", ".bccb", "abcba", ".aba."],
] as const;
const FIRE_INK = { a: RAMP.fire[3]!, b: RAMP.fire[4]!, c: RAMP.fire[5]!, d: RAMP.fire[7]! };
export function paintFire(p: Painter, time: number, seed: number, reduced: boolean, power = 1): void {
  const phase = reduced ? 0 : ((Math.floor(time * 10 + rand(seed) * 12) % FLAMES.length) + FLAMES.length) % FLAMES.length;
  const lift = Math.floor(power * 2);
  p.ellipse(0, 1, 5, 2, FIRE[0], .7);
  p.sprite(FLAMES[phase]!, FIRE_INK, -2, -6 - lift);
  p.glow(0, -4, 10, FIRE[1], .18 * power);
  if (!reduced) {
    const age = (time * 1.5 + rand(seed, 1)) % 1;
    p.dot((rand(seed, 2) - .5) * 5, -7 - age * 7, FIRE[3], 1 - age);
  }
}

export interface StatusLook {
  readonly halfWidth: number;
  readonly top: number;
  readonly burnTime?: number;
  readonly wetTime?: number;
}
const CARRIED_FLAMES = [
  ["..d", ".c.", "abc", "aba"],
  ["d..", ".cb", "abc", ".ba"],
  [".d.", "cb.", "abc", "aba"],
] as const;
const CARRIED_INK = { a: "#a83a1e", b: "#ef7f24", c: "#f9bf3c", d: "#fff0a8" };

export function paintStatus(p: Painter, actor: StatusLook, time: number, reduced: boolean): void {
  const wet = (actor.wetTime ?? 0) > 0;
  if (!wet && !(actor.burnTime && actor.burnTime > 0)) return;
  const { halfWidth: w, top } = actor;
  p.fade = Math.min(1, (wet ? actor.wetTime! : actor.burnTime!) * 2);
  if (wet) {
    const fall = reduced ? .4 : time * 1.3 % 1;
    const fall2 = reduced ? .7 : (time * 1.3 + .5) % 1;
    const x = -Math.round(w * .8), y = -Math.round(top * .3);
    const right = Math.round(w * .2);
    p.rect(x, y, 3, 2, WATER[1]);
    p.rect(x + 1, y + 1, 2, 1, WATER[0]);
    p.dot(x, y, WATER[3]);
    p.rect(right, -Math.round(top * .55), 2, 1, WATER[1]);
    p.dot(right, -Math.round(top * .55), WATER[3]);
    if (fall < .85) p.dot(right + 1, y + Math.round(fall * 5), WATER[2]);
    if (fall2 < .85) p.dot(x + 1, y + 2 + Math.round(fall2 * 4), WATER[3]);
  } else {
    const phase = reduced ? 0 : Math.floor(Math.max(0, time) * 10) % CARRIED_FLAMES.length;
    const pulse = reduced ? .52 : .42 + .2 * Math.sin(time * 12);
    paintGroundRing(p, Math.max(5, w * .95), hex(CARRIED_INK.b), pulse);
    p.sprite(CARRIED_FLAMES[phase]!, CARRIED_INK, -Math.round(w * .7) - 1, -Math.round(top * .28) - 3);
    p.sprite(CARRIED_FLAMES[(phase + 1) % 3]!, CARRIED_INK, Math.round(w * .6) - 1, -Math.round(top * .5) - 3);
    p.sprite(CARRIED_FLAMES[(phase + 2) % 3]!, CARRIED_INK, Math.round(w * .15) - 1, -top - 4);
    p.glow(w * .42, -top * .57, 7, FIRE[1], .19);
  }
  p.fade = 1;
}

export function paintSpawn(p: Painter, left: number, id: number, radius: number, elite: boolean, reduced: boolean): void {
  const [dark, mid, bright, tip] = elite ? GOLD : ALERT;
  const r = Math.min(44, 6 + radius * ISO.k), t = clamp(left / .67);
  p.ellipse(0, 0, r * .86, r * .37, dark, .46);
  paintGroundRing(p, r * (reduced ? 1 : .73 + .27 * t), bright, .9);
  const seed = id * 371;
  if (reduced) {
    p.line(-2, 0, 2, 0, tip, .75);
    p.line(0, -2, 0, 2, tip, .75);
    return;
  }
  for (let i = 0; i < 7; i++) {
    const a = rand(seed, i) * TAU, k = .42 + rand(seed, i, 1) * .58, h = (1 - t) * 15 * k;
    p.dot(Math.cos(a) * r * k, Math.sin(a) * r * k * .5 - h, i % 3 ? mid : tip, .93);
  }
}
