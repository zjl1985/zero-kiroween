/**
 * Interim wash-out look (the full colourless pencil rendering comes later):
 * washed cells lay a flat cream sheet over the painted ground, blank and cut
 * cells a whiter one, wet cells a faint blue film; water splashes and pigment
 * pops are small flat paper effects. Nothing is drawn when nothing was
 * washed, so the page looks exactly as before. Flat fills only: no gradients,
 * blur or additive light. Render only: reads SimState, never mutates it.
 */
import { CATS, ENEMY_DEFS } from "../defs/registries.js";
import { WASH } from "../defs/wash.js";
import { EFFECT_LIFE, type Impact, type SimState } from "../game/types.js";
import { washEmpty } from "../game/wash.js";
import { viewRect, type Camera } from "./camera.js";
import { oval, type Ctx } from "./paper-material.js";

const RAW = "#ece3cf", BLANK = "#fbf7ee", WET = "#8fb4c6", DROP = "#7fb3c8";

/** Flat washed patches under everything that stands on the ground. */
export function drawWashGround(ctx: Ctx, sim: SimState, cam: Camera): void {
  if (washEmpty(sim)) return;
  const cells = sim.wash.cells;
  const view = viewRect(cam, WASH.cell * 2),
    r = WASH.cell * 0.72,
    // One path per tone, filled once, so overlapping discs merge into a single blot.
    tones = [new Path2D(), new Path2D(), new Path2D()],
    blank = new Path2D(),
    wet = new Path2D();
  let any = false;
  for (const key in cells) {
    const c = cells[key]!,
      [ix, iy] = key.split(",").map(Number) as [number, number],
      x = (ix + 0.5) * WASH.cell,
      y = (iy + 0.5) * WASH.cell;
    if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
    // The bloom grows in over WASH.bloom seconds after a change.
    const grow = Math.min(1, Math.max(0.35, (sim.elapsed - c.changedAt) / WASH.bloom)),
      rr = r * (0.75 + grow * 0.25);
    if (c.blank || (c.cutUntil ?? 0) > sim.elapsed) {
      blank.moveTo(x + rr, y);
      blank.ellipse(x, y, rr, rr * 0.82, 0, 0, Math.PI * 2);
      any = true;
    } else if (c.level > 0.02) {
      const tone = tones[Math.min(2, Math.floor(c.level * 3))]!;
      tone.moveTo(x + rr, y);
      tone.ellipse(x, y, rr, rr * 0.82, 0, 0, Math.PI * 2);
      any = true;
    }
    if ((c.wetUntil ?? 0) > sim.elapsed) {
      wet.moveTo(x + r * 0.8, y);
      wet.ellipse(x, y, r * 0.8, r * 0.6, 0, 0, Math.PI * 2);
      any = true;
    }
  }
  if (!any) return;
  ctx.save();
  tones.forEach((p, i) => {
    ctx.globalAlpha = 0.28 + i * 0.2;
    ctx.fillStyle = RAW;
    ctx.fill(p);
  });
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = BLANK;
  ctx.fill(blank);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = WET;
  ctx.fill(wet);
  ctx.restore();
}

/** Splash rings and pigment pops; true when the impact was one of them. */
export function drawWashEffect(ctx: Ctx, e: Impact, sim: SimState): boolean {
  if (e.kind !== "splash" && e.kind !== "pigment") return false;
  const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])),
    fade = 1 - t,
    ease = 1 - (1 - t) ** 3,
    radius = e.radius ?? 30,
    seed = e.seed ?? 0;
  ctx.save();
  ctx.globalAlpha *= fade;
  if (e.kind === "splash") {
    ctx.strokeStyle = "#e6f4f6";
    ctx.lineWidth = 1.4;
    ctx.stroke(oval(e.x, e.y, radius * (0.4 + ease * 0.6), radius * (0.25 + ease * 0.35), seed, 0.08));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + seed, d = radius * (0.3 + ease * 0.7);
      ctx.fillStyle = DROP;
      ctx.fill(oval(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.55 - Math.sin(t * Math.PI) * 10, 2.4, 1.8, i));
    }
  } else {
    const hint = e.src ? ENEMY_DEFS.find(e.src)?.pigment : undefined,
      colour = hint ?? CATS.get(sim.player.id).stats.accent;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + seed * 0.7, d = radius * (0.2 + ease * 0.6);
      ctx.fillStyle = colour;
      ctx.fill(oval(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.55, 3.2 * fade + 1, 2.4 * fade + 0.8, i + seed));
    }
  }
  ctx.restore();
  return true;
}
