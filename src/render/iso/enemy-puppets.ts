import { enemyContact } from "../../game/combat-observation.js";
import { enemyMaxHp } from "../../game/sim.js";
import type { EnemyShotState, EnemyState } from "../../game/types.js";
import type { EnemyLook, EnemyPuppet } from "../art-registry.js";
import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
import type { IsoFxFrame } from "./fx-frame.js";
import { drawGen, genSprite } from "./gen-sprites.js";
import { ISO, snap, toScreen } from "./projection.js";
import { drawPuppet, drawPuppetShadow, puppetFrame, puppetSprite } from "./puppet.js";
import { drawPuppetStatus } from "./puppet-status.js";
import { isoDirection, isoMotion } from "./sprite-sheet.js";

const FIRE_RELEASE = 0.2, BOSS_RELEASE = 0.25, HIT_TIME = 0.14;
type Pose = { anim: string; frame: number };
type Attack = { anim: string; active: boolean; until: number };
const attacks = new WeakMap<EnemyState, Attack>();

/** Observe attack transitions on the renderer's clock, even when hurt overrides the pose. */
export function enemyPose(e: EnemyState, puppet: EnemyPuppet, time: number, moving: boolean, reduced: boolean): Pose {
  const previous = attacks.get(e);
  const act = e.act;
  const winding = (e.windup ?? 0) > 0 || (act?.t ?? 0) > 0;
  const anim = act?.kind ?? "attack";
  let attack: Pose | undefined;
  if (puppet.frames[anim] && (winding || act)) {
    attacks.set(e, { anim, active: true, until: time });
    attack = { anim, frame: winding ? 0 : 1 };
  } else if (previous) {
    const until = previous.active
      ? time + (previous.anim === "attack" ? FIRE_RELEASE : BOSS_RELEASE)
      : previous.until;
    if (time < until) {
      attacks.set(e, { ...previous, active: false, until });
      attack = { anim: previous.anim, frame: 1 };
    } else attacks.delete(e);
  }

  if ((e.hitFlash ?? 0) > 0) return { anim: "hurt", frame: 0 };
  const stunned = (e.stun ?? 0) > 0;
  if (attack && !stunned) return reduced ? { ...attack, frame: 0 } : attack;
  const motion = moving && !stunned ? "walk" : "idle";
  return { anim: motion, frame: puppetFrame(puppet, motion, time + (e.id % 4) * 0.13, reduced || stunned) };
}

function hitAct(e: EnemyState, reduced: boolean) {
  const hit = Math.min(1, (e.hitFlash ?? 0) / HIT_TIME);
  if (reduced || hit <= 0) return {};
  const contact = enemyContact(e), v = contact && toScreen(contact.dx, contact.dy);
  const len = v ? Math.hypot(v.x, v.y) || 1 : 1;
  const press = hit ** 2 * 0.16, horizontal = v && Math.abs(v.x) > Math.abs(v.y);
  return {
    sx: horizontal ? 1 - press : 1 + press * 0.5,
    sy: horizontal ? 1 + press * 0.5 : 1 - press,
    dx: v ? Math.round(v.x / len * hit * 3) : 0,
    dy: v ? Math.round(v.y / len * hit * 2) : 0,
  };
}

function eliteMarker(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.save();
  ctx.globalAlpha *= 0.8;
  ctx.fillStyle = "#cb9b4f";
  for (let row = -ry; row <= ry; row++) {
    const half = Math.round(rx * (1 - Math.abs(row) / (ry + 1) * 0.5)) + 2;
    if (Math.abs(row) >= ry - 1) ctx.fillRect(x - half, y + row, half * 2 + 1, 1);
    else {
      ctx.fillRect(x - half, y + row, 2, 1);
      ctx.fillRect(x + half - 1, y + row, 2, 1);
    }
  }
  ctx.restore();
}

function stunStars(ctx: Ctx, x: number, y: number, time: number, reduced: boolean, width: number): void {
  ctx.fillStyle = "#bde7f1";
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + (reduced ? 0 : time * 3);
    const sx = snap(x + Math.cos(a) * width), sy = snap(y + Math.sin(a) * 2);
    ctx.fillRect(sx - 1, sy, 3, 1);
    ctx.fillRect(sx, sy - 1, 1, 3);
  }
}

export function drawEnemyPuppet(ctx: Ctx, base: EnemyPuppet, e: EnemyState, time: number, look: EnemyLook, pencil: boolean, fx?: IsoFxFrame): void {
  const elite = e.elite ? base.elite : undefined, p = elite ?? base, key = `enemy:${e.id}`;
  const motion = isoMotion(key, e.x, e.y, time), facing = toScreen(look.x - e.x, look.y - e.y).x < 0 ? -1 : 1;
  const dir = isoDirection(key, motion.vx, motion.vy, facing), reduced = reducedPaperMotion();
  const pose = enemyPose(e, p, time, motion.moving, reduced);
  const foot = toScreen(e.x, e.y), x = snap(foot.x), y = snap(foot.y), [rx, ry] = p.shadow;
  if (elite) eliteMarker(ctx, x, y, rx, ry);
  drawPuppetShadow(ctx, e.x, e.y, { rx, ry });
  const flash = (e.hitFlash ?? 0) > (reduced ? HIT_TIME - 1 / 60 : HIT_TIME - 0.045);
  const id = puppetSprite(p, dir, pose.anim, pose.frame);
  drawPuppet(ctx, id, e.x, e.y, {
    look: flash ? "flash" : pencil ? "pencil" : undefined, ...hitAct(e, reduced),
  });
  drawPuppetStatus(ctx, e, time, p, fx);
  const top = genSprite(id)?.ay ?? p.top, crown = top + p.crown - p.top;
  if (elite) drawGen(ctx, "crown-elite", e.x, e.y, undefined, crown);
  if ((e.stun ?? 0) > 0) stunStars(ctx, x, y - (elite ? crown + 8 : top + 3), time, reduced, p.halfWidth * 0.7);
  const max = enemyMaxHp(e);
  if (e.hp < max) {
    const barY = y + Math.max(ry, p.bottom) + 2;
    ctx.fillStyle = "#211a30";
    ctx.fillRect(x - 6, barY, 13, 2);
    ctx.fillStyle = elite ? "#e4ae6e" : "#e0a2c4";
    ctx.fillRect(x - 5, barY, Math.max(1, Math.round(11 * Math.max(0, e.hp) / max)), 1);
  }
}

export function drawEnemyDrop(ctx: Ctx, s: EnemyShotState, x: number, y: number, progress: number): void {
  const lift = ISO.k * (32 + Math.sin(progress * Math.PI) * 46 - progress * 18);
  drawPuppetShadow(ctx, x, y, { rx: 3, ry: 1 });
  drawGen(ctx, s.kind === "water" ? "shot-water" : "shot-ink", x, y, undefined, lift);
}
